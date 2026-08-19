import '../models/announcement.dart';
import '../network/api_exception.dart';
import '../network/tenant_api_context.dart';

class AnnouncementsApi {
  AnnouncementsApi({required TenantApiContext tenantApiContext})
    : _tenantApiContext = tenantApiContext;

  final TenantApiContext _tenantApiContext;

  Future<List<Announcement>> fetchAnnouncements() async {
    final response = await _tenantApiContext.get('/announcements');
    final items = _extractItems(response);
    return items
        .map((item) => Announcement.fromJson(item))
        .toList(growable: false);
  }

  Future<Announcement> fetchAnnouncementById(String id) async {
    final response = await _tenantApiContext.get('/announcements/$id');
    final data = _asJsonMap(response, errorCode: 'ANNOUNCEMENT_DETAIL_INVALID');
    return Announcement.fromJson(data);
  }

  Future<void> acknowledgeAnnouncement(String id) async {
    await _tenantApiContext.post('/announcements/$id/ack');
  }

  List<Map<String, dynamic>> _extractItems(Object? response) {
    if (response is List) {
      return response.whereType<Map<String, dynamic>>().toList(growable: false);
    }

    if (response is Map<String, dynamic>) {
      final items = response['items'];
      if (items is List) {
        return items
            .whereType<Map<String, dynamic>>()
            .toList(growable: false);
      }
    }

    throw ApiException(
      statusCode: 0,
      code: 'ANNOUNCEMENTS_RESPONSE_INVALID',
      message: 'Resposta invalida ao carregar o mural',
      body: response,
    );
  }

  Map<String, dynamic> _asJsonMap(
    Object? response, {
    required String errorCode,
  }) {
    if (response is Map<String, dynamic>) {
      return response;
    }

    throw ApiException(
      statusCode: 0,
      code: errorCode,
      message: 'Resposta invalida do comunicado',
      body: response,
    );
  }
}
