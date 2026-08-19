import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/ui/ch_scaffold.dart';
import '../../core/ui/feature_intro_card.dart';
import '../../core/ui/hub_action_card.dart';

class ServicesHubPage extends StatelessWidget {
  const ServicesHubPage({super.key});

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
            icon: Icons.grid_view_rounded,
            title: 'Serviços do condomínio',
            subtitle: 'Entregas, QR Code e acessos do dia a dia.',
            accentColor: AppColors.success,
          ),
          const SizedBox(height: AppSpacing.lg),
          HubActionGrid(
            children: [
              HubActionCard(
                icon: Icons.people_alt_rounded,
                title: 'Visitantes',
                subtitle: 'Cadastre e libere visitas',
                accentColor: AppColors.info,
                onTap: () => context.go(AppRoutes.visitors),
              ),
              HubActionCard(
                icon: Icons.draw_rounded,
                title: 'Documentos',
                subtitle: 'Assine documentos digitalmente',
                accentColor: AppColors.warning,
                onTap: () => context.go(AppRoutes.documents),
              ),
              HubActionCard(
                icon: Icons.verified_user_rounded,
                title: 'Acessos liberados',
                subtitle: 'Trabalhadores e visitas recorrentes',
                accentColor: AppColors.tertiaryViolet,
                onTap: () => context.go(AppRoutes.access),
              ),
              HubActionCard(
                icon: Icons.videocam_rounded,
                title: 'Câmeras',
                subtitle: 'Veja as áreas comuns ao vivo',
                accentColor: AppColors.tertiaryTeal,
                onTap: () => context.go(AppRoutes.cameras),
              ),
              HubActionCard(
                icon: Icons.inventory_2_rounded,
                title: 'Encomendas',
                subtitle: 'Acompanhe suas entregas',
                accentColor: AppColors.success,
                onTap: () => context.go(AppRoutes.deliveries),
              ),
              HubActionCard(
                icon: Icons.qr_code_2_rounded,
                title: 'Acesso por QR Code',
                subtitle: 'QR Code de visita ou morador',
                accentColor: AppColors.accent,
                onTap: () => context.go(AppRoutes.qr),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
