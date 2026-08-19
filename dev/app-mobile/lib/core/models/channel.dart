class Channel {
  const Channel({
    required this.id,
    required this.name,
    this.description = '',
    this.type,
    this.icon,
    this.canPost,
    this.canComment,
    this.canModerate,
    this.createdAt,
    this.updatedAt,
    this.visibility,
    this.postCount,
  });

  final String id;
  final String name;
  final String description;
  final String? type;
  final String? icon;
  final bool? canPost;
  final bool? canComment;
  final bool? canModerate;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? visibility;
  final int? postCount;

  bool get hasDescription => description.trim().isNotEmpty;
  bool get hasPostCount => postCount != null;

  factory Channel.fromJson(Map<String, dynamic> json) {
    return Channel(
      id: _requiredString(json, 'id'),
      name: _requiredString(json, 'name'),
      description:
          _optionalString(json, 'description') ??
          _optionalString(json, 'summary') ??
          '',
      type:
          _optionalString(json, 'type') ?? _optionalString(json, 'visibility'),
      icon: _optionalString(json, 'icon'),
      canPost: _optionalBool(json, 'canPost'),
      canComment: _optionalBool(json, 'canComment'),
      canModerate: _optionalBool(json, 'canModerate'),
      createdAt: _optionalDateTime(json, 'createdAt'),
      updatedAt: _optionalDateTime(json, 'updatedAt'),
      visibility: _optionalString(json, 'visibility'),
      postCount:
          _optionalInt(json, 'postCount') ??
          _optionalInt(json, 'postsCount') ??
          _optionalInt(json, 'count'),
    );
  }

  Channel copyWith({
    String? id,
    String? name,
    String? description,
    String? type,
    String? icon,
    bool? canPost,
    bool? canComment,
    bool? canModerate,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? visibility,
    int? postCount,
  }) {
    return Channel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      type: type ?? this.type,
      icon: icon ?? this.icon,
      canPost: canPost ?? this.canPost,
      canComment: canComment ?? this.canComment,
      canModerate: canModerate ?? this.canModerate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      visibility: visibility ?? this.visibility,
      postCount: postCount ?? this.postCount,
    );
  }
}

class ChannelPost {
  const ChannelPost({
    required this.id,
    required this.channelId,
    required this.body,
    required this.createdAt,
    this.authorName,
    this.authorUserId,
    this.title,
    this.updatedAt,
    this.commentCount,
    this.status,
    this.isPinned = false,
  });

  final String id;
  final String channelId;
  final String? authorName;
  final String? authorUserId;
  final String? title;
  final String body;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final int? commentCount;
  final String? status;
  final bool isPinned;

  bool get hasTitle => (title ?? '').trim().isNotEmpty;
  bool get hasCommentCount => commentCount != null;

  factory ChannelPost.fromJson(Map<String, dynamic> json) {
    return ChannelPost(
      id: _requiredString(json, 'id'),
      channelId:
          _optionalString(json, 'channelId') ??
          _optionalString(json, 'channel_id') ??
          '',
      authorName: _readAuthorName(json),
      authorUserId:
          _optionalString(json, 'authorUserId') ??
          _optionalString(json, 'author_user_id') ??
          _optionalString(json, 'authorId'),
      title: _optionalString(json, 'title'),
      body:
          _optionalString(json, 'body') ??
          _optionalString(json, 'content') ??
          _optionalString(json, 'text') ??
          '',
      createdAt: _requiredDateTime(json, 'createdAt'),
      updatedAt: _optionalDateTime(json, 'updatedAt'),
      commentCount:
          _optionalInt(json, 'commentCount') ??
          _optionalInt(json, 'commentsCount') ??
          _optionalInt(json, 'comments_count'),
      status: _optionalString(json, 'status'),
      isPinned: _optionalBool(json, 'isPinned') ?? false,
    );
  }

  ChannelPost copyWith({
    String? id,
    String? channelId,
    String? authorName,
    String? authorUserId,
    String? title,
    String? body,
    DateTime? createdAt,
    DateTime? updatedAt,
    int? commentCount,
    String? status,
    bool? isPinned,
  }) {
    return ChannelPost(
      id: id ?? this.id,
      channelId: channelId ?? this.channelId,
      authorName: authorName ?? this.authorName,
      authorUserId: authorUserId ?? this.authorUserId,
      title: title ?? this.title,
      body: body ?? this.body,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      commentCount: commentCount ?? this.commentCount,
      status: status ?? this.status,
      isPinned: isPinned ?? this.isPinned,
    );
  }
}

class ChannelComment {
  const ChannelComment({
    required this.id,
    required this.postId,
    required this.body,
    required this.createdAt,
    this.authorName,
    this.authorUserId,
    this.status,
    this.updatedAt,
  });

  final String id;
  final String postId;
  final String? authorName;
  final String? authorUserId;
  final String body;
  final DateTime createdAt;
  final String? status;
  final DateTime? updatedAt;

  factory ChannelComment.fromJson(Map<String, dynamic> json) {
    return ChannelComment(
      id: _requiredString(json, 'id'),
      postId:
          _optionalString(json, 'postId') ??
          _optionalString(json, 'post_id') ??
          '',
      authorName: _readAuthorName(json),
      authorUserId:
          _optionalString(json, 'authorUserId') ??
          _optionalString(json, 'author_user_id') ??
          _optionalString(json, 'authorId'),
      body:
          _optionalString(json, 'body') ??
          _optionalString(json, 'content') ??
          _optionalString(json, 'text') ??
          '',
      createdAt: _requiredDateTime(json, 'createdAt'),
      status: _optionalString(json, 'status'),
      updatedAt: _optionalDateTime(json, 'updatedAt'),
    );
  }

  ChannelComment copyWith({
    String? id,
    String? postId,
    String? authorName,
    String? authorUserId,
    String? body,
    DateTime? createdAt,
    String? status,
    DateTime? updatedAt,
  }) {
    return ChannelComment(
      id: id ?? this.id,
      postId: postId ?? this.postId,
      authorName: authorName ?? this.authorName,
      authorUserId: authorUserId ?? this.authorUserId,
      body: body ?? this.body,
      createdAt: createdAt ?? this.createdAt,
      status: status ?? this.status,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

String _requiredString(Map<String, dynamic> json, String key) {
  final value = _optionalString(json, key);
  if (value == null) {
    throw FormatException('Missing or invalid string for $key');
  }
  return value;
}

String? _optionalString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}

bool? _optionalBool(Map<String, dynamic> json, String key) {
  final value = json[key];
  return value is bool ? value : null;
}

int? _optionalInt(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) return value;
  if (value is num) return value.toInt();
  return null;
}

DateTime _requiredDateTime(Map<String, dynamic> json, String key) {
  final value = _optionalDateTime(json, key);
  if (value == null) {
    throw FormatException('Missing or invalid date for $key');
  }
  return value;
}

DateTime? _optionalDateTime(Map<String, dynamic> json, String key) {
  final rawValue = _optionalString(json, key);
  if (rawValue == null) return null;
  final parsed = DateTime.tryParse(rawValue);
  return parsed?.toLocal();
}

String? _readAuthorName(Map<String, dynamic> json) {
  final direct =
      _optionalString(json, 'authorName') ?? _optionalString(json, 'author');
  if (direct != null) return direct;

  final author = json['author'];
  if (author is Map<String, dynamic>) {
    return _optionalString(author, 'name');
  }
  return null;
}
