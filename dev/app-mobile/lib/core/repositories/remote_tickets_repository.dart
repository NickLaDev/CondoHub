import 'dart:io';

import '../models/ticket.dart';
import '../network/api_exception.dart';
import '../network/tenant_api_context.dart';
import 'tickets_repository.dart';

class RemoteTicketsRepository implements TicketsRepository {
  RemoteTicketsRepository({required TenantApiContext tenantApiContext})
      : _ctx = tenantApiContext;

  final TenantApiContext _ctx;
  final Map<String, List<TicketAttachment>> _localAttachments = {};

  @override
  Future<List<Ticket>> getTickets() async {
    final r = await _ctx.get('/tickets?limit=50');
    final items = (r as Map<String, dynamic>?)?['items'];
    if (items is! List) return const [];
    return items.whereType<Map<String, dynamic>>().map(_ticketFromJson).toList(growable: false);
  }

  @override
  Future<Ticket?> getById(String id) async {
    try {
      final r = await _ctx.get('/tickets/$id');
      if (r is! Map<String, dynamic>) return null;
      return _ticketFromJson(r);
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  @override
  Future<List<TicketAttachment>> getAttachments(String ticketId) async {
    return List.unmodifiable(_localAttachments[ticketId] ?? const []);
  }

  @override
  Future<TicketAttachment> addAttachment(String ticketId, TicketDraftAttachment attachment) async {
    final uploaded = await _uploadDraftAttachment(attachment);
    await _ctx.post('/tickets/$ticketId/messages', body: {
      'body': 'Anexo adicionado: ${attachment.fileName}',
      'attachmentId': uploaded,
    });
    final materialized = TicketAttachment(
      id: uploaded,
      ticketId: ticketId,
      fileName: attachment.fileName,
      type: attachment.type,
      sizeLabel: attachment.sizeLabel,
      uploadedByName: 'Você',
      createdAt: DateTime.now(),
    );
    _localAttachments.putIfAbsent(ticketId, () => <TicketAttachment>[]).add(materialized);
    return materialized;
  }

  @override
  Future<List<TicketMessage>> getMessages(String ticketId) async {
    final r = await _ctx.get('/tickets/$ticketId');
    final messages = (r as Map<String, dynamic>?)?['messages'];
    if (messages is! List) return const [];
    return messages.whereType<Map<String, dynamic>>().map(_messageFromJson).toList(growable: false);
  }

  @override
  Future<TicketMessage> addMessage(String ticketId, String body) async {
    final r = await _ctx.post('/tickets/$ticketId/messages', body: {'body': body});
    return _messageFromJson(r as Map<String, dynamic>);
  }

  @override
  Future<List<TicketStatusEvent>> getStatusHistory(String ticketId) async {
    final r = await _ctx.get('/tickets/$ticketId');
    final history = (r as Map<String, dynamic>?)?['statusHistory'];
    if (history is! List) return const [];
    return history.whereType<Map<String, dynamic>>().map(_statusEventFromJson).toList(growable: false);
  }

  @override
  Future<Ticket> changeStatus(String ticketId, TicketStatus status) async {
    if (status == TicketStatus.reaberto) return reopenTicket(ticketId);
    await _ctx.post('/tickets/$ticketId/status', body: {'status': _statusToApi(status)});
    final refreshed = await getById(ticketId);
    if (refreshed == null) throw const ApiException(statusCode: 404, code: 'NOT_FOUND', message: 'Chamado não encontrado');
    return refreshed;
  }

  @override
  Future<Ticket> reopenTicket(String ticketId) async {
    await _ctx.post('/tickets/$ticketId/reopen', body: {'reason': 'Reaberto pelo app mobile'});
    final refreshed = await getById(ticketId);
    if (refreshed == null) throw const ApiException(statusCode: 404, code: 'NOT_FOUND', message: 'Chamado não encontrado');
    return refreshed;
  }

  @override
  Future<Ticket> createTicket({
    required String title,
    required TicketCategory category,
    required String location,
    required String description,
    List<TicketDraftAttachment> attachments = const [],
  }) async {
    final uploadedIds = <String>[];
    final uploadedAttachments = <TicketAttachment>[];

    for (final attachment in attachments) {
      final id = await _uploadDraftAttachment(attachment);
      uploadedIds.add(id);
      uploadedAttachments.add(TicketAttachment(
        id: id,
        ticketId: '',
        fileName: attachment.fileName,
        type: attachment.type,
        sizeLabel: attachment.sizeLabel,
        uploadedByName: 'Você',
        createdAt: DateTime.now(),
      ));
    }

    final r = await _ctx.post('/tickets', body: {
      'category': _categoryToApi(category),
      'location': location,
      'description': _composeDescription(title, description),
      'attachmentIds': uploadedIds,
    });
    final ticket = _ticketFromJson(r as Map<String, dynamic>);

    if (uploadedAttachments.isNotEmpty) {
      _localAttachments[ticket.id] = uploadedAttachments
          .map((a) => TicketAttachment(
                id: a.id,
                ticketId: ticket.id,
                fileName: a.fileName,
                type: a.type,
                sizeLabel: a.sizeLabel,
                uploadedByName: a.uploadedByName,
                createdAt: a.createdAt,
              ))
          .toList();
    }

    return ticket;
  }

  Future<String> _uploadDraftAttachment(TicketDraftAttachment attachment) async {
    final contentType = attachment.contentType ?? _contentTypeFor(attachment.type);
    final payload = attachment.bytes.isEmpty ? _placeholderBytesFor(attachment.type) : attachment.bytes;

    final presign = await _ctx.post('/uploads/presign', body: {
      'filename': attachment.fileName,
      'contentType': contentType,
      'size': payload.length,
    });
    final presignMap = presign as Map<String, dynamic>;
    final attachmentId = presignMap['attachmentId']?.toString();
    if (attachmentId == null || attachmentId.isEmpty) {
      throw const ApiException(statusCode: 500, code: 'UPLOAD_ERROR', message: 'Upload não retornou attachmentId');
    }

    await _sendToSignedUrl(
      presignMap['signedUrl']?.toString() ?? presignMap['uploadUrl']?.toString(),
      payload,
      contentType,
    );

    await _ctx.post('/uploads/complete', body: {
      'attachmentId': attachmentId,
      if (presignMap['bucket'] != null) 'bucket': presignMap['bucket'].toString(),
      if (presignMap['path'] != null) 'path': presignMap['path'].toString(),
      'contentType': contentType,
      'sizeBytes': payload.length,
    });

    return attachmentId;
  }

  Future<void> _sendToSignedUrl(String? signedUrl, List<int> payload, String contentType) async {
    if (signedUrl == null || signedUrl.isEmpty || signedUrl.startsWith('/')) return;
    final client = HttpClient();
    try {
      final request = await client.putUrl(Uri.parse(signedUrl));
      request.headers.contentType = ContentType.parse(contentType);
      request.contentLength = payload.length;
      request.add(payload);
      final response = await request.close();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException(statusCode: response.statusCode, code: 'UPLOAD_FAILED', message: 'Falha ao enviar anexo');
      }
    } finally {
      client.close(force: true);
    }
  }

  Ticket _ticketFromJson(Map<String, dynamic> j) {
    final rawDescription = j['description']?.toString() ?? '';
    final parsed = _splitDescription(rawDescription);
    return Ticket(
      id: j['id']?.toString() ?? '',
      title: parsed.$1,
      description: parsed.$2,
      category: _categoryFromApi(j['category']?.toString()),
      location: j['location']?.toString() ?? 'Condomínio',
      status: _statusFromApi(j['status']?.toString()),
      priority: TicketPriority.media,
      createdAt: _dateFromApi(j['createdAt']) ?? DateTime.now(),
      createdBy: j['createdByUserId']?.toString() ?? '',
    );
  }

  TicketMessage _messageFromJson(Map<String, dynamic> j) => TicketMessage(
        id: j['id']?.toString() ?? '',
        ticketId: j['ticketId']?.toString() ?? '',
        authorName: j['authorName']?.toString() ?? 'Equipe do condomínio',
        body: j['body']?.toString() ?? '',
        createdAt: _dateFromApi(j['createdAt']) ?? DateTime.now(),
        isFromCurrentUser: false,
      );

  TicketStatusEvent _statusEventFromJson(Map<String, dynamic> j) => TicketStatusEvent(
        id: j['id']?.toString() ?? '',
        ticketId: j['ticketId']?.toString() ?? '',
        fromStatus: _nullableStatusFromApi(j['fromStatus']?.toString()),
        toStatus: _statusFromApi(j['toStatus']?.toString()),
        actorName: j['actorName']?.toString() ?? 'Sistema',
        createdAt: _dateFromApi(j['createdAt']) ?? DateTime.now(),
      );

  String _composeDescription(String title, String description) {
    final t = title.trim();
    final d = description.trim();
    if (t.isEmpty) return d;
    if (d.isEmpty) return t;
    return '$t\n\n$d';
  }

  (String, String) _splitDescription(String description) {
    final trimmed = description.trim();
    if (trimmed.isEmpty) return ('Chamado', '');
    final parts = trimmed.split(RegExp(r'\n\s*\n'));
    if (parts.length <= 1) {
      final title = trimmed.length > 48 ? '${trimmed.substring(0, 48)}...' : trimmed;
      return (title, trimmed);
    }
    return (parts.first.trim(), parts.skip(1).join('\n\n').trim());
  }

  String _categoryToApi(TicketCategory c) => switch (c) {
        TicketCategory.eletrica => 'ELETRICA',
        TicketCategory.hidraulica => 'HIDRAULICA',
        TicketCategory.estrutural => 'ESTRUTURAL',
        TicketCategory.limpeza => 'LIMPEZA',
        TicketCategory.seguranca => 'SEGURANCA',
        TicketCategory.outros => 'OUTROS',
      };

  TicketCategory _categoryFromApi(String? v) => switch (_norm(v)) {
        'ELETRICA' => TicketCategory.eletrica,
        'HIDRAULICA' => TicketCategory.hidraulica,
        'ESTRUTURAL' => TicketCategory.estrutural,
        'LIMPEZA' => TicketCategory.limpeza,
        'SEGURANCA' => TicketCategory.seguranca,
        _ => TicketCategory.outros,
      };

  TicketStatus _statusFromApi(String? v) => _nullableStatusFromApi(v) ?? TicketStatus.aberto;

  TicketStatus? _nullableStatusFromApi(String? v) => switch (_norm(v)) {
        'ABERTO' => TicketStatus.aberto,
        'EM_ANALISE' => TicketStatus.emAnalise,
        'EM_EXECUCAO' => TicketStatus.emExecucao,
        'RESOLVIDO' => TicketStatus.resolvido,
        'FECHADO' => TicketStatus.fechado,
        'REABERTO' => TicketStatus.reaberto,
        _ => null,
      };

  String _statusToApi(TicketStatus s) => switch (s) {
        TicketStatus.aberto => 'ABERTO',
        TicketStatus.emAnalise => 'EM_ANALISE',
        TicketStatus.emExecucao => 'EM_EXECUCAO',
        TicketStatus.resolvido => 'RESOLVIDO',
        TicketStatus.fechado => 'FECHADO',
        TicketStatus.reaberto => 'REABERTO',
      };

  DateTime? _dateFromApi(Object? v) => v == null ? null : DateTime.tryParse(v.toString());

  String _norm(String? v) => (v ?? '').trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');

  String _contentTypeFor(TicketAttachmentType t) => switch (t) {
        TicketAttachmentType.imagem => 'image/jpeg',
        TicketAttachmentType.video => 'image/png',
        TicketAttachmentType.documento => 'application/pdf',
      };

  List<int> _placeholderBytesFor(TicketAttachmentType t) => switch (t) {
        TicketAttachmentType.documento => '%PDF-1.1\n1 0 obj\n<<>>\nendobj\n'.codeUnits,
        TicketAttachmentType.imagem || TicketAttachmentType.video => const [
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
          ],
      };
}
