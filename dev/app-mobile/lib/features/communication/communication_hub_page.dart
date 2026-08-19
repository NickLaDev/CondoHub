import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/ui/ch_scaffold.dart';
import '../../core/ui/feature_intro_card.dart';
import '../../core/ui/hub_action_card.dart';

class CommunicationHubPage extends StatelessWidget {
  const CommunicationHubPage({super.key});

  @override
  Widget build(BuildContext context) {
    return CHScaffold(
      withTopBand: false,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.xl2,
          AppSpacing.lg,
          AppSpacing.xl2,
        ),
        children: [
          const FeatureIntroCard(
            icon: Icons.forum_rounded,
            title: 'Central de comunicação',
            subtitle: 'Canais do condomínio e atendimento com a administração.',
            accentColor: AppColors.accent,
          ),
          const SizedBox(height: AppSpacing.lg),
          HubActionGrid(
            children: [
              HubActionCard(
                icon: Icons.forum_rounded,
                title: 'Canais',
                subtitle: 'Participe das discussões do condomínio',
                accentColor: AppColors.accent,
                onTap: () => context.go(AppRoutes.channels),
              ),
              HubActionCard(
                icon: Icons.support_agent_rounded,
                title: 'Atendimento',
                subtitle: 'Fale com a administração',
                accentColor: AppColors.info,
                onTap: () => context.go(AppRoutes.inbox),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
