import '../network/api_exception.dart';
import '../network/tenant_api_context.dart';

class ChannelsApi {
  ChannelsApi({required TenantApiContext tenantApiContext})
    : _tenantApiContext = tenantApiContext;

  final TenantApiContext _tenantApiContext;

  Future<List<Map<String, dynamic>>> fetchChannels() async {
    final response = await _tenantApiContext.get('/channels');
    return _extractItems(
      response,
      errorCode: 'CHANNELS_RESPONSE_INVALID',
      message: 'Resposta invalida ao carregar canais',
    );
  }

  Future<List<Map<String, dynamic>>> fetchPosts(String channelId) async {
    final response = await _tenantApiContext.get('/channels/$channelId/posts');
    return _extractItems(
      response,
      errorCode: 'CHANNEL_POSTS_RESPONSE_INVALID',
      message: 'Resposta invalida ao carregar posts do canal',
    );
  }

  Future<Map<String, dynamic>> createPost(String channelId, String body) async {
    final response = await _tenantApiContext.post(
      '/channels/$channelId/posts',
      body: {'body': body},
    );
    return _asJsonMap(
      response,
      errorCode: 'CHANNEL_POST_CREATE_INVALID',
      message: 'Resposta invalida ao criar post',
    );
  }

  Future<List<Map<String, dynamic>>> fetchComments(
    String channelId,
    String postId,
  ) async {
    final response = await _tenantApiContext.get(
      '/channels/$channelId/posts/$postId/comments',
    );
    return _extractItems(
      response,
      errorCode: 'CHANNEL_COMMENTS_RESPONSE_INVALID',
      message: 'Resposta invalida ao carregar comentarios',
    );
  }

  Future<Map<String, dynamic>> addComment(
    String channelId,
    String postId,
    String body,
  ) async {
    final response = await _tenantApiContext.post(
      '/channels/$channelId/posts/$postId/comments',
      body: {'body': body},
    );
    return _asJsonMap(
      response,
      errorCode: 'CHANNEL_COMMENT_CREATE_INVALID',
      message: 'Resposta invalida ao criar comentario',
    );
  }

  Future<void> silenceUser(
    String channelId, {
    required String userId,
    int? minutes,
    String? reason,
  }) async {
    final body = <String, Object?>{'userId': userId};
    if (minutes != null) {
      body['minutes'] = minutes;
    }
    final trimmedReason = reason?.trim();
    if (trimmedReason != null && trimmedReason.isNotEmpty) {
      body['reason'] = trimmedReason;
    }

    await _tenantApiContext.post(
      '/channels/$channelId/moderation/silence-user',
      body: body,
    );
  }

  Future<void> removeContent(
    String channelId, {
    required String contentType,
    required String contentId,
    String? reason,
  }) async {
    await _tenantApiContext.post(
      '/channels/$channelId/moderation/remove-content',
      body: {
        'contentType': contentType,
        'contentId': contentId,
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
  }

  List<Map<String, dynamic>> _extractItems(
    Object? response, {
    required String errorCode,
    required String message,
  }) {
    if (response is List) {
      return response.whereType<Map<String, dynamic>>().toList(growable: false);
    }

    if (response is Map<String, dynamic>) {
      final items = response['items'] ?? response['data'];
      if (items is List) {
        return items.whereType<Map<String, dynamic>>().toList(growable: false);
      }
    }

    throw ApiException(
      statusCode: 0,
      code: errorCode,
      message: message,
      body: response,
    );
  }

  Map<String, dynamic> _asJsonMap(
    Object? response, {
    required String errorCode,
    required String message,
  }) {
    if (response is Map<String, dynamic>) {
      return response;
    }

    throw ApiException(
      statusCode: 0,
      code: errorCode,
      message: message,
      body: response,
    );
  }
}
