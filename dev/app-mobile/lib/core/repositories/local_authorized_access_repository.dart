import 'package:uuid/uuid.dart';

import '../models/authorized_person.dart';
import '../storage/local_collection_store.dart';
import 'authorized_access_repository.dart';

/// Offline-first authorized-access repository backed by [LocalCollectionStore].
class LocalAuthorizedAccessRepository implements AuthorizedAccessRepository {
  LocalAuthorizedAccessRepository(this._store);

  final LocalCollectionStore _store;
  static const _uuid = Uuid();

  List<AuthorizedPerson> _readSorted() {
    final items = _store
        .readAll()
        .map(AuthorizedPerson.fromJson)
        .toList(growable: true);
    items.sort((a, b) {
      // Active ones first, then alphabetically by name.
      if (a.isActiveNow != b.isActiveNow) return a.isActiveNow ? -1 : 1;
      return a.name.toLowerCase().compareTo(b.name.toLowerCase());
    });
    return items;
  }

  Future<void> _persist(List<AuthorizedPerson> items) =>
      _store.writeAll(items.map((p) => p.toJson()).toList(growable: false));

  @override
  Future<List<AuthorizedPerson>> getPeople() async => _readSorted();

  @override
  Future<AuthorizedPerson?> getById(String id) async {
    for (final person in _readSorted()) {
      if (person.id == id) return person;
    }
    return null;
  }

  @override
  Future<AuthorizedPerson> save({
    String? id,
    required String name,
    required AuthorizedType type,
    required Set<int> weekdays,
    required int startMinutes,
    required int endMinutes,
    DateTime? validUntil,
    bool active = true,
    String document = '',
    String? notes,
  }) async {
    final items = _readSorted();
    final index = id == null ? -1 : items.indexWhere((p) => p.id == id);

    if (index == -1) {
      final person = AuthorizedPerson(
        id: id ?? _uuid.v4(),
        name: name,
        document: document,
        type: type,
        weekdays: weekdays,
        startMinutes: startMinutes,
        endMinutes: endMinutes,
        validUntil: validUntil,
        active: active,
        notes: notes,
        createdAt: DateTime.now(),
      );
      items.add(person);
      await _persist(items);
      return person;
    }

    final updated = items[index].copyWith(
      name: name,
      document: document,
      type: type,
      weekdays: weekdays,
      startMinutes: startMinutes,
      endMinutes: endMinutes,
      validUntil: validUntil,
      active: active,
      notes: notes,
    );
    items[index] = updated;
    await _persist(items);
    return updated;
  }

  @override
  Future<void> setActive(String id, bool active) async {
    final items = _readSorted();
    final index = items.indexWhere((p) => p.id == id);
    if (index == -1) return;
    items[index] = items[index].copyWith(active: active);
    await _persist(items);
  }

  @override
  Future<void> delete(String id) async {
    final items = _readSorted()..removeWhere((p) => p.id == id);
    await _persist(items);
  }
}
