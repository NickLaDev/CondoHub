import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/channels_api.dart';
import '../localization/app_strings.dart';
import '../models/auth_session.dart';
import '../models/authorized_person.dart';
import '../models/camera.dart';
import '../models/channel.dart';
import '../models/delivery.dart';
import '../models/identity.dart';
import '../models/inbox.dart';
import '../models/invite_acceptance.dart';
import '../models/profile_snapshot.dart';
import '../models/qr.dart';
import '../models/signable_document.dart';
import '../models/ticket.dart';
import '../models/visitor.dart';
import '../network/api_client.dart';
import '../network/api_exception.dart';
import '../network/tenant_api_context.dart';
import '../repositories/auth_repository.dart';
import '../repositories/authorized_access_repository.dart';
import '../repositories/cameras_repository.dart';
import '../repositories/channels_repository.dart';
import '../repositories/deliveries_repository.dart';
import '../repositories/documents_repository.dart';
import '../repositories/inbox_repository.dart';
import '../repositories/local_authorized_access_repository.dart';
import '../repositories/local_cameras_repository.dart';
import '../repositories/local_documents_repository.dart';
import '../repositories/local_visitors_repository.dart';
import '../repositories/qr_repository.dart';
import '../repositories/remote_channels_repository.dart';
import '../repositories/remote_auth_repository.dart';
import '../repositories/remote_deliveries_repository.dart';
import '../repositories/remote_inbox_repository.dart';
import '../repositories/remote_profile_repository.dart';
import '../repositories/remote_qr_repository.dart';
import '../repositories/remote_tickets_repository.dart';
import '../repositories/tickets_repository.dart';
import '../repositories/visitors_repository.dart';
import '../storage/auth_session_storage.dart';
import '../storage/local_collection_store.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(
    refreshAccessToken: () async {
      final current = ref.read(authStateProvider);
      final refreshToken = current.refreshToken;
      if (!current.isAuthenticated ||
          refreshToken == null ||
          refreshToken.trim().isEmpty) {
        return null;
      }
      final refreshed = await ref
          .read(authStateProvider.notifier)
          .refreshSession();
      return refreshed.accessToken;
    },
    clearSession: () {
      return ref.read(authStateProvider.notifier).logout();
    },
  );
  ref.onDispose(client.close);
  return client;
});

final tenantApiContextProvider = Provider<TenantApiContext>((ref) {
  return TenantApiContext(
    apiClient: ref.watch(apiClientProvider),
    readAuthState: () => ref.read(authStateProvider),
  );
});

final remoteAuthRepositoryProvider = Provider<RemoteAuthRepository>((ref) {
  return RemoteAuthRepository(apiClient: ref.watch(apiClientProvider));
});

