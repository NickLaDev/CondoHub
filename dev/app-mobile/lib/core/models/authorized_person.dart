/// Category of a recurring authorized person.
enum AuthorizedType { diarista, baba, cuidador, professor, prestador, outro }

/// A worker/visitor with standing authorization to enter the condominium on a
/// recurring schedule (selected weekdays + time window), optionally until a
/// given expiration date.
class AuthorizedPerson {
  const AuthorizedPerson({
    required this.id,
    required this.name,
    required this.type,
    required this.weekdays,
    required this.startMinutes,
    required this.endMinutes,
    required this.active,
    required this.createdAt,
    this.document = '',
    this.validUntil,
    this.notes,
  });

  final String id;
  final String name;
  final String document;
  final AuthorizedType type;

  /// Allowed weekdays following [DateTime.weekday] (1 = Monday … 7 = Sunday).
  final Set<int> weekdays;

  /// Allowed time window expressed in minutes from midnight.
  final int startMinutes;
  final int endMinutes;

  /// Authorization expiration date (inclusive). `null` means no expiration.
  final DateTime? validUntil;
  final bool active;
  final String? notes;
  final DateTime createdAt;

  bool get isExpired {
    final until = validUntil;
    if (until == null) return false;
    final endOfDay = DateTime(until.year, until.month, until.day, 23, 59, 59);
    return DateTime.now().isAfter(endOfDay);
  }

  /// Whether the authorization is currently usable.
  bool get isActiveNow => active && !isExpired;

  /// Whether this person is allowed to enter at [moment] (defaults to now).
  bool isAllowedAt(DateTime moment) {
    if (!active || isExpired) return false;
    if (!weekdays.contains(moment.weekday)) return false;
    final minutes = moment.hour * 60 + moment.minute;
    return minutes >= startMinutes && minutes <= endMinutes;
  }

  AuthorizedPerson copyWith({
    String? name,
    String? document,
    AuthorizedType? type,
    Set<int>? weekdays,
    int? startMinutes,
    int? endMinutes,
    Object? validUntil = _sentinel,
    bool? active,
    String? notes,
  }) {
    return AuthorizedPerson(
      id: id,
      name: name ?? this.name,
      document: document ?? this.document,
      type: type ?? this.type,
      weekdays: weekdays ?? this.weekdays,
      startMinutes: startMinutes ?? this.startMinutes,
      endMinutes: endMinutes ?? this.endMinutes,
      validUntil: identical(validUntil, _sentinel)
          ? this.validUntil
          : validUntil as DateTime?,
      active: active ?? this.active,
      notes: notes ?? this.notes,
      createdAt: createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'document': document,
        'type': type.name,
        'weekdays': weekdays.toList()..sort(),
        'startMinutes': startMinutes,
        'endMinutes': endMinutes,
        'validUntil': validUntil?.toIso8601String(),
        'active': active,
        'notes': notes,
        'createdAt': createdAt.toIso8601String(),
      };

  factory AuthorizedPerson.fromJson(Map<String, dynamic> json) {
    final rawDays = json['weekdays'];
    final days = <int>{};
    if (rawDays is List) {
      for (final d in rawDays) {
        final parsed = int.tryParse(d.toString());
        if (parsed != null && parsed >= 1 && parsed <= 7) days.add(parsed);
      }
    }
    return AuthorizedPerson(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      document: json['document']?.toString() ?? '',
      type: AuthorizedType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => AuthorizedType.outro,
      ),
      weekdays: days,
      startMinutes: int.tryParse(json['startMinutes']?.toString() ?? '') ?? 0,
      endMinutes: int.tryParse(json['endMinutes']?.toString() ?? '') ?? 1439,
      validUntil: json['validUntil'] != null
          ? DateTime.tryParse(json['validUntil'].toString())
          : null,
      active: json['active'] == true || json['active']?.toString() == 'true',
      notes: json['notes']?.toString(),
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
              DateTime.now(),
    );
  }

  static const _sentinel = Object();
}
