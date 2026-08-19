import 'package:condohub_mobile/app/app.dart';
import 'package:condohub_mobile/app/routes.dart';
import 'helpers/mock_auth_repository.dart';
import 'package:condohub_mobile/core/network/api_client.dart';
import 'package:condohub_mobile/core/providers/providers.dart';
import 'package:condohub_mobile/core/storage/auth_session_storage.dart';
import 'package:condohub_mobile/features/home/home_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

Finder _findAnyText(Iterable<String> values) {
  return find.byWidgetPredicate(
    (widget) => widget is Text && values.contains(widget.data),
    description: 'Text matching any of ${values.join(', ')}',
  );
}

Future<void> _openInviteFlow(WidgetTester tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(MockAuthRepository()),
      ],
      child: const CondoHubApp(),
    ),
  );
  await tester.pumpAndSettle();

  final inviteButton = find.byType(OutlinedButton);
  await tester.ensureVisible(inviteButton);
  await tester.tap(inviteButton);
  await tester.pumpAndSettle();
}

Map<String, Object> _storedAuthSession() {
  return {
    AuthSessionStorage.instanceKeyKey: 'demo',
    AuthSessionStorage.accessTokenKey: 'access-token',
    AuthSessionStorage.refreshTokenKey: 'refresh-token',
    AuthSessionStorage.expiresInSecKey: 900,
    AuthSessionStorage.userIdKey: 'user-001',
    AuthSessionStorage.userNameKey: 'Morador CondoHub',
    AuthSessionStorage.userEmailKey: 'morador@condohub.local',
    AuthSessionStorage.userRoleKey: 'MORADOR',
    AuthSessionStorage.condoIdKey: 'condo-001',
    AuthSessionStorage.condoNameKey: 'Residencial Teste',
    AuthSessionStorage.condoInstanceKeyKey: 'demo',
    AuthSessionStorage.unitIdKey: 'unit-001',
    AuthSessionStorage.unitBlockKey: 'A',
    AuthSessionStorage.unitNumberKey: '101',
  };
}

