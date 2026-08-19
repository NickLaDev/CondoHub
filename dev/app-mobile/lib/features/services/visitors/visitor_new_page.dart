import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/models/visitor.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/buttons.dart';
import '../../../core/ui/ch_scaffold.dart';
import '../../../core/ui/inline_page_header.dart';
import '../../../core/ui/text_field.dart';
import 'visitor_format.dart';

class VisitorNewPage extends ConsumerStatefulWidget {
  const VisitorNewPage({super.key});

  @override
  ConsumerState<VisitorNewPage> createState() => _VisitorNewPageState();
}

class _VisitorNewPageState extends ConsumerState<VisitorNewPage> {
  final _nameCtrl = TextEditingController();
  final _documentCtrl = TextEditingController();
  final _unitCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  VisitorType _type = VisitorType.visitante;
  DateTime _expectedAt = DateTime.now();
  bool _loading = false;
  bool _prefilled = false;

  bool get _isValid => _nameCtrl.text.trim().isNotEmpty;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _documentCtrl.dispose();
    _unitCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    if (!_prefilled) {
      final unit = ref.read(authStateProvider).unit?.label;
      if (unit != null && unit.isNotEmpty) _unitCtrl.text = unit;
      _prefilled = true;
    }

    return CHScaffold(
      withTopBand: false,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
        children: [
          InlinePageHeader(
            title: 'Novo visitante',
            subtitle: 'Dados básicos para a portaria liberar a entrada.',
            onBack: () => context.go(AppRoutes.visitors),
          ),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: isDark
                  ? scheme.surface
                  : Colors.white.withValues(alpha: 0.92),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: scheme.outline.withValues(alpha: isDark ? 0.24 : 0.1),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.16 : 0.03),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppTextField(
                  label: 'Nome do visitante',
                  hint: 'Ex.: Maria Souza',
                  controller: _nameCtrl,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 16),
                Text(
                  'Tipo',
                  style: AppText.body.copyWith(
                    fontWeight: FontWeight.w600,
                    color: scheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                _TypeSelector(
                  selected: _type,
                  onChanged: (t) => setState(() => _type = t),
                ),
                const SizedBox(height: 16),
                Text(
                  'Data prevista',
                  style: AppText.body.copyWith(
                    fontWeight: FontWeight.w600,
                    color: scheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                _DateField(
                  value: _expectedAt,
                  onTap: _pickDate,
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: 'Unidade',
                  hint: 'Ex.: Bloco A - Apt 42',
                  controller: _unitCtrl,
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: 'Documento (opcional)',
                  hint: 'CPF ou RG',
                  controller: _documentCtrl,
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: 'Observações (opcional)',
                  hint: 'Ex.: Entrega de móveis, fica até 18h...',
                  controller: _notesCtrl,
                  maxLines: 3,
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: PrimaryButton(
                    label: 'Cadastrar visitante',
                    onPressed: _isValid ? _create : null,
                    isLoading: _loading,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expectedAt,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _expectedAt = picked);
  }

  Future<void> _create() async {
    if (!_isValid) return;
    setState(() => _loading = true);
    try {
      await ref.read(visitorsRepositoryProvider).addVisitor(
            name: _nameCtrl.text.trim(),
            type: _type,
            expectedAt: _expectedAt,
            document: _documentCtrl.text.trim(),
            unitLabel: _unitCtrl.text.trim(),
            notes: _notesCtrl.text.trim().isEmpty
                ? null
                : _notesCtrl.text.trim(),
          );
      ref.invalidate(visitorsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Visitante cadastrado!')),
        );
        context.go(AppRoutes.visitors);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erro: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}

class _TypeSelector extends StatelessWidget {
  const _TypeSelector({required this.selected, required this.onChanged});

  final VisitorType selected;
  final ValueChanged<VisitorType> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final type in VisitorType.values) ...[
          Expanded(
            child: _TypeOption(
              type: type,
              selected: selected == type,
              onTap: () => onChanged(type),
            ),
          ),
          if (type != VisitorType.values.last)
            const SizedBox(width: AppSpacing.sm),
        ],
      ],
    );
  }
}

class _TypeOption extends StatelessWidget {
  const _TypeOption({
    required this.type,
    required this.selected,
    required this.onTap,
  });

  final VisitorType type;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Semantics(
      button: true,
      selected: selected,
      label: visitorTypeLabel(type),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.md,
            ),
            decoration: BoxDecoration(
              color: selected
                  ? scheme.primary.withValues(alpha: 0.12)
                  : (isDark
                        ? Colors.white.withValues(alpha: 0.04)
                        : AppColors.surfaceVariant),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected
                    ? scheme.primary.withValues(alpha: 0.30)
                    : scheme.outline.withValues(alpha: isDark ? 0.22 : 0.14),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  visitorTypeIcon(type),
                  size: 18,
                  color: selected ? scheme.primary : scheme.onSurfaceVariant,
                ),
                const SizedBox(width: AppSpacing.sm),
                Flexible(
                  child: Text(
                    visitorTypeLabel(type),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppText.bodySmall.copyWith(
                      color: selected
                          ? scheme.primary
                          : scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
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

class _DateField extends StatelessWidget {
  const _DateField({required this.value, required this.onTap});

  final DateTime value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.lg,
          ),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.04)
                : AppColors.surfaceVariant,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: scheme.outline.withValues(alpha: isDark ? 0.22 : 0.14),
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.calendar_today_rounded,
                size: 18,
                color: scheme.onSurfaceVariant,
              ),
              const SizedBox(width: AppSpacing.md),
              Text(
                formatDate(value),
                style: AppText.body.copyWith(color: scheme.onSurface),
              ),
              const Spacer(),
              Icon(
                Icons.keyboard_arrow_down_rounded,
                color: scheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
