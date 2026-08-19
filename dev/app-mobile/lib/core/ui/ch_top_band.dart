import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class CHTopBand extends StatelessWidget {
  const CHTopBand({super.key, this.height = 108});

  final double height;

  LinearGradient _gradient(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark
        ? AppColors.darkHeaderGradient
        : LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withValues(alpha: 0.82),
              AppColors.backgroundSoftIce.withValues(alpha: 0.78),
              const Color(0xFFE4ECF8).withValues(alpha: 0.72),
            ],
            stops: const [0, 0.56, 1],
          );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        child: Container(
          width: double.infinity,
          height: height,
          decoration: BoxDecoration(
            gradient: _gradient(context),
            borderRadius: const BorderRadius.vertical(
              bottom: Radius.circular(28),
              top: Radius.circular(24),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.16 : 0.08),
                blurRadius: isDark ? 22 : 26,
                offset: const Offset(0, 12),
              ),
            ],
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.06)
                  : AppColors.primaryBlue.withValues(alpha: 0.08),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: const Align(
              alignment: Alignment.centerLeft,
              child: _TopBandBrand(),
            ),
          ),
        ),
      ),
    );
  }
}

class _TopBandBrand extends StatelessWidget {
  const _TopBandBrand();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? Colors.white : AppColors.textPrimary;
    final subtitleColor = isDark
        ? Colors.white.withValues(alpha: 0.78)
        : AppColors.textSecondary.withValues(alpha: 0.9);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'CondoHub',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: titleColor,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Gestão condominial em um só lugar',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: subtitleColor,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