void main() {
  testWidgets('App renders login page', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: CondoHubApp()));
    await tester.pumpAndSettle();

    expect(find.text('CondoHub'), findsWidgets);
    expect(_findAnyText(['Entrar', 'Sign in']), findsOneWidget);
    expect(
      _findAnyText(['Tenho um convite', 'I have an invite']),
      findsOneWidget,
    );
    expect(find.byType(ElevatedButton), findsOneWidget);
    expect(find.byType(OutlinedButton), findsOneWidget);
  });

  testWidgets('Login requires email and password', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: CondoHubApp()));
    await tester.pumpAndSettle();

    final signInButton = find.byType(ElevatedButton);
    await tester.ensureVisible(signInButton);
    await tester.tap(signInButton);
    await tester.pump();

    expect(
      _findAnyText(['Informe o e-mail', 'Enter your email']),
      findsOneWidget,
    );
    expect(
      _findAnyText(['Informe a senha', 'Enter your password']),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('bottom-nav-visible')), findsNothing);
  });

  testWidgets('Login uses remote auth repository and navigates on success', (
    WidgetTester tester,
  ) async {
    final apiClient = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      httpClient: MockClient((request) async {
        expect(
          request.url.toString(),
          'http://localhost:3000/api/v1/auth/login',
        );
        return http.Response('''
          {
            "accessToken": "access-token",
            "refreshToken": "refresh-token",
            "expiresInSec": 900,
            "user": {
              "id": "user-001",
              "email": "morador@condohub.local",
              "name": "Morador CondoHub",
              "instanceKey": "demo",
              "roles": ["MORADOR"]
            }
          }
          ''', 200);
      }),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(apiClient)],
        child: const CondoHubApp(),
      ),
    );
    await tester.pumpAndSettle();

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'morador@condohub.local');
    await tester.enterText(fields.at(1), 'secret');

    final signInButton = find.byType(ElevatedButton);
    await tester.ensureVisible(signInButton);
    await tester.tap(signInButton);
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('bottom-nav-visible')), findsOneWidget);
    expect(find.byType(RefreshIndicator), findsOneWidget);
  });

  testWidgets('Login displays friendly API errors', (
    WidgetTester tester,
  ) async {
    final apiClient = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      httpClient: MockClient((request) async {
        return http.Response(
          '{"code":"AUTH_INVALID","message":"Invalid credentials"}',
          401,
        );
      }),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(apiClient)],
        child: const CondoHubApp(),
      ),
    );
    await tester.pumpAndSettle();

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'morador@condohub.local');
    await tester.enterText(fields.at(1), 'wrong');

    final signInButton = find.byType(ElevatedButton);
    await tester.ensureVisible(signInButton);
    await tester.tap(signInButton);
    await tester.pumpAndSettle();

    expect(_findAnyText(['E-mail ou senha inválidos.']), findsWidgets);
    expect(find.byKey(const ValueKey('bottom-nav-visible')), findsNothing);
  });

  testWidgets('Login navigates to instance selection and selects condo', (
    WidgetTester tester,
  ) async {
    final capturedRequests = <http.Request>[];
    final apiClient = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      httpClient: MockClient((request) async {
        capturedRequests.add(request);
        if (request.url.path.endsWith('/condo/profile')) {
          return http.Response('''
            {
              "id": "condo-001",
              "name": "Residencial Demo"
            }
            ''', 200);
        }

        if (request.url.path.endsWith('/dashboard/summary')) {
          return http.Response('''
            {
              "tickets": {"open": 0, "overdue": 0},
              "deliveries": {"pending": 0, "inDistribution": 0},
              "announcements": {"pendingAcks": 0}
            }
            ''', 200);
        }

        if (request.url.path.endsWith('/auth/select-instance')) {
          return http.Response('''
            {
              "accessToken": "access-token",
              "refreshToken": "refresh-token",
              "expiresInSec": 900,
              "user": {
                "id": "user-001",
                "email": "morador@condohub.local",
                "name": "Morador CondoHub",
                "instanceKey": "demo",
                "roles": ["MORADOR"]
              }
            }
            ''', 200);
        }

        return http.Response('''
          {
            "requiresInstanceSelection": true,
            "selectionToken": "selection-token",
            "options": [
              {
                "instanceId": "instance-001",
                "instanceKey": "demo",
                "instanceName": "Residencial Demo",
                "userId": "user-001",
                "unitId": null,
                "unitLabel": null,
                "roles": ["MORADOR"]
              }
            ]
          }
          ''', 200);
      }),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(apiClient)],
        child: const CondoHubApp(),
      ),
    );
    await tester.pumpAndSettle();

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'morador@condohub.local');
    await tester.enterText(fields.at(1), 'secret');

    final signInButton = find.byType(ElevatedButton);
    await tester.ensureVisible(signInButton);
    await tester.tap(signInButton);
    await tester.pumpAndSettle();

    expect(
      _findAnyText(['Escolha seu condomínio', 'Choose your condo']),
      findsWidgets,
    );
    expect(find.text('Residencial Demo'), findsOneWidget);
    expect(find.byKey(const ValueKey('bottom-nav-visible')), findsNothing);

    await tester.tap(find.text('Residencial Demo'));
    await tester.pumpAndSettle();

    final authRequests = capturedRequests
        .where((request) => request.url.path.contains('/auth/'))
        .toList();

    expect(authRequests, hasLength(2));
    expect(
      authRequests.last.url.toString(),
      'http://localhost:3000/api/v1/auth/select-instance',
    );
    expect(authRequests.last.body, contains('"selectionToken"'));
    expect(authRequests.last.body, contains('"selection-token"'));
    expect(authRequests.last.body, contains('"instance-001"'));
    expect(find.byKey(const ValueKey('bottom-nav-visible')), findsOneWidget);
  });

  testWidgets('Restored auth session opens the authenticated shell', (
    WidgetTester tester,
  ) async {
    SharedPreferences.setMockInitialValues(_storedAuthSession());
    final preferences = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(preferences)],
        child: const CondoHubApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('bottom-nav-visible')), findsOneWidget);
    expect(_findAnyText(['Entrar', 'Sign in']), findsNothing);
  });

  testWidgets('/select-condo without pending selection redirects to login', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: CondoHubApp()));
    await tester.pumpAndSettle();

    final context = tester.element(find.byType(TextFormField).first);
    GoRouter.of(context).go(AppRoutes.instanceSelection);
    await tester.pumpAndSettle();

    expect(_findAnyText(['Entrar', 'Sign in']), findsOneWidget);
    expect(
      _findAnyText(['Escolha seu condomínio', 'Choose your condo']),
      findsNothing,
    );
    expect(find.byKey(const ValueKey('bottom-nav-visible')), findsNothing);
  });

  testWidgets('Expired selection token clears pending flow and returns login', (
    WidgetTester tester,
  ) async {
    final apiClient = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      httpClient: MockClient((request) async {
        if (request.url.path.endsWith('/auth/select-instance')) {
          return http.Response(
            '{"code":"INVALID_SELECTION_TOKEN","message":"expired"}',
            401,
          );
        }

        return http.Response('''
          {
            "requiresInstanceSelection": true,
            "selectionToken": "selection-token",
            "options": [
              {
                "instanceId": "instance-001",
                "instanceKey": "demo",
                "instanceName": "Residencial Demo",
                "userId": "user-001",
                "unitId": null,
                "unitLabel": null,
                "roles": ["MORADOR"]
              }
            ]
          }
          ''', 200);
      }),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(apiClient)],
        child: const CondoHubApp(),
      ),
    );
    await tester.pumpAndSettle();

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'morador@condohub.local');
    await tester.enterText(fields.at(1), 'secret');

    final signInButton = find.byType(ElevatedButton);
    await tester.ensureVisible(signInButton);
    await tester.tap(signInButton);
    await tester.pumpAndSettle();

    expect(find.text('Residencial Demo'), findsOneWidget);

    await tester.tap(find.text('Residencial Demo'));
    await tester.pumpAndSettle();

    expect(_findAnyText(['Entrar', 'Sign in']), findsOneWidget);
    expect(
      _findAnyText([
        'Sua seleção expirou. Faça login novamente para continuar.',
        'Your selection expired. Sign in again to continue.',
      ]),
      findsWidgets,
    );
    expect(find.byKey(const ValueKey('bottom-nav-visible')), findsNothing);
  });

  testWidgets('Invite flow advances to registration after a valid token', (
    WidgetTester tester,
  ) async {
    await _openInviteFlow(tester);

    expect(find.byKey(const ValueKey('invite-step-token')), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).first, 'ABC123');
    await tester.tap(find.byKey(const ValueKey('invite-continue-button')));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('invite-step-registration')),
      findsOneWidget,
    );
    expect(_findAnyText(['Nome completo', 'Full name']), findsOneWidget);
    expect(
      _findAnyText(['Concluir cadastro', 'Finish registration']),
      findsOneWidget,
    );
  });

  testWidgets('Invite flow authenticates the resident with registration data', (
    WidgetTester tester,
  ) async {
    await _openInviteFlow(tester);

    await tester.enterText(find.byType(TextFormField).first, 'ABC123');
    await tester.tap(find.byKey(const ValueKey('invite-continue-button')));
    await tester.pumpAndSettle();

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'Maria Oliveira');
    await tester.enterText(fields.at(1), 'maria@condohub.com');
    await tester.enterText(fields.at(2), '(11) 99999-9999');
    await tester.enterText(fields.at(3), '1234');
    await tester.enterText(fields.at(4), '1234');

    final submitButton = find.byKey(const ValueKey('invite-submit-button'));
    await tester.ensureVisible(submitButton);
    await tester.tap(submitButton);
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('bottom-nav-visible')), findsOneWidget);

    expect(find.textContaining('Maria Oliveira'), findsWidgets);
  });

  testWidgets('Home fallback strings follow selected locale', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          locale: Locale('en', 'US'),
          supportedLocales: [Locale('pt', 'BR'), Locale('en', 'US')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          home: HomePage(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Flower Residence'), findsOneWidget);
    expect(find.textContaining('Tower A - Apt 101'), findsWidgets);
    expect(
      _findAnyText(['Quick access', 'Latest announcements']),
      findsWidgets,
    );
  });
}
