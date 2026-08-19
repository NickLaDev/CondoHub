import '../models/signable_document.dart';

abstract class DocumentsRepository {
  Future<List<SignableDocument>> getDocuments();
  Future<SignableDocument?> getById(String id);
  Future<void> markSigned(String id);
}
