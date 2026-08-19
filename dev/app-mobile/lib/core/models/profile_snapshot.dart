import 'identity.dart';

class ProfileSnapshot {
  const ProfileSnapshot({
    required this.userId,
    required this.roles,
    required this.instanceId,
    required this.condoName,
    this.unitId,
    this.userName,
    this.userEmail,
  });

  final String userId;
  final List<String> roles;
  final String instanceId;
  final String condoName;
  final String? unitId;
  final String? userName;
  final String? userEmail;

  ProfileSnapshot copyWith({
    String? userId,
    List<String>? roles,
    String? instanceId,
    String? condoName,
    String? unitId,
    String? userName,
    String? userEmail,
  }) {
    return ProfileSnapshot(
      userId: userId ?? this.userId,
      roles: roles ?? this.roles,
      instanceId: instanceId ?? this.instanceId,
      condoName: condoName ?? this.condoName,
      unitId: unitId ?? this.unitId,
      userName: userName ?? this.userName,
      userEmail: userEmail ?? this.userEmail,
    );
  }

  factory ProfileSnapshot.fromAuthState(AuthState state) {
    return ProfileSnapshot(
      userId: state.user?.id ?? 'local-user',
      roles: state.user == null ? const [] : [state.user!.role],
      instanceId: state.condo?.id ?? 'local-instance',
      condoName: state.condo?.name ?? 'Condomínio',
      unitId: state.unit?.id,
      userName: state.user?.name,
      userEmail: state.user?.email,
    );
  }
}
