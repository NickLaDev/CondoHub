enum AnnouncementTag { aviso, evento, urgente, comunicado }

class AnnouncementAttachment {
  const AnnouncementAttachment({required this.url, required this.name});

  final String url;
  final String name;

  factory AnnouncementAttachment.fromJson(Map<String, dynamic> json) {
    return AnnouncementAttachment(
      url: _stringFromJson(json, 'url'),
      name:
          _optionalStringFromJson(json, 'name') ?? _stringFromJson(json, 'url'),
    );
  }

  Map<String, dynamic> toJson() {
    return {'url': url, 'name': name};
  }
}

class Announcement {
  Announcement({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    String? summary,
    String? snippet,
    this.tag = AnnouncementTag.comunicado,
    this.author = 'Administracao',
    this.requireAck = false,
    bool? read,
    bool? acked,
    List<AnnouncementAttachment> attachments = const [],
  }) : summary = _normalizeSummary(
         summary: summary,
         snippet: snippet,
         body: body,
       ),
       read = read ?? acked ?? false,
       attachments = List.unmodifiable(attachments);

  final String id;
  final String title;
  final String summary;
  final String body;
  final AnnouncementTag tag;
  final String author;
  final DateTime createdAt;
  final bool requireAck;
  final bool read;
  final List<AnnouncementAttachment> attachments;

  String get snippet => summary;
  bool get acked => read;
  bool get hasAttachments => attachments.isNotEmpty;

  factory Announcement.fromJson(Map<String, dynamic> json) {
    final attachmentsValue = json['attachments'];
    final attachments = attachmentsValue is List
        ? attachmentsValue
              .whereType<Map<String, dynamic>>()
              .map(AnnouncementAttachment.fromJson)
              .toList(growable: false)
        : const <AnnouncementAttachment>[];

    final readValue = json['read'];
    final ackedValue = json['acked'];
    final requireAckValue = json['requireAck'];

    return Announcement(
      id: _stringFromJson(json, 'id'),
      title: _stringFromJson(json, 'title'),
      summary: _optionalStringFromJson(json, 'summary'),
      snippet: _optionalStringFromJson(json, 'snippet'),
      body:
          _optionalStringFromJson(json, 'body') ??
          _optionalStringFromJson(json, 'summary') ??
          '',
      createdAt: _dateTimeFromJson(json, 'createdAt'),
      read: readValue is bool
          ? readValue
          : ackedValue is bool
          ? ackedValue
          : false,
      attachments: attachments,
      author: _optionalStringFromJson(json, 'author') ?? 'Administracao',
      requireAck: requireAckValue is bool ? requireAckValue : false,
      tag: _tagFromJson(
        _optionalStringFromJson(json, 'tag') ??
            _optionalStringFromJson(json, 'type'),
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'summary': summary,
      'body': body,
      'createdAt': createdAt.toUtc().toIso8601String(),
      'read': read,
      'attachments': attachments
          .map((item) => item.toJson())
          .toList(growable: false),
      'author': author,
      'requireAck': requireAck,
      'tag': tag.name,
    };
  }

  Announcement copyWith({
    String? id,
    String? title,
    String? summary,
    String? snippet,
    String? body,
    AnnouncementTag? tag,
    String? author,
    DateTime? createdAt,
    bool? requireAck,
    bool? read,
    bool? acked,
    List<AnnouncementAttachment>? attachments,
  }) {
    return Announcement(
      id: id ?? this.id,
      title: title ?? this.title,
      summary: summary ?? snippet ?? this.summary,
      body: body ?? this.body,
      tag: tag ?? this.tag,
      author: author ?? this.author,
      createdAt: createdAt ?? this.createdAt,
      requireAck: requireAck ?? this.requireAck,
      read: read ?? acked ?? this.read,
      attachments: attachments ?? this.attachments,
    );
  }

  static String _normalizeSummary({
    required String? summary,
    required String? snippet,
    required String body,
  }) {
    final resolvedSummary = summary?.trim();
    if (resolvedSummary != null && resolvedSummary.isNotEmpty) {
      return resolvedSummary;
    }

    final resolvedSnippet = snippet?.trim();
    if (resolvedSnippet != null && resolvedSnippet.isNotEmpty) {
      return resolvedSnippet;
    }

    final normalizedBody = _summaryFromBody(body);
    if (normalizedBody.isEmpty) return '';
    if (normalizedBody.length <= 140) return normalizedBody;
    return '${normalizedBody.substring(0, 137)}...';
  }

  static AnnouncementTag _tagFromJson(String? rawTag) {
    return switch (rawTag?.trim().toLowerCase()) {
      'aviso' => AnnouncementTag.aviso,
      'evento' => AnnouncementTag.evento,
      'urgente' => AnnouncementTag.urgente,
      _ => AnnouncementTag.comunicado,
    };
  }

  static String _summaryFromBody(String body) {
    return body
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), ' ')
        .replaceAll(RegExp(r'</p\s*>', caseSensitive: false), ' ')
        .replaceAll(RegExp(r'<li[^>]*>', caseSensitive: false), ' ')
        .replaceAll(RegExp(r'<[^>]+>', caseSensitive: false), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }
}

DateTime _dateTimeFromJson(Map<String, dynamic> json, String key) {
  final rawValue = _stringFromJson(json, key);
  final parsed = DateTime.tryParse(rawValue);
  if (parsed == null) {
    throw FormatException('Invalid date for $key: $rawValue');
  }
  return parsed.toLocal();
}

String _stringFromJson(Map<String, dynamic> json, String key) {
  final value = _optionalStringFromJson(json, key);
  if (value == null) {
    throw FormatException('Missing or invalid string for $key');
  }
  return value;
}

String? _optionalStringFromJson(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
  return null;
}
