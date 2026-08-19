import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/routes.dart';
import '../../core/localization/app_strings.dart';
import '../../core/models/announcement.dart';
import '../../core/models/delivery.dart';
import '../../core/providers/providers.dart';
import '../announcements/announcements_providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_shadows.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text.dart';
import '../../core/theme/background_mood.dart';
import '../../core/ui/app_status_view.dart';
import '../../core/ui/aura_card.dart';
import '../../core/ui/ch_scaffold.dart';
import '../../core/ui/chips.dart';
import '../../core/ui/section.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final announcementsAsync = ref.watch(announcementsListControllerProvider);
    final deliveriesAsync = ref.watch(deliveriesProvider);
    final ticketsAsync = ref.watch(ticketsProvider);
    final authState = ref.watch(authStateProvider);
    final strings = AppStrings.of(context);
    final isEn = Localizations.localeOf(context).languageCode == 'en';

    final residentName = authState.user?.name ?? '';

    final condoName = authState.condo?.name ?? strings.defaultCondoName;

    final unitLabel = authState.unit?.label ?? strings.defaultUnitLabel;

    const condoPhotoUrl =
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80';

    final urgentCount = announcementsAsync.maybeWhen(
      data: (items) =>
          items.where((a) => a.tag == AnnouncementTag.urgente).length,
      orElse: () => 0,
    );

    final pendingDeliveries = deliveriesAsync.maybeWhen(
      data: (items) => items
          .where(
            (d) =>
                d.status == DeliveryStatus.aguardando ||
                d.status == DeliveryStatus.emDistribuicao,
          )
          .length,
      orElse: () => 0,
    );

    final mood = BackgroundMood.adaptive(
      now: DateTime.now(),
      urgentCount: urgentCount,
      pendingDeliveries: pendingDeliveries,
      isDark: Theme.of(context).brightness == Brightness.dark,
    );

    return CHScaffold(
      headerVariant: CHHeaderVariant.home,
      withTopBand: false,
      backgroundMood: mood,
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(deliveriesProvider);
          ref.invalidate(ticketsProvider);
          await Future.wait([
            ref.read(announcementsListControllerProvider.notifier).refresh(),
            ref.read(deliveriesProvider.future),
            ref.read(ticketsProvider.future),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: AppSpacing.xl3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.sm,
                    AppSpacing.lg,
                    AppSpacing.lg,
                  ),
                  child: AuraCard(
                    auraColor: AppColors.primaryBlue,
                    intensity: 0.32,
                    blurRadius: 56,
                    spreadRadius: -12,
                    offset: const Offset(0, 22),
                    borderRadius: BorderRadius.circular(AppRadius.xl),
                    child: _CondoHeroCard(
                      greeting: _greeting(isEn),
                      condoName: condoName,
                      unitLabel: unitLabel,
                      residentName: residentName,
                      condoLabel: strings.condo.toUpperCase(),
                      qrLabel: strings.myQrCode,
                      photoUrl: condoPhotoUrl,
                      settingsLabel: strings.settings,
                      onSettingsTap: () => context.go(AppRoutes.settings),
                      onQrTap: () => context.go(AppRoutes.qr),
                    ),
                  ),
                ),
              ),
              _TodayHeader(label: _todayLabel(isEn)),
              _StatusPillsRow(
                announcementsAsync: announcementsAsync,
                deliveriesAsync: deliveriesAsync,
                ticketsAsync: ticketsAsync,
                strings: strings,
                isEn: isEn,
              ),
              _SectionHeader(
                title: strings.quickAccess,
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.xl,
                  AppSpacing.xl,
                  AppSpacing.xl,
                  AppSpacing.md,
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.xs,
                  AppSpacing.lg,
                  AppSpacing.lg,
                ),
                child: _QuickAccessGrid(strings: strings),
              ),
              _SectionHeader(
                title: strings.latestAnnouncements,
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.xl,
                  AppSpacing.xl2,
                  AppSpacing.xl,
                  AppSpacing.md,
                ),
              ),
              announcementsAsync.when(
                data: (items) {
                  if (items.isEmpty) {
                    return AppStatusView.empty(
                      icon: Icons.campaign_outlined,
                      title: strings.noUrgentAlertsTitle,
                      message: strings.noUrgentAlertsBody,
                    );
                  }
                  return Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                    ),
                    child: Column(
                      children: [
                        for (final item in items) ...[
                          _AnnouncementCard(announcement: item),
                          const SizedBox(height: AppSpacing.sm),
                        ],
                      ],
                    ),
                  );
                },
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (error, _) => AppStatusView.error(
                  title: strings.errorLabel,
                  message: '$error',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _greeting(bool isEn) {
    final h = DateTime.now().hour;
    if (h < 12) return isEn ? 'Good morning' : 'Bom dia';
    if (h < 18) return isEn ? 'Good afternoon' : 'Boa tarde';
    return isEn ? 'Good evening' : 'Boa noite';
  }

  String _todayLabel(bool isEn) => isEn ? 'Today' : 'Resumo de hoje';
}

