import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text.dart';

/// Inline page header (back arrow + title/subtitle + optional trailing).
///
/// Used on detail/secondary screens that sit over the ambient navy band.
class InlinePageHeader extends StatelessWidget {
  const InlinePageHeader({
    super.key,
    required this.title,
    required this.onBack,
    this.subtitle,
    this.trailing,
    this.padding,
  });

  final String title;
  final String? subtitle;
  final VoidCallback onBack;
  final Widget? trailing;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    // The page sits on the ambient canvas, which is light in light mode and
    // dark in dark mode (the short navy band only backs the status bar). So the
    // header foreground simply follows the color scheme to stay legible.
    final buttonColor = isDark
        ? Colors.white.withValues(alpha: 0.05)
        : AppColors.surfaceVariant;
    final buttonBorderColor = isDark
        ? scheme.outline.withValues(alpha: 0.22)
        : AppColors.divider;
    final iconColor = scheme.onSurface;
    final titleColor = scheme.onSurface;
    final subtitleColor = scheme.onSurfaceVariant;
    const titleShadows = <Shadow>[];

    return Padding(
      padding: padding ??
          const EdgeInsets.fromLTRB(
            AppSpacing.xl,
            AppSpacing.lg,
            AppSpacing.xl,
            AppSpacing.xs,
          ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onBack,
              borderRadius: AppRadius.all(AppRadius.md),
              child: Ink(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: buttonColor,
                  borderRadius: AppRadius.all(AppRadius.md),
                  border: Border.all(color: buttonBorderColor),
                ),
                child: Icon(
                  Icons.arrow_back_rounded,
                  size: 20,
                  color: iconColor,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppText.heading2.copyWith(
                    color: titleColor,
                    fontWeight: FontWeight.w700,
                    shadows: titleShadows,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: AppText.bodySmall.copyWith(color: subtitleColor),
                  ),
                ],
              ],
            ),
          ),
          ...?switch (trailing) {
            final Widget trailingWidget => [
              const SizedBox(width: AppSpacing.md),
              trailingWidget,
            ],
            null => null,
          },
        ],
      ),
    );
  }
}