final channelsApiProvider = Provider<ChannelsApi>((ref) {
  return ChannelsApi(tenantApiContext: ref.watch(tenantApiContextProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return ref.watch(remoteAuthRepositoryProvider);
});

final inboxRepositoryProvider = Provider<InboxRepository>((ref) {
  final repo = RemoteInboxRepository(
    tenantApiContext: ref.watch(tenantApiContextProvider),
  );
  ref.onDispose(repo.dispose);
  return repo;
});

final ticketsRepositoryProvider = Provider<TicketsRepository>((ref) {
  return RemoteTicketsRepository(
    tenantApiContext: ref.watch(tenantApiContextProvider),
  );
});
final channelsRepositoryProvider = Provider<ChannelsRepository>((ref) {
  return RemoteChannelsRepository(
    api: ref.watch(channelsApiProvider),
    readAuthState: () => ref.read(authStateProvider),
  );
});
final deliveriesRepositoryProvider = Provider<DeliveriesRepository>((ref) {
  return RemoteDeliveriesRepository(
    tenantApiContext: ref.watch(tenantApiContextProvider),
  );
});
final qrRepositoryProvider = Provider<QrRepository>((ref) {
  final repo = RemoteQrRepository(
    tenantApiContext: ref.watch(tenantApiContextProvider),
  );
  ref.onDispose(repo.dispose);
  return repo;
});

// ---------------------------------------------------------------------------
// Visitors / Documents / Authorized access
//
// These features are currently persisted locally (offline-first) because the
// backend endpoints are not available yet. Each repository sits behind an
// abstract interface, so swapping the `Local*Repository` for a `Remote*` one
// here is enough to wire them to the API later.
// ---------------------------------------------------------------------------

LocalCollectionStore _localCollectionStore(Ref ref, String namespace) {
  final preferences = ref.watch(sharedPreferencesProvider);
  if (preferences == null) {
    throw StateError(
      'SharedPreferences not initialized; provide sharedPreferencesProvider',
    );
  }
  final tenant = ref.watch(authStateProvider).instanceKey ?? 'local';
  return LocalCollectionStore(
    preferences: preferences,
    namespace: namespace,
    tenant: tenant,
  );
}

final visitorsRepositoryProvider = Provider<VisitorsRepository>((ref) {
  return LocalVisitorsRepository(_localCollectionStore(ref, 'visitors'));
});

final documentsRepositoryProvider = Provider<DocumentsRepository>((ref) {
  return LocalDocumentsRepository(_localCollectionStore(ref, 'documents'));
});

final authorizedAccessRepositoryProvider =
    Provider<AuthorizedAccessRepository>((ref) {
  return LocalAuthorizedAccessRepository(
    _localCollectionStore(ref, 'authorized_access'),
  );
});

final visitorsProvider = FutureProvider<List<Visitor>>((ref) {
  return ref.watch(visitorsRepositoryProvider).getVisitors();
});

final documentsProvider = FutureProvider<List<SignableDocument>>((ref) {
  return ref.watch(documentsRepositoryProvider).getDocuments();
});

final documentDetailProvider =
    FutureProvider.family<SignableDocument?, String>((ref, id) {
  return ref.watch(documentsRepositoryProvider).getById(id);
});

final authorizedAccessProvider = FutureProvider<List<AuthorizedPerson>>((ref) {
  return ref.watch(authorizedAccessRepositoryProvider).getPeople();
});

final authorizedPersonProvider =
    FutureProvider.family<AuthorizedPerson?, String>((ref, id) {
  return ref.watch(authorizedAccessRepositoryProvider).getById(id);
});

final camerasRepositoryProvider = Provider<CamerasRepository>((ref) {
  return const LocalCamerasRepository();
});

final camerasProvider = FutureProvider<List<Camera>>((ref) {
  return ref.watch(camerasRepositoryProvider).getCameras();
});

final cameraDetailProvider = FutureProvider.family<Camera?, String>((ref, id) {
  return ref.watch(camerasRepositoryProvider).getById(id);
});

final sharedPreferencesProvider = Provider<SharedPreferences?>((_) => null);

final authSessionStorageProvider = Provider<AuthSessionStorage?>((ref) {
  final preferences = ref.watch(sharedPreferencesProvider);
  if (preferences == null) return null;
  return AuthSessionStorage(preferences);
});

enum VisitNotificationSound {
  defaultTone,
  softBell,
  shortChime,
  classicDoorbell,
}

class AppSettings {
  const AppSettings({
    this.isDarkMode = false,
    this.isMuted = false,
    this.visitSound = VisitNotificationSound.defaultTone,
    this.language = AppLanguage.ptBr,
  });

  final bool isDarkMode;
  final bool isMuted;
  final VisitNotificationSound visitSound;
  final AppLanguage language;

  factory AppSettings.fromPreferences(SharedPreferences preferences) {
    return AppSettings(
      isDarkMode: preferences.getBool(AppSettingsNotifier.darkModeKey) ?? false,
      isMuted: preferences.getBool(AppSettingsNotifier.mutedKey) ?? false,
      visitSound: AppSettingsNotifier.soundFromKey(
        preferences.getString(AppSettingsNotifier.visitSoundKey),
      ),
      language: AppLanguageX.fromStorageKey(
        preferences.getString(AppSettingsNotifier.languageKey),
      ),
    );
  }

  AppSettings copyWith({
    bool? isDarkMode,
    bool? isMuted,
    VisitNotificationSound? visitSound,
    AppLanguage? language,
  }) {
    return AppSettings(
      isDarkMode: isDarkMode ?? this.isDarkMode,
      isMuted: isMuted ?? this.isMuted,
      visitSound: visitSound ?? this.visitSound,
      language: language ?? this.language,
    );
  }
}

AppSettings _appSettingsStore = const AppSettings();

final appSettingsProvider = NotifierProvider<AppSettingsNotifier, AppSettings>(
  AppSettingsNotifier.new,
);

class AppSettingsNotifier extends Notifier<AppSettings> {
  static const darkModeKey = 'app_settings.dark_mode';
  static const mutedKey = 'app_settings.is_muted';
  static const visitSoundKey = 'app_settings.visit_sound';
  static const languageKey = 'app_settings.language';

  @override
  AppSettings build() {
    final preferences = ref.watch(sharedPreferencesProvider);
    final initial = preferences == null
        ? _appSettingsStore
        : AppSettings.fromPreferences(preferences);
    _appSettingsStore = initial;
    return initial;
  }

  void setDarkMode(bool enabled) =>
      _update(state.copyWith(isDarkMode: enabled));
  void setMuted(bool muted) => _update(state.copyWith(isMuted: muted));
  void setVisitSound(VisitNotificationSound sound) =>
      _update(state.copyWith(visitSound: sound));
  void setLanguage(AppLanguage language) =>
      _update(state.copyWith(language: language));

  void restoreDefaultSounds() {
    _update(
      state.copyWith(
        isMuted: false,
        visitSound: VisitNotificationSound.defaultTone,
      ),
    );
  }

  void _update(AppSettings next) {
    _appSettingsStore = next;
    state = next;
    unawaited(_persist(next));
  }

  Future<void> _persist(AppSettings next) async {
    final preferences = ref.read(sharedPreferencesProvider);
    if (preferences == null) return;
    await preferences.setBool(darkModeKey, next.isDarkMode);
    await preferences.setBool(mutedKey, next.isMuted);
    await preferences.setString(visitSoundKey, soundToKey(next.visitSound));
    await preferences.setString(languageKey, next.language.storageKey);
  }

  static String soundToKey(VisitNotificationSound sound) => switch (sound) {
    VisitNotificationSound.defaultTone => 'defaultTone',
    VisitNotificationSound.softBell => 'softBell',
    VisitNotificationSound.shortChime => 'shortChime',
    VisitNotificationSound.classicDoorbell => 'classicDoorbell',
  };

  static VisitNotificationSound soundFromKey(String? value) => switch (value) {
    'softBell' => VisitNotificationSound.softBell,
    'shortChime' => VisitNotificationSound.shortChime,
    'classicDoorbell' => VisitNotificationSound.classicDoorbell,
    _ => VisitNotificationSound.defaultTone,
  };
}

final authStateProvider = NotifierProvider<AuthStateNotifier, AuthState>(
  AuthStateNotifier.new,
);

class AuthStateNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    final storage = ref.watch(authSessionStorageProvider);
    if (storage == null) return const AuthState();
    try {
      final initial = storage.read() ?? const AuthState();
      Future.microtask(() => _bootstrapFromServer(initial));
      return initial;
    } catch (_) {
      unawaited(storage.clear());
      return const AuthState();
    }
  }

  Future<void> _bootstrapFromServer(AuthState current) async {
    if (!current.isAuthenticated) return;

    try {
      final response = await ref.read(tenantApiContextProvider).get('/auth/me');
      if (response is Map<String, dynamic>) {
        // The backend may return either a full auth session (with `user`,
        // `accessToken`, etc) or a minimal actor payload from `/auth/me`.
        // Try to parse a full session first, otherwise handle the actor shape.
        if (response.containsKey('user')) {
          try {
            final session = AuthSession.fromApiResponse(
              data: response,
              fallbackInstanceKey: current.instanceKey,
            );
            final next = session.toAuthState();
            state = next;
            await ref.read(authSessionStorageProvider)?.save(next);
          } catch (_) {
            // ignored - fallthrough to keep existing state
          }
        } else if (response.containsKey('userId') ||
            response.containsKey('roles')) {
          // Minimal actor response; merge minimally into current state so
          // the app stays authenticated and can fetch profile/dashboard.
          final next = current.copyWith(isAuthenticated: true);
          state = next;
          await ref.read(authSessionStorageProvider)?.save(next);
        }
      }
    } catch (error) {
      if (error is ApiException) {
        if (error.statusCode == 401 || error.statusCode == 403) {
          try {
            await logout();
          } catch (_) {}
        }
      }
    }
  }

  Future<AuthState> login({
    required String email,
    required String password,
  }) async {
    final repo = ref.read(authRepositoryProvider);
    final next = await repo.login(email: email, password: password);
    state = next;
    if (next.isAuthenticated) {
      await ref.read(authSessionStorageProvider)?.save(next);
    } else {
      await ref.read(authSessionStorageProvider)?.clear();
    }
    return next;
  }

  Future<AuthState> selectInstance({required String instanceId}) async {
    final pendingSelection = state.pendingInstanceSelection;
    if (pendingSelection == null) {
      throw StateError('No pending instance selection');
    }
    final repo = ref.read(authRepositoryProvider);
    final next = await repo.selectInstance(
      selectionToken: pendingSelection.selectionToken,
      instanceId: instanceId,
    );
    state = next;
    await ref.read(authSessionStorageProvider)?.save(next);
    return next;
  }

  Future<AuthState> refreshSession() async {
    final currentSession = AuthSession.fromAuthState(state);
    final repo = ref.read(authRepositoryProvider);
    try {
      final next = await repo.refreshSession(currentSession: currentSession);
      state = next;
      await ref.read(authSessionStorageProvider)?.save(next);
      return next;
    } catch (error) {
      if (_shouldClearSessionAfterRefreshError(error)) {
        await repo.logout();
        await ref.read(authSessionStorageProvider)?.clear();
        state = const AuthState();
      }
      rethrow;
    }
  }

  Future<void> clearPendingInstanceSelection() async {
    ref.read(authRepositoryProvider).clearPendingInstanceSelection();
    if (state.requiresInstanceSelection) {
      state = const AuthState();
      await ref.read(authSessionStorageProvider)?.clear();
    }
  }

  Future<void> logout() async {
    final repo = ref.read(authRepositoryProvider);
    await repo.logout();
    await ref.read(authSessionStorageProvider)?.clear();
    state = const AuthState();
  }

  Future<void> acceptInvite(InviteAcceptanceInput input) async {
    final repo = ref.read(authRepositoryProvider);
    state = await repo.acceptInvite(input);
  }

  bool _shouldClearSessionAfterRefreshError(Object error) {
    if (error is! ApiException) return false;
    if (error.statusCode == 401 || error.statusCode == 403) return true;
    return switch (error.code) {
      'AUTH_INVALID' ||
      'AUTH_REQUIRED' ||
      'INVALID_REFRESH_TOKEN' ||
      'SESSION_REVOKED' ||
      'TOKEN_EXPIRED' => true,
      _ => false,
    };
  }
}

