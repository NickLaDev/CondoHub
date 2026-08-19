import 'package:flutter/widgets.dart';

/// Corner radius tokens.
///
/// Keeps shapes consistent across cards, inputs, buttons and sheets.
class AppRadius {
  AppRadius._();

  static const double xs = 6;
  static const double sm = 10;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xl2 = 24;
  static const double pill = 999;

  static BorderRadius all(double value) => BorderRadius.circular(value);

  static final BorderRadius card = BorderRadius.circular(lg);
  static final BorderRadius button = BorderRadius.circular(md);
  static final BorderRadius input = BorderRadius.circular(md);
  static final BorderRadius surface = BorderRadius.circular(xl);
}
