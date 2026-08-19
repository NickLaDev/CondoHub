import 'package:condohub_mobile/core/models/auth_session.dart';
import 'package:condohub_mobile/core/models/identity.dart';
import 'package:condohub_mobile/core/models/instance_selection.dart';
import 'package:condohub_mobile/core/models/invite_acceptance.dart';
import 'package:condohub_mobile/core/network/api_exception.dart';
import 'package:condohub_mobile/core/providers/providers.dart';
import 'package:condohub_mobile/core/repositories/auth_repository.dart';
import 'package:condohub_mobile/core/storage/auth_session_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Auth session persistence', () {
    test('saves session after login', () async {
      SharedPreferences.setMockInitialValues({});
      final preferences = await SharedPreferences.getInstance();
      final container = _container(preferences, _FakeAuthRepository());
      addTearDown(container.dispose);

      await container
          .read(authStateProvider.notifier)
          .login(email: 'morador@condohub.local', password: 'secret');

      expect(preferences.getString(AuthSessionStorage.instanceKeyKey), 'demo');
      expect(
        preferences.getString(AuthSessionStorage.accessTokenKey),
        'access-token',
      );
      expect(
        preferences.getString(AuthSessionStorage.refreshTokenKey),
        'refresh-token',
      );
      expect(preferences.getInt(AuthSessionStorage.expiresInSecKey), 900);
      expect(
        preferences.getString(AuthSessionStorage.userNameKey),
        'Morador CondoHub',
      );
      expect(
        preferences.getString(AuthSessionStorage.condoNameKey),
        'Residencial Teste',
      );
      expect(preferences.getString(AuthSessionStorage.unitNumberKey), '101');
    });

    test('restores saved session when auth state provider builds', () async {
      SharedPreferences.setMockInitialValues(_storedSession());
      final preferences = await SharedPreferences.getInstance();
      final container = _container(preferences, _FakeAuthRepository());
      addTearDown(container.dispose);

      final state = container.read(authStateProvider);

      expect(state.isAuthenticated, true);
      expect(state.instanceKey, 'demo');
      expect(state.accessToken, 'access-token');
      expect(state.refreshToken, 'refresh-token');
      expect(state.user?.email, 'morador@condohub.local');
      expect(state.condo?.name, 'Residencial Teste');
      expect(state.unit?.label, 'Bloco A - Apt 101');
    });

    test('logout clears saved session', () async {
      SharedPreferences.setMockInitialValues(_storedSession());
      final preferences = await SharedPreferences.getInstance();
      final repository = _FakeAuthRepository();
      final container = _container(preferences, repository);
      addTearDown(container.dispose);

      expect(container.read(authStateProvider).isAuthenticated, true);

      await container.read(authStateProvider.notifier).logout();

      expect(repository.logoutCalled, true);
      expect(container.read(authStateProvider).isAuthenticated, false);
      expect(preferences.containsKey(AuthSessionStorage.accessTokenKey), false);
      expect(
        preferences.containsKey(AuthSessionStorage.refreshTokenKey),
        false,
      );
    });

    test('restored session can be refreshed and persisted', () async {
      SharedPreferences.setMockInitialValues(_storedSession());
      final preferences = await SharedPreferences.getInstance();
      final repository = _RefreshSuccessAuthRepository();
      final container = _container(preferences, repository);
      addTearDown(container.dispose);

      final state = await container
          .read(authStateProvider.notifier)
          .refreshSession();

      expect(repository.receivedRefreshToken, 'refresh-token');
      expect(state.accessToken, 'new-access-token');
      expect(state.refreshToken, 'new-refresh-token');
      expect(state.instanceKey, 'demo');
      expect(
        preferences.getString(AuthSessionStorage.accessTokenKey),
        'new-access-token',
      );
      expect(
        preferences.getString(AuthSessionStorage.refreshTokenKey),
        'new-refresh-token',
      );
      expect(preferences.getString(AuthSessionStorage.instanceKeyKey), 'demo');
    });

    test('logout after refresh clears updated session', () async {
      SharedPreferences.setMockInitialValues(_storedSession());
      final preferences = await SharedPreferences.getInstance();
      final repository = _RefreshSuccessAuthRepository();
      final container = _container(preferences, repository);
      addTearDown(container.dispose);

      await container.read(authStateProvider.notifier).refreshSession();
      await container.read(authStateProvider.notifier).logout();

      expect(container.read(authStateProvider).isAuthenticated, false);
      expect(preferences.getKeys(), isEmpty);
      expect(repository.logoutCalled, true);
    });

    test('invalid refresh clears state and storage', () async {
      SharedPreferences.setMockInitialValues(_storedSession());
      final preferences = await SharedPreferences.getInstance();
      final repository = _RefreshFailureAuthRepository(
        ApiException(
          statusCode: 401,
          code: 'AUTH_INVALID',
          message: 'Invalid or expired token',
        ),
      );
      final container = _container(preferences, repository);
      addTearDown(container.dispose);

      await expectLater(
        container.read(authStateProvider.notifier).refreshSession(),
        throwsA(isA<ApiException>()),
      );

      final state = container.read(authStateProvider);

      expect(repository.logoutCalled, true);
      expect(state.isAuthenticated, false);
      expect(state.requiresInstanceSelection, false);
      expect(preferences.getKeys(), isEmpty);
    });

    test('network error during refresh keeps current session', () async {
      SharedPreferences.setMockInitialValues(_storedSession());
      final preferences = await SharedPreferences.getInstance();
      final repository = _RefreshFailureAuthRepository(
        ApiException(
          statusCode: 0,
          code: 'NETWORK_ERROR',
          message: 'Nao foi possivel conectar ao servidor',
        ),
      );
      final container = _container(preferences, repository);
      addTearDown(container.dispose);

      await expectLater(
        container.read(authStateProvider.notifier).refreshSession(),
        throwsA(isA<ApiException>()),
      );

      final state = container.read(authStateProvider);

      expect(repository.logoutCalled, false);
      expect(state.isAuthenticated, true);
      expect(state.accessToken, 'access-token');
      expect(
        preferences.getString(AuthSessionStorage.accessTokenKey),
        'access-token',
      );
      expect(
        preferences.getString(AuthSessionStorage.refreshTokenKey),
        'refresh-token',
      );
    });

    test('does not persist pending instance selection after login', () async {
      SharedPreferences.setMockInitialValues({});
      final preferences = await SharedPreferences.getInstance();
      final container = _container(
        preferences,
        _FakeSelectionRequiredAuthRepository(),
      );
      addTearDown(container.dispose);

      await container
          .read(authStateProvider.notifier)
          .login(email: 'morador@condohub.local', password: 'secret');

      final state = container.read(authStateProvider);

      expect(state.isAuthenticated, false);
      expect(state.requiresInstanceSelection, true);
      expect(state.pendingInstanceSelection?.selectionToken, 'selection-token');
      expect(preferences.getKeys(), isEmpty);
    });

    test(
      'login requiring instance selection clears any saved session',
      () async {
        SharedPreferences.setMockInitialValues(_storedSession());
        final preferences = await SharedPreferences.getInstance();
        final container = _container(
          preferences,
          _FakeSelectionRequiredAuthRepository(),
        );
        addTearDown(container.dispose);

        expect(container.read(authStateProvider).isAuthenticated, true);

        await container
            .read(authStateProvider.notifier)
            .login(email: 'outro@condohub.local', password: 'secret');

        final state = container.read(authStateProvider);

        expect(state.isAuthenticated, false);
        expect(state.requiresInstanceSelection, true);
        expect(preferences.getKeys(), isEmpty);
      },
    );

    test('pending instance selection does not survive app restart', () async {
      SharedPreferences.setMockInitialValues({});
      final preferences = await SharedPreferences.getInstance();
      final firstContainer = _container(
        preferences,
        _FakeSelectionRequiredAuthRepository(),
      );
      addTearDown(firstContainer.dispose);

      await firstContainer
          .read(authStateProvider.notifier)
          .login(email: 'morador@condohub.local', password: 'secret');

      expect(
        firstContainer.read(authStateProvider).requiresInstanceSelection,
        true,
      );

      final restartedContainer = _container(preferences, _FakeAuthRepository());
      addTearDown(restartedContainer.dispose);

      final restoredState = restartedContainer.read(authStateProvider);

      expect(restoredState.isAuthenticated, false);
      expect(restoredState.requiresInstanceSelection, false);
      expect(restoredState.pendingInstanceSelection, isNull);
    });

    test('logout clears pending instance selection and storage', () async {
      SharedPreferences.setMockInitialValues(_storedSession());
      final preferences = await SharedPreferences.getInstance();
      final repository = _FakeSelectionRequiredAuthRepository();
      final container = _container(preferences, repository);
      addTearDown(container.dispose);

      await container
          .read(authStateProvider.notifier)
          .login(email: 'morador@condohub.local', password: 'secret');

      expect(container.read(authStateProvider).requiresInstanceSelection, true);

      await container.read(authStateProvider.notifier).logout();

      final state = container.read(authStateProvider);

      expect(repository.logoutCalled, true);
      expect(state.isAuthenticated, false);
      expect(state.requiresInstanceSelection, false);
      expect(preferences.getKeys(), isEmpty);
    });

    test('saves final session after selecting instance', () async {
      SharedPreferences.setMockInitialValues({});
      final preferences = await SharedPreferences.getInstance();
      final repository = _FakeSelectionRequiredAuthRepository();
      final container = _container(preferences, repository);
      addTearDown(container.dispose);

      await container
          .read(authStateProvider.notifier)
          .login(email: 'morador@condohub.local', password: 'secret');

      await container
          .read(authStateProvider.notifier)
          .selectInstance(instanceId: 'instance-001');

      expect(repository.selectedInstanceId, 'instance-001');
      expect(
        container.read(authStateProvider).pendingInstanceSelection,
        isNull,
      );
      expect(preferences.getString(AuthSessionStorage.instanceKeyKey), 'demo');
      expect(
        preferences.getString(AuthSessionStorage.accessTokenKey),
        'access-token',
      );
      expect(
        preferences.getKeys().any(
          (key) => preferences.get(key) == 'selection-token',
        ),
        false,
      );
    });

    test(
      'switching users after logout does not reuse previous state',
      () async {
        SharedPreferences.setMockInitialValues({});
        final preferences = await SharedPreferences.getInstance();
        final repository = _SwitchingAuthRepository();
        final container = _container(preferences, repository);
        addTearDown(container.dispose);

        await container
            .read(authStateProvider.notifier)
            .login(email: 'ana@condohub.local', password: 'secret');

        expect(
          preferences.getString(AuthSessionStorage.instanceKeyKey),
          'alpha',
        );
        expect(
          preferences.getString(AuthSessionStorage.accessTokenKey),
          'access-ana',
        );

        await container.read(authStateProvider.notifier).logout();

        expect(preferences.getKeys(), isEmpty);

        await container
            .read(authStateProvider.notifier)
            .login(email: 'bruno@condohub.local', password: 'secret');

        final state = container.read(authStateProvider);

        expect(state.instanceKey, 'beta');
        expect(state.user?.email, 'bruno@condohub.local');
        expect(state.accessToken, 'access-bruno');
        expect(
          preferences.getString(AuthSessionStorage.instanceKeyKey),
          'beta',
        );
        expect(
          preferences.getString(AuthSessionStorage.accessTokenKey),
          'access-bruno',
        );
        expect(
          preferences.getString(AuthSessionStorage.userEmailKey),
          isNot('ana@condohub.local'),
        );
      },
    );

    test(
      'invalid saved session does not authenticate and is cleared',
      () async {
        SharedPreferences.setMockInitialValues({
          AuthSessionStorage.accessTokenKey: 'orphan-token',
        });
        final preferences = await SharedPreferences.getInstance();
        final container = _container(preferences, _FakeAuthRepository());
        addTearDown(container.dispose);

        final state = container.read(authStateProvider);
        await Future<void>.delayed(Duration.zero);

        expect(state.isAuthenticated, false);
        expect(
          preferences.containsKey(AuthSessionStorage.accessTokenKey),
          false,
        );
      },
    );
  });
}

