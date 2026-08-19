import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/models/camera.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_shadows.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/app_status_view.dart';
import '../../../core/ui/aura_card.dart';
import '../../../core/ui/ch_scaffold.dart';
import '../../../core/ui/inline_page_header.dart';

class CamerasPage extends ConsumerWidget {
  const CamerasPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(camerasProvider);

    return CHScaffold(
      withTopBand: false,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InlinePageHeader(
            title: 'Câmeras',
            subtitle: 'Veja as câmeras das áreas comuns ao vivo.',
            onBack: () => context.go(AppRoutes.services),
          ),
          const SizedBox(height: AppSpacing.sm),
          Expanded(
            child: async.when(
              data: (cameras) {
                if (cameras.isEmpty) {
                  return AppStatusView.empty(
                    icon: Icons.videocam_off_outlined,
                    title: 'Nenhuma câmera',
                    message: 'Não há câmeras disponíveis no momento.',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () => ref.refresh(camerasProvider.future),
                  child: GridView.builder(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.lg,
                      AppSpacing.sm,
                      AppSpacing.lg,
                      AppSpacing.xl2,
                    ),
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 340,
                      mainAxisSpacing: AppSpacing.md,
                      crossAxisSpacing: AppSpacing.md,
                      childAspectRatio: 0.92,
                    ),
                    itemCount: cameras.length,
                    itemBuilder: (_, i) => _CameraCard(
                      camera: cameras[i],
                      onTap: () => _open(context, cameras[i]),
                    ),
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => AppStatusView.error(
                title: 'Erro ao carregar câmeras',
                message: '$e',
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _open(BuildContext context, Camera camera) {
    if (!camera.isOnline) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${camera.name} está offline no momento.')),
      );
      return;
    }
    context.go(AppRoutes.cameraLiveLocation(camera.id));
  }
}

class _CameraCard extends StatelessWidget {
  const _CameraCard({required this.camera, required this.onTap});

  final Camera camera;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final online = camera.isOnline;
    final accent = online ? AppColors.success : AppColors.secondaryGray;
    final radius = AppRadius.all(AppRadius.lg);

    return AuraCard(
      auraColor: accent,
      intensity: online ? 0.22 : 0.10,
      blurRadius: 26,
      spreadRadius: -10,
      offset: const Offset(0, 12),
      borderRadius: radius,
      child: Semantics(
        button: true,
        label: 'Câmera ${camera.name}',
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: radius,
            child: Ink(
              decoration: BoxDecoration(
                color: isDark ? scheme.surface : Colors.white,
                borderRadius: radius,
                border: Border.all(
                  color: scheme.outline.withValues(alpha: isDark ? 0.3 : 0.14),
                ),
                boxShadow: AppShadows.level1(isDark: isDark),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Preview(online: online),
                  Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          camera.name,
                          style: AppText.subtitle.copyWith(
                            fontWeight: FontWeight.w700,
                            color: scheme.onSurface,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Icon(
                              Icons.place_outlined,
                              size: 14,
                              color: scheme.onSurfaceVariant,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                camera.location,
                                style: AppText.caption.copyWith(
                                  color: scheme.onSurfaceVariant,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Preview extends StatelessWidget {
  const _Preview({required this.online});

  final bool online;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 10,
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppRadius.lg),
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF1B2840), Color(0xFF0E1626)],
                ),
              ),
            ),
            Center(
              child: Icon(
                online ? Icons.videocam_rounded : Icons.videocam_off_rounded,
                color: Colors.white.withValues(alpha: 0.5),
                size: 34,
              ),
            ),
            Positioned(
              top: AppSpacing.sm,
              left: AppSpacing.sm,
              child: _StatusBadge(online: online),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.online});

  final bool online;

  @override
  Widget build(BuildContext context) {
    final color = online ? AppColors.success : AppColors.secondaryGray;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.42),
        borderRadius: AppRadius.all(AppRadius.pill),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            online ? 'AO VIVO' : 'OFFLINE',
            style: AppText.overline.copyWith(
              color: Colors.white,
              fontSize: 9.5,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}
