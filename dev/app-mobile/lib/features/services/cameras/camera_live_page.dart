import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';

import '../../../app/routes.dart';
import '../../../core/models/camera.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text.dart';

class CameraLivePage extends ConsumerStatefulWidget {
  const CameraLivePage({super.key, required this.id});

  final String id;

  @override
  ConsumerState<CameraLivePage> createState() => _CameraLivePageState();
}

class _CameraLivePageState extends ConsumerState<CameraLivePage> {
  VideoPlayerController? _controller;
  Camera? _camera;
  bool _loading = true;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = false;
    });
    try {
      final camera =
          await ref.read(camerasRepositoryProvider).getById(widget.id);
      if (!mounted) return;
      if (camera == null) {
        setState(() {
          _loading = false;
          _error = true;
        });
        return;
      }
      _camera = camera;
      final controller =
          VideoPlayerController.networkUrl(Uri.parse(camera.streamUrl));
      _controller = controller;
      controller.addListener(_onUpdate);
      await controller.initialize();
      if (!mounted) {
        controller.dispose();
        return;
      }
      await controller.setLooping(true);
      await controller.play();
      setState(() => _loading = false);
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = true;
        });
      }
    }
  }

  void _onUpdate() {
    final controller = _controller;
    if (controller != null && controller.value.hasError && mounted && !_error) {
      setState(() => _error = true);
    }
  }

  Future<void> _retry() async {
    final old = _controller;
    _controller = null;
    old?.removeListener(_onUpdate);
    await old?.dispose();
    await _load();
  }

  void _togglePlay() {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    setState(() {
      controller.value.isPlaying ? controller.pause() : controller.play();
    });
  }

  void _toggleMute() {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    final muted = controller.value.volume == 0;
    setState(() => controller.setVolume(muted ? 1 : 0));
  }

  @override
  void dispose() {
    _controller?.removeListener(_onUpdate);
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final ready = controller != null &&
        controller.value.isInitialized &&
        !_error;

    return Scaffold(
      backgroundColor: const Color(0xFF0C1322),
      body: Column(
        children: [
          _TopBar(title: _camera?.name ?? 'Câmera'),
          Expanded(
            child: Stack(
              children: [
                const Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Color(0xFF13294A), Color(0xFF0C1322)],
                      ),
                    ),
                  ),
                ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: Center(
                            child: _VideoArea(
                              controller: controller,
                              loading: _loading,
                              error: _error,
                              onRetry: _retry,
                            ),
                          ),
                        ),
                        if (_camera != null) ...[
                          const SizedBox(height: AppSpacing.lg),
                          _InfoBar(camera: _camera!, live: ready),
                          const SizedBox(height: AppSpacing.md),
                          _Controls(
                            enabled: ready,
                            isPlaying: ready && controller.value.isPlaying,
                            isMuted: ready && controller.value.volume == 0,
                            onPlayPause: _togglePlay,
                            onMute: _toggleMute,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF0C1322),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 60,
          child: Row(
            children: [
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => context.go(AppRoutes.cameras),
                  borderRadius: BorderRadius.circular(14),
                  child: Ink(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.12),
                      ),
                    ),
                    child: const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: AppText.heading3.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VideoArea extends StatelessWidget {
  const _VideoArea({
    required this.controller,
    required this.loading,
    required this.error,
    required this.onRetry,
  });

  final VideoPlayerController? controller;
  final bool loading;
  final bool error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    if (error) {
      return _Message(
        icon: Icons.videocam_off_rounded,
        title: 'Não foi possível conectar',
        message: 'A câmera pode estar offline. Tente novamente.',
        action: FilledButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh_rounded, size: 18),
          label: const Text('Tentar novamente'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.accent,
            foregroundColor: Colors.white,
          ),
        ),
      );
    }
    if (loading || controller == null || !controller!.value.isInitialized) {
      return const _Message(
        icon: Icons.videocam_rounded,
        title: 'Conectando à câmera...',
        message: 'Carregando a transmissão ao vivo.',
        showSpinner: true,
      );
    }
    return ClipRRect(
      borderRadius: AppRadius.all(AppRadius.lg),
      child: AspectRatio(
        aspectRatio: controller!.value.aspectRatio == 0
            ? 16 / 9
            : controller!.value.aspectRatio,
        child: VideoPlayer(controller!),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({
    required this.icon,
    required this.title,
    required this.message,
    this.action,
    this.showSpinner = false,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;
  final bool showSpinner;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 64,
          height: 64,
          child: showSpinner
              ? const CircularProgressIndicator(color: Colors.white54)
              : Icon(icon, color: Colors.white54, size: 44),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          title,
          textAlign: TextAlign.center,
          style: AppText.subtitle.copyWith(color: Colors.white),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          message,
          textAlign: TextAlign.center,
          style: AppText.bodySmall.copyWith(color: Colors.white60),
        ),
        if (action != null) ...[
          const SizedBox(height: AppSpacing.lg),
          action!,
        ],
      ],
    );
  }
}

class _InfoBar extends StatelessWidget {
  const _InfoBar({required this.camera, required this.live});

  final Camera camera;
  final bool live;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                camera.name,
                style: AppText.heading3.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                camera.location,
                style: AppText.bodySmall.copyWith(color: Colors.white60),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        if (live)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.16),
              borderRadius: AppRadius.all(AppRadius.pill),
              border: Border.all(
                color: AppColors.error.withValues(alpha: 0.4),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: AppColors.error,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  'AO VIVO',
                  style: AppText.overline.copyWith(
                    color: Colors.white,
                    fontSize: 10,
                    letterSpacing: 0.6,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _Controls extends StatelessWidget {
  const _Controls({
    required this.enabled,
    required this.isPlaying,
    required this.isMuted,
    required this.onPlayPause,
    required this.onMute,
  });

  final bool enabled;
  final bool isPlaying;
  final bool isMuted;
  final VoidCallback onPlayPause;
  final VoidCallback onMute;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _ControlButton(
          icon: isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
          label: isPlaying ? 'Pausar' : 'Reproduzir',
          onTap: enabled ? onPlayPause : null,
          primary: true,
        ),
        const SizedBox(width: AppSpacing.md),
        _ControlButton(
          icon: isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
          label: isMuted ? 'Sem som' : 'Com som',
          onTap: enabled ? onMute : null,
        ),
      ],
    );
  }
}

class _ControlButton extends StatelessWidget {
  const _ControlButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.primary = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final disabled = onTap == null;
    final bg = primary
        ? AppColors.accent.withValues(alpha: disabled ? 0.3 : 1)
        : Colors.white.withValues(alpha: 0.08);
    final fg = primary ? Colors.white : Colors.white.withValues(alpha: 0.92);

    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.all(AppRadius.md),
          child: Ink(
            height: 48,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: AppRadius.all(AppRadius.md),
              border: primary
                  ? null
                  : Border.all(color: Colors.white.withValues(alpha: 0.12)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: fg, size: 20),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  label,
                  style: AppText.button.copyWith(color: fg, fontSize: 14),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
