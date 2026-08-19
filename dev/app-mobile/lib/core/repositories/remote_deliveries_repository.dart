import '../models/delivery.dart';
import '../network/tenant_api_context.dart';
import 'deliveries_repository.dart';

class RemoteDeliveriesRepository implements DeliveriesRepository {
  RemoteDeliveriesRepository({required TenantApiContext tenantApiContext})
      : _ctx = tenantApiContext;

  final TenantApiContext _ctx;

  @override
  Future<List<Delivery>> getDeliveries() async {
    final r = await _ctx.get('/deliveries?limit=50');
    final items = (r as Map<String, dynamic>?)?['items'];
    if (items is! List) return const [];
    return items.whereType<Map<String, dynamic>>().map(_fromJson).toList(growable: false);
  }

  @override
  Future<Delivery?> getById(String id) async {
    final r = await _ctx.get('/deliveries/$id');
    if (r is! Map<String, dynamic>) return null;
    return _fromJson(r);
  }

  @override
  Future<List<Delivery>> getByStatus(DeliveryStatus status) async {
    final r = await _ctx.get('/deliveries?limit=50&status=${_statusToApi(status)}');
    final items = (r as Map<String, dynamic>?)?['items'];
    if (items is! List) return const [];
    return items.whereType<Map<String, dynamic>>().map(_fromJson).toList(growable: false);
  }

  Delivery _fromJson(Map<String, dynamic> j) => Delivery(
        id: j['id']?.toString() ?? '',
        title: j['title']?.toString() ?? j['description']?.toString() ?? 'Encomenda',
        carrier: j['carrier']?.toString() ?? j['senderName']?.toString() ?? '',
        status: _statusFromApi(j['status']?.toString()),
        arrivedAt: DateTime.tryParse(j['arrivedAt']?.toString() ?? '') ?? DateTime.now(),
        deliveredAt: j['deliveredAt'] != null ? DateTime.tryParse(j['deliveredAt'].toString()) : null,
        notes: j['notes']?.toString(),
      );

  DeliveryStatus _statusFromApi(String? v) => switch ((v ?? '').toUpperCase()) {
        'AGUARDANDO' => DeliveryStatus.aguardando,
        'EM_DISTRIBUICAO' => DeliveryStatus.emDistribuicao,
        'ENTREGUE' => DeliveryStatus.entregue,
        'NAO_ENTREGUE' => DeliveryStatus.naoEntregue,
        _ => DeliveryStatus.aguardando,
      };

  String _statusToApi(DeliveryStatus s) => switch (s) {
        DeliveryStatus.aguardando => 'AGUARDANDO',
        DeliveryStatus.emDistribuicao => 'EM_DISTRIBUICAO',
        DeliveryStatus.entregue => 'ENTREGUE',
        DeliveryStatus.naoEntregue => 'NAO_ENTREGUE',
      };
}
