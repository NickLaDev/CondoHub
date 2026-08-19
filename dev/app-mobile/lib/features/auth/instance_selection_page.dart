import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/routes.dart';
import '../../core/localization/app_strings.dart';
import '../../core/models/instance_selection.dart';
import '../../core/network/api_exception.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/ui/buttons.dart';

class InstanceSelectionPage extends ConsumerStatefulWidget {
  const InstanceSelectionPage({super.key});

  @override
  ConsumerState<InstanceSelectionPage> createState() =>
      _InstanceSelectionPageState();
}

class _InstanceSelectionPageState extends ConsumerState<InstanceSelectionPage> {
  String? _selectingInstanceId;
  String? _errorMessage;

  Future<void> _selectInstance(InstanceSelectionOption option) async {
    if (_selectingInstanceId != null) return;

    setState(() {
      _selectingInstanceId = option.instanceId;
      _errorMessage = null;
    });

    try {
      await ref
          .read(authStateProvider.notifier)
          .selectInstance(instanceId: option.instanceId);
      if (!mounted) return;
      context.go(AppRoutes.home);
    } catch (error) {
      if (!mounted) return;

      final strings = AppStrings.of(context);
      final message = _friendlySelectionError(error, strings);
      final shouldReturnToLogin = _shouldReturnToLogin(error);

      if (shouldReturnToLogin) {
        final messenger = ScaffoldMessenger.of(context);
        await ref
            .read(authStateProvider.notifier)
            .clearPendingInstanceSelection();
        if (!mounted) return;
        context.go(AppRoutes.login);
        messenger.showSnackBar(SnackBar(content: Text(message)));
        return;
      }

      setState(() => _errorMessage = message);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) {
        setState(() => _selectingInstanceId = null);
      }
    }
  }

  Future<void> _cancelSelection() async {
    if (_selectingInstanceId != null) return;

    await ref.read(authStateProvider.notifier).clearPendingInstanceSelection();
    if (!mounted) return;
    context.go(AppRoutes.login);
  }

  String _friendlySelectionError(Object error, AppStrings strings) {
    if (error is ApiException) {
      return switch (error.code) {
        'INVALID_SELECTION_TOKEN' => strings.instanceSelectionExpired,
        'INSTANCE_SELECTION_NOT_ALLOWED' => strings.instanceSelectionNotAllowed,
        'INST_SUSPENDED' => strings.instanceSelectionSuspended,
        'NETWORK_ERROR' => strings.loginServerUnavailable,
        _ when error.statusCode == 401 => strings.instanceSelectionExpired,
        _ =>
          error.message.isEmpty
              ? strings.instanceSelectionGenericError
              : error.message,
      };
    }

    return strings.instanceSelectionGenericError;
  }

  bool _shouldReturnToLogin(Object error) {
    if (error is! ApiException) return false;
    return error.code == 'INVALID_SELECTION_TOKEN' || error.statusCode == 401;
  }

  @override
  Widget build(BuildContext context) {
    final pendingSelection = ref
        .watch(authStateProvider)
        .pendingInstanceSelection;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.backgroundSoftIce,
      body: Stack(
        children: [
          const Positioned.fill(child: _InstanceSelectionBackground()),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 28,
                  vertical: 24,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
                    decoration: BoxDecoration(
                      color: scheme.surface.withValues(
                        alpha: isDark ? 0.94 : 1,
                      ),
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                        color: scheme.outline.withValues(
                          alpha: isDark ? 0.4 : 0.16,
                        ),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(
                            alpha: isDark ? 0.28 : 0.06,
                          ),
                          blurRadius: isDark ? 16 : 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: pendingSelection == null
                        ? SizedBox(
                            height: 140,
                            child: Center(
                              child: CircularProgressIndicator(
                                color: scheme.primary,
                              ),
                            ),
                          )
                        : _InstanceSelectionContent(
                            pendingSelection: pendingSelection,
                            selectingInstanceId: _selectingInstanceId,
                            errorMessage: _errorMessage,
                            onSelect: _selectInstance,
                            onCancel: _cancelSelection,
                          ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InstanceSelectionBackground extends StatelessWidget {
  const _InstanceSelectionBackground();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IgnorePointer(
      child: Stack(
        fit: StackFit.expand,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: isDark
                  ? AppColors.darkShellBackgroundGradient
                  : AppColors.shellBackgroundGradient,
            ),
          ),
          Align(
            alignment: const Alignment(1.1, -0.95),
            child: FractionallySizedBox(
              widthFactor: 0.9,
              child: AspectRatio(
                aspectRatio: 1,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: isDark
                          ? [
                              AppColors.accentBlue.withValues(alpha: 0.12),
                              AppColors.primaryBlue.withValues(alpha: 0.08),
                              Colors.transparent,
                            ]
                          : [
                              AppColors.primaryBlue.withValues(alpha: 0.2),
                              const Color(0xFF18365F).withValues(alpha: 0.12),
                              Colors.transparent,
                            ],
                      stops: const [0, 0.42, 1],
                    ),
                  ),
                ),
              ),
            ),
          ),
          Align(
            alignment: const Alignment(-1.05, -0.85),
            child: FractionallySizedBox(
              widthFactor: 0.72,
              child: AspectRatio(
                aspectRatio: 1,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: isDark
                          ? [
                              Colors.white.withValues(alpha: 0.04),
                              Colors.transparent,
                            ]
                          : [
                              Colors.white.withValues(alpha: 0.3),
                              Colors.transparent,
                            ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: isDark
                    ? [
                        const Color(0xFF173150),
                        const Color(0xFF121D2D).withValues(alpha: 0.96),
                        Colors.transparent,
                      ]
                    : [
                        AppColors.primaryBlue,
                        const Color(0xFF18365F).withValues(alpha: 0.92),
                        Colors.transparent,
                      ],
                stops: const [0, 0.58, 1],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InstanceSelectionContent extends StatelessWidget {
  const _InstanceSelectionContent({
    required this.pendingSelection,
    required this.selectingInstanceId,
    required this.errorMessage,
    required this.onSelect,
    required this.onCancel,
  });

  final PendingInstanceSelection pendingSelection;
  final String? selectingInstanceId;
  final String? errorMessage;
  final ValueChanged<InstanceSelectionOption> onSelect;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: scheme.primary.withValues(alpha: isDark ? 0.28 : 0.12),
              ),
              boxShadow: [
                BoxShadow(
                  color: scheme.primary.withValues(alpha: isDark ? 0.18 : 0.1),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Icon(
              Icons.apartment_rounded,
              size: 40,
              color: scheme.primary,
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          strings.instanceSelectionTitle,
          style: AppText.heading1,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6),
        Text(
          strings.instanceSelectionBody,
          style: AppText.bodySmall.copyWith(color: scheme.onSurfaceVariant),
          textAlign: TextAlign.center,
        ),
        if (errorMessage != null) ...[
          const SizedBox(height: 20),
          _InstanceSelectionErrorBanner(message: errorMessage!),
        ],
        const SizedBox(height: 24),
        for (final option in pendingSelection.options) ...[
          _InstanceSelectionOptionTile(
            option: option,
            isLoading: selectingInstanceId == option.instanceId,
            isDisabled: selectingInstanceId != null,
            onTap: () => onSelect(option),
          ),
          const SizedBox(height: 12),
        ],
        const SizedBox(height: 8),
        OutlineButton(
          label: strings.backToLogin,
          icon: Icons.arrow_back,
          onPressed: selectingInstanceId == null ? onCancel : null,
        ),
      ],
    );
  }
}

class _InstanceSelectionOptionTile extends StatelessWidget {
  const _InstanceSelectionOptionTile({
    required this.option,
    required this.isLoading,
    required this.isDisabled,
    required this.onTap,
  });

  final InstanceSelectionOption option;
  final bool isLoading;
  final bool isDisabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final rolesLabel = option.roles.join(', ');
    final borderRadius = BorderRadius.circular(18);
    final isMuted = isDisabled && !isLoading;

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 160),
      opacity: isMuted ? 0.62 : 1,
      child: Material(
        color: isDark
            ? scheme.surfaceContainerHighest.withValues(alpha: 0.42)
            : AppColors.surfaceMuted,
        shape: RoundedRectangleBorder(
          borderRadius: borderRadius,
          side: BorderSide(
            color: scheme.outline.withValues(alpha: isDark ? 0.32 : 0.14),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: isDisabled ? null : onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: scheme.primary.withValues(
                      alpha: isDark ? 0.16 : 0.08,
                    ),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: scheme.primary.withValues(
                        alpha: isDark ? 0.2 : 0.1,
                      ),
                    ),
                  ),
                  child: Icon(
                    Icons.home_work_outlined,
                    color: scheme.primary,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        option.instanceName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.subtitle.copyWith(
                          color: scheme.onSurface,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (option.unitLabel != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          strings.instanceSelectionUnit(option.unitLabel!),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppText.bodySmall.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                      if (rolesLabel.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          strings.instanceSelectionRoles(rolesLabel),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppText.caption.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                if (isLoading)
                  SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: scheme.primary,
                    ),
                  )
                else
                  Icon(Icons.chevron_right_rounded, color: scheme.primary),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _InstanceSelectionErrorBanner extends StatelessWidget {
  const _InstanceSelectionErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.16)),
      ),
      child: Text(
        message,
        style: AppText.body.copyWith(color: AppColors.error),
      ),
    );
  }
}
