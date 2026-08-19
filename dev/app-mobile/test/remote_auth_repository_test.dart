import 'dart:convert';

import 'package:condohub_mobile/core/models/auth_session.dart';
import 'package:condohub_mobile/core/models/identity.dart';
import 'package:condohub_mobile/core/network/api_client.dart';
import 'package:condohub_mobile/core/repositories/remote_auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('login posts credentials to global path and maps auth state', () async {
    late http.Request capturedRequest;
    final repository = RemoteAuthRepository(
      apiClient: ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        httpClient: MockClient((request) async {
          capturedRequest = request;
          return http.Response(
            jsonEncode({
              'accessToken': 'access-token',
              'refreshToken': 'refresh-token',
              'expiresInSec': 900,
              'user': {
                'id': 'user-001',
                'email': 'morador@condohub.local',
                'name': 'Morador CondoHub',
                'roles': ['MORADOR'],
                'instanceId': 'instance-001',
                'instanceKey': 'demo',
                'unitId': 'unit-001',
              },
            }),
            200,
          );
        }),
      ),
    );

    final state = await repository.login(
      email: 'morador@condohub.local',
      password: 'secret',
    );

    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/auth/login',
    );
    expect(jsonDecode(capturedRequest.body), {
      'email': 'morador@condohub.local',
      'password': 'secret',
    });
    expect(state.isAuthenticated, true);
    expect(state.instanceKey, 'demo');
    expect(state.accessToken, 'access-token');
    expect(state.refreshToken, 'refresh-token');
    expect(state.expiresInSec, 900);
    expect(state.user?.name, 'Morador CondoHub');
    expect(state.user?.role, 'MORADOR');
    expect(state.condo, isNull);
    expect(state.unit, isNull);
    expect(repository.currentState.isAuthenticated, true);
  });

  test('login falls back to email when user name is absent', () async {
    final repository = RemoteAuthRepository(
      apiClient: ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        httpClient: MockClient((request) async {
          return http.Response(
            jsonEncode({
              'accessToken': 'access-token',
              'refreshToken': 'refresh-token',
              'expiresInSec': 900,
              'user': {
                'id': 'user-001',
                'email': 'morador@condohub.local',
                'instanceKey': 'demo',
                'role': 'MORADOR',
              },
            }),
            200,
          );
        }),
      ),
    );

    final state = await repository.login(
      email: 'morador@condohub.local',
      password: 'secret',
    );

    expect(state.user?.name, 'morador@condohub.local');
  });

  test(
    'login maps pending instance selection without authenticating',
    () async {
      final repository = RemoteAuthRepository(
        apiClient: ApiClient(
          baseUrl: 'http://localhost:3000/api/v1',
          httpClient: MockClient((request) async {
            return http.Response(
              jsonEncode({
                'requiresInstanceSelection': true,
                'selectionToken': 'selection-token',
                'options': [
                  {
                    'instanceId': 'instance-001',
                    'instanceKey': 'demo',
                    'instanceName': 'Residencial Demo',
                    'userId': 'user-001',
                    'unitId': null,
                    'unitLabel': null,
                    'roles': ['MORADOR'],
                  },
                ],
              }),
              200,
            );
          }),
        ),
      );

      final state = await repository.login(
        email: 'morador@condohub.local',
        password: 'secret',
      );

      expect(repository.currentState.isAuthenticated, false);
      expect(state.requiresInstanceSelection, true);
      expect(state.pendingInstanceSelection?.selectionToken, 'selection-token');
      expect(state.pendingInstanceSelection?.options, hasLength(1));
      expect(
        state.pendingInstanceSelection?.options.first.instanceName,
        'Residencial Demo',
      );
      expect(state.pendingInstanceSelection?.options.first.roles, ['MORADOR']);
    },
  );

  test('selectInstance posts selected instance and maps auth state', () async {
    final capturedRequests = <http.Request>[];
    final repository = RemoteAuthRepository(
      apiClient: ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        httpClient: MockClient((request) async {
          capturedRequests.add(request);
          return http.Response(
            jsonEncode({
              'accessToken': 'access-token',
              'refreshToken': 'refresh-token',
              'expiresInSec': 900,
              'user': {
                'id': 'user-001',
                'email': 'morador@condohub.local',
                'name': 'Morador CondoHub',
                'roles': ['MORADOR'],
                'instanceId': 'instance-001',
                'instanceKey': 'demo',
                'unitId': 'unit-001',
              },
            }),
            200,
          );
        }),
      ),
    );

    final state = await repository.selectInstance(
      selectionToken: 'selection-token',
      instanceId: 'instance-001',
    );

    expect(
      capturedRequests.single.url.toString(),
      'http://localhost:3000/api/v1/auth/select-instance',
    );
    expect(jsonDecode(capturedRequests.single.body), {
      'selectionToken': 'selection-token',
      'instanceId': 'instance-001',
    });
    expect(state.isAuthenticated, true);
    expect(state.instanceKey, 'demo');
    expect(repository.currentState.isAuthenticated, true);
  });

  test('refreshSession posts refresh token and maps rotated session', () async {
    late http.Request capturedRequest;
    final repository = RemoteAuthRepository(
      apiClient: ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        httpClient: MockClient((request) async {
          capturedRequest = request;
          return http.Response(
            jsonEncode({
              'accessToken': 'new-access-token',
              'refreshToken': 'new-refresh-token',
              'expiresInSec': 300,
              'user': {
                'id': 'user-001',
                'email': 'morador@condohub.local',
                'name': 'Morador CondoHub',
                'roles': ['MORADOR'],
                'instanceId': 'instance-001',
                'instanceKey': 'demo-new',
                'unitId': 'unit-001',
              },
            }),
            200,
          );
        }),
      ),
    );

    final state = await repository.refreshSession(
      currentSession: _currentSession(),
    );

    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/auth/refresh',
    );
    expect(jsonDecode(capturedRequest.body), {'refreshToken': 'refresh-token'});
    expect(state.isAuthenticated, true);
    expect(state.accessToken, 'new-access-token');
    expect(state.refreshToken, 'new-refresh-token');
    expect(state.expiresInSec, 300);
    expect(state.instanceKey, 'demo-new');
    expect(repository.currentState.accessToken, 'new-access-token');
  });

  test('refreshSession preserves instanceKey when backend omits it', () async {
    final repository = RemoteAuthRepository(
      apiClient: ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        httpClient: MockClient((request) async {
          return http.Response(
            jsonEncode({
              'accessToken': 'new-access-token',
              'refreshToken': 'new-refresh-token',
              'expiresInSec': 300,
              'user': {
                'id': 'user-001',
                'email': 'morador@condohub.local',
                'name': 'Morador CondoHub',
                'roles': ['MORADOR'],
                'instanceId': 'instance-001',
                'unitId': 'unit-001',
              },
            }),
            200,
          );
        }),
      ),
    );

    final state = await repository.refreshSession(
      currentSession: _currentSession(),
    );

    expect(state.accessToken, 'new-access-token');
    expect(state.refreshToken, 'new-refresh-token');
    expect(state.instanceKey, 'demo');
  });

  test('logout clears only local in-memory state', () async {
    final repository = RemoteAuthRepository(
      apiClient: ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        httpClient: MockClient((request) async {
          return http.Response(
            jsonEncode({
              'accessToken': 'access-token',
              'refreshToken': 'refresh-token',
              'expiresInSec': 900,
              'user': {
                'id': 'user-001',
                'email': 'morador@condohub.local',
                'instanceKey': 'demo',
                'role': 'MORADOR',
              },
            }),
            200,
          );
        }),
      ),
    );

    await repository.login(email: 'morador@condohub.local', password: 'secret');
    await repository.logout();

    expect(repository.currentState.isAuthenticated, false);
    expect(repository.currentState.accessToken, isNull);
  });
}

AuthSession _currentSession() {
  return const AuthSession(
    instanceKey: 'demo',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresInSec: 900,
    user: User(
      id: 'user-001',
      name: 'Morador CondoHub',
      email: 'morador@condohub.local',
      role: 'MORADOR',
    ),
  );
}
