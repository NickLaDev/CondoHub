import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/models/signable_document.dart';
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
import '../../../core/util/date_format.dart';

class DocumentsPage extends ConsumerStatefulWidget {
  const DocumentsPage({super.key});

  @override
  ConsumerState<DocumentsPage> createState() => _DocumentsPageState();
}

class _DocumentsPageState extends ConsumerState<DocumentsPage> {
  int _selectedTab = 0;
  static const _tabs = ['Pendentes', 'Assinados'];

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(documentsProvider);

    return CHScaffold(
      withTopBand: false,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InlinePageHeader(
            title: 'Documentos',
            subtitle: 'Assine digitalmente os documentos do condomínio.',
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
                    icon: Icons.task_alt_rounded,
                    title: _selectedTab == 0
                        ? 'Nenhum documento pendente'
                        : 'Nenhum documento assinado',
                    message: _selectedTab == 0
                        ? 'Você está em dia com as assinaturas.'
                        : 'Os documentos assinados aparecerão aqui.',
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
                    child: _DocumentCard(document: filtered[i]),
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => AppStatusView.error(
                title: 'Erro ao carregar documentos',
                message: '$e',
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<SignableDocument> _filter(List<SignableDocument> items) {
    final wantSigned = _selectedTab == 1;
    return items.where((d) => d.isSigned == wantSigned).toList();
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

class _DocumentCard extends StatelessWidget {
  const _DocumentCard({required this.document});
  final SignableDocument document;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final signed = document.isSigned;
    final accent = signed ? AppColors.success : AppColors.warning;
    final radius = AppRadius.all(AppRadius.lg);

    return AuraCard(
      auraColor: accent,
      intensity: signed ? 0.16 : 0.28,
      blurRadius: 28,
      spreadRadius: -10,
      offset: const Offset(0, 12),
      borderRadius: radius,
      child: Semantics(
        button: true,
        label: 'Documento ${document.title}',
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () =>
                context.go(AppRoutes.documentDetailLocation(document.id)),
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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      borderRadius: AppRadius.all(AppRadius.md),
                    ),
                    child: Icon(
                      signed
                          ? Icons.verified_rounded
                          : Icons.draw_outlined,
                      color: accent,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                document.title,
                                style: AppText.subtitle.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: scheme.onSurface,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            StatusChip(
                              label: signed ? 'Assinado' : 'Pendente',
                              statusColor: accent,
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          document.description,
                          style: AppText.bodySmall.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          signed && document.signedAt != null
                              ? 'Assinado em ${formatDate(document.signedAt!)}'
                              : 'Recebido em ${formatDate(document.createdAt)}',
                          style: AppText.caption.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
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
