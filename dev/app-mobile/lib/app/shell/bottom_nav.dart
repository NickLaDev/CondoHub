import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/localization/app_strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text.dart';

/// Liquid-glass bottom navigation bar.
///
/// Anatomy:
/// - Frosted glass surface that blurs the canvas behind, with a soft rim
///   and a brand-tinted halo that bleeds outside the clip.
/// - Compact pill indicator that morphs around the active icon (not the
///   whole item) — refined, iOS-like proportion.
/// - Section accent color interpolates smoothly on tab change to signal
///   context without pulling attention from content.
class BottomNav extends StatefulWidget {
  const BottomNav({super.key, required this.currentIndex, required this.onTap});

  static const _barHeight = 74.0;
  static const _barRadius = 32.0;
  static const _blurSigma = 26.0;
  static const _animationDuration = Duration(milliseconds: 320);
  static const _animationCurve = Curves.easeOutCubic;
  // Pill geometry — compact, sits only around the icon.
  static const _pillWidth = 56.0;
  static const _pillHeight = 38.0;
  static const _pillTop = 8.0;

  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  State<BottomNav> createState() => _BottomNavState();
}

class _BottomNavState extends State<BottomNav> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final strings = AppStrings.of(context);
    final systemBottom = MediaQuery.paddingOf(context).bottom;

    final items = <_BottomNavItemData>[
      _BottomNavItemData(
        label: strings.start,
        icon: Icons.home_outlined,
        selectedIcon: Icons.home_rounded,
        accent: AppColors.primaryBlue,
      ),
      _BottomNavItemData(
        label: strings.mural,
        icon: Icons.campaign_outlined,
        selectedIcon: Icons.campaign_rounded,
        accent: AppColors.navy,
      ),
      _BottomNavItemData(
        label: strings.tickets,
        icon: Icons.handyman_outlined,
        selectedIcon: Icons.handyman_rounded,
        accent: AppColors.warning,
      ),
      _BottomNavItemData(
        label: strings.communication,
        icon: Icons.forum_outlined,
        selectedIcon: Icons.forum_rounded,
        accent: AppColors.accent,
      ),
      _BottomNavItemData(
        label: strings.services,
        icon: Icons.grid_view_outlined,
        selectedIcon: Icons.grid_view_rounded,
        accent: AppColors.success,
      ),
    ];

    final activeAccent = items[widget.currentIndex].accent;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.md,
        0,
        AppSpacing.md,
        systemBottom > 0 ? AppSpacing.sm : AppSpacing.md,
      ),
      child: TweenAnimationBuilder<Color?>(
        tween: ColorTween(end: activeAccent),
        duration: BottomNav._animationDuration,
        curve: BottomNav._animationCurve,
        builder: (context, animatedAccent, _) {
          final accent = animatedAccent ?? activeAccent;
          return DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(BottomNav._barRadius),
              boxShadow: [
                // Subtle brand halo bleeds into the canvas.
                BoxShadow(
                  color: accent.withValues(alpha: isDark ? 0.18 : 0.10),
                  blurRadius: 32,
                  spreadRadius: -12,
                  offset: const Offset(0, 14),
                ),
                BoxShadow(
                  color: Colors.black.withValues(
                    alpha: isDark ? 0.22 : 0.04,
                  ),
                  blurRadius: 22,
                  spreadRadius: -6,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(BottomNav._barRadius),
              child: BackdropFilter(
                filter: ImageFilter.blur(
                  sigmaX: BottomNav._blurSigma,
                  sigmaY: BottomNav._blurSigma,
                ),
                child: _GlassSurface(
                  isDark: isDark,
                  height: BottomNav._barHeight,
                  accent: accent,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final itemWidth =
                          constraints.maxWidth / items.length;
                      final pillLeft = itemWidth * widget.currentIndex +
                          (itemWidth - BottomNav._pillWidth) / 2;

                      return Stack(
                        clipBehavior: Clip.none,
                        children: [
                          AnimatedPositioned(
                            duration: BottomNav._animationDuration,
                            curve: BottomNav._animationCurve,
                            left: pillLeft,
                            top: BottomNav._pillTop,
                            width: BottomNav._pillWidth,
                            height: BottomNav._pillHeight,
                            child: IgnorePointer(
                              child: _ActivePillGlass(
                                isDark: isDark,
                                accent: accent,
                              ),
                            ),
                          ),
                          Row(
                            children: [
                              for (final entry in items.asMap().entries)
                                Expanded(
                                  child: _BottomNavItem(
                                    data: entry.value,
                                    selected:
                                        entry.key == widget.currentIndex,
                                    duration: BottomNav._animationDuration,
                                    curve: BottomNav._animationCurve,
                                    onTap: () => widget.onTap(entry.key),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Frosted glass surface.
///
/// Top of the surface is nearly transparent so the bar dissolves into the
/// canvas instead of cutting it with a hard edge. Opacity ramps up toward
/// the bottom where the icons need a stable backdrop. No border at the
/// rim — integration over delineation.
class _GlassSurface extends StatelessWidget {
  const _GlassSurface({
    required this.isDark,
    required this.height,
    required this.accent,
    required this.child,
  });

  final bool isDark;
  final double height;
  final Color accent;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          height: height,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              stops: const [0, 0.35, 1],
              colors: isDark
                  ? [
                      Colors.white.withValues(alpha: 0.02),
                      Color.alphaBlend(
                        accent.withValues(alpha: 0.03),
                        Colors.white.withValues(alpha: 0.08),
                      ),
                      Colors.white.withValues(alpha: 0.05),
                    ]
                  : [
                      Colors.white.withValues(alpha: 0.16),
                      Color.alphaBlend(
                        accent.withValues(alpha: 0.02),
                        Colors.white.withValues(alpha: 0.42),
                      ),
                      Colors.white.withValues(alpha: 0.52),
                    ],
            ),
            borderRadius: BorderRadius.circular(BottomNav._barRadius),
          ),
        ),
        SizedBox(height: height, child: child),
      ],
    );
  }
}

/// Compact glass pill that morphs around the active icon.
///
/// Stronger gradient + inner highlight read it as a refractive lens.
class _ActivePillGlass extends StatelessWidget {
  const _ActivePillGlass({required this.isDark, required this.accent});

  final bool isDark;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: isDark
              ? [
                  Color.alphaBlend(
                    accent.withValues(alpha: 0.16),
                    Colors.white.withValues(alpha: 0.26),
                  ),
                  Color.alphaBlend(
                    accent.withValues(alpha: 0.04),
                    Colors.white.withValues(alpha: 0.08),
                  ),
                ]
              : [
                  Colors.white.withValues(alpha: 0.96),
                  Color.alphaBlend(
                    accent.withValues(alpha: 0.10),
                    Colors.white.withValues(alpha: 0.68),
                  ),
                ],
        ),
        borderRadius: AppRadius.all(AppRadius.pill),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.24)
              : Colors.white.withValues(alpha: 0.92),
          width: 1,
        ),
        boxShadow: [
          // Outer accent glow grounds the pill in the bar.
          BoxShadow(
            color: accent.withValues(alpha: isDark ? 0.38 : 0.26),
            blurRadius: 22,
            spreadRadius: -4,
            offset: const Offset(0, 8),
          ),
          // Tight inner-top highlight (white sliver) for liquid refraction.
          BoxShadow(
            color: Colors.white.withValues(alpha: isDark ? 0.20 : 0.65),
            blurRadius: 1,
            spreadRadius: -1,
            offset: const Offset(0, 1),
          ),
        ],
      ),
    );
  }
}

