import 'dart:convert';

import 'package:condohub_mobile/core/api/channels_api.dart';
import 'package:condohub_mobile/core/models/identity.dart';
import 'package:condohub_mobile/core/network/api_client.dart';
import 'package:condohub_mobile/core/network/tenant_api_context.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('fetchChannels uses tenant path and auth header', () async {
    late http.Request capturedRequest;
    final api = _buildApi((request) async {
      capturedRequest = request;
      return http.Response(
        jsonEncode({
          'items': [
            {
              'id': 'ch-001',
              'name': 'Geral',
              'description': 'Avisos e recados',
              'createdAt': '2024-01-01T12:00:00Z',
            },
          ],
          'total': 1,
          'page': 1,
          'limit': 20,
        }),
        200,
      );
    });

    final items = await api.fetchChannels();

    expect(items, hasLength(1));
    expect(items.first['id'], 'ch-001');
    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/demo/channels',
    );
    expect(capturedRequest.headers['Authorization'], 'Bearer access-token');
  });

  test('fetchPosts reads channel posts endpoint', () async {
    late http.Request capturedRequest;
    final api = _buildApi((request) async {
      capturedRequest = request;
      return http.Response(
        jsonEncode({
          'items': [
            {
              'id': 'post-001',
              'channelId': 'ch-001',
              'body': 'Primeiro post',
              'createdAt': '2024-01-02T08:00:00Z',
            },
          ],
        }),
        200,
      );
    });

    final items = await api.fetchPosts('ch-001');

    expect(items.single['id'], 'post-001');
    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/demo/channels/ch-001/posts',
    );
  });

  test('createPost posts JSON body to channel endpoint', () async {
    late http.Request capturedRequest;
    final api = _buildApi((request) async {
      capturedRequest = request;
      return http.Response(
        jsonEncode({
          'id': 'post-002',
          'channelId': 'ch-001',
          'body': 'Novo post',
          'createdAt': '2024-01-03T10:00:00Z',
        }),
        201,
      );
    });

    final post = await api.createPost('ch-001', 'Novo post');

    expect(post['id'], 'post-002');
    expect(capturedRequest.method, 'POST');
    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/demo/channels/ch-001/posts',
    );
    expect(capturedRequest.body, '{"body":"Novo post"}');
  });

  test('addComment posts to nested comments endpoint', () async {
    late http.Request capturedRequest;
    final api = _buildApi((request) async {
      capturedRequest = request;
      return http.Response(
        jsonEncode({
          'id': 'comment-001',
          'postId': 'post-001',
          'body': 'Comentario novo',
          'createdAt': '2024-01-03T11:00:00Z',
        }),
        201,
      );
    });

    final comment = await api.addComment('ch-001', 'post-001', 'Comentario novo');

    expect(comment['id'], 'comment-001');
    expect(capturedRequest.method, 'POST');
    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/demo/channels/ch-001/posts/post-001/comments',
    );
    expect(capturedRequest.body, '{"body":"Comentario novo"}');
  });

  test('removeContent uses confirmed moderation endpoint', () async {
    late http.Request capturedRequest;
    final api = _buildApi((request) async {
      capturedRequest = request;
      return http.Response('{}', 200);
    });

    await api.removeContent(
      'ch-001',
      contentType: 'comment',
      contentId: 'comment-001',
      reason: 'Conteudo improprio',
    );

    expect(capturedRequest.method, 'POST');
    expect(
      capturedRequest.url.toString(),
      'http://localhost:3000/api/v1/demo/channels/ch-001/moderation/remove-content',
    );
    expect(
      capturedRequest.body,
      '{"contentType":"comment","contentId":"comment-001","reason":"Conteudo improprio"}',
    );
  });
}

ChannelsApi _buildApi(
  Future<http.Response> Function(http.Request request) handler,
) {
  return ChannelsApi(
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
