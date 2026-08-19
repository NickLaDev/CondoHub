import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/models/authorized_person.dart';
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
import '../../../core/ui/inline_page_header.dart';
import '../../../core/util/date_format.dart';
import 'access_format.dart';

class AuthorizedAccessPage extends ConsumerWidget {
  const AuthorizedAccessPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(authorizedAccessProvider);

    return CHScaffold(
      withTopBand: false,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InlinePageHeader(
            title: 'Acessos liberados',
            subtitle:
                'Trabalhadores e visitas sempre autorizados, com horário e '
                'validade.',
            onBack: () => context.go(AppRoutes.services),
            trailing: _AddButton(
              onTap: () => context.go(AppRoutes.accessNew),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Expanded(
            child: async.when(
              data: (people) {
                if (people.isEmpty) {
                  return AppStatusView.empty(
                    icon: Icons.verified_user_outlined,
                    title: 'Nenhum acesso liberado',
                    message:
                        'Cadastre quem pode entrar de forma recorrente, como '
                        'a diarista ou a babá.',
                    action: SizedBox(
                      width: 220,
                      child: PrimaryButton(
                        label: 'Liberar acesso',
                        icon: Icons.add_rounded,
                        onPressed: () => context.go(AppRoutes.accessNew),
                      ),
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(authorizedAccessProvider.future),
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.lg,
                      AppSpacing.sm,
                      AppSpacing.lg,
                      AppSpacing.xl2,
                    ),
                    itemCount: people.length,
                    itemBuilder: (_, i) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: _PersonCard(
                        person: people[i],
                        onToggle: (value) => _toggle(ref, people[i], value),
                        onTap: () => context.go(
                          AppRoutes.accessEditLocation(people[i].id),
                        ),
                      ),
                    ),
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => AppStatusView.error(
                title: 'Erro ao carregar acessos',
                message: '$e',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _toggle(
    WidgetRef ref,
    AuthorizedPerson person,
    bool value,
  ) async {
    await ref
        .read(authorizedAccessRepositoryProvider)
        .setActive(person.id, value);
    ref.invalidate(authorizedAccessProvider);
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
      label: 'Liberar acesso',
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

class _PersonCard extends StatelessWidget {
  const _PersonCard({
    required this.person,
    required this.onToggle,
    required this.onTap,
  });

  final AuthorizedPerson person;
  final ValueChanged<bool> onToggle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final expired = person.isExpired;
    final activeNow = person.isActiveNow;
    final accent = expired
        ? AppColors.error
        : (activeNow ? AppColors.success : AppColors.secondaryGray);
    final radius = AppRadius.all(AppRadius.lg);

    return AuraCard(
      auraColor: accent,
      intensity: activeNow ? 0.26 : 0.12,
      blurRadius: 28,
      spreadRadius: -10,
      offset: const Offset(0, 12),
      borderRadius: radius,
      child: Semantics(
        button: true,
        label: 'Editar acesso de ${person.name}',
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
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
                          color: accent.withValues(alpha: 0.12),
                          borderRadius: AppRadius.all(AppRadius.md),
                        ),
                        child: Icon(
                          authorizedTypeIcon(person.type),
                          color: accent,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              person.name,
                              style: AppText.subtitle.copyWith(
                                fontWeight: FontWeight.w700,
                                color: scheme.onSurface,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              authorizedTypeLabel(person.type),
                              style: AppText.caption.copyWith(
                                color: scheme.onSurfaceVariant,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: person.active,
                        onChanged: onToggle,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  _InfoRow(
                    icon: Icons.event_repeat_rounded,
                    label: formatWeekdays(person.weekdays),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  _InfoRow(
                    icon: Icons.schedule_rounded,
                    label:
                        '${formatMinutes(person.startMinutes)} às '
                        '${formatMinutes(person.endMinutes)}',
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  _InfoRow(
                    icon: Icons.event_available_rounded,
                    label: person.validUntil == null
                        ? 'Sem data de expiração'
                        : (expired
                            ? 'Expirou em ${formatDate(person.validUntil!)}'
                            : 'Liberado até ${formatDate(person.validUntil!)}'),
                    color: expired ? AppColors.error : null,
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

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, this.color});

  final IconData icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fg = color ?? scheme.onSurfaceVariant;
    return Row(
      children: [
        Icon(icon, size: 16, color: fg),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            label,
            style: AppText.bodySmall.copyWith(
              color: fg,
              fontWeight: FontWeight.w600,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
