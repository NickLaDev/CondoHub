import '../models/camera.dart';
import 'cameras_repository.dart';

/// View-only cameras repository seeded with public HLS test streams.
///
/// There is no backend for cameras yet, so the feeds below are public `.m3u8`
/// test streams (served over HTTPS so no extra native ATS/cleartext config is
/// needed). Replace [_seed] with the real condominium feeds when the backend
/// exposes them.
class LocalCamerasRepository implements CamerasRepository {
  const LocalCamerasRepository();

  // Public HTTPS HLS test streams.
  static const _bipbop =
      'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8';
  static const _mux = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  static const _tos = 'https://test-streams.mux.dev/test_001/stream.m3u8';

  static const _seed = <Camera>[
    Camera(
      id: 'cam-portaria',
      name: 'Portaria',
      location: 'Entrada principal',
      streamUrl: _bipbop,
      status: CameraStatus.online,
    ),
    Camera(
      id: 'cam-garagem',
      name: 'Garagem',
      location: 'Subsolo 1',
      streamUrl: _mux,
      status: CameraStatus.online,
    ),
    Camera(
      id: 'cam-hall',
      name: 'Hall social',
      location: 'Térreo',
      streamUrl: _tos,
      status: CameraStatus.online,
    ),
    Camera(
      id: 'cam-piscina',
      name: 'Piscina',
      location: 'Área de lazer',
      streamUrl: _mux,
      status: CameraStatus.online,
    ),
    Camera(
      id: 'cam-playground',
      name: 'Playground',
      location: 'Área de lazer',
      streamUrl: _bipbop,
      status: CameraStatus.online,
    ),
    Camera(
      id: 'cam-quadra',
      name: 'Quadra',
      location: 'Área externa',
      streamUrl: _tos,
      status: CameraStatus.offline,
    ),
  ];

  @override
  Future<List<Camera>> getCameras() async => _seed;

  @override
  Future<Camera?> getById(String id) async {
    for (final camera in _seed) {
      if (camera.id == id) return camera;
    }
    return null;
  }
}
