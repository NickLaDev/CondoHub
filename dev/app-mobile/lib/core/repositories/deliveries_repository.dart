import '../models/delivery.dart';

abstract class DeliveriesRepository {
  Future<List<Delivery>> getDeliveries();
  Future<Delivery?> getById(String id);
  Future<List<Delivery>> getByStatus(DeliveryStatus status);
}
