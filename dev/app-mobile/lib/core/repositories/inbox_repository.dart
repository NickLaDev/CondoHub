import 'dart:async';
import '../models/inbox.dart';

abstract class InboxRepository {
  Future<List<InboxMessage>> getMessages();
  Stream<List<InboxMessage>> get messagesStream;
  Future<void> sendMessage(String body);
  Future<void> updateStatus(String status);
}
