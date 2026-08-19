class InboxMessage {
  final String id;
  final String body;
  final bool isFromAdmin;
  final DateTime createdAt;

  InboxMessage({
    required this.id,
    required this.body,
    required this.isFromAdmin,
    required this.createdAt,
  });
}
