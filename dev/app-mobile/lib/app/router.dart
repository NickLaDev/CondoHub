import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'routes.dart';
import 'shell/app_shell.dart';
import '../core/providers/providers.dart';
import '../features/auth/login_page.dart';
import '../features/auth/invite_page.dart';
import '../features/auth/instance_selection_page.dart';
import '../features/announcements/announcement_detail_page.dart';
import '../features/announcements/announcements_page.dart';
import '../features/home/home_page.dart';
import '../features/tickets/tickets_page.dart';
import '../features/tickets/ticket_new_page.dart';
import '../features/tickets/ticket_detail_page.dart';
import '../features/communication/communication_hub_page.dart';
import '../features/communication/channels/channels_page.dart';
import '../features/communication/channels/channel_posts_page.dart';
import '../features/communication/channels/channel_new_post_page.dart';
import '../features/communication/channels/channel_post_detail_page.dart';
import '../features/communication/inbox/inbox_page.dart';
import '../features/services/services_hub_page.dart';
import '../features/settings/settings_page.dart';
import '../features/services/deliveries/deliveries_page.dart';
import '../features/services/deliveries/delivery_detail_page.dart';
import '../features/services/qr/qr_page.dart';
import '../features/services/visitors/visitors_page.dart';
import '../features/services/visitors/visitor_new_page.dart';
import '../features/services/documents/documents_page.dart';
import '../features/services/documents/document_detail_page.dart';
import '../features/services/access/authorized_access_page.dart';
import '../features/services/access/authorized_access_edit_page.dart';
import '../features/services/cameras/cameras_page.dart';
import '../features/services/cameras/camera_live_page.dart';
import '../features/packages/package_detail_page.dart';
import '../features/support/support_detail_page.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: AppRoutes.login,
    redirect: (context, state) {
      final isAuth = authState.isAuthenticated;
      final hasPendingSelection = authState.requiresInstanceSelection;
      final location = state.uri.toString();
      final isOnLogin = location == AppRoutes.login;
      final isOnInvite = location == AppRoutes.invite;
      final isOnInstanceSelection = location == AppRoutes.instanceSelection;
      final isOnAuth = isOnLogin || isOnInvite || isOnInstanceSelection;

      if (!isAuth && hasPendingSelection && !isOnInstanceSelection) {
        return AppRoutes.instanceSelection;
      }
      if (!isAuth && !hasPendingSelection && isOnInstanceSelection) {
        return AppRoutes.login;
      }
      if (!isAuth && !isOnAuth) return AppRoutes.login;
      if (isAuth && isOnAuth) return AppRoutes.home;
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: AppRoutes.invite,
        builder: (context, state) => const InvitePage(),
      ),
      GoRoute(
        path: AppRoutes.instanceSelection,
        builder: (context, state) => const InstanceSelectionPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.home,
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: HomePage()),
          ),
          GoRoute(
            path: AppRoutes.mural,
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: AnnouncementsPage()),
          ),
          GoRoute(
            path: AppRoutes.tickets,
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: TicketsPage()),
          ),
          GoRoute(
            path: AppRoutes.comm,
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: CommunicationHubPage()),
          ),
          GoRoute(
            path: AppRoutes.services,
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: ServicesHubPage()),
          ),
          GoRoute(
            path: AppRoutes.settings,
            builder: (context, state) => const SettingsPage(),
          ),
          GoRoute(
            path: AppRoutes.muralDetail,
            name: 'mural-detail',
            builder: (context, state) =>
                AnnouncementDetailPage(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: AppRoutes.ticketNew,
            builder: (context, state) => const TicketNewPage(),
          ),
          GoRoute(
            path: AppRoutes.ticketDetail,
            name: 'ticket-detail',
            builder: (context, state) =>
                TicketDetailPage(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: AppRoutes.channels,
            builder: (context, state) => const ChannelsPage(),
          ),
          GoRoute(
            path: AppRoutes.channelDetail,
            name: 'channel-detail',
            builder: (context, state) =>
                ChannelPostsPage(channelId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: AppRoutes.channelNewPost,
            builder: (context, state) =>
                ChannelNewPostPage(channelId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: AppRoutes.channelPostDetail,
            builder: (context, state) => ChannelPostDetailPage(
              channelId: state.pathParameters['id']!,
              postId: state.pathParameters['postId']!,
            ),
          ),
          GoRoute(
            path: AppRoutes.inbox,
            builder: (context, state) => const InboxPage(),
          ),
          GoRoute(
            path: AppRoutes.deliveries,
            builder: (context, state) => const DeliveriesPage(),
          ),
          GoRoute(
            path: AppRoutes.deliveryDetail,
            builder: (context, state) =>
                DeliveryDetailPage(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: AppRoutes.packageDetail,
            name: 'package-detail',
            builder: (context, state) =>
                PackageDetailPage(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: AppRoutes.supportDetail,
            name: 'support-detail',
            builder: (context, state) =>
                SupportDetailPage(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: AppRoutes.qr,
            builder: (context, state) => const QrPage(),
          ),
          GoRoute(
            path: AppRoutes.visitors,
            builder: (context, state) => const VisitorsPage(),
          ),
          GoRoute(
            path: AppRoutes.visitorNew,
            builder: (context, state) => const VisitorNewPage(),
          ),
          GoRoute(
            path: AppRoutes.documents,
            builder: (context, state) => const DocumentsPage(),
          ),
          GoRoute(
            path: AppRoutes.documentDetail,
            name: 'document-detail',
            builder: (context, state) =>
                DocumentDetailPage(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: AppRoutes.access,
            builder: (context, state) => const AuthorizedAccessPage(),
          ),
          GoRoute(
            path: AppRoutes.accessNew,
            builder: (context, state) => const AuthorizedAccessEditPage(),
          ),
          GoRoute(
            path: AppRoutes.accessEdit,
            name: 'access-edit',
            builder: (context, state) =>
                AuthorizedAccessEditPage(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: AppRoutes.cameras,
            builder: (context, state) => const CamerasPage(),
          ),
          GoRoute(
            path: AppRoutes.cameraLive,
            name: 'camera-live',
            builder: (context, state) =>
                CameraLivePage(id: state.pathParameters['id']!),
          ),
        ],
      ),
    ],
  );
});
