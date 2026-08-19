enum TicketStatus {
  aberto,
  emAnalise,
  emExecucao,
  resolvido,
  fechado,
  reaberto,
}

enum TicketCategory {
  eletrica,
  hidraulica,
  estrutural,
  limpeza,
  seguranca,
  outros,
}

enum TicketPriority { baixa, media, alta, urgente }

enum TicketAttachmentType { imagem, video, documento }

class Ticket {
  final String id;
  final String title;
  final String description;
  final TicketCategory category;
  final String location;
  final TicketStatus status;
  final TicketPriority priority;
  final DateTime createdAt;
  final String createdBy;

  Ticket({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.location,
    required this.status,
    required this.priority,
    required this.createdAt,
    required this.createdBy,
  });

  bool get canReopen =>
      status == TicketStatus.resolvido || status == TicketStatus.fechado;

  Ticket copyWith({TicketStatus? status, String? title, String? description}) {
    return Ticket(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      category: category,
      location: location,
      status: status ?? this.status,
      priority: priority,
      createdAt: createdAt,
      createdBy: createdBy,
    );
  }
}

class TicketMessage {
  final String id;
  final String ticketId;
  final String authorName;
  final String body;
  final DateTime createdAt;
  final bool isFromCurrentUser;

  const TicketMessage({
    required this.id,
    required this.ticketId,
    required this.authorName,
    required this.body,
    required this.createdAt,
    required this.isFromCurrentUser,
  });
}

class TicketStatusEvent {
  final String id;
  final String ticketId;
  final TicketStatus? fromStatus;
  final TicketStatus toStatus;
  final String actorName;
  final DateTime createdAt;

  const TicketStatusEvent({
    required this.id,
    required this.ticketId,
    required this.fromStatus,
    required this.toStatus,
    required this.actorName,
    required this.createdAt,
  });
}

class TicketAttachment {
  final String id;
  final String ticketId;
  final String fileName;
  final TicketAttachmentType type;
  final String sizeLabel;
  final String uploadedByName;
  final DateTime createdAt;

  const TicketAttachment({
    required this.id,
    required this.ticketId,
    required this.fileName,
    required this.type,
    required this.sizeLabel,
    required this.uploadedByName,
    required this.createdAt,
  });
}

class TicketDraftAttachment {
  final String id;
  final String fileName;
  final TicketAttachmentType type;
  final String sizeLabel;
  final String? contentType;
  final List<int> bytes;

  const TicketDraftAttachment({
    required this.id,
    required this.fileName,
    required this.type,
    required this.sizeLabel,
    this.contentType,
    this.bytes = const <int>[],
  });
}
