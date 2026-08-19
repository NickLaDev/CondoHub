import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../app/routes.dart';
import '../../../core/models/qr.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';

class QrPage extends ConsumerStatefulWidget {
  const QrPage({super.key});

  @override
  ConsumerState<QrPage> createState() => _QrPageState();
}

enum _QrAccessMode { resident, visitor }

class _QrPageState extends ConsumerState<QrPage> {
  final Map<_QrAccessMode, QrState> _qrByMode = {};
  final Map<_QrAccessMode, Future<void>> _generateInFlightByMode = {};
  _QrAccessMode _selectedMode = _QrAccessMode.resident;
  Timer? _uiTimer;
  final ValueNotifier<int> _remainingSeconds = ValueNotifier<int>(0);

  QrState? get _currentQr => _qrByMode[_selectedMode];

  bool _isGenerating(_QrAccessMode mode) =>
      _generateInFlightByMode[mode] != null;

  bool get _isGeneratingSelected => _isGenerating(_selectedMode);

  @override
  void initState() {
    super.initState();
    _generate(_selectedMode);
  }

  Future<void> _generate(_QrAccessMode mode) {
    final inFlight = _generateInFlightByMode[mode];
    if (inFlight != null) return inFlight;

    final request = _runGenerate(mode).whenComplete(() {
      _generateInFlightByMode.remove(mode);
      if (mounted) {
        setState(() {});
      }
    });

    _generateInFlightByMode[mode] = request;
    if (mounted) {
      setState(() {});
    }
    return request;
  }

  Future<void> _runGenerate(_QrAccessMode mode) async {
    final qr = await ref.read(qrRepositoryProvider).generate();
    if (!mounted) return;

    setState(() {
      _qrByMode[mode] = qr;
    });
    if (mode == _selectedMode) {
      _remainingSeconds.value = qr.remainingSeconds;
      _startUiTimer();
    }
  }

  void _selectMode(_QrAccessMode mode) {
    if (_selectedMode == mode) return;

    setState(() {
      _selectedMode = mode;
    });

    final qr = _qrByMode[mode];
    _remainingSeconds.value = qr?.remainingSeconds ?? 0;

    if (qr == null || qr.isExpired) {
      _generate(mode);
    }
  }

