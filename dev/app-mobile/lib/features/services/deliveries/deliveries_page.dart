import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/routes.dart';
import '../../../core/models/delivery.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_shadows.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/app_status_view.dart';
import '../../../core/ui/aura_card.dart';
import '../../../core/ui/ch_scaffold.dart';
import '../../../core/ui/chips.dart';
import '../../../core/ui/inline_page_header.dart';

class DeliveriesPage extends ConsumerStatefulWidget {
  const DeliveriesPage({super.key});

  @override
  ConsumerState<DeliveriesPage> createState() => _DeliveriesPageState();
}

class _DeliveriesPageState extends ConsumerState<DeliveriesPage> {
  int _selectedTab = 0;
  static const _tabs = ['Todas', 'Aguardando', 'Entregues', 'Não entregues'];

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(deliveriesProvider);

    return CHScaffold(
      withTopBand: false,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InlinePageHeader(
            title: 'Encomendas',
            subtitle: 'Acompanhe o status e os detalhes das entregas.',
            onBack: () => context.go(AppRoutes.services),
          ),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            height: 46,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              itemCount: _tabs.length,
              itemBuilder: (_, i) => Padding(
                padding: const EdgeInsets.only(right: AppSpacing.sm),
                child: _FilterChip(
                  label: _tabs[i],
                  selected: _selectedTab == i,
                  onTap: () => setState(() => _selectedTab = i),
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Expanded(
            child: async.when(
              data: (items) {
                final filtered = _filter(items);
                if (filtered.isEmpty) {
                  return AppStatusView.empty(
                    icon: Icons.inventory_2_outlined,
                    title: 'Nenhuma encomenda',
                    message: 'Não há encomendas nesta categoria.',
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.sm,
                    AppSpacing.lg,
                    AppSpacing.xl2,
                  ),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: _DeliveryCard(delivery: filtered[i]),
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => AppStatusView.error(
                title: 'Erro ao carregar encomendas',
                message: '$e',
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Delivery> _filter(List<Delivery> items) {
    switch (_selectedTab) {
      case 1:
        return items
            .where((d) => d.status == DeliveryStatus.aguardando)
            .toList();
      case 2:
        return items
            .where((d) => d.status == DeliveryStatus.entregue)
            .toList();
      case 3:
        return items
            .where((d) => d.status == DeliveryStatus.naoEntregue)
            .toList();
      default:
        return items;
    }
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.all(AppRadius.pill),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: selected
                  ? scheme.primary.withValues(alpha: 0.12)
                  : (isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.white.withValues(alpha: 0.72)),
              borderRadius: AppRadius.all(AppRadius.pill),
              border: Border.all(
                color: selected
                    ? scheme.primary.withValues(alpha: 0.20)
                    : scheme.outline.withValues(
                        alpha: isDark ? 0.22 : 0.14,
                      ),
              ),
            ),
            child: Text(
              label,
              style: AppText.caption.copyWith(
                color: selected ? scheme.primary : scheme.onSurfaceVariant,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DeliveryCard extends StatelessWidget {
  const _DeliveryCard({required this.delivery});
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
        return 'Aguardando';
      case DeliveryStatus.emDistribuicao:
        return 'Em distribuição';
      case DeliveryStatus.entregue:
        return 'Entregue';
      case DeliveryStatus.naoEntregue:
        return 'Não entregue';
    }
  }

  IconData _statusIcon() {
    switch (delivery.status) {
      case DeliveryStatus.aguardando:
        return Icons.hourglass_bottom;
      case DeliveryStatus.emDistribuicao:
        return Icons.local_shipping_rounded;
      case DeliveryStatus.entregue:
        return Icons.check_circle;
      case DeliveryStatus.naoEntregue:
        return Icons.cancel;
    }
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}min';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return '${diff.inDays}d';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final statusColor = _statusColor();
    final radius = AppRadius.all(AppRadius.lg);
    final isPending = delivery.status == DeliveryStatus.aguardando ||
        delivery.status == DeliveryStatus.emDistribuicao;

    return AuraCard(
      auraColor: statusColor,
      intensity: isPending ? 0.30 : 0.18,
      blurRadius: 28,
      spreadRadius: -10,
      offset: const Offset(0, 12),
      borderRadius: radius,
      child: Semantics(
        button: true,
        label: 'Entrega ${delivery.title}',
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () =>
                context.go(AppRoutes.deliveryDetailLocation(delivery.id)),
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
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: AppRadius.all(AppRadius.md),
                    ),
                    child: Icon(_statusIcon(), color: statusColor, size: 22),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          delivery.title,
                          style: AppText.subtitle.copyWith(
                            fontWeight: FontWeight.w700,
                            color: scheme.onSurface,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Wrap(
                          spacing: AppSpacing.xs,
                          runSpacing: AppSpacing.xs,
                          children: [
                            _MetaPill(label: delivery.carrier),
                            _MetaPill(label: _timeAgo(delivery.arrivedAt)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  StatusChip(label: _statusLabel(), statusColor: statusColor),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
          color: scheme.outline.withValues(alpha: isDark ? 0.22 : 0.14),
        ),
      ),
      child: Text(
        label,
        style: AppText.caption.copyWith(
          color: scheme.onSurfaceVariant,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
