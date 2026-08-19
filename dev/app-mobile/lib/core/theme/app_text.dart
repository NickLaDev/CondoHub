import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Typography scale.
///
/// Type roles inspired by Material 3:
/// - display / headings: 30 / 24 / 20 / 18
/// - subtitle: 16
/// - body: 14
/// - bodySmall: 13
/// - caption / label: 12
/// - overline: 11
class AppText {
  AppText._();

  static const _family = 'Roboto';
  static const _base = TextStyle(
    fontFamily: _family,
    letterSpacing: -0.1,
    height: 1.3,
  );

  static final display = _base.copyWith(
    fontSize: 30,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.5,
    height: 1.15,
  );

  static final heading1 = _base.copyWith(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
    height: 1.2,
  );

  static final heading2 = _base.copyWith(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.2,
    height: 1.25,
  );

  static final heading3 = _base.copyWith(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.15,
    height: 1.3,
  );

  static final subtitle = _base.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.1,
    height: 1.35,
  );

  static final body = _base.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.45,
  );

  static final bodySmall = _base.copyWith(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.4,
    color: AppColors.textSecondary,
  );

  static final caption = _base.copyWith(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    height: 1.35,
    color: AppColors.textSecondary,
  );

  static final overline = _base.copyWith(
    fontSize: 11,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.8,
    height: 1.2,
    color: AppColors.textSecondary,
  );

  static final button = _base.copyWith(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
    height: 1.2,
    color: Colors.white,
  );

  static final headingOnNavy = heading2.copyWith(color: Colors.white);

  static final bodyOnNavy = body.copyWith(color: Colors.white);
}
