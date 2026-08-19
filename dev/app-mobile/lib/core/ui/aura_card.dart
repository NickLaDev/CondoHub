import 'package:flutter/material.dart';

/// Wraps a card with a soft colored "aura" backshadow.
///
/// The aura is rendered as an extra-large blurred shadow that bleeds beyond
/// the card's bounds. Because it lives in the same widget subtree as the
/// card, the aura translates with the card during scroll — the background
/// stays calm and the active color sources move naturally with content.
///
/// Use sparingly: each aura is a blur pass on the GPU. Wrap only the cards
/// that carry meaningful brand or semantic color.
class AuraCard extends StatelessWidget {
  const AuraCard({
    super.key,
    required this.child,
    required this.auraColor,
    this.intensity = 0.30,
    this.blurRadius = 56,
    this.spreadRadius = -10,
    this.offset = const Offset(0, 18),
    this.borderRadius,
  });

  /// Card widget being decorated.
  final Widget child;

  /// Tint of the aura — typically the card's accent color.
  final Color auraColor;

  /// Opacity multiplier (0..1). 0.3 is a soft halo; 0.5+ becomes strong.
  final double intensity;

  /// Spread of the blur. Bigger = wider halo, more expensive.
  final double blurRadius;

  /// Negative values keep the glow tight around the card; positive pushes
  /// it outward.
  final double spreadRadius;

  /// Where the glow sits relative to the card. Slight downward offset
  /// mimics natural light from above.
  final Offset offset;

  /// Border radius used for the shadow shape. Match the card's radius for
  /// a coherent halo.
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(20);

    return RepaintBoundary(
      child: Stack(
        clipBehavior: Clip.none,
        // Pass-through so the wrapped child inherits the parent's tight
        // constraints (e.g. SizedBox.width). Default StackFit.loose would
        // let the child shrink to its content and break grid alignment.
        fit: StackFit.passthrough,
        children: [
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: radius,
                  boxShadow: [
                    BoxShadow(
                      color: auraColor.withValues(alpha: intensity),
                      blurRadius: blurRadius,
                      spreadRadius: spreadRadius,
                      offset: offset,
                    ),
                  ],
                ),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}
