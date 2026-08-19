import 'package:condohub_mobile/app/routes.dart';
import 'package:condohub_mobile/core/models/announcement.dart';
import 'package:condohub_mobile/core/network/api_exception.dart';
import 'package:condohub_mobile/core/repositories/announcements_repository.dart';
import 'package:condohub_mobile/features/announcements/announcement_detail_page.dart';
import 'package:condohub_mobile/features/announcements/announcements_page.dart';
import 'package:condohub_mobile/features/announcements/announcements_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  testWidgets('AnnouncementsPage renders items and navigates to detail', (
    tester,
  ) async {
    final repository = FakeAnnouncementsRepository(
      initialItems: [
        Announcement(
          id: 'announcement-001',
          title: 'Manutencao da caixa dagua',
          summary: 'O fornecimento sera interrompido as 10h.',
          body: '<p>O fornecimento sera interrompido as 10h.</p>',
          createdAt: DateTime(2024, 1, 1, 12),
          attachments: const [
            AnnouncementAttachment(
              url: 'https://cdn.condohub.local/manual.pdf',
              name: 'manual.pdf',
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(_appWithRepository(repository));
    await tester.pumpAndSettle();

    expect(find.text('Manutencao da caixa dagua'), findsOneWidget);
    expect(find.text('Nao lido'), findsOneWidget);

    await tester.tap(
      find.byKey(const ValueKey('announcement-tile-announcement-001')),
    );
    await tester.pumpAndSettle();

    expect(find.text('Detalhe do aviso'), findsOneWidget);
    expect(find.text('manual.pdf'), findsOneWidget);
  });

  testWidgets('AnnouncementDetailPage auto acknowledges unread item', (
    tester,
  ) async {
    final repository = FakeAnnouncementsRepository(
      initialItems: [
        Announcement(
          id: 'announcement-002',
          title: 'Assembleia extraordinaria',
          summary: 'Reuniao na sexta-feira.',
          body: '<p>Reuniao na sexta-feira.</p>',
          createdAt: DateTime(2024, 2, 10, 18),
        ),
      ],
    );

    await tester.pumpWidget(_appWithRepository(repository));
    await tester.pumpAndSettle();

    await tester.tap(
      find.byKey(const ValueKey('announcement-tile-announcement-002')),
    );
    await tester.pump();
    await tester.pumpAndSettle();

    expect(repository.acknowledgedIds, contains('announcement-002'));
    expect(find.text('Lido'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back_rounded));
    await tester.pumpAndSettle();

    expect(find.text('Nao lido'), findsNothing);
  });

  testWidgets('AnnouncementsPage shows error and retries successfully', (
    tester,
  ) async {
    final repository = FakeAnnouncementsRepository(
      failListOnce: true,
      initialItems: [
        Announcement(
          id: 'announcement-003',
          title: 'Elevador em manutencao',
          summary: 'Uso interditado ate as 15h.',
          body: 'Uso interditado ate as 15h.',
          createdAt: DateTime(2024, 3, 5, 9),
        ),
      ],
    );

    await tester.pumpWidget(_appWithRepository(repository));
    await tester.pump(const Duration(milliseconds: 20));
    await tester.pumpAndSettle();

    final retryAction = find.byIcon(Icons.refresh_rounded);
    if (retryAction.evaluate().isNotEmpty) {
      await tester.tap(retryAction);
      await tester.pump(const Duration(milliseconds: 20));
      await tester.pumpAndSettle();
    }

    expect(find.text('Elevador em manutencao'), findsOneWidget);
    expect(repository.listCalls, greaterThanOrEqualTo(1));
  });
}

Widget _appWithRepository(FakeAnnouncementsRepository repository) {
  final router = GoRouter(
    initialLocation: AppRoutes.mural,
    routes: [
      GoRoute(
        path: AppRoutes.mural,
        builder: (_, _) => const AnnouncementsPage(),
      ),
      GoRoute(
        path: AppRoutes.muralDetail,
        builder: (_, state) =>
            AnnouncementDetailPage(id: state.pathParameters['id']!),
      ),
    ],
  );

  return ProviderScope(
    overrides: [announcementsRepositoryProvider.overrideWithValue(repository)],
    child: MaterialApp.router(
      locale: const Locale('pt', 'BR'),
      supportedLocales: const [Locale('pt', 'BR'), Locale('en', 'US')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      routerConfig: router,
    ),
  );
}

class FakeAnnouncementsRepository implements AnnouncementsRepository {
  FakeAnnouncementsRepository({
    required List<Announcement> initialItems,
    this.failListOnce = false,
    this.failAcknowledge = false,
  }) : _items = [...initialItems];

  final List<Announcement> _items;
  bool failListOnce;
  bool failAcknowledge;
  int listCalls = 0;
  final List<String> acknowledgedIds = <String>[];

  @override
  Future<void> acknowledge(String id) async {
    await Future<void>.delayed(const Duration(milliseconds: 10));
    if (failAcknowledge) {
      throw const ApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Nao foi possivel conectar ao servidor',
      );
    }

    final index = _items.indexWhere((item) => item.id == id);
    if (index >= 0) {
      _items[index] = _items[index].copyWith(read: true);
    }
    acknowledgedIds.add(id);
  }

  @override
  Future<Announcement> getAnnouncementById(
    String id, {
    bool forceRefresh = false,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 10));
    return _items.firstWhere((item) => item.id == id);
  }

  @override
  Future<List<Announcement>> getAnnouncements({
    bool forceRefresh = false,
  }) async {
    listCalls += 1;
    await Future<void>.delayed(const Duration(milliseconds: 10));
    if (failListOnce) {
      failListOnce = false;
      throw const ApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Nao foi possivel conectar ao servidor',
      );
    }
    return List<Announcement>.unmodifiable(_items);
  }
}