class _CondoHeroCard extends StatelessWidget {
  const _CondoHeroCard({
    required this.greeting,
    required this.condoName,
    required this.unitLabel,
    required this.residentName,
    required this.condoLabel,
    required this.qrLabel,
    required this.photoUrl,
    required this.settingsLabel,
    required this.onSettingsTap,
    required this.onQrTap,
  });

  final String greeting;
  final String condoName;
  final String unitLabel;
  final String residentName;
  final String condoLabel;
  final String qrLabel;
  final String? photoUrl;
  final String settingsLabel;
  final VoidCallback onSettingsTap;
  final VoidCallback onQrTap;

  String _firstName(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return '';
    return trimmed.split(' ').first;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final radius = AppRadius.all(AppRadius.xl);

    final gradient = isDark
        ? const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1A2740), Color(0xFF111A2A), Color(0xFF0E1626)],
            stops: [0, 0.55, 1],
          )
        : const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFFFFFFF), Color(0xFFF6F9FE), Color(0xFFEAF1FB)],
            stops: [0, 0.6, 1],
          );

    final titleColor = isDark ? Colors.white : AppColors.textPrimary;
    final subtitleColor = isDark
        ? Colors.white.withValues(alpha: 0.74)
        : AppColors.textSecondary;

    final firstName = _firstName(residentName);
    final displayName = firstName.isNotEmpty ? firstName : residentName;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: AppShadows.level3(isDark: isDark),
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Container(
          decoration: BoxDecoration(gradient: gradient),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _CondoPhotoBanner(
                photoUrl: photoUrl,
                condoLabel: condoLabel,
                condoName: condoName,
                unitLabel: unitLabel,
                isDark: isDark,
                settingsLabel: settingsLabel,
                onSettingsTap: onSettingsTap,
              ),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$greeting,',
                      style: AppText.caption.copyWith(
                        color: subtitleColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    if (displayName.isNotEmpty)
                      Text(
                        displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.display.copyWith(
                          color: titleColor,
                          height: 1.05,
                          fontSize: 26,
                        ),
                      ),
                    if (residentName.isNotEmpty &&
                        displayName != residentName) ...[
                      const SizedBox(height: 2),
                      Text(
                        residentName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.bodySmall.copyWith(
                          color: subtitleColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    _HeroQrButton(
                      label: qrLabel,
                      onTap: onQrTap,
                      isDark: isDark,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CondoPhotoBanner extends StatelessWidget {
  const _CondoPhotoBanner({
    required this.photoUrl,
    required this.condoLabel,
    required this.condoName,
    required this.unitLabel,
    required this.isDark,
    required this.settingsLabel,
    required this.onSettingsTap,
  });

  final String? photoUrl;
  final String condoLabel;
  final String condoName;
  final String unitLabel;
  final bool isDark;
  final String settingsLabel;
  final VoidCallback onSettingsTap;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (photoUrl != null && photoUrl!.isNotEmpty)
            Image.network(
              photoUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _PhotoFallback(isDark: isDark),
              loadingBuilder: (context, child, progress) {
                if (progress == null) return child;
                return _PhotoFallback(isDark: isDark);
              },
            )
          else
            _PhotoFallback(isDark: isDark),
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0),
                      Colors.black.withValues(alpha: 0.2),
                      Colors.black.withValues(alpha: 0.62),
                    ],
                    stops: const [0, 0.5, 1],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            top: AppSpacing.md,
            right: AppSpacing.md,
            child: _PhotoActionButton(
              icon: Icons.settings_rounded,
              semanticLabel: settingsLabel,
              onTap: onSettingsTap,
            ),
          ),
          Positioned(
            left: AppSpacing.xl,
            right: AppSpacing.xl,
            bottom: AppSpacing.lg,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        condoLabel,
                        style: AppText.overline.copyWith(
                          color: Colors.white.withValues(alpha: 0.78),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        condoName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.heading2.copyWith(
                          color: Colors.white,
                          shadows: [
                            Shadow(
                              color: Colors.black.withValues(alpha: 0.4),
                              blurRadius: 8,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                _UnitPillOnPhoto(unitLabel: unitLabel),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PhotoActionButton extends StatelessWidget {
  const _PhotoActionButton({
    required this.icon,
    required this.semanticLabel,
    required this.onTap,
  });

  final IconData icon;
  final String semanticLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      child: Tooltip(
        message: semanticLabel,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: AppRadius.all(AppRadius.md),
            child: Ink(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.32),
                borderRadius: AppRadius.all(AppRadius.md),
                border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
              ),
              child: Icon(icon, color: Colors.white, size: 18),
            ),
          ),
        ),
      ),
    );
  }
}

class _PhotoFallback extends StatelessWidget {
  const _PhotoFallback({required this.isDark});
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? const [Color(0xFF1B2840), Color(0xFF0E1626)]
              : [AppColors.primaryBlue, const Color(0xFF1B3766)],
        ),
      ),
      child: const Center(
        child: Icon(Icons.apartment_rounded, color: Colors.white24, size: 64),
      ),
    );
  }
}

