import '../models/profile_snapshot.dart';
import '../network/tenant_api_context.dart';

class RemoteProfileRepository {
  RemoteProfileRepository({required TenantApiContext tenantApiContext})
      : _ctx = tenantApiContext;

  final TenantApiContext _ctx;

  Future<ProfileSnapshot> loadProfile() async {
    final me = await _ctx.get('/auth/me');
    final meMap = me as Map<String, dynamic>;
    final roles = meMap['roles'] is List
        ? (meMap['roles'] as List).map((e) => e.toString()).toList()
        : const <String>[];

    return ProfileSnapshot(
      userId: meMap['userId']?.toString() ?? '',
      roles: roles,
      instanceId: meMap['instanceId']?.toString() ?? '',
      unitId: meMap['unitId']?.toString(),
      condoName: '',
    );
  }
}
