import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/models/authorized_person.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/buttons.dart';
import '../../../core/ui/ch_scaffold.dart';
import '../../../core/ui/inline_page_header.dart';
import '../../../core/ui/text_field.dart';
import '../../../core/util/date_format.dart';
import 'access_format.dart';

class AuthorizedAccessEditPage extends ConsumerStatefulWidget {
  const AuthorizedAccessEditPage({super.key, this.id});

  final String? id;

  bool get isEditing => id != null;

  @override
  ConsumerState<AuthorizedAccessEditPage> createState() =>
      _AuthorizedAccessEditPageState();
}

class _AuthorizedAccessEditPageState
    extends ConsumerState<AuthorizedAccessEditPage> {
  final _nameCtrl = TextEditingController();
  final _documentCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  AuthorizedType _type = AuthorizedType.diarista;
  Set<int> _weekdays = {1, 2, 3, 4, 5};
  int _startMinutes = 8 * 60;
  int _endMinutes = 18 * 60;
  DateTime? _validUntil;
  bool _active = true;

  bool _loading = false;
  bool _saving = false;

  bool get _isValid =>
      _nameCtrl.text.trim().isNotEmpty &&
      _weekdays.isNotEmpty &&
      _endMinutes > _startMinutes;

  @override
  void initState() {
    super.initState();
    if (widget.id != null) {
      _loading = true;
      Future.microtask(_loadExisting);
    }
  }

  Future<void> _loadExisting() async {
    final person =
        await ref.read(authorizedAccessRepositoryProvider).getById(widget.id!);
    if (!mounted) return;
    if (person != null) {
      _nameCtrl.text = person.name;
      _documentCtrl.text = person.document;
      _notesCtrl.text = person.notes ?? '';
      _type = person.type;
      _weekdays = {...person.weekdays};
      _startMinutes = person.startMinutes;
      _endMinutes = person.endMinutes;
      _validUntil = person.validUntil;
      _active = person.active;
    }
    setState(() => _loading = false);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _documentCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return CHScaffold(
      withTopBand: false,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
              children: [
                InlinePageHeader(
                  title: widget.isEditing ? 'Editar acesso' : 'Liberar acesso',
                  subtitle:
                      'Defina os dias, o horário e até quando o acesso vale.',
                  onBack: () => context.go(AppRoutes.access),
                ),
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: isDark
                        ? scheme.surface
                        : Colors.white.withValues(alpha: 0.92),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color:
                          scheme.outline.withValues(alpha: isDark ? 0.24 : 0.1),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AppTextField(
                        label: 'Nome',
                        hint: 'Ex.: Joana da Silva',
                        controller: _nameCtrl,
                        onChanged: (_) => setState(() {}),
                      ),
                      const SizedBox(height: 16),
                      _label('Tipo', scheme),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<AuthorizedType>(
                        initialValue: _type,
                        decoration: const InputDecoration(),
                        items: AuthorizedType.values
                            .map(
                              (t) => DropdownMenuItem(
                                value: t,
                                child: Text(authorizedTypeLabel(t)),
                              ),
                            )
                            .toList(),
                        onChanged: (v) =>
                            setState(() => _type = v ?? _type),
                      ),
                      const SizedBox(height: 16),
                      _label('Dias liberados', scheme),
                      const SizedBox(height: 8),
                      _WeekdayPicker(
                        selected: _weekdays,
                        onToggle: _toggleWeekday,
                      ),
                      const SizedBox(height: 16),
                      _label('Horário liberado', scheme),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: _TimeField(
                              caption: 'Início',
                              minutes: _startMinutes,
                              onTap: () => _pickTime(isStart: true),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: _TimeField(
                              caption: 'Fim',
                              minutes: _endMinutes,
                              onTap: () => _pickTime(isStart: false),
                            ),
                          ),
                        ],
                      ),
                      if (_endMinutes <= _startMinutes) ...[
                        const SizedBox(height: 8),
                        Text(
                          'O horário final deve ser maior que o inicial.',
                          style: AppText.caption.copyWith(
                            color: AppColors.error,
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      _label('Liberado até', scheme),
                      const SizedBox(height: 8),
                      _ValidUntilField(
                        value: _validUntil,
                        onTap: _pickValidUntil,
                        onClear: () => setState(() => _validUntil = null),
                      ),
                      const SizedBox(height: 16),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          'Acesso ativo',
                          style: AppText.body.copyWith(
                            fontWeight: FontWeight.w600,
                            color: scheme.onSurface,
                          ),
                        ),
                        subtitle: Text(
                          'Desative para suspender sem excluir.',
                          style: AppText.bodySmall.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                        value: _active,
                        onChanged: (v) => setState(() => _active = v),
                      ),
                      const SizedBox(height: 8),
                      AppTextField(
                        label: 'Observações (opcional)',
                        hint: 'Ex.: Tem a chave da unidade.',
                        controller: _notesCtrl,
                        maxLines: 3,
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: PrimaryButton(
                          label: widget.isEditing
                              ? 'Salvar alterações'
                              : 'Liberar acesso',
                          onPressed: _isValid ? _save : null,
                          isLoading: _saving,
                        ),
                      ),
                      if (widget.isEditing) ...[
                        const SizedBox(height: AppSpacing.sm),
                        SizedBox(
                          width: double.infinity,
                          child: TextButton.icon(
                            onPressed: _delete,
                            icon: const Icon(Icons.delete_outline_rounded),
                            label: const Text('Excluir acesso'),
                            style: TextButton.styleFrom(
                              foregroundColor: AppColors.error,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _label(String text, ColorScheme scheme) => Text(
        text,
        style: AppText.body.copyWith(
          fontWeight: FontWeight.w600,
          color: scheme.onSurface,
        ),
      );

  void _toggleWeekday(int day) {
    setState(() {
      if (_weekdays.contains(day)) {
        _weekdays.remove(day);
      } else {
        _weekdays.add(day);
      }
    });
  }

  Future<void> _pickTime({required bool isStart}) async {
    final initial = isStart ? _startMinutes : _endMinutes;
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: initial ~/ 60, minute: initial % 60),
    );
    if (picked == null) return;
    setState(() {
      final minutes = picked.hour * 60 + picked.minute;
      if (isStart) {
        _startMinutes = minutes;
      } else {
        _endMinutes = minutes;
      }
    });
  }

  Future<void> _pickValidUntil() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _validUntil ?? now.add(const Duration(days: 30)),
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) setState(() => _validUntil = picked);
  }

  Future<void> _save() async {
    if (!_isValid) return;
    setState(() => _saving = true);
    try {
      await ref.read(authorizedAccessRepositoryProvider).save(
            id: widget.id,
            name: _nameCtrl.text.trim(),
            type: _type,
            weekdays: _weekdays,
            startMinutes: _startMinutes,
            endMinutes: _endMinutes,
            validUntil: _validUntil,
            active: _active,
            document: _documentCtrl.text.trim(),
            notes: _notesCtrl.text.trim().isEmpty
                ? null
                : _notesCtrl.text.trim(),
          );
      ref.invalidate(authorizedAccessProvider);
      if (widget.id != null) {
        ref.invalidate(authorizedPersonProvider(widget.id!));
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.isEditing ? 'Acesso atualizado!' : 'Acesso liberado!',
            ),
          ),
        );
        context.go(AppRoutes.access);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erro: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    final id = widget.id;
    if (id == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Excluir acesso'),
        content: Text('Deseja excluir o acesso de ${_nameCtrl.text.trim()}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(authorizedAccessRepositoryProvider).delete(id);
    ref.invalidate(authorizedAccessProvider);
    if (mounted) context.go(AppRoutes.access);
  }
}

class _WeekdayPicker extends StatelessWidget {
  const _WeekdayPicker({required this.selected, required this.onToggle});

  final Set<int> selected;
  final ValueChanged<int> onToggle;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        for (var day = 1; day <= 7; day++)
          _WeekdayChip(
            day: day,
            selected: selected.contains(day),
            onTap: () => onToggle(day),
          ),
      ],
    );
  }
}

class _WeekdayChip extends StatelessWidget {
  const _WeekdayChip({
    required this.day,
    required this.selected,
    required this.onTap,
  });

  final int day;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Semantics(
      button: true,
      selected: selected,
      label: weekdayLong(day),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected
                  ? scheme.primary.withValues(alpha: 0.14)
                  : (isDark
                        ? Colors.white.withValues(alpha: 0.04)
                        : AppColors.surfaceVariant),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected
                    ? scheme.primary.withValues(alpha: 0.32)
                    : scheme.outline.withValues(alpha: isDark ? 0.22 : 0.14),
              ),
            ),
            child: Text(
              weekdayShort(day),
              style: AppText.caption.copyWith(
                color: selected ? scheme.primary : scheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TimeField extends StatelessWidget {
  const _TimeField({
    required this.caption,
    required this.minutes,
    required this.onTap,
  });

  final String caption;
  final int minutes;
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
            vertical: AppSpacing.md,
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                caption,
                style: AppText.caption.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  Icon(
                    Icons.schedule_rounded,
                    size: 16,
                    color: scheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    formatMinutes(minutes),
                    style: AppText.subtitle.copyWith(
                      color: scheme.onSurface,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ValidUntilField extends StatelessWidget {
  const _ValidUntilField({
    required this.value,
    required this.onTap,
    required this.onClear,
  });

  final DateTime? value;
  final VoidCallback onTap;
  final VoidCallback onClear;

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
                Icons.event_available_rounded,
                size: 18,
                color: scheme.onSurfaceVariant,
              ),
              const SizedBox(width: AppSpacing.md),
              Text(
                value == null ? 'Sem data de expiração' : formatDate(value!),
                style: AppText.body.copyWith(color: scheme.onSurface),
              ),
              const Spacer(),
              if (value != null)
                IconButton(
                  onPressed: onClear,
                  icon: const Icon(Icons.close_rounded, size: 18),
                  color: scheme.onSurfaceVariant,
                  tooltip: 'Remover data',
                )
              else
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
