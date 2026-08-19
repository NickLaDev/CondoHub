import 'package:uuid/uuid.dart';

import '../models/visitor.dart';
import '../storage/local_collection_store.dart';
import 'visitors_repository.dart';

/// Offline-first visitors repository backed by [LocalCollectionStore].
class LocalVisitorsRepository implements VisitorsRepository {
  LocalVisitorsRepository(this._store);

  final LocalCollectionStore _store;
  static const _uuid = Uuid();

  List<Visitor> _readSorted() {
    final items = _store
        .readAll()
        .map(Visitor.fromJson)
        .toList(growable: true);
    // Most relevant first: upcoming/recent expected dates on top.
    items.sort((a, b) => b.expectedAt.compareTo(a.expectedAt));
    return items;
  }

  Future<void> _persist(List<Visitor> items) =>
      _store.writeAll(items.map((v) => v.toJson()).toList(growable: false));

  @override
  Future<List<Visitor>> getVisitors() async => _readSorted();

  @override
  Future<Visitor> addVisitor({
    required String name,
    required VisitorType type,
    required DateTime expectedAt,
    String document = '',
    String unitLabel = '',
    String? notes,
  }) async {
    final visitor = Visitor(
      id: _uuid.v4(),
      name: name,
      document: document,
      unitLabel: unitLabel,
      type: type,
      expectedAt: expectedAt,
      status: VisitorStatus.agendado,
      notes: notes,
      createdAt: DateTime.now(),
    );
    final items = _readSorted()..add(visitor);
    await _persist(items);
    return visitor;
  }

  @override
  Future<void> setStatus(String id, VisitorStatus status) async {
    final items = _readSorted();
    final index = items.indexWhere((v) => v.id == id);
    if (index == -1) return;
    items[index] = items[index].copyWith(status: status);
    await _persist(items);
  }

  @override
  Future<void> deleteVisitor(String id) async {
    final items = _readSorted()..removeWhere((v) => v.id == id);
    await _persist(items);
  }
}
