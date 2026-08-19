import '../api/channels_api.dart';
import '../models/channel.dart';
import '../models/identity.dart';
import 'channels_repository.dart';

typedef AuthStateSnapshotReader = AuthState Function();

class RemoteChannelsRepository implements ChannelsRepository {
  RemoteChannelsRepository({
    required ChannelsApi api,
    required AuthStateSnapshotReader readAuthState,
  }) : _api = api,
       _readAuthState = readAuthState;

  final ChannelsApi _api;
  final AuthStateSnapshotReader _readAuthState;

  @override
  Future<List<Channel>> getChannels() async {
    final currentUser = _readAuthState().user;
    final items = await _api.fetchChannels();
    return items
        .map((item) => _mapChannel(item, currentUser: currentUser))
        .toList(growable: false);
  }

  @override
  Future<List<ChannelPost>> getPosts(String channelId) async {
    final currentUser = _readAuthState().user;
    final items = await _api.fetchPosts(channelId);
    return items
        .map((item) => _mapPost(item, currentUser: currentUser, channelId: channelId))
        .toList(growable: false);
  }

  @override
  Future<ChannelPost> createPost(String channelId, String body) async {
    final currentUser = _readAuthState().user;
    final data = await _api.createPost(channelId, body.trim());
    return _mapPost(data, currentUser: currentUser, channelId: channelId);
  }

  @override
  Future<List<ChannelComment>> getComments(String channelId, String postId) async {
    final currentUser = _readAuthState().user;
    final items = await _api.fetchComments(channelId, postId);
    return items
        .map((item) => _mapComment(item, currentUser: currentUser, postId: postId))
        .toList(growable: false);
  }

  @override
  Future<ChannelComment> addComment(
    String channelId,
    String postId,
    String body,
  ) async {
    final currentUser = _readAuthState().user;
    final data = await _api.addComment(channelId, postId, body.trim());
    return _mapComment(data, currentUser: currentUser, postId: postId);
  }

  @override
  Future<void> silenceUser(
    String channelId, {
    required String userId,
    int? minutes,
    String? reason,
  }) {
    return _api.silenceUser(
      channelId,
      userId: userId,
      minutes: minutes,
      reason: reason,
    );
  }

  @override
  Future<void> removePost(
    String channelId, {
    required String postId,
    String? reason,
  }) {
    return _api.removeContent(
      channelId,
      contentType: 'post',
      contentId: postId,
      reason: reason,
    );
  }

  @override
  Future<void> removeComment(
    String channelId, {
    required String commentId,
    String? reason,
  }) {
    return _api.removeContent(
      channelId,
      contentType: 'comment',
      contentId: commentId,
      reason: reason,
    );
  }

  Channel _mapChannel(
    Map<String, dynamic> json, {
    required User? currentUser,
  }) {
    final channel = Channel.fromJson(json);
    final isModerator = currentUser?.role == 'SINDICO_ADMIN';

    return channel.copyWith(
      canPost: channel.canPost ?? true,
      canComment: channel.canComment ?? true,
      canModerate: channel.canModerate ?? isModerator,
    );
  }

  ChannelPost _mapPost(
    Map<String, dynamic> json, {
    required User? currentUser,
    required String channelId,
  }) {
    final post = ChannelPost.fromJson({
      ...json,
      if (_missingString(json, 'channelId') &&
          _missingString(json, 'channel_id'))
        'channelId': channelId,
    });
    return post.copyWith(
      authorName: _resolvedAuthorName(
        explicitName: post.authorName,
        authorUserId: post.authorUserId,
        currentUser: currentUser,
      ),
    );
  }

  ChannelComment _mapComment(
    Map<String, dynamic> json, {
    required User? currentUser,
    required String postId,
  }) {
    final comment = ChannelComment.fromJson({
      ...json,
      if (_missingString(json, 'postId') && _missingString(json, 'post_id'))
        'postId': postId,
    });
    return comment.copyWith(
      authorName: _resolvedAuthorName(
        explicitName: comment.authorName,
        authorUserId: comment.authorUserId,
        currentUser: currentUser,
      ),
    );
  }

  String? _resolvedAuthorName({
    required String? explicitName,
    required String? authorUserId,
    required User? currentUser,
  }) {
    final trimmedName = explicitName?.trim();
    if (trimmedName != null && trimmedName.isNotEmpty) {
      return trimmedName;
    }

    if (currentUser != null && currentUser.id == authorUserId) {
      return currentUser.name;
    }

    return null;
  }

  bool _missingString(Map<String, dynamic> json, String key) {
    final value = json[key];
    return value is! String || value.trim().isEmpty;
  }
}
