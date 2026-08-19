import '../models/auth_session.dart';
import '../models/identity.dart';
import '../models/invite_acceptance.dart';
import '../models/instance_selection.dart';
import '../network/api_client.dart';
import '../network/api_exception.dart';
import 'auth_repository.dart';

class RemoteAuthRepository implements AuthRepository {
  RemoteAuthRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;
  AuthState _state = const AuthState();

  @override
  AuthState get currentState => _state;

  @override
  Future<AuthState> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post(
      '/auth/login',
      body: {'email': email.trim(), 'password': password},
    );

    if (response is! Map<String, dynamic>) {
      throw ApiException(
        statusCode: 0,
        code: 'AUTH_RESPONSE_INVALID',
        message: 'Resposta de login invalida',
        body: response,
      );
    }

    if (response['requiresInstanceSelection'] == true) {
      _state = AuthState(
        pendingInstanceSelection: PendingInstanceSelection.fromApiResponse(
          data: response,
        ),
      );
      return _state;
    }

    final session = AuthSession.fromApiResponse(data: response);
    _state = session.toAuthState();
    return _state;
  }

  @override
  Future<AuthState> selectInstance({
    required String selectionToken,
    required String instanceId,
  }) async {
    final response = await _apiClient.post(
      '/auth/select-instance',
      body: {'selectionToken': selectionToken, 'instanceId': instanceId},
    );

    if (response is! Map<String, dynamic>) {
      throw ApiException(
        statusCode: 0,
        code: 'AUTH_RESPONSE_INVALID',
        message: 'Resposta de seleção inválida',
        body: response,
      );
    }

    final session = AuthSession.fromApiResponse(data: response);
    _state = session.toAuthState();
    return _state;
  }

  @override
  Future<AuthState> refreshSession({
    required AuthSession currentSession,
  }) async {
    final response = await _apiClient.post(
      '/auth/refresh',
      body: {'refreshToken': currentSession.refreshToken},
    );

    if (response is! Map<String, dynamic>) {
      throw ApiException(
        statusCode: 0,
        code: 'AUTH_RESPONSE_INVALID',
        message: 'Resposta de refresh inválida',
        body: response,
      );
    }

    final session = AuthSession.fromApiResponse(
      data: response,
      fallbackInstanceKey: currentSession.instanceKey,
    );
    _state = session.toAuthState();
    return _state;
  }

  @override
  void clearPendingInstanceSelection() {
    if (_state.requiresInstanceSelection) {
      _state = const AuthState();
    }
  }

  @override
  Future<void> logout() async {
    _state = const AuthState();
  }

  @override
  Future<void> requestPasswordReset(String email) {
    throw UnimplementedError('Password reset remoto ainda nao implementado');
  }

  @override
  Future<AuthState> acceptInvite(InviteAcceptanceInput input) {
    throw UnimplementedError('Invite remoto ainda nao implementado');
  }
}
