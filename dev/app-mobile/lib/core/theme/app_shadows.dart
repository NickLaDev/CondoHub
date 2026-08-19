import 'package:flutter/material.dart';

/// Elevation tokens — three discrete levels.
///
/// Level 1: subtle separation (cards, tiles, list items).
/// Level 2: floating surfaces (sticky bars, dropdowns, sheets header).
/// Level 3: modals/dialogs.
class AppShadows {
  AppShadows._();

  static List<BoxShadow> level1({bool isDark = false}) => [
    BoxShadow(
      color: Colors.black.withValues(alpha: isDark ? 0.20 : 0.04),
      blurRadius: isDark ? 10 : 8,
      offset: const Offset(0, 2),
    ),
  ];

  static List<BoxShadow> level2({bool isDark = false}) => [
    BoxShadow(
      color: Colors.black.withValues(alpha: isDark ? 0.28 : 0.06),
      blurRadius: isDark ? 18 : 14,
      offset: const Offset(0, 6),
    ),
  ];

  static List<BoxShadow> level3({bool isDark = false}) => [
    BoxShadow(
      color: Colors.black.withValues(alpha: isDark ? 0.36 : 0.10),
      blurRadius: isDark ? 28 : 22,
      offset: const Offset(0, 10),
    ),
  ];
}