  void _startUiTimer() {
    _uiTimer?.cancel();
    _uiTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      final qr = _currentQr;
      if (qr == null) return;
      final remaining = qr.remainingSeconds;
      if (remaining <= 0) {
        if (!_isGeneratingSelected) _generate(_selectedMode);
      } else if (_remainingSeconds.value != remaining) {
        _remainingSeconds.value = remaining;
      }
    });
  }

  @override
  void dispose() {
    _uiTimer?.cancel();
    _remainingSeconds.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final selectedQr = _currentQr;
    final selectedMode = _selectedMode;
    final personName = switch (selectedMode) {
      _QrAccessMode.resident => authState.user?.name ?? 'Morador',
      _QrAccessMode.visitor => 'Visitante autorizado',
    };
    final personSubtitle = switch (selectedMode) {
      _QrAccessMode.resident => authState.unit?.label ?? 'Bloco A - Apt 42',
      _QrAccessMode.visitor => 'Acesso temporário para a portaria',
    };
    final helpText = switch (selectedMode) {
      _QrAccessMode.resident =>
        'Apresente este código na portaria para identificação.\n'
            'O código é renovado automaticamente.',
      _QrAccessMode.visitor =>
        'Use este QR Code para liberar uma visita autorizada.\n'
            'O código é renovado automaticamente.',
    };

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          _buildTopBar(context),
          Expanded(
            child: Stack(
              children: [
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0xFF112C59),
                          AppColors.primaryBlue,
                          Color(0xFF0C1C36),
                        ],
                        stops: [0, 0.44, 1],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: -60,
                  right: -20,
                  child: Container(
                    width: 180,
                    height: 180,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.05),
                    ),
                  ),
                ),
                SafeArea(
                  top: false,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final minHeight = (constraints.maxHeight - 24)
                          .clamp(0.0, double.infinity)
                          .toDouble();

                      return SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                        child: ConstrainedBox(
                          constraints: BoxConstraints(minHeight: minHeight),
                          child: Column(
                            children: [
                              const SizedBox(height: 56),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.08),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.apartment_rounded,
                                      color: Colors.white70,
                                      size: 15,
                                    ),
                                    const SizedBox(width: 6),
                                    ConstrainedBox(
                                      constraints: const BoxConstraints(
                                        maxWidth: 220,
                                      ),
                                      child: Text(
                                        authState.condo?.name ??
                                            'Condomínio Verde Park',
                                        style: AppText.bodyOnNavy.copyWith(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              _QrModeSelector(
                                selectedMode: selectedMode,
                                onChanged: _selectMode,
                              ),
                              const SizedBox(height: 18),
                              _QrCard(
                                code: selectedQr?.code ?? '------',
                                payload: selectedQr?.payload,
                              ),
                              const SizedBox(height: 22),
                              Text(
                                personName,
                                style: AppText.heading2.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 28,
                                  height: 1.1,
                                ),
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                personSubtitle,
                                style: AppText.bodyOnNavy.copyWith(
                                  color: Colors.white70,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 16),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.08),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.schedule_rounded,
                                      color: Colors.white70,
                                      size: 15,
                                    ),
                                    const SizedBox(width: 6),
                                    ValueListenableBuilder<int>(
                                      valueListenable: _remainingSeconds,
                                      builder: (context, remaining, _) {
                                        return Text(
                                          'Expira em ${remaining}s',
                                          style: AppText.bodyOnNavy.copyWith(
                                            color: Colors.white70,
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        );
                                      },
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 18),
                              FilledButton.icon(
                                onPressed: _isGeneratingSelected
                                    ? null
                                    : () => _generate(_selectedMode),
                                icon: const Icon(
                                  Icons.refresh_rounded,
                                  size: 18,
                                ),
                                label: Text(
                                  _isGeneratingSelected
                                      ? 'Atualizando...'
                                      : 'Gerar novo código',
                                ),
                                style: FilledButton.styleFrom(
                                  backgroundColor: AppColors.accent,
                                  foregroundColor: Colors.white,
                                  minimumSize: const Size(196, 44),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 18,
                                  ),
                                  textStyle: AppText.body.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                  ),
                                  shape: const StadiumBorder(),
                                ),
                              ),
                              const SizedBox(height: 22),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.08),
                                  ),
                                ),
                                child: Text(
                                  helpText,
                                  style: AppText.bodySmall.copyWith(
                                    color: Colors.white70,
                                    height: 1.45,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      color: AppColors.surface,
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
                  onTap: () => context.go(AppRoutes.services),
                  borderRadius: BorderRadius.circular(14),
                  child: Ink(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: scheme.outline.withValues(alpha: 0.12),
                      ),
                    ),
                    child: const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      color: AppColors.navy,
                      size: 16,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Acesso por QR Code',
                style: AppText.heading3.copyWith(
                  color: AppColors.navy,
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QrModeSelector extends StatelessWidget {
  const _QrModeSelector({required this.selectedMode, required this.onChanged});

  final _QrAccessMode selectedMode;
  final ValueChanged<_QrAccessMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _QrModeOption(
              mode: _QrAccessMode.resident,
              selected: selectedMode == _QrAccessMode.resident,
              onTap: onChanged,
            ),
          ),
          Expanded(
            child: _QrModeOption(
              mode: _QrAccessMode.visitor,
              selected: selectedMode == _QrAccessMode.visitor,
              onTap: onChanged,
            ),
          ),
        ],
      ),
    );
  }
}

class _QrModeOption extends StatelessWidget {
  const _QrModeOption({
    required this.mode,
    required this.selected,
    required this.onTap,
  });

  final _QrAccessMode mode;
  final bool selected;
  final ValueChanged<_QrAccessMode> onTap;

  String get _label => switch (mode) {
    _QrAccessMode.resident => 'Morador',
    _QrAccessMode.visitor => 'Visita',
  };

  IconData get _icon => switch (mode) {
    _QrAccessMode.resident => Icons.person_pin_circle_rounded,
    _QrAccessMode.visitor => Icons.badge_outlined,
  };

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: _label,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => onTap(mode),
          borderRadius: BorderRadius.circular(999),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            decoration: BoxDecoration(
              color: selected ? Colors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(999),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.12),
                        blurRadius: 12,
                        offset: const Offset(0, 5),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  _icon,
                  size: 17,
                  color: selected ? AppColors.navy : Colors.white70,
                ),
                const SizedBox(width: 6),
                Text(
                  _label,
                  style: AppText.bodySmall.copyWith(
                    color: selected ? AppColors.navy : Colors.white70,
                    fontWeight: FontWeight.w800,
                    height: 1,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QrCard extends StatelessWidget {
  const _QrCard({required this.code, required this.payload});

  final String code;
  final String? payload;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 204,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.22),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 142,
            height: 142,
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.divider),
            ),
            child: payload == null || payload!.isEmpty
                ? const Center(
                    child: SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(strokeWidth: 2.4),
                    ),
                  )
                : QrImageView(
                    data: payload!,
                    version: QrVersions.auto,
                    size: 128,
                    padding: EdgeInsets.zero,
                    backgroundColor: Colors.white,
                    errorCorrectionLevel: QrErrorCorrectLevel.M,
                  ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              code,
              style: AppText.bodySmall.copyWith(
                color: AppColors.textSecondary,
                fontSize: 12,
                letterSpacing: 0.8,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
