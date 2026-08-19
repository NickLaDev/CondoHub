import 'package:condohub_mobile/core/models/authorized_person.dart';
import 'package:condohub_mobile/core/models/signable_document.dart';
import 'package:condohub_mobile/core/models/visitor.dart';
import 'package:condohub_mobile/core/repositories/local_authorized_access_repository.dart';
import 'package:condohub_mobile/core/repositories/local_documents_repository.dart';
import 'package:condohub_mobile/core/repositories/local_visitors_repository.dart';
import 'package:condohub_mobile/core/storage/local_collection_store.dart';
import 'package:condohub_mobile/core/util/date_format.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<LocalCollectionStore> _store(String namespace, {String tenant = 't1'}) async {
  final prefs = await SharedPreferences.getInstance();
  return LocalCollectionStore(
    preferences: prefs,
    namespace: namespace,
    tenant: tenant,
  );
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('LocalVisitorsRepository', () {
    test('adds, lists, releases and deletes a visitor', () async {
      final repo = LocalVisitorsRepository(await _store('visitors'));

      final created = await repo.addVisitor(
        name: 'Maria Souza',
        type: VisitorType.prestador,
        expectedAt: DateTime.now().add(const Duration(days: 1)),
        unitLabel: 'Bloco A - 42',
      );

      var all = await repo.getVisitors();
      expect(all, hasLength(1));
      expect(all.first.name, 'Maria Souza');
      expect(all.first.effectiveStatus, VisitorStatus.agendado);

      await repo.setStatus(created.id, VisitorStatus.liberado);
      all = await repo.getVisitors();
      expect(all.first.effectiveStatus, VisitorStatus.liberado);

      await repo.deleteVisitor(created.id);
      expect(await repo.getVisitors(), isEmpty);
    });

    test('expired status is derived from a past expected date', () {
      final visitor = Visitor(
        id: '1',
        name: 'Old',
        type: VisitorType.visitante,
        expectedAt: DateTime.now().subtract(const Duration(days: 2)),
        status: VisitorStatus.agendado,
        createdAt: DateTime.now(),
      );
      expect(visitor.effectiveStatus, VisitorStatus.expirado);
    });
  });

  group('LocalDocumentsRepository', () {
    test('seeds pending documents on first read', () async {
      final repo = LocalDocumentsRepository(await _store('documents'));
      final docs = await repo.getDocuments();
      expect(docs, isNotEmpty);
      expect(docs.every((d) => d.status == DocumentStatus.pendente), isTrue);
    });

    test('marking signed moves the document to the signed list', () async {
      final repo = LocalDocumentsRepository(await _store('documents'));
      final docs = await repo.getDocuments();
      final target = docs.first;

      await repo.markSigned(target.id);

      final updated = await repo.getById(target.id);
      expect(updated, isNotNull);
      expect(updated!.isSigned, isTrue);
      expect(updated.signedAt, isNotNull);
    });
  });

  group('LocalAuthorizedAccessRepository', () {
    test('saves, updates active flag and deletes', () async {
      final repo = LocalAuthorizedAccessRepository(await _store('access'));

      final person = await repo.save(
        name: 'Joana',
        type: AuthorizedType.diarista,
        weekdays: {1, 3, 5},
        startMinutes: 8 * 60,
        endMinutes: 17 * 60,
        validUntil: DateTime.now().add(const Duration(days: 30)),
      );

      expect((await repo.getPeople()), hasLength(1));
      expect(person.isActiveNow, isTrue);

      await repo.setActive(person.id, false);
      final reloaded = await repo.getById(person.id);
      expect(reloaded!.active, isFalse);
      expect(reloaded.isActiveNow, isFalse);

      await repo.delete(person.id);
      expect(await repo.getPeople(), isEmpty);
    });

    test('isAllowedAt respects weekday and time window', () {
      // Monday 2024-01-01 10:00 is within Mon 08:00-17:00.
      final person = AuthorizedPerson(
        id: '1',
        name: 'X',
        type: AuthorizedType.baba,
        weekdays: {1},
        startMinutes: 8 * 60,
        endMinutes: 17 * 60,
        active: true,
        createdAt: DateTime(2024, 1, 1),
      );
      expect(person.isAllowedAt(DateTime(2024, 1, 1, 10)), isTrue);
      expect(person.isAllowedAt(DateTime(2024, 1, 1, 20)), isFalse); // late
      expect(person.isAllowedAt(DateTime(2024, 1, 2, 10)), isFalse); // Tuesday
    });

    test('expired authorization is not active', () {
      final person = AuthorizedPerson(
        id: '1',
        name: 'X',
        type: AuthorizedType.outro,
        weekdays: {1, 2, 3, 4, 5},
        startMinutes: 0,
        endMinutes: 1439,
        active: true,
        validUntil: DateTime.now().subtract(const Duration(days: 1)),
        createdAt: DateTime.now(),
      );
      expect(person.isExpired, isTrue);
      expect(person.isActiveNow, isFalse);
    });
  });

  group('LocalCollectionStore tenant scoping', () {
    test('different tenants do not share data', () async {
      final repoA =
          LocalVisitorsRepository(await _store('visitors', tenant: 'condoA'));
      final repoB =
          LocalVisitorsRepository(await _store('visitors', tenant: 'condoB'));

      await repoA.addVisitor(
        name: 'Only A',
        type: VisitorType.visitante,
        expectedAt: DateTime.now(),
      );

      expect(await repoA.getVisitors(), hasLength(1));
      expect(await repoB.getVisitors(), isEmpty);
    });
  });

  group('date_format', () {
    test('formats dates and minutes', () {
      expect(formatDate(DateTime(2026, 5, 9)), '09/05/2026');
      expect(formatMinutes(8 * 60 + 5), '08:05');
      expect(formatMinutes(18 * 60), '18:00');
    });

    test('summarizes weekday sets', () {
      expect(formatWeekdays({1, 2, 3, 4, 5}), 'Seg a Sex');
      expect(formatWeekdays({6, 7}), 'Fim de semana');
      expect(formatWeekdays({1, 2, 3, 4, 5, 6, 7}), 'Todos os dias');
      expect(formatWeekdays({1, 3}), 'Seg, Qua');
    });
  });
}
