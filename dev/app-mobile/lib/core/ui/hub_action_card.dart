import 'package:flutter/material.dart';

import '../theme/app_radius.dart';
import '../theme/app_shadows.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text.dart';
import 'aura_card.dart';

/// Grid wrapper used by hub pages to lay out action cards responsively.
class HubActionGrid extends StatelessWidget {
  const HubActionGrid({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = AppSpacing.md;
        final columns = constraints.maxWidth >= 520 ? 2 : 1;
        final itemWidth =
            (constraints.maxWidth - (spacing * (columns - 1))) / columns;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final child in children)
              SizedBox(width: itemWidth, child: child),
          ],
        );
      },
    );
  }
}

/// Premium hub action card with branded aura.
class HubActionCard extends StatefulWidget {
  const HubActionCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.accentColor,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color accentColor;
  final VoidCallback onTap;

  @override
  State<HubActionCard> createState() => _HubActionCardState();
}

class _HubActionCardState extends State<HubActionCard> {
  static const _pressDuration = Duration(milliseconds: 120);
  static const _curve = Curves.easeOutCubic;
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

    return Semantics(
      button: true,
      label: widget.title,
      child: AnimatedScale(
        duration: _pressDuration,
        curve: _curve,
        scale: _pressed ? 0.97 : 1,
        child: AuraCard(
          auraColor: widget.accentColor,
          intensity: 0.28,
          blurRadius: 32,
          spreadRadius: -10,
          offset: const Offset(0, 14),
          borderRadius: borderRadius,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: widget.onTap,
              onHighlightChanged: _handleHighlightChanged,
              borderRadius: borderRadius,
              child: Ink(
                height: 156,
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: isDark ? scheme.surface : Colors.white,
                  borderRadius: borderRadius,
                  border: Border.all(
                    color: scheme.outline.withValues(
                      alpha: isDark ? 0.30 : 0.14,
                    ),
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
                            color: widget.accentColor.withValues(
                              alpha: isDark ? 0.20 : 0.12,
                            ),
                            borderRadius: AppRadius.all(AppRadius.md),
                          ),
                          child: Icon(
                            widget.icon,
                            color: isDark
                                ? widget.accentColor.withValues(alpha: 0.95)
                                : widget.accentColor,
                            size: 22,
                          ),
                        ),
                        const Spacer(),
                        Icon(
                          Icons.arrow_forward_rounded,
                          size: 20,
                          color: scheme.onSurfaceVariant,
                        ),
                      ],
                    ),
                    const Spacer(),
                    Text(
                      widget.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppText.heading3.copyWith(
                        color: scheme.onSurface,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      widget.subtitle,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: AppText.bodySmall.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
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
