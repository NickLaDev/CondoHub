import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/routes.dart';
import '../../core/localization/app_strings.dart';
import '../../core/models/announcement.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text.dart';
import '../../core/ui/buttons.dart';
import '../../core/ui/ch_scaffold.dart';
import '../../core/ui/inline_page_header.dart';
import 'announcements_providers.dart';
import 'widgets/announcement_html_body.dart';
import 'widgets/announcements_error_view.dart';
import 'widgets/announcements_loading_view.dart';

class AnnouncementDetailPage extends ConsumerStatefulWidget {
  const AnnouncementDetailPage({super.key, required this.id});

  final String id;

  @override
  ConsumerState<AnnouncementDetailPage> createState() =>
      _AnnouncementDetailPageState();
}

class _AnnouncementDetailPageState
    extends ConsumerState<AnnouncementDetailPage> {
  bool _autoAcknowledgeTriggered = false;
  bool _isAcknowledging = false;
  String? _acknowledgementError;

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    final isEnglish = strings.isEnglish;
    final preview = ref.watch(announcementPreviewProvider(widget.id));
    final detailAsync = ref.watch(announcementRemoteDetailProvider(widget.id));

    return CHScaffold(
      withTopBand: false,
      body: detailAsync.when(
        data: (detail) {
          final announcement = _mergeAnnouncement(preview, detail);
          _scheduleAutomaticAcknowledgeIfNeeded(announcement);
          return _DetailContent(
            announcement: announcement,
            isAcknowledging: _isAcknowledging,
            acknowledgementError: _acknowledgementError,
            onBack: () => context.go(AppRoutes.mural),
            onAcknowledge: _acknowledge,
            onCopyAttachment: _copyAttachmentLink,
          );
        },
        loading: () {
          if (preview != null) {
            _scheduleAutomaticAcknowledgeIfNeeded(preview);
            return _DetailContent(
              announcement: preview,
              isAcknowledging: _isAcknowledging,
              acknowledgementError: _acknowledgementError,
              onBack: () => context.go(AppRoutes.mural),
              onAcknowledge: _acknowledge,
              onCopyAttachment: _copyAttachmentLink,
              isRefreshing: true,
            );
          }

          return AnnouncementsLoadingView(
            message: isEnglish
                ? 'Loading announcement...'
                : 'Carregando comunicado...',
          );
        },
        error: (error, _) {
          if (preview != null) {
            _scheduleAutomaticAcknowledgeIfNeeded(preview);
            return _DetailContent(
              announcement: preview,
              isAcknowledging: _isAcknowledging,
              acknowledgementError: _acknowledgementError,
              onBack: () => context.go(AppRoutes.mural),
              onAcknowledge: _acknowledge,
              onCopyAttachment: _copyAttachmentLink,
              inlineLoadError: _friendlyDetailError(error, isEnglish: isEnglish),
              onRetryDetail: () =>
                  ref.invalidate(announcementRemoteDetailProvider(widget.id)),
            );
          }

          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.xl2,
              AppSpacing.lg,
              AppSpacing.xl2,
            ),
            children: [
              AnnouncementsErrorView(
                message: _friendlyDetailError(error, isEnglish: isEnglish),
                onRetry: () =>
                    ref.invalidate(announcementRemoteDetailProvider(widget.id)),
              ),
            ],
          );
        },
      ),
    );
  }

  Announcement _mergeAnnouncement(
    Announcement? preview,
    Announcement detail,
  ) {
    if (preview == null) return detail;
    if (!preview.read || detail.read) return detail;
    return detail.copyWith(read: true);
  }

  void _scheduleAutomaticAcknowledgeIfNeeded(Announcement announcement) {
    if (_autoAcknowledgeTriggered || announcement.read) {
      return;
    }

    _autoAcknowledgeTriggered = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _acknowledge();
    });
  }

  Future<void> _acknowledge() async {
    if (_isAcknowledging) return;

    setState(() {
      _acknowledgementError = null;
      _isAcknowledging = true;
    });

    final isEnglish = AppStrings.of(context).isEnglish;

    try {
      await ref
          .read(announcementsListControllerProvider.notifier)
          .acknowledge(widget.id);
    } catch (error) {
      if (!mounted) return;

      final message = _friendlyAcknowledgeError(error, isEnglish: isEnglish);
      setState(() {
        _acknowledgementError = message;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isAcknowledging = false;
        });
      }
    }
  }

  Future<void> _copyAttachmentLink(AnnouncementAttachment attachment) async {
    await Clipboard.setData(ClipboardData(text: attachment.url));
    if (!mounted) return;

    final isEnglish = AppStrings.of(context).isEnglish;
    final message = isEnglish
        ? 'Attachment link copied.'
        : 'Link do anexo copiado.';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}