class _UnitPillOnPhoto extends StatelessWidget {
  const _UnitPillOnPhoto({required this.unitLabel});
  final String unitLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: AppRadius.all(AppRadius.pill),
        border: Border.all(color: Colors.white.withValues(alpha: 0.32)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.home_outlined, size: 14, color: Colors.white),
          const SizedBox(width: AppSpacing.xs),
          Text(
            unitLabel,
            style: AppText.caption.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroQrButton extends StatelessWidget {
  const _HeroQrButton({
    required this.label,
    required this.onTap,
    required this.isDark,
  });

  final String label;
  final VoidCallback onTap;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    final bg = isDark ? Colors.white : AppColors.primaryBlue;
    final fg = isDark ? AppColors.primaryBlue : Colors.white;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.all(AppRadius.md),
        child: Ink(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: AppRadius.all(AppRadius.md),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.qr_code_2_rounded, color: fg, size: 18),
              const SizedBox(width: AppSpacing.sm),
              Text(
                label,
                style: AppText.button.copyWith(color: fg, fontSize: 13.5),
              ),
              const SizedBox(width: AppSpacing.xs),
              Icon(Icons.arrow_forward_rounded, color: fg, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _TodayHeader extends StatelessWidget {
  const _TodayHeader({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.xl,
        AppSpacing.sm,
        AppSpacing.xl,
        AppSpacing.md,
      ),
      child: Text(
        label.toUpperCase(),
        style: AppText.overline.copyWith(
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

class _StatusPillsRow extends StatelessWidget {
  const _StatusPillsRow({
    required this.announcementsAsync,
    required this.deliveriesAsync,
    required this.ticketsAsync,
    required this.strings,
    required this.isEn,
  });

  final AsyncValue<List<Announcement>> announcementsAsync;
  final AsyncValue<List<Delivery>> deliveriesAsync;
  final AsyncValue<dynamic> ticketsAsync;
  final AppStrings strings;
  final bool isEn;

  int _urgentFromAnnouncements(List<Announcement> items) =>
      items.where((a) => a.tag == AnnouncementTag.urgente).length;

  int _pendingFromDeliveries(List<Delivery> items) => items
      .where(
        (d) =>
            d.status == DeliveryStatus.aguardando ||
            d.status == DeliveryStatus.emDistribuicao,
      )
      .length;

  int _openTicketsFromList(dynamic value) {
    if (value is! List) return 0;
    return value.where((t) {
      try {
        final status = (t as dynamic).status.toString();
        return !status.contains('concluido') && !status.contains('done');
      } catch (_) {
        return false;
      }
    }).length;
  }

  @override
  Widget build(BuildContext context) {
    final urgent = announcementsAsync.maybeWhen(
      data: _urgentFromAnnouncements,
      orElse: () => 0,
    );

    final pending = deliveriesAsync.maybeWhen(
      data: _pendingFromDeliveries,
      orElse: () => 0,
    );

    final tickets =
        ticketsAsync.maybeWhen(data: _openTicketsFromList, orElse: () => 0);

    return SizedBox(
      height: 116,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.sm,
          AppSpacing.lg,
          AppSpacing.lg,
        ),
        clipBehavior: Clip.none,
        physics: const BouncingScrollPhysics(),
        children: [
          _StatusPill(
            count: urgent,
            label: strings.urgentAlerts,
            icon: urgent > 0
                ? Icons.warning_amber_rounded
                : Icons.verified_outlined,
            tint: urgent > 0 ? AppColors.urgent : AppColors.success,
            onTap: () => context.go(AppRoutes.mural),
          ),
          const SizedBox(width: AppSpacing.md),
          _StatusPill(
            count: pending,
            label: strings.deliveries,
            icon: Icons.local_shipping_rounded,
            tint: pending > 0 ? AppColors.info : AppColors.textSecondary,
            onTap: () => context.go(AppRoutes.deliveries),
          ),
          const SizedBox(width: AppSpacing.md),
          _StatusPill(
            count: tickets,
            label: strings.tickets,
            icon: Icons.handyman_outlined,
            tint: tickets > 0 ? AppColors.warning : AppColors.textSecondary,
            onTap: () => context.go(AppRoutes.tickets),
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.count,
    required this.label,
    required this.icon,
    required this.tint,
    required this.onTap,
  });

  final int count;
  final String label;
  final IconData icon;
  final Color tint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? scheme.surface : Colors.white;

    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 148),
      child: AuraCard(
        auraColor: tint,
        intensity: count > 0 ? 0.30 : 0.10,
        blurRadius: 24,
        spreadRadius: -8,
        offset: const Offset(0, 10),
        borderRadius: AppRadius.all(AppRadius.lg),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: AppRadius.all(AppRadius.lg),
            child: Ink(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.md,
              ),
              decoration: BoxDecoration(
                color: bg,
                borderRadius: AppRadius.all(AppRadius.lg),
                border: Border.all(
                  color: scheme.outline.withValues(alpha: isDark ? 0.3 : 0.14),
                ),
                boxShadow: AppShadows.level1(isDark: isDark),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: tint.withValues(alpha: isDark ? 0.20 : 0.12),
                      borderRadius: AppRadius.all(AppRadius.sm),
                    ),
                    child: Icon(icon, color: tint, size: 18),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        count.toString(),
                        style: AppText.heading2.copyWith(
                          color: scheme.onSurface,
                          height: 1,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        label,
                        style: AppText.caption.copyWith(
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
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

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.padding});
  final String title;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return SectionTitle(title: title, padding: padding);
  }
}

class _QuickAccessGrid extends StatelessWidget {
  const _QuickAccessGrid({required this.strings});
  final AppStrings strings;

  @override
  Widget build(BuildContext context) {
    final tiles = <_QuickAccessConfig>[
      _QuickAccessConfig(
        icon: Icons.campaign_outlined,
        label: strings.mural,
        color: AppColors.navy,
        onTap: () => context.go(AppRoutes.mural),
      ),
      _QuickAccessConfig(
        icon: Icons.forum_outlined,
        label: strings.communication,
        color: AppColors.accent,
        onTap: () => context.go(AppRoutes.channels),
      ),
      _QuickAccessConfig(
        icon: Icons.handyman_outlined,
        label: strings.tickets,
        color: AppColors.warning,
        onTap: () => context.go(AppRoutes.tickets),
      ),
      _QuickAccessConfig(
        icon: Icons.inventory_2_outlined,
        label: strings.deliveries,
        color: AppColors.success,
        onTap: () => context.go(AppRoutes.deliveries),
      ),
      _QuickAccessConfig(
        icon: Icons.support_agent_outlined,
        label: strings.support,
        color: AppColors.info,
        onTap: () => context.go(AppRoutes.inbox),
      ),
      _QuickAccessConfig(
        icon: Icons.qr_code_2_outlined,
        label: strings.myQrCode,
        color: AppColors.accent,
        onTap: () => context.go(AppRoutes.qr),
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = AppSpacing.lg;
        const columns = 3;
        final tileWidth =
            (constraints.maxWidth - (spacing * (columns - 1))) / columns;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final tile in tiles)
              SizedBox(
                width: tileWidth,
                child: _PremiumQuickTile(config: tile),
              ),
          ],
        );
      },
    );
  }
}

class _QuickAccessConfig {
  const _QuickAccessConfig({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
}

class _PremiumQuickTile extends StatefulWidget {
  const _PremiumQuickTile({required this.config});
  final _QuickAccessConfig config;

  @override
  State<_PremiumQuickTile> createState() => _PremiumQuickTileState();
}

class _PremiumQuickTileState extends State<_PremiumQuickTile> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = widget.config.color;
    final bg = isDark ? scheme.surface : Colors.white;
    final borderColor = scheme.outline.withValues(alpha: isDark ? 0.3 : 0.14);

    return AnimatedScale(
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOut,
      scale: _pressed ? 0.97 : 1.0,
      child: AuraCard(
        auraColor: color,
        intensity: 0.24,
        blurRadius: 20,
        spreadRadius: -8,
        offset: const Offset(0, 10),
        borderRadius: AppRadius.all(AppRadius.lg),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: widget.config.onTap,
            onHighlightChanged: (h) => setState(() => _pressed = h),
            borderRadius: AppRadius.all(AppRadius.lg),
            child: Ink(
              height: 108,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.md,
              ),
              decoration: BoxDecoration(
                color: bg,
                borderRadius: AppRadius.all(AppRadius.lg),
                border: Border.all(color: borderColor),
                boxShadow: AppShadows.level1(isDark: isDark),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: isDark ? 0.20 : 0.12),
                      borderRadius: AppRadius.all(AppRadius.sm),
                    ),
                    child: Icon(
                      widget.config.icon,
                      color: isDark ? color.withValues(alpha: 0.95) : color,
                      size: 20,
                    ),
                  ),
                  Text(
                    widget.config.label,
                    style: AppText.bodySmall.copyWith(
                      color: scheme.onSurface,
                      fontWeight: FontWeight.w700,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
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

class _AnnouncementCard extends StatelessWidget {
  const _AnnouncementCard({required this.announcement});
  final Announcement announcement;

  Color _tagColor() => switch (announcement.tag) {
    AnnouncementTag.urgente => AppColors.urgent,
    AnnouncementTag.evento => AppColors.success,
    AnnouncementTag.aviso => AppColors.warning,
    AnnouncementTag.comunicado => AppColors.info,
  };

  IconData _tagIcon() => switch (announcement.tag) {
    AnnouncementTag.urgente => Icons.warning_amber_rounded,
    AnnouncementTag.evento => Icons.event_outlined,
    AnnouncementTag.aviso => Icons.info_outline_rounded,
    AnnouncementTag.comunicado => Icons.campaign_outlined,
  };

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes} min';
    if (diff.inHours < 24) return '${diff.inHours} h';
    return '${diff.inDays} d';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tagColor = _tagColor();
    final strings = AppStrings.of(context);

    return Semantics(
      button: true,
      label: '${strings.mural} ${announcement.title}',
      child: AuraCard(
        auraColor: tagColor,
        intensity: announcement.tag == AnnouncementTag.urgente ? 0.38 : 0.22,
        blurRadius: 36,
        spreadRadius: -10,
        offset: const Offset(0, 14),
        borderRadius: AppRadius.all(AppRadius.lg),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () =>
                context.go(AppRoutes.muralDetailLocation(announcement.id)),
            borderRadius: AppRadius.all(AppRadius.lg),
            child: Ink(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: isDark ? scheme.surface : Colors.white,
                borderRadius: AppRadius.all(AppRadius.lg),
                border: Border.all(
                  color: scheme.outline.withValues(alpha: isDark ? 0.3 : 0.14),
                ),
                boxShadow: AppShadows.level1(isDark: isDark),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: tagColor.withValues(alpha: isDark ? 0.20 : 0.12),
                      borderRadius: AppRadius.all(AppRadius.sm),
                    ),
                    child: Icon(_tagIcon(), color: tagColor, size: 20),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            TagChip(
                              label: strings.announcementTag(announcement.tag),
                              color: tagColor.withValues(alpha: 0.12),
                              textColor: tagColor,
                            ),
                            const Spacer(),
                            Text(
                              _timeAgo(announcement.createdAt),
                              style: AppText.caption.copyWith(
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          announcement.title,
                          style: AppText.subtitle.copyWith(
                            color: scheme.onSurface,
                            fontWeight: FontWeight.w700,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          announcement.snippet,
                          style: AppText.bodySmall.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
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
