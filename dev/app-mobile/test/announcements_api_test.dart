import 'dart:convert';

import 'package:condohub_mobile/core/api/announcements_api.dart';
import 'package:condohub_mobile/core/models/identity.dart';
import 'package:condohub_mobile/core/network/api_client.dart';
import 'package:condohub_mobile/core/network/tenant_api_context.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('fetchAnnouncements parses paginated response and tenant path', () async {
    late http.Request capturedRequest;
    final api = _buildApi((request) async {
      capturedRequest = request;
      return http.Response(
        jsonEncode({
          'items': [
            {
              'id': 'announcement-001',
              'title': 'Manutencao programada',
              'summary': 'A agua sera desligada por 2 horas.',
              'body': '<p>A agua sera desligada por 2 horas.</p>',
              'createdAt': '2024-01-01T12:00:00Z',
              'read': false,
              'attachments': [
                {'url': 'https://cdn.condohub.local/manual.pdf', 'name': 'manual.pdf'},
              ],
            },
          ],
          'total': 1,
          'page': 1,
          'limit': 20,
        }),
        200,
      );
    });

    final items = await api.fetchAnnouncements();

    expect(items, hasLength(1));
    expect(items.first.id, 'announcement-001');
    expect(items.first.summary, 'A agua sera desligada por 2 horas.');
    expect(items.first.read, false);
    expect(items.first.attachments.single.name, 'manual.pdf');
    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/demo/announcements',
    );
    expect(capturedRequest.headers['Authorization'], 'Bearer access-token');
  });

  test('fetchAnnouncements also accepts raw array responses', () async {
    final api = _buildApi((_) async {
      return http.Response(
        jsonEncode([
          {
            'id': 'announcement-002',
            'title': 'Reuniao',
            'summary': 'Assembleia na quinta-feira.',
            'body': 'Assembleia na quinta-feira.',
            'createdAt': '2024-02-01T19:30:00Z',
            'read': true,
            'attachments': [],
          },
        ]),
        200,
      );
    });

    final items = await api.fetchAnnouncements();

    expect(items, hasLength(1));
    expect(items.first.id, 'announcement-002');
    expect(items.first.read, true);
  });

  test('fetchAnnouncementById hits detail endpoint and parses body', () async {
    late http.Request capturedRequest;
    final api = _buildApi((request) async {
      capturedRequest = request;
      return http.Response(
        jsonEncode({
          'id': 'announcement-003',
          'title': 'Nova regra da piscina',
          'summary': 'Veja os horarios atualizados.',
          'body': '<p>Veja os horarios atualizados.</p>',
          'createdAt': '2024-03-10T09:00:00Z',
          'read': false,
          'attachments': [],
        }),
        200,
      );
    });

    final item = await api.fetchAnnouncementById('announcement-003');

    expect(item.title, 'Nova regra da piscina');
    expect(item.body, '<p>Veja os horarios atualizados.</p>');
    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/demo/announcements/announcement-003',
    );
  });

  test('acknowledgeAnnouncement posts to ack endpoint', () async {
    late http.Request capturedRequest;
    final api = _buildApi((request) async {
      capturedRequest = request;
      return http.Response('', 204);
    });

    await api.acknowledgeAnnouncement('announcement-004');

    expect(capturedRequest.method, 'POST');
    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/demo/announcements/announcement-004/ack',
    );
    expect(capturedRequest.headers['Authorization'], 'Bearer access-token');
  });
}

AnnouncementsApi _buildApi(
  Future<http.Response> Function(http.Request request) handler,
) {
  return AnnouncementsApi(
    tenantApiContext: TenantApiContext(
      apiClient: ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        httpClient: MockClient(handler),
      ),
      readAuthState: () => const AuthState(
        isAuthenticated: true,
        instanceKey: 'demo',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      ),
    ),
  );
}
