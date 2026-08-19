import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text.dart';

/// Unified loading/empty/error placeholder.
///
/// Use it inside lists and pages so all status surfaces look the same.
class AppStatusView extends StatelessWidget {
  const AppStatusView._({
    required this.icon,
    required this.title,
    this.message,
    this.action,
    this.tone = AppStatusTone.neutral,
    this.isLoading = false,
  });

  factory AppStatusView.empty({
    required IconData icon,
    required String title,
    String? message,
    Widget? action,
  }) {
    return AppStatusView._(
      icon: icon,
      title: title,
      message: message,
      action: action,
    );
  }

  factory AppStatusView.error({
    required String title,
    String? message,
    Widget? action,
    IconData icon = Icons.error_outline_rounded,
  }) {
    return AppStatusView._(
      icon: icon,
      title: title,
      message: message,
      action: action,
      tone: AppStatusTone.error,
    );
  }

  factory AppStatusView.loading({String? message}) {
    return AppStatusView._(
      icon: Icons.hourglass_empty_rounded,
      title: message ?? 'Carregando...',
      isLoading: true,
    );
  }

  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;
  final AppStatusTone tone;
  final bool isLoading;

  Color _accentColor() {
    switch (tone) {
      case AppStatusTone.error:
        return AppColors.error;
      case AppStatusTone.neutral:
        return AppColors.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final accent = _accentColor();

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xl,
        vertical: AppSpacing.xl2,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              borderRadius: AppRadius.all(AppRadius.lg),
            ),
            child: isLoading
                ? Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        color: accent,
                      ),
                    ),
                  )
                : Icon(icon, color: accent, size: 26),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            title,
            textAlign: TextAlign.center,
            style: AppText.subtitle.copyWith(color: scheme.onSurface),
          ),
          if (message != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: AppText.bodySmall.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
          ],
          if (action != null) ...[
            const SizedBox(height: AppSpacing.lg),
            action!,
          ],
        ],
      ),
    );
  }
}

enum AppStatusTone { neutral, error }