final profileSnapshotProvider = FutureProvider<ProfileSnapshot>((ref) async {
  final authState = ref.watch(authStateProvider);
  final profile = await RemoteProfileRepository(
    tenantApiContext: ref.watch(tenantApiContextProvider),
  ).loadProfile();
  return profile.copyWith(
    userName: authState.user?.name,
    userEmail: authState.user?.email,
    condoName: authState.condo?.name ?? 'Condomínio',
  );
});

final ticketsProvider = FutureProvider<List<Ticket>>((ref) {
  return ref.watch(ticketsRepositoryProvider).getTickets();
});

final ticketDetailProvider = FutureProvider.family<Ticket?, String>((ref, id) {
  return ref.watch(ticketsRepositoryProvider).getById(id);
});

final ticketAttachmentsProvider =
    FutureProvider.family<List<TicketAttachment>, String>((ref, id) {
      return ref.watch(ticketsRepositoryProvider).getAttachments(id);
    });

final ticketMessagesProvider =
    FutureProvider.family<List<TicketMessage>, String>((ref, id) {
      return ref.watch(ticketsRepositoryProvider).getMessages(id);
    });

final ticketStatusHistoryProvider =
    FutureProvider.family<List<TicketStatusEvent>, String>((ref, id) {
      return ref.watch(ticketsRepositoryProvider).getStatusHistory(id);
    });

