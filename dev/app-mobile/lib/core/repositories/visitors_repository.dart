import '../models/visitor.dart';

abstract class VisitorsRepository {
  Future<List<Visitor>> getVisitors();
  Future<Visitor> addVisitor({
    required String name,
    required VisitorType type,
    required DateTime expectedAt,
    String document,
    String unitLabel,
    String? notes,
  });
  Future<void> setStatus(String id, VisitorStatus status);
  Future<void> deleteVisitor(String id);
}
