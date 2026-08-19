import '../models/authorized_person.dart';

abstract class AuthorizedAccessRepository {
  Future<List<AuthorizedPerson>> getPeople();
  Future<AuthorizedPerson?> getById(String id);

  /// Inserts a new person when [id] is null, otherwise updates the existing one.
  Future<AuthorizedPerson> save({
    String? id,
    required String name,
    required AuthorizedType type,
    required Set<int> weekdays,
    required int startMinutes,
    required int endMinutes,
    DateTime? validUntil,
    bool active,
    String document,
    String? notes,
  });

  Future<void> setActive(String id, bool active);
  Future<void> delete(String id);
}