final channelsProvider = FutureProvider<List<Channel>>((ref) {
  return ref.watch(channelsRepositoryProvider).getChannels();
});

final channelProvider = Provider.family<Channel?, String>((ref, channelId) {
  final channels = ref.watch(channelsProvider).asData?.value;
  if (channels == null) return null;

  for (final channel in channels) {
    if (channel.id == channelId) return channel;
  }
  return null;
});

final channelPostsProvider = FutureProvider.family<List<ChannelPost>, String>((
  ref,
  channelId,
) {
  return ref.watch(channelsRepositoryProvider).getPosts(channelId);
});

final postCommentsProvider =
    FutureProvider.family<
      List<ChannelComment>,
      ({String channelId, String postId})
    >((ref, args) {
      return ref
          .watch(channelsRepositoryProvider)
          .getComments(args.channelId, args.postId);
    });

final inboxMessagesProvider = FutureProvider<List<InboxMessage>>((ref) {
  return ref.watch(inboxRepositoryProvider).getMessages();
});

final inboxStreamProvider = StreamProvider<List<InboxMessage>>((ref) {
  return ref.watch(inboxRepositoryProvider).messagesStream;
});

final deliveriesProvider = FutureProvider<List<Delivery>>((ref) {
  return ref.watch(deliveriesRepositoryProvider).getDeliveries();
});

final deliveryDetailProvider = FutureProvider.family<Delivery?, String>((
  ref,
  id,
) {
  return ref.watch(deliveriesRepositoryProvider).getById(id);
});

final qrStreamProvider = StreamProvider<QrState>((ref) {
  return ref.watch(qrRepositoryProvider).qrStream;
});
