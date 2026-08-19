import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_shadows.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text.dart';
import 'ambient_background.dart';

class SectionTitle extends StatelessWidget {
  const SectionTitle({
    super.key,
    required this.title,
    this.trailing,
    this.padding,
    this.textColor,
  });

  final String title;
  final Widget? trailing;
  final EdgeInsetsGeometry? padding;
  final Color? textColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          padding ??
          const EdgeInsets.fromLTRB(
            AppSpacing.xl,
            AppSpacing.xl,
            AppSpacing.xl,
            AppSpacing.sm,
          ),
      child: Row(
        children: [
          Expanded(
            child: _AdaptiveSectionTitleText(
              title: title,
              explicitTextColor: textColor,
            ),
          ),
          ...?switch (trailing) {
            final Widget trailingWidget => [trailingWidget],
            null => null,
          },
        ],
      ),
    );
  }
}

class _AdaptiveSectionTitleText extends StatefulWidget {
  const _AdaptiveSectionTitleText({
    required this.title,
    required this.explicitTextColor,
  });

  final String title;
  final Color? explicitTextColor;

  @override
  State<_AdaptiveSectionTitleText> createState() =>
      _AdaptiveSectionTitleTextState();
}

class _AdaptiveSectionTitleTextState extends State<_AdaptiveSectionTitleText> {
  static const _reactionDuration = Duration(milliseconds: 45);
  static const _positionUpdateThreshold = 0.1;

  final _textKey = GlobalKey();
  double? _centerDy;
  bool _measureScheduled = false;

  void _scheduleMeasure() {
    if (_measureScheduled) return;
    _measureScheduled = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _measureScheduled = false;
      if (!mounted) return;

      final renderObject = _textKey.currentContext?.findRenderObject();
      if (renderObject is! RenderBox || !renderObject.hasSize) return;

      final centerDy = renderObject
          .localToGlobal(Offset(0, renderObject.size.height / 2))
          .dy;
      if (_centerDy == null ||
          (centerDy - _centerDy!).abs() > _positionUpdateThreshold) {
        setState(() => _centerDy = centerDy);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    _scheduleMeasure();

    final ambientBackground = AmbientBackgroundScope.maybeOf(context);
    final effectiveColor =
        widget.explicitTextColor ??
        ambientBackground?.foregroundColorFor(
          context,
          globalCenterDy: _centerDy,
        ) ??
        Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.94);
    final shadows = widget.explicitTextColor == null
        ? ambientBackground?.foregroundShadowsFor(
            context,
            globalCenterDy: _centerDy,
          )
        : null;
    final headingStyle = AppText.heading3.copyWith(
      fontWeight: FontWeight.w700,
      color: effectiveColor,
      shadows: shadows,
    );

    return AnimatedDefaultTextStyle(
      duration: _reactionDuration,
      curve: Curves.linear,
      style: headingStyle,
      child: Text(key: _textKey, widget.title),
    );
  }
}

class AlertCard extends StatefulWidget {
  const AlertCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback? onTap;

  @override
  State<AlertCard> createState() => _AlertCardState();
}

class _AlertCardState extends State<AlertCard> {
  static const _pressDuration = Duration(milliseconds: 120);
  static const _pressCurve = Curves.easeOutCubic;
  static const _normalScale = 1.0;
  static const _pressedScale = 0.992;
  bool _pressed = false;

  void _handleHighlightChanged(bool highlighted) {
    if (_pressed == highlighted) return;
    setState(() => _pressed = highlighted);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderRadius = AppRadius.all(AppRadius.lg);
    final iconColor = isDark
        ? widget.color.withValues(alpha: 0.95)
        : widget.color;
    final isUrgent = widget.color == AppColors.urgent;
    final backgroundColor = isDark
        ? scheme.surface
        : Color.alphaBlend(
            widget.color.withValues(alpha: isUrgent ? 0.06 : 0.045),
            Colors.white,
          );
    final titleColor = scheme.onSurface;
    final subtitleColor = scheme.onSurfaceVariant;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.xs,
      ),
      child: Semantics(
        button: widget.onTap != null,
        enabled: widget.onTap != null,
        label: widget.title,
        child: AnimatedScale(
          duration: _pressDuration,
          curve: _pressCurve,
          scale: _pressed ? _pressedScale : _normalScale,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: widget.onTap,
              onHighlightChanged: _handleHighlightChanged,
              borderRadius: borderRadius,
              child: AnimatedContainer(
                duration: _pressDuration,
                curve: _pressCurve,
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: backgroundColor,
                  borderRadius: borderRadius,
                  border: Border.all(
                    color: widget.color.withValues(
                      alpha: _pressed ? 0.24 : 0.16,
                    ),
                  ),
                  boxShadow: AppShadows.level1(isDark: isDark),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: widget.color.withValues(
                          alpha: isDark ? 0.16 : 0.12,
                        ),
                        borderRadius: AppRadius.all(AppRadius.md),
                      ),
                      child: Icon(widget.icon, color: iconColor, size: 20),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.title,
                            style: AppText.subtitle.copyWith(
                              color: titleColor,
                              fontWeight: FontWeight.w700,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.subtitle,
                            style: AppText.bodySmall.copyWith(
                              color: subtitleColor,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    if (widget.onTap != null) ...[
                      const SizedBox(width: AppSpacing.sm),
                      Icon(
                        Icons.chevron_right_rounded,
                        size: 22,
                        color: scheme.onSurfaceVariant,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
