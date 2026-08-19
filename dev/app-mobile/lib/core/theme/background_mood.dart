import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Time-of-day period derived from the local clock.
enum BackgroundPeriod { dawn, day, dusk, night }

/// User-attention level computed from app state (urgent alerts, pending
/// deliveries, etc.). The background palette shifts toward warmer/alert
/// tones when attention is required.
enum BackgroundUrgency { calm, attention, urgent }

/// Color set used to paint the mesh blobs of the adaptive app background.
///
/// Built via [BackgroundMood.adaptive], which combines the current time
/// of day, the user's attention level, and the active theme brightness
/// to pick a coherent palette. The same mood is also used to tint the
/// status bar contrast guard so foreground and background feel in sync.
@immutable
class BackgroundMood {
  const BackgroundMood({
    required this.period,
    required this.urgency,
    required this.blobPrimary,
    required this.blobAccent,
    required this.blobCounter,
    required this.isDark,
  });

  final BackgroundPeriod period;
  final BackgroundUrgency urgency;

  /// Dominant blob (top-right area). Strongest brand presence.
  final Color blobPrimary;

  /// Accent blob (mid-left). Carries time-of-day character.
  final Color blobAccent;

  /// Counterweight blob (bottom-right). Subtle stabilizer.
  final Color blobCounter;

  final bool isDark;

  /// Returns the mood for the current moment.
  ///
  /// [now] – current time used to pick the period.
  /// [urgentCount] – urgent announcements pending.
  /// [pendingDeliveries] – packages awaiting pickup.
  /// [isDark] – whether the app is in dark mode.
  factory BackgroundMood.adaptive({
    required DateTime now,
    required int urgentCount,
    required int pendingDeliveries,
    required bool isDark,
  }) {
    final period = _periodFromHour(now.hour);
    final urgency = _urgencyFor(
      urgentCount: urgentCount,
      pendingDeliveries: pendingDeliveries,
    );

    final periodAccent = switch (period) {
      BackgroundPeriod.dawn => AppColors.ambientDawn,
      BackgroundPeriod.day => AppColors.ambientDay,
      BackgroundPeriod.dusk => AppColors.ambientDusk,
      BackgroundPeriod.night => AppColors.ambientNight,
    };

    // Primary blob always carries the brand navy/accent.
    final Color primary = isDark
        ? AppColors.accent
        : AppColors.primaryBlue;

    // Counterweight rotates by period to add subtle variety.
    final Color counter = switch (period) {
      BackgroundPeriod.dawn => AppColors.tertiaryCoral,
      BackgroundPeriod.day => AppColors.accent,
      BackgroundPeriod.dusk => AppColors.tertiaryAmber,
      BackgroundPeriod.night => AppColors.tertiaryViolet,
    };

    // Urgency promotes warning/urgent colors into the accent slot.
    final Color accent = switch (urgency) {
      BackgroundUrgency.urgent => AppColors.urgent,
      BackgroundUrgency.attention => AppColors.warning,
      BackgroundUrgency.calm => periodAccent,
    };

    return BackgroundMood(
      period: period,
      urgency: urgency,
      blobPrimary: primary,
      blobAccent: accent,
      blobCounter: counter,
      isDark: isDark,
    );
  }

  /// Static fallback used when no contextual data is available.
  factory BackgroundMood.fallback({required bool isDark}) {
    return BackgroundMood.adaptive(
      now: DateTime.now(),
      urgentCount: 0,
      pendingDeliveries: 0,
      isDark: isDark,
    );
  }

  static BackgroundPeriod _periodFromHour(int hour) {
    if (hour >= 5 && hour < 9) return BackgroundPeriod.dawn;
    if (hour >= 9 && hour < 17) return BackgroundPeriod.day;
    if (hour >= 17 && hour < 21) return BackgroundPeriod.dusk;
    return BackgroundPeriod.night;
  }

  static BackgroundUrgency _urgencyFor({
    required int urgentCount,
    required int pendingDeliveries,
  }) {
    if (urgentCount > 0) return BackgroundUrgency.urgent;
    if (pendingDeliveries > 0) return BackgroundUrgency.attention;
    return BackgroundUrgency.calm;
  }

  @override
  bool operator ==(Object other) {
    return other is BackgroundMood &&
        other.period == period &&
        other.urgency == urgency &&
        other.isDark == isDark &&
        other.blobPrimary == blobPrimary &&
        other.blobAccent == blobAccent &&
        other.blobCounter == blobCounter;
  }

  @override
  int get hashCode => Object.hash(
    period,
    urgency,
    isDark,
    blobPrimary,
    blobAccent,
    blobCounter,
  );
}
