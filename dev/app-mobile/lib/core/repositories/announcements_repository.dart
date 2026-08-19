import '../api/announcements_api.dart';
import '../models/announcement.dart';

abstract class AnnouncementsRepository {
  Future<List<Announcement>> getAnnouncements({bool forceRefresh = false});
  Future<Announcement> getAnnouncementById(String id, {bool forceRefresh = false});
  Future<void> acknowledge(String id);
}

class RemoteAnnouncementsRepository implements AnnouncementsRepository {
  RemoteAnnouncementsRepository({required AnnouncementsApi api}) : _api = api;

  final AnnouncementsApi _api;
  final Map<String, Announcement> _cache = <String, Announcement>{};
  final Set<String> _acknowledgedIds = <String>{};
  final Map<String, Future<void>> _acknowledgementsInFlight =
      <String, Future<void>>{};

  @override
  Future<List<Announcement>> getAnnouncements({bool forceRefresh = false}) async {
    if (!forceRefresh && _cache.isNotEmpty) {
      return _sortedCacheValues();
    }

    final items = await _api.fetchAnnouncements();
    _storeAnnouncements(items);
    return _sortedCacheValues();
  }

  @override
  Future<Announcement> getAnnouncementById(
    String id, {
    bool forceRefresh = false,
  }) async {
    final cached = _cache[id];
    if (!forceRefresh && cached != null) {
      return cached;
    }

    final announcement = await _api.fetchAnnouncementById(id);
    final merged = _markReadIfKnown(announcement);
    _cache[id] = merged;
    if (merged.read) {
      _acknowledgedIds.add(id);
    }
    return merged;
  }

  @override
  Future<void> acknowledge(String id) {
    final cached = _cache[id];
    if ((cached?.read ?? false) || _acknowledgedIds.contains(id)) {
      _markAnnouncementAsRead(id);
      return Future<void>.value();
    }

    final inFlight = _acknowledgementsInFlight[id];
    if (inFlight != null) return inFlight;

    _markAnnouncementAsRead(id);

    final request = _runAcknowledge(id);
    _acknowledgementsInFlight[id] = request;
    return request;
  }

  Future<void> _runAcknowledge(String id) async {
    try {
      await _api.acknowledgeAnnouncement(id);
      _acknowledgedIds.add(id);
      _markAnnouncementAsRead(id);
    } finally {
      _acknowledgementsInFlight.remove(id);
    }
  }

  void _storeAnnouncements(List<Announcement> items) {
    for (final item in items) {
      final merged = _markReadIfKnown(item);
      _cache[merged.id] = merged;
      if (merged.read) {
        _acknowledgedIds.add(merged.id);
      }
    }
  }

  Announcement _markReadIfKnown(Announcement announcement) {
    if (_acknowledgedIds.contains(announcement.id)) {
      return announcement.copyWith(read: true);
    }
    return announcement;
  }

  void _markAnnouncementAsRead(String id) {
    final cached = _cache[id];
    if (cached != null && !cached.read) {
      _cache[id] = cached.copyWith(read: true);
    }
  }

  List<Announcement> _sortedCacheValues() {
    final items = _cache.values.toList(growable: false);
    final sorted = [...items]
      ..sort((first, second) => second.createdAt.compareTo(first.createdAt));
    return List.unmodifiable(sorted);
  }
}