class _BottomNavItemData {
  const _BottomNavItemData({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.accent,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final Color accent;
}

class _BottomNavItem extends StatefulWidget {
  const _BottomNavItem({
    required this.data,
    required this.selected,
    required this.duration,
    required this.curve,
    required this.onTap,
  });

  final _BottomNavItemData data;
  final bool selected;
  final Duration duration;
  final Curve curve;
  final VoidCallback onTap;

  @override
  State<_BottomNavItem> createState() => _BottomNavItemState();
}

class _BottomNavItemState extends State<_BottomNavItem> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = widget.data.accent;
    final activeForeground = isDark ? _lighten(accent, 0.20) : accent;
    final inactive = scheme.onSurfaceVariant.withValues(
      alpha: isDark ? 0.72 : 0.56,
    );
    final color = widget.selected ? activeForeground : inactive;

    return Semantics(
      button: true,
      selected: widget.selected,
      label: widget.data.label,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.onTap,
          onHighlightChanged: (h) {
            if (_pressed != h) setState(() => _pressed = h);
          },
          splashColor: accent.withValues(alpha: 0.10),
          highlightColor: Colors.transparent,
          child: AnimatedScale(
            duration: widget.duration,
            curve: widget.curve,
            scale: _pressed ? 0.92 : 1.0,
            child: Padding(
              padding: const EdgeInsets.only(top: BottomNav._pillTop),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    height: BottomNav._pillHeight,
                    child: Center(
                      child: AnimatedSwitcher(
                        duration: widget.duration,
                        switchInCurve: widget.curve,
                        switchOutCurve: widget.curve,
                        transitionBuilder: (child, animation) {
                          return ScaleTransition(
                            scale: Tween<double>(
                              begin: 0.82,
                              end: 1,
                            ).animate(animation),
                            child: FadeTransition(
                              opacity: animation,
                              child: child,
                            ),
                          );
                        },
                        child: ShaderMask(
                          key: ValueKey<bool>(widget.selected),
                          shaderCallback: (bounds) => LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: widget.selected
                                ? [
                                    _lighten(color, 0.08),
                                    Color.alphaBlend(
                                      Colors.black.withValues(alpha: 0.16),
                                      color,
                                    ),
                                  ]
                                : [color, color],
                          ).createShader(bounds),
                          child: Icon(
                            widget.selected
                                ? widget.data.selectedIcon
                                : widget.data.icon,
                            size: widget.selected ? 23 : 22,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  AnimatedDefaultTextStyle(
                    duration: widget.duration,
                    curve: widget.curve,
                    style: AppText.overline.copyWith(
                      color: color,
                      fontWeight: widget.selected
                          ? FontWeight.w700
                          : FontWeight.w500,
                      letterSpacing: 0.5,
                      fontSize: 9.5,
                    ),
                    child: Text(
                      widget.data.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
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

  Color _lighten(Color c, double amount) {
    final hsl = HSLColor.fromColor(c);
    return hsl
        .withLightness((hsl.lightness + amount).clamp(0.0, 1.0))
        .toColor();
  }
}
