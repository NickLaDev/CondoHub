import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/routes.dart';
import '../../../core/models/signable_document.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/app_status_view.dart';
import '../../../core/ui/buttons.dart';
import '../../../core/ui/ch_scaffold.dart';
import '../../../core/ui/chips.dart';
import '../../../core/ui/inline_page_header.dart';
import '../../../core/util/date_format.dart';

class DocumentDetailPage extends ConsumerStatefulWidget {
  const DocumentDetailPage({super.key, required this.id});

  final String id;

  @override
  ConsumerState<DocumentDetailPage> createState() => _DocumentDetailPageState();
}

class _DocumentDetailPageState extends ConsumerState<DocumentDetailPage> {
  bool _signing = false;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(documentDetailProvider(widget.id));

    return CHScaffold(
      withTopBand: false,
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AppStatusView.error(
          title: 'Erro ao carregar documento',
          message: '$e',
        ),
        data: (document) {
          if (document == null) {
            return AppStatusView.empty(
              icon: Icons.description_outlined,
              title: 'Documento não encontrado',
              message: 'Ele pode ter sido removido.',
            );
          }
          return _DocumentDetailView(
            document: document,
            signing: _signing,
            onOpenToSign: () => _openToSign(document),
            onMarkSigned: () => _markSigned(document),
          );
        },
      ),
    );
  }

  Future<void> _openToSign(SignableDocument document) async {
    final url = document.signUrl.trim();
    if (url.isEmpty) {
      _showMessage('Link de assinatura indisponível.');
      return;
    }
    final uri = Uri.tryParse(url);
    var launched = false;
    if (uri != null) {
      try {
        launched = await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
      } catch (_) {
        launched = false;
      }
    }
    if (!launched) {
      await Clipboard.setData(ClipboardData(text: url));
      _showMessage('Não foi possível abrir. Link copiado para a área de '
          'transferência.');
    }
  }

  Future<void> _markSigned(SignableDocument document) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Marcar como assinado'),
        content: Text(
          'Confirma que já assinou "${document.title}" no aplicativo de '
          'assinatura?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _signing = true);
    try {
      await ref.read(documentsRepositoryProvider).markSigned(document.id);
      ref.invalidate(documentsProvider);
      ref.invalidate(documentDetailProvider(document.id));
      _showMessage('Documento marcado como assinado.');
    } catch (e) {
      _showMessage('Erro: $e');
    } finally {
      if (mounted) setState(() => _signing = false);
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _DocumentDetailView extends StatelessWidget {
  const _DocumentDetailView({
    required this.document,
    required this.signing,
    required this.onOpenToSign,
    required this.onMarkSigned,
  });

  final SignableDocument document;
  final bool signing;
  final VoidCallback onOpenToSign;
  final VoidCallback onMarkSigned;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final signed = document.isSigned;
    final accent = signed ? AppColors.success : AppColors.warning;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
      children: [
        InlinePageHeader(
          title: 'Documento',
          subtitle: 'Detalhes e assinatura digital.',
          onBack: () => context.go(AppRoutes.documents),
        ),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: isDark
                ? scheme.surface
                : Colors.white.withValues(alpha: 0.92),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: scheme.outline.withValues(alpha: isDark ? 0.24 : 0.1),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      borderRadius: AppRadius.all(AppRadius.md),
                    ),
                    child: Icon(
                      signed ? Icons.verified_rounded : Icons.draw_outlined,
                      color: accent,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Text(
                      document.title,
                      style: AppText.heading3.copyWith(
                        color: scheme.onSurface,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  StatusChip(
                    label: signed ? 'Assinado' : 'Pendente',
                    statusColor: accent,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                document.description,
                style: AppText.body.copyWith(
                  color: scheme.onSurfaceVariant,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                signed && document.signedAt != null
                    ? 'Assinado em ${formatDateTime(document.signedAt!)}'
                    : 'Recebido em ${formatDate(document.createdAt)}',
                style: AppText.caption.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        if (!signed) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.04)
                  : AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: scheme.outline.withValues(alpha: isDark ? 0.22 : 0.08),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline_rounded,
                  size: 18,
                  color: scheme.onSurfaceVariant,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    'Abra o link para assinar no aplicativo de assinatura e '
                    'depois volte aqui para marcar como assinado.',
                    style: AppText.bodySmall.copyWith(
                      color: scheme.onSurfaceVariant.withValues(alpha: 0.9),
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: onOpenToSign,
              icon: const Icon(Icons.open_in_new_rounded, size: 18),
              label: const Text('Abrir para assinar'),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            child: PrimaryButton(
              label: 'Marcar como assinado',
              icon: Icons.check_circle_outline_rounded,
              onPressed: signing ? null : onMarkSigned,
              isLoading: signing,
            ),
          ),
        ] else
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: onOpenToSign,
              icon: const Icon(Icons.visibility_outlined, size: 18),
              label: const Text('Abrir documento'),
            ),
          ),
      ],
    );
  }
}
