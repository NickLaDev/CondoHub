/// Kind of visitor being registered at the gate.
enum VisitorType { visitante, prestador }

/// Lifecycle of a scheduled visit.
enum VisitorStatus { agendado, liberado, expirado }

/// A visitor pre-registered by the resident so the gate can release access
/// quickly.
class Visitor {
  const Visitor({
    required this.id,
    required this.name,
    required this.type,
    required this.expectedAt,
    required this.status,
    required this.createdAt,
    this.document = '',
    this.unitLabel = '',
    this.notes,
  });

  final String id;
  final String name;
  final String document;
  final String unitLabel;
  final VisitorType type;
  final DateTime expectedAt;
  final VisitorStatus status;
  final String? notes;
  final DateTime createdAt;

  /// Status taking the expected date into account: a visit still marked as
  /// `agendado` after its day has passed is surfaced as `expirado`.
  VisitorStatus get effectiveStatus {
    if (status == VisitorStatus.liberado) return VisitorStatus.liberado;
    final today = DateTime.now();
    final endOfDay = DateTime(
      expectedAt.year,
      expectedAt.month,
      expectedAt.day,
      23,
      59,
      59,
    );
    if (endOfDay.isBefore(today)) return VisitorStatus.expirado;
    return VisitorStatus.agendado;
  }

  Visitor copyWith({
    String? name,
    String? document,
    String? unitLabel,
    VisitorType? type,
    DateTime? expectedAt,
    VisitorStatus? status,
    String? notes,
  }) {
    return Visitor(
      id: id,
      name: name ?? this.name,
      document: document ?? this.document,
      unitLabel: unitLabel ?? this.unitLabel,
      type: type ?? this.type,
      expectedAt: expectedAt ?? this.expectedAt,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      createdAt: createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'document': document,
        'unitLabel': unitLabel,
        'type': type.name,
        'expectedAt': expectedAt.toIso8601String(),
        'status': status.name,
        'notes': notes,
        'createdAt': createdAt.toIso8601String(),
      };

  factory Visitor.fromJson(Map<String, dynamic> json) => Visitor(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        document: json['document']?.toString() ?? '',
        unitLabel: json['unitLabel']?.toString() ?? '',
        type: VisitorType.values.firstWhere(
          (t) => t.name == json['type'],
          orElse: () => VisitorType.visitante,
        ),
        expectedAt:
            DateTime.tryParse(json['expectedAt']?.toString() ?? '') ??
                DateTime.now(),
        status: VisitorStatus.values.firstWhere(
          (s) => s.name == json['status'],
          orElse: () => VisitorStatus.agendado,
        ),
        notes: json['notes']?.toString(),
        createdAt:
            DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
                DateTime.now(),
      );
}
