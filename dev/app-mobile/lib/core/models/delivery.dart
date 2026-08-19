enum DeliveryStatus { aguardando, emDistribuicao, entregue, naoEntregue }

class Delivery {
  final String id;
  final String title;
  final String carrier;
  final DeliveryStatus status;
  final DateTime arrivedAt;
  final DateTime? deliveredAt;
  final String? notes;

  Delivery({
    required this.id,
    required this.title,
    required this.carrier,
    required this.status,
    required this.arrivedAt,
    this.deliveredAt,
    this.notes,
  });
}
