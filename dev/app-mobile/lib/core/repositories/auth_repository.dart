import '../models/auth_session.dart';
import '../models/identity.dart';
import '../models/invite_acceptance.dart';

abstract class AuthRepository {
  Future<AuthState> login({required String email, required String password});
  Future<AuthState> selectInstance({
    required String selectionToken,
    required String instanceId,
  });
  Future<AuthState> refreshSession({required AuthSession currentSession});
  void clearPendingInstanceSelection();
  Future<void> logout();
  Future<void> requestPasswordReset(String email);
  Future<AuthState> acceptInvite(InviteAcceptanceInput input);
  AuthState get currentState;
}
