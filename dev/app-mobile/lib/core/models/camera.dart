/// Availability of a camera feed.
enum CameraStatus { online, offline }

/// A condominium camera the resident can watch live.
///
/// [streamUrl] is an HLS (`.m3u8`) URL played by `video_player`. While there is
/// no backend, the repository seeds public test streams; swap them for the real
/// camera feeds later.
class Camera {
  const Camera({
    required this.id,
    required this.name,
    required this.location,
    required this.streamUrl,
    required this.status,
  });

  final String id;
  final String name;
  final String location;
  final String streamUrl;
  final CameraStatus status;

  bool get isOnline => status == CameraStatus.online;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'location': location,
        'streamUrl': streamUrl,
        'status': status.name,
      };

  factory Camera.fromJson(Map<String, dynamic> json) => Camera(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        location: json['location']?.toString() ?? '',
        streamUrl: json['streamUrl']?.toString() ?? '',
        status: CameraStatus.values.firstWhere(
          (s) => s.name == json['status'],
          orElse: () => CameraStatus.online,
        ),
      );
}
