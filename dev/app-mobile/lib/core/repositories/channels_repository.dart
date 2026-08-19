import '../models/channel.dart';

abstract class ChannelsRepository {
  Future<List<Channel>> getChannels();
  Future<List<ChannelPost>> getPosts(String channelId);
  Future<ChannelPost> createPost(String channelId, String body);
  Future<List<ChannelComment>> getComments(String channelId, String postId);
  Future<ChannelComment> addComment(String channelId, String postId, String body);
  Future<void> silenceUser(
    String channelId, {
    required String userId,
    int? minutes,
    String? reason,
  });
  Future<void> removePost(
    String channelId, {
    required String postId,
    String? reason,
  });
  Future<void> removeComment(
    String channelId, {
    required String commentId,
    String? reason,
  });
}
