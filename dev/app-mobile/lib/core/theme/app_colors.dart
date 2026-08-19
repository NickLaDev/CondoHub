import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Brand palette (design padrão)
  static const primaryBlue = Color(0xFF0F2A56);
  static const secondaryGray = Color(0xFF8A9099);
  static const tertiaryGraphite = Color(0xFF1C1F26);
  static const accentBlue = Color(0xFF2F5DFF);

  // Backward-compatible aliases used across the app
  static const navy = primaryBlue;
  static const navyLight = tertiaryGraphite;
  static const navyDark = tertiaryGraphite;
  static const accent = accentBlue;
  static const accentLight = Color(0xFF5C7CFF);

  static const background = Color(0xFFF6F7FA);
  static const backgroundSoftBlue = Color(0xFFF2F4F7);
  static const backgroundSoftIce = Color(0xFFFCFDFE);
  static const surface = Colors.white;
  static const surfaceVariant = Color(0xFFF2F4F7);
  static const surfaceMuted = Color(0xFFFBFCFE);
  static const surfaceIcon = Color(0xFFF1F5F9);
  static const surfaceIconBorder = Color(0xFFE1E8F0);

  // Dark palette (modo noturno real)
  static const darkBackground = Color(0xFF0B0D12);
  static const darkSurface = Color(0xFF121721);
  static const darkSurfaceVariant = Color(0xFF202838);
  static const darkSurfaceElevated = Color(0xFF1A2231);
  static const darkDivider = Color(0xFF2D3647);
  static const darkTextPrimary = Color(0xFFE8ECF4);
  static const darkTextSecondary = Color(0xFFA7B2C4);

  static const textPrimary = tertiaryGraphite;
  static const textSecondary = secondaryGray;
  static const textOnNavy = Colors.white;

  // Semantic tokens (coloridos para status/chips/cards)
  static const success = Color(0xFF22C55E);
  static const warning = Color(0xFFF59E0B);
  static const error = Color(0xFFEF4444);
  static const info = Color(0xFF3B82F6);

  static const urgent = Color(0xFFEF4444);
  static const divider = Color(0xFFE1E6EC);

  // ---- Extended brand palette ------------------------------------------
  // Warm complements for the cool navy/blue base. Used sparingly on
  // highlights, badges, and the adaptive background. They humanize the
  // interface and provide variation without breaking brand identity.
  static const tertiaryCoral = Color(0xFFFF8B5C);
  static const tertiaryAmber = Color(0xFFFFB454);
  static const tertiaryTeal = Color(0xFF14B8A6);
  static const tertiaryViolet = Color(0xFF8B5CF6);

  // ---- Adaptive background ambients ------------------------------------
  // Time-of-day mood tints consumed by the home background. The mesh
  // blobs interpolate between these so the surface evolves with the user.
  static const ambientDawn = Color(0xFFFFB088); // 5h–9h, soft peach
  static const ambientDay = Color(0xFF60A5FA); // 9h–17h, sky blue
  static const ambientDusk = Color(0xFFFF9966); // 17h–21h, warm dusk
  static const ambientNight = Color(0xFF6B5BD6); // 21h–5h, deep violet

  static const shellBackdrop = Color(0xFF08162D);
  static const shellHeroBlue = Color(0xFF173257);
  static const shellPatternLine = Color(0x123B82F6);
  static const shellPatternSoft = Color(0x10FFFFFF);
  static const shellTopGlow = Color(0x183B82F6);
  static const shellBottomGlow = Color(0x100F2A56);

  static const navyGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [primaryBlue, tertiaryGraphite],
  );

  static const brandAccentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [accentBlue, primaryBlue],
  );

  static const shellHeroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [shellBackdrop, primaryBlue, shellHeroBlue],
    stops: [0, 0.62, 1],
  );

  static const shellBackgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      shellBackdrop,
      Color(0xFF102446),
      backgroundSoftBlue,
      backgroundSoftIce,
    ],
    stops: [0, 0.18, 0.56, 1],
  );

  static const darkHeaderGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF1A2231), Color(0xFF0D121C)],
  );

  static const darkShellBackgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF050A14), Color(0xFF0B1321), darkBackground],
    stops: [0, 0.42, 1],
  );
}
