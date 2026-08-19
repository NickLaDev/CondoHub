import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text.dart';
import '../theme/background_mood.dart';
import 'ambient_background.dart';
import 'ch_top_band.dart';

enum CHHeaderVariant { compact, home, fullNavy }

class CHScaffold extends StatefulWidget {
  const CHScaffold({
    super.key,
    required this.body,
    this.title,
    this.headerVariant = CHHeaderVariant.compact,
    this.homeHeaderContent,
    this.floatingActionButton,
    this.actions,
    this.withTopBand = true,
    this.backgroundMood,
  });

  final Widget body;
  final String? title;
  final CHHeaderVariant headerVariant;
  final Widget? homeHeaderContent;
  final Widget? floatingActionButton;
  final List<Widget>? actions;
  final bool withTopBand;

  /// Optional mood used by the adaptive background. When `null`, a default
  /// time-of-day mood is computed automatically.
  final BackgroundMood? backgroundMood;

  @override
  State<CHScaffold> createState() => _CHScaffoldState();
}

class _CHScaffoldState extends State<CHScaffold> {
  static const _scrollProgressUpdateThreshold = 0.0025;
  static const _scrollOffsetUpdateThreshold = 0.25;

  double _scrollProgress = 0;
  double _scrollOffset = 0;

  bool _handleScroll(ScrollNotification notification) {
    if (notification.depth != 0) return false;

    final viewport = notification.metrics.viewportDimension;
    if (viewport <= 0) return false;

    final fadeDistance = (viewport * 1.2).clamp(320.0, 560.0);
    final pixels = notification.metrics.pixels < 0
        ? 0.0
        : notification.metrics.pixels;
    final nextProgress = (pixels / fadeDistance).clamp(0.0, 1.0);

    if ((nextProgress - _scrollProgress).abs() >
            _scrollProgressUpdateThreshold ||
        (pixels - _scrollOffset).abs() > _scrollOffsetUpdateThreshold) {
      setState(() {
        _scrollProgress = nextProgress;
        _scrollOffset = pixels;
      });
    }

    return false;
  }

  LinearGradient _headerGradient(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? AppColors.darkHeaderGradient : AppColors.navyGradient;
  }