ProviderContainer _container(
  SharedPreferences preferences,
  AuthRepository repository,
) {
  return ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(preferences),
      authRepositoryProvider.overrideWithValue(repository),
    ],
  );
}

Map<String, Object> _storedSession() {
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

class _FakeAuthRepository implements AuthRepository {
  AuthState _state = const AuthState();
  bool logoutCalled = false;

  @override
  AuthState get currentState => _state;

  @override
  Future<AuthState> login({
    required String email,
    required String password,
  }) async {
    _state = AuthState(
      isAuthenticated: true,
      instanceKey: 'demo',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresInSec: 900,
      user: User(
        id: 'user-001',
        name: 'Morador CondoHub',
        email: email,
        role: 'MORADOR',
      ),
      condo: Condo(
        id: 'condo-001',
        name: 'Residencial Teste',
        instanceKey: 'demo',
      ),
      unit: const Unit(id: 'unit-001', block: 'A', number: '101'),
    );
    return _state;
  }

  @override
  Future<AuthState> selectInstance({
    required String selectionToken,
    required String instanceId,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<AuthState> refreshSession({
    required AuthSession currentSession,
  }) async {
    _state = currentSession.toAuthState();
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
    logoutCalled = true;
    _state = const AuthState();
  }

  @override
  Future<void> requestPasswordReset(String email) {
    throw UnimplementedError();
  }

  @override
  Future<AuthState> acceptInvite(InviteAcceptanceInput input) {
    throw UnimplementedError();
  }
}

class _FakeSelectionRequiredAuthRepository implements AuthRepository {
  AuthState _state = const AuthState();
  String? selectedInstanceId;
  bool logoutCalled = false;

  @override
  AuthState get currentState => _state;

  @override
  Future<AuthState> login({
    required String email,
    required String password,
  }) async {
    _state = const AuthState(
      pendingInstanceSelection: PendingInstanceSelection(
        selectionToken: 'selection-token',
        options: [
          InstanceSelectionOption(
            instanceId: 'instance-001',
            instanceKey: 'demo',
            instanceName: 'Residencial Demo',
            userId: 'user-001',
            unitId: null,
            unitLabel: null,
            roles: ['MORADOR'],
          ),
        ],
      ),
    );
    return _state;
  }

  @override
  Future<AuthState> selectInstance({
    required String selectionToken,
    required String instanceId,
  }) async {
    selectedInstanceId = instanceId;
    _state = const AuthState(
      isAuthenticated: true,
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
      condo: Condo(
        id: 'condo-001',
        name: 'Residencial Teste',
        instanceKey: 'demo',
      ),
      unit: Unit(id: 'unit-001', block: 'A', number: '101'),
    );
    return _state;
  }

  @override
  Future<AuthState> refreshSession({
    required AuthSession currentSession,
  }) async {
    _state = currentSession.toAuthState();
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
    logoutCalled = true;
    _state = const AuthState();
  }

  @override
  Future<void> requestPasswordReset(String email) {
    throw UnimplementedError();
  }

  @override
  Future<AuthState> acceptInvite(InviteAcceptanceInput input) {
    throw UnimplementedError();
  }
}

class _SwitchingAuthRepository implements AuthRepository {
  AuthState _state = const AuthState();

  @override
  AuthState get currentState => _state;

  @override
  Future<AuthState> login({
    required String email,
    required String password,
  }) async {
    final isBruno = email.startsWith('bruno');
    final instanceKey = isBruno ? 'beta' : 'alpha';
    final tokenSuffix = isBruno ? 'bruno' : 'ana';

    _state = AuthState(
      isAuthenticated: true,
      instanceKey: instanceKey,
      accessToken: 'access-$tokenSuffix',
      refreshToken: 'refresh-$tokenSuffix',
      expiresInSec: 900,
      user: User(
        id: isBruno ? 'user-bruno' : 'user-ana',
        name: isBruno ? 'Bruno CondoHub' : 'Ana CondoHub',
        email: email,
        role: 'MORADOR',
      ),
      condo: Condo(
        id: isBruno ? 'condo-beta' : 'condo-alpha',
        name: isBruno ? 'Residencial Beta' : 'Residencial Alpha',
        instanceKey: instanceKey,
      ),
      unit: Unit(
        id: isBruno ? 'unit-beta' : 'unit-alpha',
        block: isBruno ? 'B' : 'A',
        number: isBruno ? '202' : '101',
      ),
    );
    return _state;
  }

  @override
  Future<AuthState> selectInstance({
    required String selectionToken,
    required String instanceId,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<AuthState> refreshSession({
    required AuthSession currentSession,
  }) async {
    _state = currentSession.toAuthState();
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
    throw UnimplementedError();
  }

  @override
  Future<AuthState> acceptInvite(InviteAcceptanceInput input) {
    throw UnimplementedError();
  }
}

class _RefreshSuccessAuthRepository implements AuthRepository {
  AuthState _state = const AuthState();
  String? receivedRefreshToken;
  bool logoutCalled = false;

  @override
  AuthState get currentState => _state;

  @override
  Future<AuthState> refreshSession({
    required AuthSession currentSession,
  }) async {
    receivedRefreshToken = currentSession.refreshToken;
    _state = AuthState(
      isAuthenticated: true,
      instanceKey: currentSession.instanceKey,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresInSec: 300,
      user: currentSession.user,
      condo: currentSession.condo,
      unit: currentSession.unit,
    );
    return _state;
  }

  @override
  Future<AuthState> login({required String email, required String password}) {
    throw UnimplementedError();
  }

  @override
  Future<AuthState> selectInstance({
    required String selectionToken,
    required String instanceId,
  }) {
    throw UnimplementedError();
  }

  @override
  void clearPendingInstanceSelection() {}

  @override
  Future<void> logout() async {
    logoutCalled = true;
    _state = const AuthState();
  }

  @override
  Future<void> requestPasswordReset(String email) {
    throw UnimplementedError();
  }

  @override
  Future<AuthState> acceptInvite(InviteAcceptanceInput input) {
    throw UnimplementedError();
  }
}

class _RefreshFailureAuthRepository implements AuthRepository {
  _RefreshFailureAuthRepository(this.error);

  final ApiException error;
  AuthState _state = const AuthState();
  bool logoutCalled = false;

  @override
  AuthState get currentState => _state;

  @override
  Future<AuthState> refreshSession({required AuthSession currentSession}) {
    _state = currentSession.toAuthState();
    throw error;
  }

  @override
  Future<AuthState> login({required String email, required String password}) {
    throw UnimplementedError();
  }

  @override
  Future<AuthState> selectInstance({
    required String selectionToken,
    required String instanceId,
  }) {
    throw UnimplementedError();
  }

  @override
  void clearPendingInstanceSelection() {}

  @override
  Future<void> logout() async {
    logoutCalled = true;
    _state = const AuthState();
  }

  @override
  Future<void> requestPasswordReset(String email) {
    throw UnimplementedError();
  }

  @override
  Future<AuthState> acceptInvite(InviteAcceptanceInput input) {
    throw UnimplementedError();
  }
}
