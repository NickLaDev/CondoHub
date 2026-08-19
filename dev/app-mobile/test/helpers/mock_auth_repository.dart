import 'package:condohub_mobile/core/models/auth_session.dart';
import 'package:condohub_mobile/core/models/identity.dart';
import 'package:condohub_mobile/core/models/invite_acceptance.dart';
import 'package:condohub_mobile/core/repositories/auth_repository.dart';

class MockAuthRepository implements AuthRepository {
  AuthState _state = const AuthState();

  static final _user = User(
    id: 'u-001',
    name: 'Nicolas Laredo',
    email: 'nicolas@condohub.com',
    role: 'MORADOR',
  );
  static final _condo = Condo(
    id: 'c-001',
    name: 'Residencial das Flores',
    instanceKey: 'demo',
  );
  static final _unit = Unit(id: 'unit-001', block: 'A', number: '101');

  @override
  AuthState get currentState => _state;

  @override
  Future<AuthState> login({required String email, required String password}) async {
    await Future.delayed(const Duration(milliseconds: 800));
    if (email.isEmpty || password.isEmpty) throw Exception('Email e senha são obrigatórios');
    _state = AuthState(
      isAuthenticated: true,
      instanceKey: _condo.instanceKey,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresInSec: 900,
      user: _user,
      condo: _condo,
      unit: _unit,
    );
    return _state;
  }

  @override
  Future<AuthState> selectInstance({required String selectionToken, required String instanceId}) async => _state;

  @override
  Future<AuthState> refreshSession({required AuthSession currentSession}) async {
    _state = currentSession.toAuthState();
    return _state;
  }

  @override
  void clearPendingInstanceSelection() {
    if (_state.requiresInstanceSelection) _state = const AuthState();
  }

  @override
  Future<void> logout() async {
    await Future.delayed(const Duration(milliseconds: 300));
    _state = const AuthState();
  }

  @override
  Future<void> requestPasswordReset(String email) async {
    await Future.delayed(const Duration(milliseconds: 500));
  }

  @override
  Future<AuthState> acceptInvite(InviteAcceptanceInput input) async {
    await Future.delayed(const Duration(milliseconds: 800));
    if (input.token.trim().length < 4) throw Exception('Código inválido');
    if (input.name.trim().isEmpty) throw Exception('Nome completo é obrigatório');
    if (input.password.length < 4) throw Exception('Senha inválida');
    final email = input.email?.trim();
    _state = AuthState(
      isAuthenticated: true,
      user: User(
        id: _user.id,
        name: input.name.trim(),
        email: (email == null || email.isEmpty) ? _user.email : email,
        role: _user.role,
      ),
      condo: _condo,
      unit: _unit,
    );
    return _state;
  }
}
