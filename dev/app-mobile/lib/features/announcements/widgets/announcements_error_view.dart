import 'package:flutter/material.dart';

import '../../../core/localization/app_strings.dart';
import '../../../core/ui/app_status_view.dart';
import '../../../core/ui/buttons.dart';

class AnnouncementsErrorView extends StatelessWidget {
  const AnnouncementsErrorView({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    final isEnglish = strings.isEnglish;

    return AppStatusView.error(
      title: strings.errorLabel,
      message: message,
      action: PrimaryButton(
        label: isEnglish ? 'Retry' : 'Tentar novamente',
        onPressed: onRetry,
        icon: Icons.refresh_rounded,
      ),
    );
  }
}
