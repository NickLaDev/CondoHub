import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/models/delivery.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/ch_scaffold.dart';
import '../../../core/ui/chips.dart';
import '../../../core/ui/inline_page_header.dart';
import '../../../core/providers/providers.dart';

class DeliveryDetailPage extends ConsumerWidget {
  const DeliveryDetailPage({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(deliveryDetailProvider(id));

    return CHScaffold(
      withTopBand: false,
      body: async.when(
        data: (delivery) {
          if (delivery == null) {
            return const Center(child: Text('Encomenda não encontrada'));
          }
          return _DetailBody(delivery: delivery);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erro: $e')),
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.delivery});
  final Delivery delivery;

  Color _statusColor() {
    switch (delivery.status) {
      case DeliveryStatus.aguardando:
        return AppColors.warning;
      case DeliveryStatus.emDistribuicao:
        return AppColors.info;
      case DeliveryStatus.entregue:
        return AppColors.success;
      case DeliveryStatus.naoEntregue:
        return AppColors.error;
    }
  }

  String _statusLabel() {
    switch (delivery.status) {
      case DeliveryStatus.aguardando:
        return 'Aguardando retirada';
      case DeliveryStatus.emDistribuicao:
        return 'Em distribuição';
      case DeliveryStatus.entregue:
        return 'Entregue';
      case DeliveryStatus.naoEntregue:
        return 'Não entregue';
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final statusColor = _statusColor();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        InlinePageHeader(
          title: 'Detalhe da encomenda',
          subtitle: 'Veja o status, os horários e os dados da retirada.',
          onBack: () => context.go(AppRoutes.deliveries),
        ),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? scheme.surface : AppColors.surfaceMuted,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isDark
                  ? scheme.outline.withValues(alpha: 0.3)
                  : statusColor.withValues(alpha: 0.12),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.22 : 0.045),
                blurRadius: isDark ? 18 : 14,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  StatusChip(label: _statusLabel(), statusColor: statusColor),
                  const Spacer(),
                  _MetaBadge(
                    icon: Icons.schedule_rounded,
                    label: _relativeDate(delivery.arrivedAt),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                delivery.title,
                style: AppText.heading2.copyWith(
                  color: scheme.onSurface,
                  fontWeight: FontWeight.w700,
                  height: 1.14,
                ),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _MetaBadge(
                    icon: Icons.local_shipping_outlined,
                    label: delivery.carrier,
                  ),
                  _MetaBadge(
                    icon: Icons.calendar_today_rounded,
                    label: _formatFull(delivery.arrivedAt),
                  ),
                  if (delivery.deliveredAt != null)
                    _MetaBadge(
                      icon: Icons.check_circle_outline_rounded,
                      label: _formatFull(delivery.deliveredAt!),
                      accentColor: AppColors.success,
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _DetailPanel(
          title: 'Informações da entrega',
          child: Column(
            children: [
              _InfoTile(
                icon: Icons.local_shipping_outlined,
                label: 'Transportadora',
                value: delivery.carrier,
              ),
              const SizedBox(height: 10),
              _InfoTile(
                icon: Icons.access_time_rounded,
                label: 'Chegou em',
                value: _formatFull(delivery.arrivedAt),
              ),
              if (delivery.deliveredAt != null) ...[
                const SizedBox(height: 10),
                _InfoTile(
                  icon: Icons.check_circle_outline_rounded,
                  label: 'Entregue em',
                  value: _formatFull(delivery.deliveredAt!),
                  accentColor: AppColors.success,
                ),
              ],
            ],
          ),
        ),
        if (delivery.notes != null) ...[
          const SizedBox(height: 16),
          _DetailPanel(
            title: 'Observações',
            child: Text(
              delivery.notes!,
              style: AppText.body.copyWith(
                color: scheme.onSurfaceVariant.withValues(alpha: 0.92),
                height: 1.55,
              ),
            ),
          ),
        ],
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.info.withValues(alpha: isDark ? 0.16 : 0.08),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppColors.info.withValues(alpha: 0.18)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.info.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.info_outline_rounded,
                  color: AppColors.info,
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  delivery.status == DeliveryStatus.aguardando
                      ? 'Retire sua encomenda na portaria com documento de identificação.'
                      : 'Para mais informações, entre em contato com a portaria.',
                  style: AppText.bodySmall.copyWith(
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.92),
                    height: 1.45,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _formatFull(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  String _relativeDate(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}min atrás';
    }
    if (diff.inHours < 24) {
      return '${diff.inHours}h atrás';
    }
    return '${diff.inDays}d atrás';
  }
}

class _DetailPanel extends StatelessWidget {
  const _DetailPanel({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? scheme.surface : Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.24 : 0.1),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.16 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: AppText.subtitle.copyWith(
              fontWeight: FontWeight.w700,
              color: scheme.onSurface,
            ),
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    this.accentColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? accentColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = Theme.of(context).colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.03)
            : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.2 : 0.1),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: (accentColor ?? scheme.primary).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 18, color: accentColor ?? scheme.primary),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: AppText.bodySmall.copyWith(
              color: scheme.onSurfaceVariant.withValues(alpha: 0.88),
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: AppText.body.copyWith(
                fontWeight: FontWeight.w600,
                color: accentColor ?? scheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaBadge extends StatelessWidget {
  const _MetaBadge({required this.icon, required this.label, this.accentColor});

  final IconData icon;
  final String label;
  final Color? accentColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final color = accentColor ?? scheme.onSurfaceVariant;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.04)
            : Colors.white.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.22 : 0.12),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: AppText.caption.copyWith(
              color: accentColor ?? scheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
