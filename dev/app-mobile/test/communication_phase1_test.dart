import 'package:condohub_mobile/features/communication/channels/channels_page.dart';
import 'package:condohub_mobile/features/communication/channels/channel_post_detail_page.dart';
import 'package:condohub_mobile/features/communication/communication_hub_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  group('Phase 1 communication UI', () {
    testWidgets('Hub navigates to Canais', (tester) async {
      final router = GoRouter(
        initialLocation: '/app/comm',
        routes: [
          GoRoute(
            path: '/app/comm',
            builder: (_, _) => const CommunicationHubPage(),
          ),
          GoRoute(
            path: '/app/channels',
            builder: (_, _) => const Scaffold(body: Text('Tela Canais')),
          ),
          GoRoute(
            path: '/app/inbox',
            builder: (_, _) => const Scaffold(body: Text('Tela Inbox')),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(child: MaterialApp.router(routerConfig: router)),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Canais'));
      await tester.pumpAndSettle();

      expect(find.text('Tela Canais'), findsOneWidget);
    });

    testWidgets('Hub navigates to Inbox', (tester) async {
      final router = GoRouter(
        initialLocation: '/app/comm',
        routes: [
          GoRoute(
            path: '/app/comm',
            builder: (_, _) => const CommunicationHubPage(),
          ),
          GoRoute(
            path: '/app/channels',
            builder: (_, _) => const Scaffold(body: Text('Tela Canais')),
          ),
          GoRoute(
            path: '/app/inbox',
            builder: (_, _) => const Scaffold(body: Text('Tela Inbox')),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(child: MaterialApp.router(routerConfig: router)),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Atendimento'));
      await tester.pumpAndSettle();

      expect(find.text('Tela Inbox'), findsOneWidget);
    });

    testWidgets('Novo post dialog handles small screen with keyboard insets', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            builder: (context, child) {
              return MediaQuery(
                data: const MediaQueryData(
                  size: Size(320, 480),
                  viewInsets: EdgeInsets.only(bottom: 220),
                ),
                child: child!,
              );
            },
            home: const ChannelsPage(),
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 400));

      await tester.tap(find.text('Novo post'));
      await tester.pumpAndSettle();

      expect(find.widgetWithText(AlertDialog, 'Novo post'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('Novo post dialog enables publish only with content', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: ChannelsPage())),
      );
      await tester.pump(const Duration(milliseconds: 400));

      await tester.tap(find.text('Novo post'));
      await tester.pumpAndSettle();

      final publishButton = find.widgetWithText(FilledButton, 'Publicar');
      expect(publishButton, findsOneWidget);
      expect(tester.widget<FilledButton>(publishButton).onPressed, isNull);

      await tester.enterText(find.byType(TextField), 'Post de teste fase 1');
      await tester.pump();

      expect(tester.widget<FilledButton>(publishButton).onPressed, isNotNull);
    });

    testWidgets('Post detail shows fallback when post is invalid', (
      tester,
    ) async {
      final router = GoRouter(
        initialLocation: '/app/channels/ch-001/posts/invalido',
        routes: [
          GoRoute(
            path: '/app/channels/:id/posts/:postId',
            builder: (_, state) => ChannelPostDetailPage(
              channelId: state.pathParameters['id']!,
              postId: state.pathParameters['postId']!,
            ),
          ),
          GoRoute(
            path: '/app/channels/:id',
            builder: (_, _) => const Scaffold(body: Text('Tela Posts')),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(child: MaterialApp.router(routerConfig: router)),
      );
      await tester.pumpAndSettle();

      expect(find.text('Post nao encontrado'), findsOneWidget);
      expect(find.text('Escreva um comentario...'), findsNothing);
    });
  });
}

