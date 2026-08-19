import '../models/camera.dart';

abstract class CamerasRepository {
  Future<List<Camera>> getCameras();
  Future<Camera?> getById(String id);
}