class _DetailContent extends StatelessWidget {
  const _DetailContent({
    required this.announcement,
    required this.isAcknowledging,
    required this.onBack,
    required this.onAcknowledge,
    required this.onCopyAttachment,
    this.acknowledgementError,
    this.inlineLoadError,
    this.onRetryDetail,
    this.isRefreshing = false,
  });

  final Announcement announcement;
  final bool isAcknowledging;
  final String? acknowledgementError;
  final String? inlineLoadError;
  final VoidCallback onBack;
  final VoidCallback onAcknowledge;
  final ValueChanged<AnnouncementAttachment> onCopyAttachment;
  final VoidCallback? onRetryDetail;
  final bool isRefreshing;

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    final isEnglish = strings.isEnglish;
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final formattedDate = DateFormat.yMMMMd(locale).add_Hm().format(announcement.createdAt);
    final copyHint = isEnglish ? 'Tap to copy link' : 'Toque para copiar o link';

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        AppSpacing.xl2,
      ),
      children: [
        InlinePageHeader(
          title: strings.announcementDetail,
          subtitle: isRefreshing
              ? (isEnglish
                    ? 'Refreshing latest details from the server.'
                    : 'Atualizando os detalhes mais recentes do servidor.')
              : null,
          onBack: onBack,
        ),
        if (inlineLoadError != null) ...[
          _InlineErrorBanner(
            message: inlineLoadError!,
            retryLabel: isEnglish ? 'Retry' : 'Tentar novamente',
            onRetry: onRetryDetail,
          ),
          const SizedBox(height: AppSpacing.md),
        ],
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: isDark ? scheme.surface : Colors.white,
            borderRadius: AppRadius.all(AppRadius.xl),
            border: Border.all(
              color: scheme.outline.withValues(alpha: isDark ? 0.28 : 0.14),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  _DetailChip(
                    icon: Icons.schedule_rounded,
                    label: formattedDate,
                  ),
                  _DetailChip(
                    icon: announcement.read
                        ? Icons.drafts_outlined
                        : Icons.mark_email_unread_outlined,
                    label: announcement.read
                        ? (isEnglish ? 'Read' : 'Lido')
                        : (isEnglish ? 'Unread' : 'Nao lido'),
                    backgroundColor: announcement.read
                        ? AppColors.success.withValues(alpha: 0.10)
                        : AppColors.accent.withValues(alpha: 0.12),
                    foregroundColor: announcement.read
                        ? AppColors.success
                        : AppColors.accent,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                announcement.title,
                style: AppText.heading2.copyWith(
                  color: scheme.onSurface,
                  fontWeight: FontWeight.w700,
                  height: 1.18,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.03)
                      : AppColors.surfaceMuted,
                  borderRadius: AppRadius.all(AppRadius.lg),
                  border: Border.all(
                    color: scheme.outline.withValues(alpha: isDark ? 0.20 : 0.10),
                  ),
                ),
                child: AnnouncementHtmlBody(
                  html: announcement.body,
                  color: scheme.onSurfaceVariant.withValues(alpha: 0.94),
                ),
              ),
              if (announcement.hasAttachments) ...[
                const SizedBox(height: AppSpacing.lg),
                Text(
                  isEnglish ? 'Attachments' : 'Anexos',
                  style: AppText.subtitle.copyWith(
                    color: scheme.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                for (final attachment in announcement.attachments) ...[
                  _AttachmentTile(
                    attachment: attachment,
                    copyHint: copyHint,
                    onTap: () => onCopyAttachment(attachment),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
              ],
            ],
          ),
        ),
        if (!announcement.read || acknowledgementError != null) ...[
          const SizedBox(height: AppSpacing.lg),
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: isDark ? scheme.surface : Colors.white,
              borderRadius: AppRadius.all(AppRadius.xl),
              border: Border.all(
                color: scheme.outline.withValues(alpha: isDark ? 0.28 : 0.14),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isEnglish ? 'Read acknowledgement' : 'Confirmacao de leitura',
                  style: AppText.subtitle.copyWith(
                    color: scheme.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  isEnglish
                      ? 'Opening this screen tries to mark the announcement as read automatically. You can retry below if needed.'
                      : 'Ao abrir esta tela, o app tenta marcar o comunicado como lido automaticamente. Se precisar, voce pode tentar novamente abaixo.',
                  style: AppText.bodySmall.copyWith(
                    color: scheme.onSurfaceVariant,
                    height: 1.45,
                  ),
                ),
                if (acknowledgementError != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    acknowledgementError!,
                    style: AppText.bodySmall.copyWith(
                      color: AppColors.error,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.lg),
                SizedBox(
                  width: double.infinity,
                  child: PrimaryButton(
                    label: strings.acknowledge,
                    onPressed: onAcknowledge,
                    isLoading: isAcknowledging,
                    icon: Icons.check_rounded,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({
    required this.icon,
    required this.label,
    this.backgroundColor,
    this.foregroundColor,
  });

  final IconData icon;
  final String label;
  final Color? backgroundColor;
  final Color? foregroundColor;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final resolvedBackground =
        backgroundColor ??
        (isDark
            ? Colors.white.withValues(alpha: 0.05)
            : AppColors.surfaceVariant);
    final resolvedForeground =
        foregroundColor ?? scheme.onSurfaceVariant.withValues(alpha: 0.92);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: resolvedBackground,
        borderRadius: AppRadius.all(AppRadius.pill),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.22 : 0.12),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: resolvedForeground),
          const SizedBox(width: AppSpacing.xs),
          Text(
            label,
            style: AppText.caption.copyWith(
              color: resolvedForeground,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _AttachmentTile extends StatelessWidget {
  const _AttachmentTile({
    required this.attachment,
    required this.copyHint,
    required this.onTap,
  });

  final AnnouncementAttachment attachment;
  final String copyHint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        key: ValueKey('attachment-${attachment.name}'),
        onTap: onTap,
        borderRadius: AppRadius.all(AppRadius.lg),
        child: Ink(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.03)
                : AppColors.surfaceMuted,
            borderRadius: AppRadius.all(AppRadius.lg),
            border: Border.all(
              color: scheme.outline.withValues(alpha: isDark ? 0.20 : 0.10),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.info.withValues(alpha: 0.12),
                  borderRadius: AppRadius.all(AppRadius.md),
                ),
                child: const Icon(
                  Icons.attach_file_rounded,
                  color: AppColors.info,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      attachment.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppText.bodySmall.copyWith(
                        color: scheme.onSurface,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      copyHint,
                      style: AppText.caption.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.content_copy_rounded,
                size: 18,
                color: scheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InlineErrorBanner extends StatelessWidget {
  const _InlineErrorBanner({
    required this.message,
    required this.retryLabel,
    this.onRetry,
  });

  final String message;
  final String retryLabel;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.08),
        borderRadius: AppRadius.all(AppRadius.lg),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.16)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.wifi_off_rounded,
            size: 18,
            color: AppColors.error,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: AppText.bodySmall.copyWith(
                color: AppColors.error,
                height: 1.4,
              ),
            ),
          ),
          if (onRetry != null) ...[
            const SizedBox(width: AppSpacing.sm),
            TextButton(
              onPressed: onRetry,
              child: Text(retryLabel),
            ),
          ],
        ],
      ),
    );
  }
}

String _friendlyDetailError(
  Object error, {
  required bool isEnglish,
}) {
  final text = error.toString().toLowerCase();
  if (text.contains('not_found')) {
    return isEnglish
        ? 'This announcement was not found anymore.'
        : 'Este comunicado nao foi encontrado.';
  }

  if (text.contains('network_error') || text.contains('nao foi possivel')) {
    return isEnglish
        ? 'Could not refresh the details. Showing cached content when available.'
        : 'Nao foi possivel atualizar os detalhes. Exibindo o conteudo em cache quando disponivel.';
  }

  return isEnglish
      ? 'Could not load the announcement details right now.'
      : 'Nao foi possivel carregar os detalhes do comunicado agora.';
}

String _friendlyAcknowledgeError(
  Object error, {
  required bool isEnglish,
}) {
  final text = error.toString().toLowerCase();
  if (text.contains('network_error') || text.contains('nao foi possivel')) {
    return isEnglish
        ? 'Could not confirm reading right now. Check your connection and try again.'
        : 'Nao foi possivel confirmar a leitura agora. Verifique sua conexao e tente novamente.';
  }

  return isEnglish
      ? 'Could not mark the announcement as read.'
      : 'Nao foi possivel marcar o comunicado como lido.';
}
