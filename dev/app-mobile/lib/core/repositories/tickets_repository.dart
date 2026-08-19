import '../models/ticket.dart';

abstract class TicketsRepository {
  Future<List<Ticket>> getTickets();
  Future<Ticket?> getById(String id);
  Future<List<TicketAttachment>> getAttachments(String ticketId);
  Future<TicketAttachment> addAttachment(
    String ticketId,
    TicketDraftAttachment attachment,
  );
  Future<List<TicketMessage>> getMessages(String ticketId);
  Future<TicketMessage> addMessage(String ticketId, String body);
  Future<List<TicketStatusEvent>> getStatusHistory(String ticketId);
  Future<Ticket> changeStatus(String ticketId, TicketStatus status);
  Future<Ticket> reopenTicket(String ticketId);
  Future<Ticket> createTicket({
    required String title,
    required TicketCategory category,
    required String location,
    required String description,
    List<TicketDraftAttachment> attachments = const [],
  });
}
