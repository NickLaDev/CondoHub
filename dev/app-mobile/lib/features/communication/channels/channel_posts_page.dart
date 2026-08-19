import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/models/channel.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_shadows.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/app_status_view.dart';
import '../../../core/ui/aura_card.dart';
import '../../../core/ui/ch_scaffold.dart';
import '../../../core/ui/inline_page_header.dart';

class ChannelPostsPage extends ConsumerWidget {
  const ChannelPostsPage({super.key, required this.channelId});

  final String channelId;

  Future<void> _refreshPosts(WidgetRef ref) async {
    ref.invalidate(channelPostsProvider(channelId));
    await ref.read(channelPostsProvider(channelId).future);
  }

  String _authorLabel(ChannelPost post) {
    final name = post.authorName?.trim();
    if (name != null && name.isNotEmpty) return name;
    return 'Morador';
  }

  String _avatarInitial(String? name) {
    final trimmed = (name ?? '').trim();
    if (trimmed.isEmpty) return '?';
    return trimmed.substring(0, 1).toUpperCase();
  }

  String _timeAgo(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);
    if (diff.inMinutes <= 0) return 'agora';
    if (diff.inMinutes < 60) return '${diff.inMinutes}min';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return '${diff.inDays}d';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final postsAsync = ref.watch(channelPostsProvider(channelId));
    final channel = ref.watch(channelProvider(channelId));
    final canPost = channel?.canPost ?? true;
    final channelName = channel?.name ?? 'Canal';

    return CHScaffold(
      withTopBand: false,
      floatingActionButton: canPost
          ? FloatingActionButton(
              onPressed: () =>
                  context.go(AppRoutes.channelNewPostLocation(channelId)),
              child: const Icon(Icons.add_rounded),
            )
          : null,
      body: Column(
        children: [
          InlinePageHeader(
            title: channelName,
            subtitle: 'Veja as publicacoes do canal e acompanhe a conversa.',
            onBack: () => context.go(AppRoutes.channels),
          ),
          Expanded(
            child: postsAsync.when(
              data: (posts) => RefreshIndicator(
                onRefresh: () => _refreshPosts(ref),
                child: posts.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(
                          AppSpacing.lg,
                          0,
                          AppSpacing.lg,
                          AppSpacing.lg,
                        ),
                        children: [
                          const SizedBox(height: AppSpacing.lg),
                          AppStatusView.empty(
                            icon: Icons.forum_outlined,
                            title: 'Nenhum post ainda',
                            message: canPost
                                ? 'Seja o primeiro a publicar uma atualizacao neste canal.'
                                : 'Ainda nao ha publicacoes neste canal.',
                          ),
                        ],
                      )
                    : ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(
                          AppSpacing.lg,
                          0,
                          AppSpacing.lg,
                          96,
                        ),
                        children: [
                          if (!canPost)
                            Padding(
                              padding: const EdgeInsets.only(
                                bottom: AppSpacing.md,
                              ),
                              child: _ReadOnlyBanner(channelName: channelName),
                            ),
                          for (final post in posts) ...[
                            _PostCard(
                              channelId: channelId,
                              postId: post.id,
                              authorInitial: _avatarInitial(_authorLabel(post)),
                              authorName: _authorLabel(post),
                              title: post.title,
                              body: post.body,
                              commentCount: post.commentCount,
                              isPinned: post.isPinned,
                              createdAt: _timeAgo(post.createdAt),
                            ),
                            const SizedBox(height: AppSpacing.md),
                          ],
                        ],
                      ),
              ),
              loading: () =>
                  AppStatusView.loading(message: 'Carregando posts...'),
              error: (error, _) => AppStatusView.error(
                title: 'Nao foi possivel carregar os posts',
                message: _friendlyErrorMessage(error),
                action: OutlinedButton(
                  onPressed: () => _refreshPosts(ref),
                  child: const Text('Tentar novamente'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReadOnlyBanner extends StatelessWidget {
  const _ReadOnlyBanner({required this.channelName});

  final String channelName;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: AppRadius.all(AppRadius.lg),
      ),
      child: Row(
        children: [
          Icon(
            Icons.visibility_outlined,
            color: scheme.onSurfaceVariant,
            size: 18,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              'Voce esta em modo leitura no canal $channelName.',
              style: AppText.bodySmall.copyWith(color: scheme.onSurfaceVariant),
            ),
          ),
        ],
      ),
    );
  }
}

class _PostCard extends StatelessWidget {
  const _PostCard({
    required this.channelId,
    required this.postId,
    required this.authorInitial,
    required this.authorName,
    required this.body,
    required this.createdAt,
    this.title,
    this.commentCount,
    this.isPinned = false,
  });

  final String channelId;
  final String postId;
  final String authorInitial;
  final String authorName;
  final String? title;
  final String body;
  final int? commentCount;
  final bool isPinned;
  final String createdAt;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final radius = AppRadius.all(AppRadius.lg);

    return AuraCard(
      auraColor: AppColors.accent,
      intensity: 0.20,
      blurRadius: 28,
      spreadRadius: -10,
      offset: const Offset(0, 12),
      borderRadius: radius,
      child: Semantics(
        button: true,
        label: 'Post de $authorName',
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => context.go(
              AppRoutes.channelPostDetailLocation(channelId, postId),
            ),
            borderRadius: radius,
            child: Ink(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: isDark ? scheme.surface : Colors.white,
                borderRadius: radius,
                border: Border.all(
                  color: scheme.outline.withValues(alpha: isDark ? 0.3 : 0.14),
                ),
                boxShadow: AppShadows.level1(isDark: isDark),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: AppColors.accent.withValues(
                          alpha: 0.12,
                        ),
                        child: Text(
                          authorInitial,
                          style: AppText.subtitle.copyWith(
                            color: AppColors.accent,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              authorName,
                              style: AppText.subtitle.copyWith(
                                fontWeight: FontWeight.w700,
                                color: scheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              createdAt,
                              style: AppText.caption.copyWith(
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (isPinned)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: AppSpacing.xs,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.accent.withValues(alpha: 0.10),
                            borderRadius: AppRadius.all(AppRadius.pill),
                          ),
                          child: Text(
                            'Fixado',
                            style: AppText.caption.copyWith(
                              color: AppColors.accent,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        )
                      else
                        Icon(
                          Icons.chevron_right_rounded,
                          color: scheme.onSurfaceVariant,
                          size: 20,
                        ),
                    ],
                  ),
                  if ((title ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      title!.trim(),
                      style: AppText.subtitle.copyWith(
                        color: scheme.onSurface,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    body,
                    style: AppText.body.copyWith(color: scheme.onSurface),
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: AppSpacing.xs,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.04)
                              : AppColors.surfaceVariant,
                          borderRadius: AppRadius.all(AppRadius.pill),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.comment_outlined,
                              size: 14,
                              color: scheme.onSurfaceVariant,
                            ),
                            const SizedBox(width: AppSpacing.xs),
                            Text(
                              commentCount == null
                                  ? 'Comentarios'
                                  : '$commentCount comentarios',
                              style: AppText.caption.copyWith(
                                color: scheme.onSurfaceVariant,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String _friendlyErrorMessage(Object error) {
  if (error is ApiException) {
    if (error.code == 'NETWORK_ERROR') {
      return 'Nao foi possivel conectar ao servidor. Tente novamente.';
    }
    if (error.message.trim().isNotEmpty) {
      return error.message;
    }
  }

  return 'Nao foi possivel concluir a operacao agora.';
}
