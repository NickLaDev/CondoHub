/// Signing state of a document.
enum DocumentStatus { pendente, assinado }

/// A document the resident needs to sign digitally. The actual signing happens
/// in an external provider (opened through [signUrl]); once done the resident
/// marks it as signed here.
class SignableDocument {
  const SignableDocument({
    required this.id,
    required this.title,
    required this.description,
    required this.signUrl,
    required this.status,
    required this.createdAt,
    this.signedAt,
  });

  final String id;
  final String title;
  final String description;
  final String signUrl;
  final DocumentStatus status;
  final DateTime createdAt;
  final DateTime? signedAt;

  bool get isSigned => status == DocumentStatus.assinado;

  SignableDocument copyWith({
    String? title,
    String? description,
    String? signUrl,
    DocumentStatus? status,
    DateTime? signedAt,
  }) {
    return SignableDocument(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      signUrl: signUrl ?? this.signUrl,
      status: status ?? this.status,
      createdAt: createdAt,
      signedAt: signedAt ?? this.signedAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'signUrl': signUrl,
        'status': status.name,
        'createdAt': createdAt.toIso8601String(),
        'signedAt': signedAt?.toIso8601String(),
      };

  factory SignableDocument.fromJson(Map<String, dynamic> json) =>
      SignableDocument(
        id: json['id']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        signUrl: json['signUrl']?.toString() ?? '',
        status: DocumentStatus.values.firstWhere(
          (s) => s.name == json['status'],
          orElse: () => DocumentStatus.pendente,
        ),
        createdAt:
            DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
                DateTime.now(),
        signedAt: json['signedAt'] != null
            ? DateTime.tryParse(json['signedAt'].toString())
            : null,
      );
}
