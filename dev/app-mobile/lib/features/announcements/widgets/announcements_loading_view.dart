import 'package:flutter/material.dart';

import '../../../core/theme/app_spacing.dart';
import '../../../core/ui/app_status_view.dart';

class AnnouncementsLoadingView extends StatelessWidget {
  const AnnouncementsLoadingView({
    super.key,
    this.message,
  });

  final String? message;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(top: AppSpacing.xl2),
      children: [
        AppStatusView.loading(message: message),
      ],
    );
  }
}
