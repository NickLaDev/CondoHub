import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/routes.dart';
import '../../core/models/ticket.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_shadows.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text.dart';
import '../../core/ui/app_status_view.dart';
import '../../core/ui/aura_card.dart';
import '../../core/ui/ch_scaffold.dart';
import '../../core/ui/chips.dart';
import '../../core/ui/feature_intro_card.dart';
import 'ticket_attachment_support.dart';

class TicketsPage extends ConsumerWidget {
  const TicketsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(ticketsProvider);

    return CHScaffold(
      withTopBand: false,
      body: async.when(
        data: (items) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(ticketsProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.xl2,
              AppSpacing.lg,
              AppSpacing.xl2,
            ),
            children: [
              const FeatureIntroCard(
                icon: Icons.handyman_rounded,
                title: 'Central de chamados',
                subtitle:
                    'Registre e acompanhe solicitações para a administração.',
                accentColor: AppColors.warning,
              ),
              const SizedBox(height: AppSpacing.md),
              Align(
                alignment: Alignment.centerRight,
                child: _NewTicketButton(
                  onTap: () => context.go(AppRoutes.ticketNew),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              if (items.isEmpty)
                AppStatusView.empty(
                  icon: Icons.handyman_outlined,
                  title: 'Nenhum chamado',
                  message:
                      'Quando registrar um chamado ele aparecerá aqui.',
                )
              else
                for (final item in items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: _TicketCard(ticket: item),
                  ),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AppStatusView.error(
          title: 'Erro ao carregar chamados',
          message: '$e',
        ),
      ),
    );
  }
}

class _NewTicketButton extends StatelessWidget {
  const _NewTicketButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Semantics(
      button: true,
      label: 'Novo chamado',
      child: FilledButton.icon(
        onPressed: onTap,
        icon: const Icon(Icons.add_rounded, size: 18),
        label: const Text('Novo chamado'),
        style: FilledButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          minimumSize: const Size(0, 44),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.sm,
          ),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.button),
          textStyle: AppText.button,
        ),
      ),
    );
  }
}

class _TicketCard extends ConsumerWidget {
  const _TicketCard({required this.ticket});
  final Ticket ticket;

  Color _statusColor() {
    switch (ticket.status) {
      case TicketStatus.aberto:
        return AppColors.info;
      case TicketStatus.emAnalise:
        return AppColors.warning;
      case TicketStatus.emExecucao:
        return AppColors.accent;
      case TicketStatus.resolvido:
        return AppColors.success;
      case TicketStatus.fechado:
        return AppColors.textSecondary;
      case TicketStatus.reaberto:
        return AppColors.urgent;
    }
  }

  String _statusLabel() {
    switch (ticket.status) {
      case TicketStatus.aberto:
        return 'Aberto';
      case TicketStatus.emAnalise:
        return 'Em análise';
      case TicketStatus.emExecucao:
        return 'Em execução';
      case TicketStatus.resolvido:
        return 'Resolvido';
      case TicketStatus.fechado:
        return 'Fechado';
      case TicketStatus.reaberto:
        return 'Reaberto';
    }
  }

  String _categoryLabel() {
    switch (ticket.category) {
      case TicketCategory.eletrica:
        return 'Elétrica';
      case TicketCategory.hidraulica:
        return 'Hidráulica';
      case TicketCategory.estrutural:
        return 'Estrutural';
      case TicketCategory.limpeza:
        return 'Limpeza';
      case TicketCategory.seguranca:
        return 'Segurança';
      case TicketCategory.outros:
        return 'Outros';
    }
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}min';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return '${diff.inDays}d';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final statusColor = _statusColor();
    final attachmentsAsync = ref.watch(ticketAttachmentsProvider(ticket.id));
    final borderRadius = AppRadius.all(AppRadius.lg);

    return AuraCard(
      auraColor: statusColor,
      intensity: ticket.status == TicketStatus.reaberto ? 0.36 : 0.22,
      blurRadius: 28,
      spreadRadius: -10,
      offset: const Offset(0, 12),
      borderRadius: borderRadius,
      child: Semantics(
        button: true,
        label: 'Chamado ${ticket.title}',
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => context.go(AppRoutes.ticketDetailLocation(ticket.id)),
            borderRadius: borderRadius,
            child: Ink(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: isDark ? scheme.surface : Colors.white,
                borderRadius: borderRadius,
                border: Border.all(
                  color: scheme.outline.withValues(alpha: isDark ? 0.30 : 0.14),
                ),
                boxShadow: AppShadows.level1(isDark: isDark),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      StatusChip(
                        label: _statusLabel(),
                        statusColor: statusColor,
                      ),
                      const Spacer(),
                      TagChip(
                        label: _categoryLabel(),
                        color: scheme.primary.withValues(
                          alpha: isDark ? 0.20 : 0.08,
                        ),
                        textColor: scheme.primary,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    ticket.title,
                    style: AppText.subtitle.copyWith(
                      fontWeight: FontWeight.w700,
                      color: scheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.xs,
                    children: [
                      _TicketMetaPill(
                        icon: Icons.location_on_outlined,
                        label: ticket.location,
                      ),
                      if (attachmentsAsync.hasValue &&
                          attachmentsAsync.value!.isNotEmpty)
                        _TicketMetaPill(
                          icon: Icons.attach_file_rounded,
                          label: ticketAttachmentCountLabel(
                            attachmentsAsync.value!.length,
                          ),
                        ),
                      _TicketMetaPill(
                        icon: Icons.access_time_rounded,
                        label: _timeAgo(ticket.createdAt),
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

class _TicketMetaPill extends StatelessWidget {
  const _TicketMetaPill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.04)
            : AppColors.surfaceVariant,
        borderRadius: AppRadius.all(AppRadius.pill),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.22 : 0.12),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: scheme.onSurfaceVariant),
          const SizedBox(width: AppSpacing.xs),
          Text(
            label,
            style: AppText.caption.copyWith(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
