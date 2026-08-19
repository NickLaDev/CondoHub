import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/models/channel.dart';
import '../../../core/models/identity.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/app_status_view.dart';
import '../../../core/ui/ch_scaffold.dart';
import '../../../core/ui/inline_page_header.dart';

class ChannelPostDetailPage extends ConsumerStatefulWidget {
  const ChannelPostDetailPage({
    super.key,
    required this.channelId,
    required this.postId,
  });

  final String channelId;
  final String postId;

  @override
  ConsumerState<ChannelPostDetailPage> createState() =>
      _ChannelPostDetailPageState();
}

class _ChannelPostDetailPageState extends ConsumerState<ChannelPostDetailPage> {
  final _commentCtrl = TextEditingController();
  bool _sending = false;
  bool _moderating = false;

  ({String channelId, String postId}) get _commentsArgs =>
      (channelId: widget.channelId, postId: widget.postId);

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(channelPostsProvider(widget.channelId));
    ref.invalidate(postCommentsProvider(_commentsArgs));
    await ref.read(channelPostsProvider(widget.channelId).future);
  }

  Future<void> _addComment() async {
    final body = _commentCtrl.text.trim();
    if (body.isEmpty) return;

    setState(() => _sending = true);
    try {
      await ref
          .read(channelsRepositoryProvider)
          .addComment(widget.channelId, widget.postId, body);
      _commentCtrl.clear();
      ref.invalidate(postCommentsProvider(_commentsArgs));
      ref.invalidate(channelPostsProvider(widget.channelId));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_friendlyErrorMessage(error))));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<bool> _confirmAction({
    required String title,
    required String message,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );

    return confirmed ?? false;
  }

  Future<void> _removePost() async {
    final confirmed = await _confirmAction(
      title: 'Remover post',
      message: 'Deseja remover este post do canal?',
    );
    if (!confirmed) return;

    setState(() => _moderating = true);
    try {
      await ref
          .read(channelsRepositoryProvider)
          .removePost(
            widget.channelId,
            postId: widget.postId,
            reason: 'Removido pelo app mobile',
          );
      ref.invalidate(channelPostsProvider(widget.channelId));
      ref.invalidate(postCommentsProvider(_commentsArgs));
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Post removido.')));
      context.go(AppRoutes.channelLocation(widget.channelId));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_friendlyErrorMessage(error))));
    } finally {
      if (mounted) setState(() => _moderating = false);
    }
  }

  Future<void> _removeComment(ChannelComment comment) async {
    final confirmed = await _confirmAction(
      title: 'Remover comentario',
      message: 'Deseja remover este comentario?',
    );
    if (!confirmed) return;

    setState(() => _moderating = true);
    try {
      await ref
          .read(channelsRepositoryProvider)
          .removeComment(
            widget.channelId,
            commentId: comment.id,
            reason: 'Removido pelo app mobile',
          );
      ref.invalidate(postCommentsProvider(_commentsArgs));
      ref.invalidate(channelPostsProvider(widget.channelId));
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Comentario removido.')));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_friendlyErrorMessage(error))));
    } finally {
      if (mounted) setState(() => _moderating = false);
    }
  }

  Future<void> _silenceUser({
    required String userId,
    required String label,
  }) async {
    final confirmed = await _confirmAction(
      title: 'Silenciar usuario',
      message: 'Deseja silenciar $label por 60 minutos neste canal?',
    );
    if (!confirmed) return;

    setState(() => _moderating = true);
    try {
      await ref
          .read(channelsRepositoryProvider)
          .silenceUser(
            widget.channelId,
            userId: userId,
            minutes: 60,
            reason: 'Silenciado pelo app mobile',
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$label foi silenciado por 60 minutos.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_friendlyErrorMessage(error))));
    } finally {
      if (mounted) setState(() => _moderating = false);
    }
  }

  String _authorLabel(String? authorName) {
    final trimmed = authorName?.trim();
    if (trimmed != null && trimmed.isNotEmpty) return trimmed;
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

  bool _canModerate(Channel? channel, User? user) {
    return channel?.canModerate ?? user?.role == 'SINDICO_ADMIN';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final authState = ref.watch(authStateProvider);
    final currentUser = authState.user;
    final channel = ref.watch(channelProvider(widget.channelId));
    final postsAsync = ref.watch(channelPostsProvider(widget.channelId));
    final commentsAsync = ref.watch(postCommentsProvider(_commentsArgs));
    final canComment = channel?.canComment ?? true;
    final canModerate = _canModerate(channel, currentUser);

    ChannelPost? post;
    final posts = postsAsync.asData?.value;
    if (posts != null) {
      for (final candidate in posts) {
        if (candidate.id == widget.postId) {
          post = candidate;
          break;
        }
      }
    }

    return CHScaffold(
      withTopBand: false,
      body: Column(
        children: [
          InlinePageHeader(
            title: 'Post',
            subtitle: 'Leia a publicacao e participe pelos comentarios.',
            onBack: () =>
                context.go(AppRoutes.channelLocation(widget.channelId)),
          ),
          Expanded(
            child: postsAsync.when(
              data: (_) {
                final resolvedPost = post;
                if (resolvedPost == null) {
                  return AppStatusView.empty(
                    icon: Icons.forum_outlined,
                    title: 'Post nao encontrado',
                    message:
                        'Este post nao esta mais disponivel ou foi removido.',
                    action: OutlinedButton(
                      onPressed: () => _refresh(),
                      child: const Text('Tentar novamente'),
                    ),
                  );
                }

                final postAuthor = _authorLabel(resolvedPost.authorName);
                final canSilencePostAuthor =
                    canModerate &&
                    resolvedPost.authorUserId != null &&
                    resolvedPost.authorUserId != currentUser?.id;

                return Column(
                  children: [
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: _refresh,
                        child: ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          children: [
                            _PostSummaryCard(
                              authorInitial: _avatarInitial(postAuthor),
                              authorName: postAuthor,
                              title: resolvedPost.title,
                              body: resolvedPost.body,
                              createdAt: _timeAgo(resolvedPost.createdAt),
                              actions: canModerate
                                  ? PopupMenuButton<_PostMenuAction>(
                                      onSelected: (action) {
                                        switch (action) {
                                          case _PostMenuAction.removePost:
                                            _removePost();
                                            break;
                                          case _PostMenuAction.silenceAuthor:
                                            if (resolvedPost.authorUserId !=
                                                null) {
                                              _silenceUser(
                                                userId:
                                                    resolvedPost.authorUserId!,
                                                label: postAuthor,
                                              );
                                            }
                                            break;
                                        }
                                      },
                                      itemBuilder: (context) => [
                                        const PopupMenuItem(
                                          value: _PostMenuAction.removePost,
                                          child: Text('Remover post'),
                                        ),
                                        if (canSilencePostAuthor)
                                          const PopupMenuItem(
                                            value:
                                                _PostMenuAction.silenceAuthor,
                                            child: Text('Silenciar autor'),
                                          ),
                                      ],
                                    )
                                  : null,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Comentarios',
                              style: AppText.subtitle.copyWith(
                                fontWeight: FontWeight.w700,
                                color: scheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 10),
                            commentsAsync.when(
                              data: (comments) {
                                if (comments.isEmpty) {
                                  return const _CommentsEmptyCard();
                                }

                                return Column(
                                  children: [
                                    for (final comment in comments) ...[
                                      _CommentCard(
                                        authorInitial: _avatarInitial(
                                          _authorLabel(comment.authorName),
                                        ),
                                        authorName: _authorLabel(
                                          comment.authorName,
                                        ),
                                        body: comment.body,
                                        createdAt: _timeAgo(comment.createdAt),
                                        trailing: canModerate
                                            ? PopupMenuButton<
                                                _CommentMenuAction
                                              >(
                                                onSelected: (action) {
                                                  switch (action) {
                                                    case _CommentMenuAction
                                                        .removeComment:
                                                      _removeComment(comment);
                                                      break;
                                                    case _CommentMenuAction
                                                        .silenceAuthor:
                                                      if (comment
                                                              .authorUserId !=
                                                          null) {
                                                        _silenceUser(
                                                          userId: comment
                                                              .authorUserId!,
                                                          label: _authorLabel(
                                                            comment.authorName,
                                                          ),
                                                        );
                                                      }
                                                      break;
                                                  }
                                                },
                                                itemBuilder: (context) => [
                                                  const PopupMenuItem(
                                                    value: _CommentMenuAction
                                                        .removeComment,
                                                    child: Text(
                                                      'Remover comentario',
                                                    ),
                                                  ),
                                                  if (comment.authorUserId !=
                                                          null &&
                                                      comment.authorUserId !=
                                                          currentUser?.id)
                                                    const PopupMenuItem(
                                                      value: _CommentMenuAction
                                                          .silenceAuthor,
                                                      child: Text(
                                                        'Silenciar autor',
                                                      ),
                                                    ),
                                                ],
                                              )
                                            : null,
                                      ),
                                      const SizedBox(height: 10),
                                    ],
                                  ],
                                );
                              },
                              loading: () => Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 32,
                                ),
                                child: AppStatusView.loading(
                                  message: 'Carregando comentarios...',
                                ),
                              ),
                              error: (error, _) => AppStatusView.error(
                                title:
                                    'Nao foi possivel carregar os comentarios',
                                message: _friendlyErrorMessage(error),
                                action: OutlinedButton(
                                  onPressed: () => ref.invalidate(
                                    postCommentsProvider(_commentsArgs),
                                  ),
                                  child: const Text('Tentar novamente'),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Container(
                      margin: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
                      decoration: BoxDecoration(
                        color: isDark
                            ? scheme.surface
                            : Colors.white.withValues(alpha: 0.92),
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(24),
                        ),
                        border: Border.all(
                          color: scheme.outline.withValues(
                            alpha: isDark ? 0.24 : 0.1,
                          ),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(
                              alpha: isDark ? 0.18 : 0.03,
                            ),
                            blurRadius: 12,
                            offset: const Offset(0, -2),
                          ),
                        ],
                      ),
                      child: SafeArea(
                        top: false,
                        child: canComment
                            ? Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      controller: _commentCtrl,
                                      decoration: InputDecoration(
                                        hintText: 'Escreva um comentario...',
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(
                                            18,
                                          ),
                                          borderSide: BorderSide.none,
                                        ),
                                        filled: true,
                                        fillColor: isDark
                                            ? Colors.white.withValues(
                                                alpha: 0.05,
                                              )
                                            : AppColors.surfaceMuted,
                                        contentPadding:
                                            const EdgeInsets.symmetric(
                                              horizontal: 16,
                                              vertical: 12,
                                            ),
                                      ),
                                      onChanged: (_) => setState(() {}),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Material(
                                    color: Colors.transparent,
                                    child: InkWell(
                                      onTap:
                                          _commentCtrl.text.trim().isNotEmpty &&
                                              !_sending &&
                                              !_moderating
                                          ? _addComment
                                          : null,
                                      borderRadius: BorderRadius.circular(16),
                                      child: Ink(
                                        width: 44,
                                        height: 44,
                                        decoration: BoxDecoration(
                                          color:
                                              _commentCtrl.text
                                                      .trim()
                                                      .isNotEmpty &&
                                                  !_sending &&
                                                  !_moderating
                                              ? scheme.primary
                                              : scheme.onSurface.withValues(
                                                  alpha: 0.06,
                                                ),
                                          borderRadius: BorderRadius.circular(
                                            16,
                                          ),
                                        ),
                                        child: Center(
                                          child: _sending
                                              ? SizedBox(
                                                  width: 18,
                                                  height: 18,
                                                  child:
                                                      CircularProgressIndicator(
                                                        strokeWidth: 2,
                                                        color: scheme.onPrimary,
                                                      ),
                                                )
                                              : Icon(
                                                  Icons.send_rounded,
                                                  color:
                                                      _commentCtrl.text
                                                              .trim()
                                                              .isNotEmpty &&
                                                          !_moderating
                                                      ? scheme.onPrimary
                                                      : scheme.onSurfaceVariant,
                                                  size: 20,
                                                ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              )
                            : Text(
                                'Comentarios indisponiveis para o seu perfil neste canal.',
                                style: AppText.bodySmall.copyWith(
                                  color: scheme.onSurfaceVariant,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                );
              },
              loading: () =>
                  AppStatusView.loading(message: 'Carregando post...'),
              error: (error, _) => AppStatusView.error(
                title: 'Nao foi possivel carregar o post',
                message: _friendlyErrorMessage(error),
                action: OutlinedButton(
                  onPressed: _refresh,
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

enum _PostMenuAction { removePost, silenceAuthor }

enum _CommentMenuAction { removeComment, silenceAuthor }

class _PostSummaryCard extends StatelessWidget {
  const _PostSummaryCard({
    required this.authorInitial,
    required this.authorName,
    required this.body,
    required this.createdAt,
    this.title,
    this.actions,
  });

  final String authorInitial;
  final String authorName;
  final String? title;
  final String body;
  final String createdAt;
  final Widget? actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? scheme.surface : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.24 : 0.1),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: isDark ? 16 : 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 19,
                backgroundColor: AppColors.accent.withValues(alpha: 0.12),
                child: Text(
                  authorInitial,
                  style: const TextStyle(
                    color: AppColors.accent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 10),
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
                        color: scheme.onSurfaceVariant.withValues(alpha: 0.88),
                      ),
                    ),
                  ],
                ),
              ),
              ?actions,
            ],
          ),
          if ((title ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              title!.trim(),
              style: AppText.subtitle.copyWith(
                fontWeight: FontWeight.w700,
                color: scheme.onSurface,
              ),
            ),
          ],
          const SizedBox(height: 14),
          Text(
            body,
            style: AppText.body.copyWith(
              color: scheme.onSurfaceVariant.withValues(alpha: 0.92),
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentCard extends StatelessWidget {
  const _CommentCard({
    required this.authorInitial,
    required this.authorName,
    required this.body,
    required this.createdAt,
    this.trailing,
  });

  final String authorInitial;
  final String authorName;
  final String body;
  final String createdAt;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? scheme.surface : Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.24 : 0.1),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 15,
            backgroundColor: AppColors.info.withValues(alpha: 0.12),
            child: Text(
              authorInitial,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.info,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            authorName,
                            style: AppText.bodySmall.copyWith(
                              fontWeight: FontWeight.w700,
                              color: scheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            createdAt,
                            style: AppText.caption.copyWith(
                              color: scheme.onSurfaceVariant.withValues(
                                alpha: 0.88,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    ?trailing,
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  body,
                  style: AppText.body.copyWith(
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.92),
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentsEmptyCard extends StatelessWidget {
  const _CommentsEmptyCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? scheme.surface : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.24 : 0.1),
        ),
      ),
      child: Text(
        'Nenhum comentario ainda.',
        style: AppText.bodySmall.copyWith(
          color: scheme.onSurfaceVariant.withValues(alpha: 0.9),
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
