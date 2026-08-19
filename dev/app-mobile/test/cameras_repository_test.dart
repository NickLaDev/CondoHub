import 'package:condohub_mobile/core/models/camera.dart';
import 'package:condohub_mobile/core/repositories/local_cameras_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const repo = LocalCamerasRepository();

  test('seeds a non-empty camera list with HTTPS HLS streams', () async {
    final cameras = await repo.getCameras();
    expect(cameras, isNotEmpty);
    for (final camera in cameras) {
      expect(camera.streamUrl, startsWith('https://'));
      expect(camera.streamUrl, endsWith('.m3u8'));
      expect(camera.name, isNotEmpty);
    }
  });

  test('exposes at least one online and one offline camera', () async {
    final cameras = await repo.getCameras();
    expect(cameras.any((c) => c.status == CameraStatus.online), isTrue);
    expect(cameras.any((c) => c.status == CameraStatus.offline), isTrue);
  });

  test('getById returns the matching camera or null', () async {
    final first = (await repo.getCameras()).first;
    final found = await repo.getById(first.id);
    expect(found, isNotNull);
    expect(found!.id, first.id);
    expect(await repo.getById('does-not-exist'), isNull);
  });
}
