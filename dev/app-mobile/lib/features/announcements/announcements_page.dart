import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/routes.dart';
import '../../core/localization/app_strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text.dart';
import '../../core/ui/app_status_view.dart';
import '../../core/ui/ch_scaffold.dart';
import 'announcements_providers.dart';
import 'widgets/announcement_list_tile.dart';
import 'widgets/announcements_error_view.dart';
import 'widgets/announcements_loading_view.dart';

class AnnouncementsPage extends ConsumerWidget {
  const AnnouncementsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = AppStrings.of(context);
    final isEnglish = strings.isEnglish;
    final announcementsAsync = ref.watch(announcementsListControllerProvider);

    return CHScaffold(
      withTopBand: false,
      body: announcementsAsync.when(
        data: (announcements) {
          final unreadCount = announcements.where((item) => !item.read).length;
          return RefreshIndicator(
            onRefresh: () => ref
                .read(announcementsListControllerProvider.notifier)
                .refresh(),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.xl2,
                AppSpacing.lg,
                AppSpacing.xl2,
              ),
              children: [
                _AnnouncementsHeader(
                  title: strings.mural,
                  subtitle: isEnglish
                      ? 'Official updates from your condo in one place.'
                      : 'Comunicados oficiais do condominio em um unico lugar.',
                  countLabel: isEnglish
                      ? '${announcements.length} item${announcements.length == 1 ? '' : 's'}'
                      : '${announcements.length} item${announcements.length == 1 ? '' : 's'}',
                  unreadLabel: unreadCount == 0
                      ? (isEnglish ? 'All read' : 'Tudo lido')
                      : isEnglish
                      ? '$unreadCount unread'
                      : '$unreadCount nao lido${unreadCount == 1 ? '' : 's'}',
                ),
                const SizedBox(height: AppSpacing.lg),
                if (announcements.isEmpty)
                  AppStatusView.empty(
                    icon: Icons.campaign_outlined,
                    title: strings.noAnnouncementsNow,
                    message: strings.noAnnouncementsBody,
                  )
                else
                  for (final announcement in announcements) ...[
                    AnnouncementListTile(
                      announcement: announcement,
                      onTap: () => context.go(
                        AppRoutes.muralDetailLocation(announcement.id),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ],
              ],
            ),
          );
        },
        loading: () => AnnouncementsLoadingView(
          message: isEnglish
              ? 'Loading announcements...'
              : 'Carregando mural...',
        ),
        error: (error, _) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.xl2,
            AppSpacing.lg,
            AppSpacing.xl2,
          ),
          children: [
            _AnnouncementsHeader(
              title: strings.mural,
              subtitle: isEnglish
                  ? 'Official updates from your condo in one place.'
                  : 'Comunicados oficiais do condominio em um unico lugar.',
              countLabel: isEnglish ? 'Unavailable' : 'Indisponivel',
              unreadLabel: isEnglish ? 'Tap to retry' : 'Toque para tentar de novo',
            ),
            const SizedBox(height: AppSpacing.lg),
            AnnouncementsErrorView(
              message: _friendlyAnnouncementsError(
                error,
                isEnglish: isEnglish,
              ),
              onRetry: () => ref
                  .read(announcementsListControllerProvider.notifier)
                  .refresh(),
            ),
          ],
        ),
      ),
    );
  }
}

class _AnnouncementsHeader extends StatelessWidget {
  const _AnnouncementsHeader({
    required this.title,
    required this.subtitle,
    required this.countLabel,
    required this.unreadLabel,
  });

  final String title;
  final String subtitle;
  final String countLabel;
  final String unreadLabel;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        gradient: isDark
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF173259), Color(0xFF0F1B2C)],
              )
            : const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1A4A84), Color(0xFF0E2B4D)],
              ),
        borderRadius: AppRadius.all(AppRadius.xl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: AppText.heading1.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            subtitle,
            style: AppText.bodySmall.copyWith(
              color: Colors.white.withValues(alpha: 0.84),
              height: 1.45,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              _HeaderChip(label: countLabel),
              _HeaderChip(
                label: unreadLabel,
                color: AppColors.accent.withValues(alpha: 0.18),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeaderChip extends StatelessWidget {
  const _HeaderChip({
    required this.label,
    this.color,
  });

  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: color ?? Colors.white.withValues(alpha: 0.14),
        borderRadius: AppRadius.all(AppRadius.pill),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
      ),
      child: Text(
        label,
        style: AppText.caption.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

String _friendlyAnnouncementsError(
  Object error, {
  required bool isEnglish,
}) {
  final text = error.toString().toLowerCase();
  if (text.contains('network_error') || text.contains('nao foi possivel')) {
    return isEnglish
        ? 'Could not connect to the server. Check your connection and try again.'
        : 'Nao foi possivel conectar ao servidor. Verifique sua conexao e tente novamente.';
  }

  if (text.contains('auth_session_required') || text.contains('auth_required')) {
    return isEnglish
        ? 'Your session expired. Sign in again to see the mural.'
        : 'Sua sessao expirou. Entre novamente para ver o mural.';
  }

  return isEnglish
      ? 'We could not load the mural right now.'
      : 'Nao foi possivel carregar o mural agora.';
}
