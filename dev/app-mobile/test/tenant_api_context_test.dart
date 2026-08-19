import 'dart:convert';

import 'package:condohub_mobile/core/models/identity.dart';
import 'package:condohub_mobile/core/network/api_client.dart';
import 'package:condohub_mobile/core/network/api_exception.dart';
import 'package:condohub_mobile/core/network/tenant_api_context.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('tenantPath mounts tenant-scoped paths from current instanceKey', () {
    final context = _context();

    expect(context.tenantPath('/announcements'), '/demo/announcements');
  });

  test('tenantPath accepts paths with or without leading slash', () {
    final context = _context();

    expect(context.tenantPath('announcements'), '/demo/announcements');
    expect(context.tenantPath('/announcements'), '/demo/announcements');
  });

  test('tenantPath removes duplicated slashes', () {
    final context = _context();

    expect(
      context.tenantPath('///announcements//active///'),
      '/demo/announcements/active',
    );
  });

  test('tenantPath reads the latest session on each call', () {
    var state = _authenticatedState(instanceKey: 'alpha');
    final context = _context(readAuthState: () => state);

    expect(context.tenantPath('/announcements'), '/alpha/announcements');

    state = _authenticatedState(instanceKey: 'beta');

    expect(context.tenantPath('/announcements'), '/beta/announcements');
  });

  test('tenantPath encodes instanceKey as a path segment', () {
    final context = _context(
      readAuthState: () => _authenticatedState(instanceKey: 'demo condo'),
    );

    expect(context.tenantPath('/announcements'), '/demo%20condo/announcements');
  });

  test(
    'throws AUTH_SESSION_REQUIRED when there is no authenticated session',
    () {
      final context = _context(readAuthState: () => const AuthState());

      expect(
        () => context.tenantPath('/announcements'),
        throwsA(_apiExceptionCode('AUTH_SESSION_REQUIRED')),
      );
    },
  );

  test('throws AUTH_ACCESS_TOKEN_REQUIRED when accessToken is empty', () async {
    final context = _context(
      readAuthState: () => _authenticatedState(accessToken: ' '),
    );

    await expectLater(
      context.get('/announcements'),
      throwsA(_apiExceptionCode('AUTH_ACCESS_TOKEN_REQUIRED')),
    );
  });

  test('throws AUTH_INSTANCE_REQUIRED when instanceKey is empty', () async {
    final context = _context(
      readAuthState: () => _authenticatedState(instanceKey: ' '),
    );

    await expectLater(
      context.get('/announcements'),
      throwsA(_apiExceptionCode('AUTH_INSTANCE_REQUIRED')),
    );
  });

  test('get delegates to ApiClient with tenant path and accessToken', () async {
    late http.Request capturedRequest;
    final context = _context(
      handler: (request) async {
        capturedRequest = request;
        return http.Response(jsonEncode({'items': []}), 200);
      },
    );

    final response = await context.get('/announcements');

    expect(response, {'items': []});
    expect(capturedRequest.method, 'GET');
    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/demo/announcements',
    );
    expect(capturedRequest.headers['Authorization'], 'Bearer access-token');
  });

  test('post delegates with body and preserves custom headers', () async {
    late http.Request capturedRequest;
    final context = _context(
      handler: (request) async {
        capturedRequest = request;
        return http.Response(jsonEncode({'created': true}), 201);
      },
    );

    final response = await context.post(
      'tickets',
      body: {'title': 'Lampada queimada'},
      headers: {'X-Trace-Id': 'trace-123'},
    );

    expect(response, {'created': true});
    expect(capturedRequest.method, 'POST');
    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/demo/tickets',
    );
    expect(capturedRequest.headers['Authorization'], 'Bearer access-token');
    expect(capturedRequest.headers['X-Trace-Id'], 'trace-123');
    expect(jsonDecode(capturedRequest.body), {'title': 'Lampada queimada'});
  });

  test('delete delegates to ApiClient with tenant path', () async {
    late http.Request capturedRequest;
    final context = _context(
      handler: (request) async {
        capturedRequest = request;
        return http.Response('', 204);
      },
    );

    final response = await context.delete('/tickets/t-001');

    expect(response, isNull);
    expect(capturedRequest.method, 'DELETE');
    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/demo/tickets/t-001',
    );
    expect(capturedRequest.headers['Authorization'], 'Bearer access-token');
  });

  test('put and patch delegate to ApiClient with tenant path', () async {
    final capturedRequests = <http.Request>[];
    final context = _context(
      handler: (request) async {
        capturedRequests.add(request);
        return http.Response(jsonEncode({'ok': true}), 200);
      },
    );

    await context.put('/condo/profile', body: {'name': 'Residencial Demo'});
    await context.patch('/condo/profile', body: {'name': 'Residencial Novo'});

    expect(capturedRequests, hasLength(2));
    expect(capturedRequests.first.method, 'PUT');
    expect(
      capturedRequests.first.url.toString(),
      'http://localhost:3000/api/v1/demo/condo/profile',
    );
    expect(
      capturedRequests.first.headers['Authorization'],
      'Bearer access-token',
    );
    expect(jsonDecode(capturedRequests.first.body), {
      'name': 'Residencial Demo',
    });
    expect(capturedRequests.last.method, 'PATCH');
    expect(
      capturedRequests.last.url.toString(),
      'http://localhost:3000/api/v1/demo/condo/profile',
    );
    expect(
      capturedRequests.last.headers['Authorization'],
      'Bearer access-token',
    );
    expect(jsonDecode(capturedRequests.last.body), {
      'name': 'Residencial Novo',
    });
  });

  test('auto-refresh remains delegated to ApiClient', () async {
    final capturedRequests = <http.Request>[];
    var refreshCount = 0;
    final context = _context(
      refreshAccessToken: () async {
        refreshCount += 1;
        return 'new-access-token';
      },
      handler: (request) async {
        capturedRequests.add(request);
        if (capturedRequests.length == 1) {
          return http.Response(
            jsonEncode({'code': 'TOKEN_EXPIRED', 'message': 'Token expired'}),
            401,
          );
        }

        return http.Response(jsonEncode({'ok': true}), 200);
      },
    );

    final response = await context.get('/announcements');

    expect(response, {'ok': true});
    expect(refreshCount, 1);
    expect(capturedRequests, hasLength(2));
    expect(
      capturedRequests.first.headers['Authorization'],
      'Bearer access-token',
    );
    expect(
      capturedRequests.last.headers['Authorization'],
      'Bearer new-access-token',
    );
  });
}

TenantApiContext _context({
  AuthStateReader? readAuthState,
  AccessTokenRefresher? refreshAccessToken,
  Future<http.Response> Function(http.Request request)? handler,
}) {
  return TenantApiContext(
    apiClient: ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      refreshAccessToken: refreshAccessToken,
      httpClient: MockClient(
        handler ??
            (_) async {
              return http.Response(jsonEncode({'ok': true}), 200);
            },
      ),
    ),
    readAuthState: readAuthState ?? _authenticatedState,
  );
}

AuthState _authenticatedState({
  String instanceKey = 'demo',
  String accessToken = 'access-token',
}) {
  return AuthState(
    isAuthenticated: true,
    instanceKey: instanceKey,
    accessToken: accessToken,
    refreshToken: 'refresh-token',
    expiresInSec: 900,
    user: const User(
      id: 'user-001',
      name: 'Morador CondoHub',
      email: 'morador@condohub.local',
      role: 'MORADOR',
    ),
  );
}

Matcher _apiExceptionCode(String code) {
  return isA<ApiException>()
      .having((error) => error.statusCode, 'statusCode', 0)
      .having((error) => error.code, 'code', code);
}
