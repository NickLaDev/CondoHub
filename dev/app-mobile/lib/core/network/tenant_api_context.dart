import '../models/identity.dart';
import 'api_client.dart';
import 'api_exception.dart';

typedef AuthStateReader = AuthState Function();

class TenantApiContext {
  const TenantApiContext({
    required ApiClient apiClient,
    required AuthStateReader readAuthState,
  }) : _apiClient = apiClient,
       _readAuthState = readAuthState;

  final ApiClient _apiClient;
  final AuthStateReader _readAuthState;

  String tenantPath(String path) {
    final session = _requireTenantSession();
    return _tenantPathFor(session.instanceKey, path);
  }

  Future<Object?> get(String path, {Map<String, String>? headers}) async {
    final session = _requireTenantSession();
    return _apiClient.get(
      _tenantPathFor(session.instanceKey, path),
      headers: headers,
      accessToken: session.accessToken,
    );
  }

  Future<Object?> post(
    String path, {
    Object? body,
    Map<String, String>? headers,
  }) async {
    final session = _requireTenantSession();
    return _apiClient.post(
      _tenantPathFor(session.instanceKey, path),
      body: body,
      headers: headers,
      accessToken: session.accessToken,
    );
  }

  Future<Object?> put(
    String path, {
    Object? body,
    Map<String, String>? headers,
  }) async {
    final session = _requireTenantSession();
    return _apiClient.put(
      _tenantPathFor(session.instanceKey, path),
      body: body,
      headers: headers,
      accessToken: session.accessToken,
    );
  }

  Future<Object?> patch(
    String path, {
    Object? body,
    Map<String, String>? headers,
  }) async {
    final session = _requireTenantSession();
    return _apiClient.patch(
      _tenantPathFor(session.instanceKey, path),
      body: body,
      headers: headers,
      accessToken: session.accessToken,
    );
  }

  Future<Object?> delete(
    String path, {
    Object? body,
    Map<String, String>? headers,
  }) async {
    final session = _requireTenantSession();
    return _apiClient.delete(
      _tenantPathFor(session.instanceKey, path),
      body: body,
      headers: headers,
      accessToken: session.accessToken,
    );
  }

  _TenantSession _requireTenantSession() {
    final state = _readAuthState();
    if (!state.isAuthenticated) {
      throw const ApiException(
        statusCode: 0,
        code: 'AUTH_SESSION_REQUIRED',
        message: 'Sessao autenticada obrigatoria',
      );
    }

    final accessToken = state.accessToken;
    if (accessToken == null || accessToken.trim().isEmpty) {
      throw const ApiException(
        statusCode: 0,
        code: 'AUTH_ACCESS_TOKEN_REQUIRED',
        message: 'Token de acesso obrigatorio',
      );
    }

    final instanceKey = state.instanceKey;
    if (instanceKey == null || instanceKey.trim().isEmpty) {
      throw const ApiException(
        statusCode: 0,
        code: 'AUTH_INSTANCE_REQUIRED',
        message: 'InstanceKey obrigatorio',
      );
    }

    return _TenantSession(
      accessToken: accessToken.trim(),
      instanceKey: instanceKey.trim(),
    );
  }

  String _tenantPathFor(String instanceKey, String path) {
    final encodedInstanceKey = Uri.encodeComponent(instanceKey);
    final relativePath = path
        .trim()
        .replaceAll(RegExp(r'/+'), '/')
        .replaceFirst(RegExp(r'^/+'), '')
        .replaceFirst(RegExp(r'/+$'), '');

    if (relativePath.isEmpty) return '/$encodedInstanceKey';
    return '/$encodedInstanceKey/$relativePath';
  }
}

class _TenantSession {
  const _TenantSession({required this.accessToken, required this.instanceKey});

  final String accessToken;
  final String instanceKey;
}
