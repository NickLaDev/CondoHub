import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/models/announcement.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_shadows.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/aura_card.dart';

class AnnouncementListTile extends StatelessWidget {
  const AnnouncementListTile({
    super.key,
    required this.announcement,
    required this.onTap,
  });

  final Announcement announcement;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final dateLabel = DateFormat.yMMMd(locale).add_Hm().format(announcement.createdAt);
    final unreadLabel = locale.startsWith('en') ? 'Unread' : 'Nao lido';
    final attachmentsLabel = locale.startsWith('en')
        ? '${announcement.attachments.length} attachment${announcement.attachments.length == 1 ? '' : 's'}'
        : '${announcement.attachments.length} anexo${announcement.attachments.length == 1 ? '' : 's'}';

    return AuraCard(
      auraColor: announcement.read ? AppColors.info : AppColors.accent,
      intensity: announcement.read ? 0.12 : 0.22,
      blurRadius: 26,
      spreadRadius: -8,
      offset: const Offset(0, 10),
      borderRadius: AppRadius.all(AppRadius.lg),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          key: ValueKey('announcement-tile-${announcement.id}'),
          onTap: onTap,
          borderRadius: AppRadius.all(AppRadius.lg),
          child: Ink(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: isDark ? scheme.surface : Colors.white,
              borderRadius: AppRadius.all(AppRadius.lg),
              border: Border.all(
                color: scheme.outline.withValues(alpha: isDark ? 0.28 : 0.14),
              ),
              boxShadow: AppShadows.level1(isDark: isDark),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        announcement.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.subtitle.copyWith(
                          color: scheme.onSurface,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    if (!announcement.read) ...[
                      Container(
                        width: 10,
                        height: 10,
                        decoration: const BoxDecoration(
                          color: AppColors.accent,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  announcement.summary,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: AppText.bodySmall.copyWith(
                    color: scheme.onSurfaceVariant,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    _MetaChip(
                      icon: Icons.schedule_rounded,
                      label: dateLabel,
                    ),
                    if (!announcement.read)
                      _MetaChip(
                        icon: Icons.mark_email_unread_outlined,
                        label: unreadLabel,
                        backgroundColor: AppColors.accent.withValues(alpha: 0.12),
                        foregroundColor: AppColors.accent,
                      ),
                    if (announcement.hasAttachments)
                      _MetaChip(
                        icon: Icons.attach_file_rounded,
                        label: attachmentsLabel,
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({
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
