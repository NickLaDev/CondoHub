import 'package:condohub_mobile/app/routes.dart';
import 'package:condohub_mobile/app/shell/app_shell.dart';
import 'package:condohub_mobile/core/ui/ch_scaffold.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

Widget _localizedRouterApp(GoRouter router, Locale locale) {
  return ProviderScope(
    child: MaterialApp.router(
      locale: locale,
      supportedLocales: const [Locale('pt', 'BR'), Locale('en', 'US')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      routerConfig: router,
    ),
  );
}

void main() {
  testWidgets('AppShell bottom nav navigates between root sections', (
    tester,
  ) async {
    final router = GoRouter(
      initialLocation: AppRoutes.home,
      routes: [
        ShellRoute(
          builder: (_, _, child) => AppShell(child: child),
          routes: [
            GoRoute(
              path: AppRoutes.home,
              builder: (_, _) => const Scaffold(body: Text('Tela Início')),
            ),
            GoRoute(
              path: AppRoutes.mural,
              builder: (_, _) => const Scaffold(body: Text('Tela Mural')),
            ),
            GoRoute(
              path: AppRoutes.tickets,
              builder: (_, _) => const Scaffold(body: Text('Tela Chamados')),
            ),
            GoRoute(
              path: AppRoutes.comm,
              builder: (_, _) => const Scaffold(body: Text('Tela Comunicação')),
            ),
            GoRoute(
              path: AppRoutes.services,
              builder: (_, _) => const Scaffold(body: Text('Tela Serviços')),
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      _localizedRouterApp(router, const Locale('pt', 'BR')),
    );
    await tester.pumpAndSettle();

    expect(find.text('Tela Início'), findsOneWidget);

    await tester.tap(find.text('Mural'));
    await tester.pumpAndSettle();
    expect(find.text('Tela Mural'), findsOneWidget);

    await tester.tap(find.text('Chamados'));
    await tester.pumpAndSettle();
    expect(find.text('Tela Chamados'), findsOneWidget);

    await tester.tap(find.text('Comunicação'));
    await tester.pumpAndSettle();
    expect(find.text('Tela Comunicação'), findsOneWidget);

    await tester.tap(find.text('Serviços'));
    await tester.pumpAndSettle();
    expect(find.text('Tela Serviços'), findsOneWidget);
  });

  testWidgets('AppShell keeps bottom nav visible on root page', (tester) async {
    final router = GoRouter(
      initialLocation: AppRoutes.home,
      routes: [
        ShellRoute(
          builder: (_, _, child) => AppShell(child: child),
          routes: [
            GoRoute(
              path: AppRoutes.home,
              builder: (_, _) => const CHScaffold(body: Text('Tela Início')),
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      _localizedRouterApp(router, const Locale('pt', 'BR')),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('bottom-nav-visible')), findsOneWidget);
    expect(find.byType(Drawer), findsNothing);
    expect(find.byIcon(Icons.menu), findsNothing);
    expect(find.byKey(const ValueKey('bottom-nav-visible')), findsOneWidget);
  });

  testWidgets('AppShell bottom nav localizes labels in English', (
    tester,
  ) async {
    final router = GoRouter(
      initialLocation: AppRoutes.home,
      routes: [
        ShellRoute(
          builder: (_, _, child) => AppShell(child: child),
          routes: [
            GoRoute(
              path: AppRoutes.home,
              builder: (_, _) => const Scaffold(body: Text('Home Screen')),
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      _localizedRouterApp(router, const Locale('en', 'US')),
    );
    await tester.pumpAndSettle();

    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Announcements'), findsOneWidget);
    expect(find.text('Tickets'), findsOneWidget);
    expect(find.text('Communication'), findsOneWidget);
    expect(find.text('Services'), findsOneWidget);
  });
}
