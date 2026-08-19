import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class AmbientBackgroundScope extends InheritedWidget {
  const AmbientBackgroundScope({
    super.key,
    required this.scrollProgress,
    required this.scrollOffset,
    required this.isDark,
    required this.emphasizeBlue,
    required this.usesAmbientBackground,
    required super.child,
  });

  final double scrollProgress;
  final double scrollOffset;
  final bool isDark;
  final bool emphasizeBlue;
  final bool usesAmbientBackground;

  static AmbientBackgroundScope? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<AmbientBackgroundScope>();
  }

  Color foregroundColorFor(
    BuildContext context, {
    required double? globalCenterDy,
  }) {
    final scheme = Theme.of(context).colorScheme;

    if (!usesAmbientBackground || globalCenterDy == null) {
      return scheme.onSurface.withValues(alpha: 0.94);
    }

    return _prefersLightForeground(context, globalCenterDy)
        ? Colors.white.withValues(alpha: 0.97)
        : scheme.onSurface.withValues(alpha: 0.94);
  }

  List<Shadow>? foregroundShadowsFor(
    BuildContext context, {
    required double? globalCenterDy,
  }) {
    if (!usesAmbientBackground ||
        globalCenterDy == null ||
        !_prefersLightForeground(context, globalCenterDy)) {
      return null;
    }

    return [
      Shadow(
        color: Colors.black.withValues(alpha: isDark ? 0.24 : 0.2),
        blurRadius: 10,
        offset: const Offset(0, 2),
      ),
    ];
  }

  bool _prefersLightForeground(BuildContext context, double globalCenterDy) {
    final backgroundColor = _backgroundColorAt(context, globalCenterDy);
    return backgroundColor.computeLuminance() < 0.38;
  }

  Color _backgroundColorAt(BuildContext context, double globalCenterDy) {
    final screenHeight = MediaQuery.sizeOf(context).height;
    if (screenHeight <= 0) {
      return isDark ? AppColors.darkBackground : AppColors.background;
    }

    final progress = scrollProgress.clamp(0.0, 1.0);
    final backgroundHeight = screenHeight * 1.24;
    final backgroundTop =
        (-screenHeight * 0.08) + ((screenHeight * 0.18) * progress);
    final t = ((globalCenterDy - backgroundTop) / backgroundHeight).clamp(
      0.0,
      1.0,
    );

    final primaryStop = emphasizeBlue
        ? 0.1 + (0.03 * progress)
        : 0.15 + (0.05 * progress);
    final secondaryStop = emphasizeBlue
        ? 0.26 + (0.06 * progress)
        : 0.5 + (0.1 * progress);
    final tertiaryStop = emphasizeBlue
        ? 0.7 + (0.06 * progress)
        : 0.82 + (0.04 * progress);

    if (isDark) {
      return _sampleGradient(
        t,
        [
          Color.lerp(
            const Color(0xFF173150),
            const Color(0xFF121D2D),
            progress,
          )!,
          Color.lerp(
            const Color(0xFF1A2941),
            const Color(0xFF141F2F),
            progress,
          )!,
          const Color(0xFF0F1725),
          AppColors.darkBackground,
        ],
        [0, primaryStop.clamp(0.2, 0.38), secondaryStop, 1],
      );
    }

    return _sampleGradient(
      t,
      [
        AppColors.primaryBlue,
        AppColors.primaryBlue,
        const Color(0xFF18365F),
        Color.lerp(
          const Color(0xFF18365F),
          AppColors.backgroundSoftBlue,
          emphasizeBlue ? 0.78 : 0.72,
        )!,
        AppColors.background,
        AppColors.backgroundSoftIce,
      ],
      [
        0,
        primaryStop.clamp(0.08, 0.2),
        secondaryStop.clamp(0.22, 0.62),
        (secondaryStop + (emphasizeBlue ? 0.18 : 0.14)).clamp(0.4, 0.78),
        tertiaryStop.clamp(0.66, 0.92),
        1,
      ],
    );
  }

  Color _sampleGradient(double t, List<Color> colors, List<double> stops) {
    for (var i = 0; i < stops.length - 1; i++) {
      final start = stops[i];
      final end = stops[i + 1];
      if (t <= end) {
        final localT = end == start ? 1.0 : ((t - start) / (end - start));
        return Color.lerp(colors[i], colors[i + 1], localT.clamp(0.0, 1.0))!;
      }
    }
    return colors.last;
  }

  @override
  bool updateShouldNotify(AmbientBackgroundScope oldWidget) {
    return scrollProgress != oldWidget.scrollProgress ||
        scrollOffset != oldWidget.scrollOffset ||
        isDark != oldWidget.isDark ||
        emphasizeBlue != oldWidget.emphasizeBlue ||
        usesAmbientBackground != oldWidget.usesAmbientBackground;
  }
}
