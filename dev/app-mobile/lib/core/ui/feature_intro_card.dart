import 'package:flutter/material.dart';

import '../theme/app_spacing.dart';
import '../theme/app_text.dart';

/// Intro header used on top of feature pages that sit over the navy band.
///
/// Lives directly on the ambient navy background, so text colors and
/// shadows are tuned for legibility on dark surfaces.
class FeatureIntroCard extends StatelessWidget {
  const FeatureIntroCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.accentColor,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color accentColor;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // Sits on the ambient canvas (light in light mode, dark in dark mode), so
    // the text follows the color scheme to remain legible.
    final titleColor = scheme.onSurface;
    final subtitleColor = scheme.onSurfaceVariant;

    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.lg, bottom: 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: AppText.heading1.copyWith(
              color: titleColor,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            subtitle,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: AppText.bodySmall.copyWith(
              color: subtitleColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