  SystemUiOverlayStyle _systemOverlayStyle(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemStatusBarContrastEnforced: false,
      systemNavigationBarColor: isDark
          ? AppColors.darkBackground
          : AppColors.background,
      systemNavigationBarIconBrightness: isDark
          ? Brightness.light
          : Brightness.dark,
      systemNavigationBarContrastEnforced: false,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.headerVariant == CHHeaderVariant.fullNavy) {
      return _buildFullNavyScaffold(context);
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final usesAmbientBackground =
        widget.headerVariant != CHHeaderVariant.fullNavy;
    final emphasizeBlue = widget.headerVariant == CHHeaderVariant.home;
    final hasTopHeader = widget.withTopBand;
    final hasTitleRow =
        widget.title != null || (widget.actions?.isNotEmpty ?? false);
    // Title sits on the ambient canvas (light/dark), so it follows the scheme
    // instead of forcing white, which was illegible over the light canvas.
    final titleStyle = AppText.heading2;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: _systemOverlayStyle(context),
      child: AmbientBackgroundScope(
        scrollProgress: _scrollProgress,
        scrollOffset: _scrollOffset,
        isDark: isDark,
        emphasizeBlue: emphasizeBlue,
        usesAmbientBackground: usesAmbientBackground,
        child: Scaffold(
          backgroundColor: Colors.transparent,
          floatingActionButton: widget.floatingActionButton,
          body: Stack(
            children: [
              Positioned.fill(
                child: usesAmbientBackground
                    ? _AppBackground(
                        isDark: isDark,
                        scrollProgress: _scrollProgress,
                        emphasizeBlue: emphasizeBlue,
                        mood:
                            widget.backgroundMood ??
                            BackgroundMood.fallback(isDark: isDark),
                      )
                    : ColoredBox(
                        color: isDark
                            ? AppColors.darkBackground
                            : AppColors.background,
                      ),
              ),
              Column(
                children: [
                  if (hasTopHeader) _buildPinnedHeader(context),
                  if (hasTitleRow)
                    SafeArea(
                      top: !hasTopHeader,
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(
                          AppSpacing.xl,
                          AppSpacing.md,
                          AppSpacing.xl,
                          AppSpacing.xs,
                        ),
                        child: Row(
                          children: [
                            if (widget.title != null)
                              Expanded(
                                child: Text(widget.title!, style: titleStyle),
                              ),
                            ...?widget.actions,
                          ],
                        ),
                      ),
                    ),
                  Expanded(
                    child: SafeArea(
                      top:
                          !hasTopHeader &&
                          !hasTitleRow &&
                          widget.headerVariant != CHHeaderVariant.home,
                      child: NotificationListener<ScrollNotification>(
                        onNotification: _handleScroll,
                        child: Padding(
                          padding: EdgeInsets.only(
                            top: hasTopHeader ? AppSpacing.sm : 0,
                          ),
                          child: widget.body,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPinnedHeader(BuildContext context) {
    if (widget.headerVariant == CHHeaderVariant.home) {
      return _buildHomeHeader(context);
    }
    return const CHTopBand();
  }

  Widget _buildFullNavyScaffold(BuildContext context) {
    final headerActions = widget.actions ?? const <Widget>[];
    final hasActions = headerActions.isNotEmpty;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: _systemOverlayStyle(context),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        floatingActionButton: widget.floatingActionButton,
        body: Container(
          width: double.infinity,
          decoration: BoxDecoration(gradient: _headerGradient(context)),
          child: Column(
            children: [
              if (widget.withTopBand)
                const CHTopBand()
              else
                SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.xl,
                      AppSpacing.sm,
                      AppSpacing.xl,
                      0,
                    ),
                    child: Row(
                      children: [
                        const SizedBox(width: AppSpacing.xl4),
                        Expanded(
                          child: Center(
                            child: widget.title == null
                                ? const SizedBox.shrink()
                                : Text(
                                    widget.title!,
                                    style: AppText.headingOnNavy,
                                  ),
                          ),
                        ),
                        if (hasActions)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: headerActions,
                          )
                        else
                          const SizedBox(width: AppSpacing.xl4),
                      ],
                    ),
                  ),
                ),
              if (widget.withTopBand && (widget.title != null || hasActions))
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.xl,
                    AppSpacing.lg,
                    AppSpacing.xl,
                    AppSpacing.xs,
                  ),
                  child: Row(
                    children: [
                      ...headerActions,
                      if (hasActions && widget.title != null)
                        const SizedBox(width: AppSpacing.sm),
                      if (widget.title != null)
                        Expanded(
                          child: Text(
                            widget.title!,
                            style: AppText.headingOnNavy,
                          ),
                        ),
                    ],
                  ),
                ),
              if (widget.homeHeaderContent != null) ...[
                const SizedBox(height: AppSpacing.sm),
                widget.homeHeaderContent!,
              ],
              Expanded(
                child: SafeArea(
                  top: false,
                  child: NotificationListener<ScrollNotification>(
                    onNotification: _handleScroll,
                    child: widget.body,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHomeHeader(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.md,
          AppSpacing.lg,
          0,
        ),
        child: IconTheme.merge(
          data: IconThemeData(
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : AppColors.textPrimary,
          ),
          child: widget.homeHeaderContent ?? const SizedBox.shrink(),
        ),
      ),
    );
  }
}

/// Calm app background.
///
/// The page surface is intentionally quiet — color and motion come from
/// the cards themselves (see `AuraCard`), so this only paints:
///
/// 1. A short navy band behind the system status bar (so white system
///    icons stay legible).
/// 2. A clean tinted canvas underneath (brand-tinted, derived from
///    `primaryBlue` blended onto white).
///
/// `mood` is honored as a subtle hue shift on the canvas's top tint so the
/// page still evolves with time of day / urgency, but the dramatic color
/// motion is delegated to the cards.
class _AppBackground extends StatelessWidget {
  const _AppBackground({
    required this.isDark,
    required this.scrollProgress,
    required this.emphasizeBlue,
    required this.mood,
  });

  final bool isDark;
  final double scrollProgress;
  final bool emphasizeBlue;
  final BackgroundMood mood;

  @override
  Widget build(BuildContext context) {
    final statusInset = MediaQuery.paddingOf(context).top;

    return RepaintBoundary(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final size = constraints.biggest;
          // The navy stays a clean cap behind the status bar and fades into the
          // canvas within the safe-area gap. This keeps it from ever sitting
          // behind the page title (which is dark), removing the old muddy
          // mid-screen transition the title used to float over.
          final navyEnd = (statusInset - AppSpacing.sm).clamp(0.0, size.height);
          final fadeEnd = statusInset + AppSpacing.sm;
          final navyStop = (navyEnd / size.height).clamp(0.0, 1.0);
          final fadeStop = (fadeEnd / size.height).clamp(0.0, 1.0);

          return DecoratedBox(
            decoration: BoxDecoration(
              gradient: _gradient(navyStop, fadeStop),
            ),
          );
        },
      ),
    );
  }

  LinearGradient _gradient(double navyStop, double fadeStop) {
    // Mono palette: navy cap → short fade → clean canvas. The canvas is a soft
    // off-white so the white cards keep separation from the page surface.
    final canvasColor = isDark ? AppColors.darkBackground : AppColors.background;
    final navyColor = isDark
        ? const Color(0xFF0E1626)
        : AppColors.primaryBlue;

    return LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [navyColor, navyColor, canvasColor, canvasColor],
      stops: [0, navyStop, fadeStop, 1],
    );
  }
}
