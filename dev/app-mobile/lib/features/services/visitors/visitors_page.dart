import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/models/visitor.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_shadows.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/app_status_view.dart';
import '../../../core/ui/aura_card.dart';
import '../../../core/ui/buttons.dart';
import '../../../core/ui/ch_scaffold.dart';
import '../../../core/ui/chips.dart';
import '../../../core/ui/inline_page_header.dart';
import 'visitor_format.dart';

class VisitorsPage extends ConsumerStatefulWidget {
  const VisitorsPage({super.key});

  @override
  ConsumerState<VisitorsPage> createState() => _VisitorsPageState();
}

class _VisitorsPageState extends ConsumerState<VisitorsPage> {
  int _selectedTab = 0;
  static const _tabs = ['Todos', 'Agendados', 'Liberados'];

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(visitorsProvider);

    return CHScaffold(
      withTopBand: false,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InlinePageHeader(
            title: 'Visitantes',
            subtitle: 'Cadastre e libere visitas com rapidez na portaria.',
            onBack: () => context.go(AppRoutes.services),
            trailing: _AddButton(
              onTap: () => context.go(AppRoutes.visitorNew),
            ),
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
                    icon: Icons.people_alt_outlined,
                    title: 'Nenhum visitante',
                    message: 'Cadastre um visitante para liberar o acesso.',
                    action: SizedBox(
                      width: 220,
                      child: PrimaryButton(
                        label: 'Cadastrar visitante',
                        icon: Icons.add_rounded,
                        onPressed: () => context.go(AppRoutes.visitorNew),
                      ),
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () => ref.refresh(visitorsProvider.future),
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.lg,
                      AppSpacing.sm,
                      AppSpacing.lg,
                      AppSpacing.xl2,
                    ),
                    itemCount: filtered.length,
                    itemBuilder: (_, i) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: _VisitorCard(
                        visitor: filtered[i],
                        onRelease: () => _release(filtered[i]),
                        onDelete: () => _delete(filtered[i]),
                      ),
                    ),
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => AppStatusView.error(
                title: 'Erro ao carregar visitantes',
                message: '$e',
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Visitor> _filter(List<Visitor> items) {
    switch (_selectedTab) {
      case 1:
        return items
            .where((v) => v.effectiveStatus != VisitorStatus.liberado)
            .toList();
      case 2:
        return items
            .where((v) => v.effectiveStatus == VisitorStatus.liberado)
            .toList();
      default:
        return items;
    }
  }

  Future<void> _release(Visitor visitor) async {
    await ref
        .read(visitorsRepositoryProvider)
        .setStatus(visitor.id, VisitorStatus.liberado);
    ref.invalidate(visitorsProvider);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${visitor.name} liberado para entrada.')),
      );
    }
  }

  Future<void> _delete(Visitor visitor) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remover visitante'),
        content: Text('Deseja remover ${visitor.name} da lista?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Remover'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(visitorsRepositoryProvider).deleteVisitor(visitor.id);
    ref.invalidate(visitorsProvider);
  }
}

class _AddButton extends StatelessWidget {
  const _AddButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final useLight = !isDark;
    return Semantics(
      button: true,
      label: 'Cadastrar visitante',
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.all(AppRadius.md),
          child: Ink(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: useLight
                  ? Colors.white.withValues(alpha: 0.16)
                  : AppColors.accent.withValues(alpha: 0.22),
              borderRadius: AppRadius.all(AppRadius.md),
              border: Border.all(
                color: useLight
                    ? Colors.white.withValues(alpha: 0.20)
                    : AppColors.accent.withValues(alpha: 0.32),
              ),
            ),
            child: Icon(
              Icons.add_rounded,
              size: 22,
              color: useLight ? Colors.white : AppColors.accent,
            ),
          ),
        ),
      ),
    );
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
                    : scheme.outline.withValues(alpha: isDark ? 0.22 : 0.14),
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

class _VisitorCard extends StatelessWidget {
  const _VisitorCard({
    required this.visitor,
    required this.onRelease,
    required this.onDelete,
  });

  final Visitor visitor;
  final VoidCallback onRelease;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final status = visitor.effectiveStatus;
    final statusColor = visitorStatusColor(status);
    final radius = AppRadius.all(AppRadius.lg);
    final canRelease = status != VisitorStatus.liberado;

    return AuraCard(
      auraColor: statusColor,
      intensity: status == VisitorStatus.liberado ? 0.18 : 0.28,
      blurRadius: 28,
      spreadRadius: -10,
      offset: const Offset(0, 12),
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
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: AppRadius.all(AppRadius.md),
                  ),
                  child: Icon(
                    visitorTypeIcon(visitor.type),
                    color: statusColor,
                    size: 22,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        visitor.name,
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
                          _MetaPill(label: visitorTypeLabel(visitor.type)),
                          _MetaPill(
                            label: 'Previsto ${formatDate(visitor.expectedAt)}',
                          ),
                          if (visitor.unitLabel.isNotEmpty)
                            _MetaPill(label: visitor.unitLabel),
                        ],
                      ),
                    ],
                  ),
                ),
                StatusChip(
                  label: visitorStatusLabel(status),
                  statusColor: statusColor,
                ),
              ],
            ),
            if ((visitor.notes ?? '').isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                visitor.notes!,
                style: AppText.bodySmall.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                if (canRelease)
                  SmallActionButton(
                    label: 'Liberar entrada',
                    color: AppColors.success,
                    onPressed: onRelease,
                  ),
                const Spacer(),
                IconButton(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline_rounded),
                  color: scheme.onSurfaceVariant,
                  tooltip: 'Remover',
                ),
              ],
            ),
          ],
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
