import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/announcements_api.dart';
import '../../core/models/announcement.dart';
import '../../core/providers/providers.dart';
import '../../core/repositories/announcements_repository.dart';

final announcementsApiProvider = Provider<AnnouncementsApi>((ref) {
  return AnnouncementsApi(
    tenantApiContext: ref.watch(tenantApiContextProvider),
  );
});

final announcementsRepositoryProvider = Provider<AnnouncementsRepository>((
  ref,
) {
  return RemoteAnnouncementsRepository(
    api: ref.watch(announcementsApiProvider),
  );
});

final announcementsListControllerProvider =
    AsyncNotifierProvider<AnnouncementsListController, List<Announcement>>(
      AnnouncementsListController.new,
    );

final announcementPreviewProvider = Provider.family<Announcement?, String>((
  ref,
  id,
) {
  final items = ref.watch(announcementsListControllerProvider).asData?.value;
  if (items == null) return null;

  for (final item in items) {
    if (item.id == id) return item;
  }
  return null;
});

final announcementRemoteDetailProvider = FutureProvider.autoDispose
    .family<Announcement, String>((ref, id) async {
      final detail = await ref
          .watch(announcementsRepositoryProvider)
          .getAnnouncementById(id, forceRefresh: true);
      final preview = ref.read(announcementPreviewProvider(id));
      final merged = preview != null && preview.read && !detail.read
          ? detail.copyWith(read: true)
          : detail;
      ref
          .read(announcementsListControllerProvider.notifier)
          .mergeAnnouncement(merged);
      return merged;
    });

class AnnouncementsListController extends AsyncNotifier<List<Announcement>> {
  final Set<String> _acknowledgingIds = <String>{};

  @override
  Future<List<Announcement>> build() {
    return _load(forceRefresh: true);
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _load(forceRefresh: true));
  }

  Future<void> acknowledge(String id) async {
    if (_acknowledgingIds.contains(id)) return;

    final currentItems = state.asData?.value;
    final currentAnnouncement = _findById(currentItems, id);
    if (currentAnnouncement?.read == true) return;

    _acknowledgingIds.add(id);
    if (currentAnnouncement != null) {
      _replaceInState(currentAnnouncement.copyWith(read: true));
    }

    try {
      await ref.read(announcementsRepositoryProvider).acknowledge(id);
      final refreshed = await ref
          .read(announcementsRepositoryProvider)
          .getAnnouncementById(id);
      _replaceInState(refreshed.copyWith(read: true));
    } catch (error, stackTrace) {
      if (currentAnnouncement != null) {
        _replaceInState(currentAnnouncement);
      }
      Error.throwWithStackTrace(error, stackTrace);
    } finally {
      _acknowledgingIds.remove(id);
    }
  }

  void mergeAnnouncement(Announcement announcement) {
    final currentItems = state.asData?.value;
    if (currentItems == null) return;

    final existing = _findById(currentItems, announcement.id);
    final merged = existing != null && existing.read && !announcement.read
        ? announcement.copyWith(read: true)
        : announcement;
    _replaceInState(merged);
  }

  bool isAcknowledging(String id) => _acknowledgingIds.contains(id);

  Future<List<Announcement>> _load({required bool forceRefresh}) {
    return ref
        .read(announcementsRepositoryProvider)
        .getAnnouncements(forceRefresh: forceRefresh);
  }

  Announcement? _findById(List<Announcement>? items, String id) {
    if (items == null) return null;
    for (final item in items) {
      if (item.id == id) return item;
    }
    return null;
  }

  void _replaceInState(Announcement announcement) {
    final currentItems = state.asData?.value;
    if (currentItems == null) return;

    final nextItems = [...currentItems];
    final existingIndex = nextItems.indexWhere(
      (item) => item.id == announcement.id,
    );

    if (existingIndex >= 0) {
      nextItems[existingIndex] = announcement;
    } else {
      nextItems.insert(0, announcement);
    }

    nextItems.sort(
      (first, second) => second.createdAt.compareTo(first.createdAt),
    );

    state = AsyncValue.data(List<Announcement>.unmodifiable(nextItems));
  }
}
