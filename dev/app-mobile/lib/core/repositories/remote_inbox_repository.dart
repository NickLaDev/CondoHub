import 'dart:async';

import '../models/inbox.dart';
import '../network/api_exception.dart';
import '../network/tenant_api_context.dart';
import '../repositories/inbox_repository.dart';

class RemoteInboxRepository implements InboxRepository {
  RemoteInboxRepository({
    required TenantApiContext tenantApiContext,
    Duration pollInterval = const Duration(seconds: 5),
  }) : _ctx = tenantApiContext,
       _pollInterval = pollInterval;

  final TenantApiContext _ctx;
  final Duration _pollInterval;

  final _controller = StreamController<List<InboxMessage>>.broadcast();
  Timer? _pollTimer;
  bool _disposed = false;
  String? _threadId;

  @override
  Future<List<InboxMessage>> getMessages() async {
    final messages = await _fetchMessages();
    return List.unmodifiable(messages);
  }

  @override
  Stream<List<InboxMessage>> get messagesStream {
    _startPollingIfNeeded();
    return _controller.stream;
  }

  @override
  Future<void> sendMessage(String body) async {
    final response = await _ctx.post(
      '/unit/inbox/messages',
      body: {'body': body},
    );

    if (response is! Map<String, dynamic>) {
      throw const ApiException(
        statusCode: 0,
        code: 'INBOX_RESPONSE_INVALID',
        message: 'Resposta de envio de mensagem invalida',
      );
    }

    await _poll();
  }

  @override
  Future<void> updateStatus(String status) async {
    try {
      var threadId = _threadId;
      if (threadId == null) {
        // Try to fetch thread id from server
        final resp = await _ctx.get('/unit/inbox');
        if (resp is Map<String, dynamic>) {
          final items = resp['items'];
          if (items is List &&
              items.isNotEmpty &&
              items[0] is Map<String, dynamic>) {
            threadId = (items[0] as Map<String, dynamic>)['id']?.toString();
          }
        } else if (resp is List &&
            resp.isNotEmpty &&
            resp[0] is Map<String, dynamic>) {
          threadId = (resp[0] as Map<String, dynamic>)['id']?.toString();
        }
      }

      if (threadId == null || threadId.trim().isEmpty) {
        throw const ApiException(
          statusCode: 0,
          code: 'INBOX_THREAD_NOT_FOUND',
          message: 'Thread id not available for status update',
        );
      }

      await _ctx.post(
        '/unit/inbox/status',
        body: {'threadId': threadId, 'status': status},
      );
      await _poll();
    } catch (e) {
      rethrow;
    }
  }

  void _startPollingIfNeeded() {
    if (_pollTimer != null || _disposed) return;
    _pollTimer = Timer.periodic(_pollInterval, (_) => _poll());
    _poll();
  }

  Future<void> _poll() async {
    if (_disposed) return;
    try {
      final messages = await _fetchMessages();
      if (!_disposed && !_controller.isClosed) {
        _controller.add(List.unmodifiable(messages));
      }
    } catch (_) {}
  }

  Future<List<InboxMessage>> _fetchMessages() async {
    final response = await _ctx.get('/unit/inbox');

    List<dynamic> rawMessages = [];
    // Try paginated response { items, total, page, limit }
    if (response is Map<String, dynamic>) {
      if (response.containsKey('items')) {
        final items = response['items'];
        if (items is List &&
            items.isNotEmpty &&
            items[0] is Map<String, dynamic>) {
          final item0 = items[0] as Map<String, dynamic>;
          _threadId = item0['id']?.toString();
          final msgs = item0['messages'];
          rawMessages = msgs is List ? msgs : [];
        } else {
          rawMessages = [];
        }
      } else if (response.containsKey('messages')) {
        final msgs = response['messages'];
        rawMessages = msgs is List ? msgs : [];
      } else {
        rawMessages = [];
      }
    } else if (response is List) {
      // Plain list of messages
      rawMessages = response;
    } else {
      rawMessages = [];
    }

    return rawMessages
        .whereType<Map<String, dynamic>>()
        .map(_parseMessage)
        .toList();
  }

  InboxMessage _parseMessage(Map<String, dynamic> data) {
    return InboxMessage(
      id: data['id']?.toString() ?? '',
      body: data['message']?.toString() ?? data['body']?.toString() ?? '',
      isFromAdmin:
          data['isFromAdmin'] as bool? ??
          (data['senderRole']?.toString() != 'MORADOR'),
      createdAt: _parseDate(data['createdAt']) ?? DateTime.now(),
    );
  }

  DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _pollTimer?.cancel();
    _pollTimer = null;
    _controller.close();
  }
}
