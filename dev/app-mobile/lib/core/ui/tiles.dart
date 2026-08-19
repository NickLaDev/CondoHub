import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_shadows.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text.dart';

class QuickAccessTile extends StatefulWidget {
  const QuickAccessTile({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  State<QuickAccessTile> createState() => _QuickAccessTileState();
}

class _QuickAccessTileState extends State<QuickAccessTile> {
  static const _pressDuration = Duration(milliseconds: 120);
  static const _pressCurve = Curves.easeOutCubic;
  bool _pressed = false;

  void _handleHighlightChanged(bool highlighted) {
    if (_pressed == highlighted) return;
    setState(() => _pressed = highlighted);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final effectiveColor = widget.color ?? AppColors.navy;
    final iconColor = isDark
        ? effectiveColor.withValues(alpha: 0.95)
        : effectiveColor;
    final borderRadius = AppRadius.all(AppRadius.lg);
    final cardColor = isDark ? scheme.surface : Colors.white;
    final borderColor = scheme.outline.withValues(
      alpha: isDark ? (_pressed ? 0.42 : 0.3) : (_pressed ? 0.22 : 0.14),
    );

    return AnimatedScale(
      duration: _pressDuration,
      curve: _pressCurve,
      scale: _pressed ? 0.98 : 1.0,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.onTap,
          onHighlightChanged: _handleHighlightChanged,
          borderRadius: borderRadius,
          child: AnimatedContainer(
            duration: _pressDuration,
            curve: _pressCurve,
            height: 104,
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: borderRadius,
              border: Border.all(color: borderColor),
              boxShadow: AppShadows.level1(isDark: isDark),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: effectiveColor.withValues(
                      alpha: isDark ? 0.18 : 0.12,
                    ),
                    borderRadius: AppRadius.all(AppRadius.md),
                  ),
                  child: Icon(widget.icon, color: iconColor, size: 22),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  widget.label,
                  style: AppText.caption.copyWith(
                    color: scheme.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
