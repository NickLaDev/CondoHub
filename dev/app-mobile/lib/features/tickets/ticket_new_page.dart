import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/routes.dart';
import '../../core/models/ticket.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/ui/buttons.dart';
import '../../core/ui/ch_scaffold.dart';
import '../../core/ui/inline_page_header.dart';
import '../../core/ui/text_field.dart';
import 'ticket_attachment_support.dart';

class TicketNewPage extends ConsumerStatefulWidget {
  const TicketNewPage({super.key});

  @override
  ConsumerState<TicketNewPage> createState() => _TicketNewPageState();
}

class _TicketNewPageState extends ConsumerState<TicketNewPage> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final List<TicketDraftAttachment> _draftAttachments = [];
  TicketCategory? _category;
  String? _location;
  bool _loading = false;

  static const _locations = [
    'Bloco A - Térreo',
    'Bloco A - 1º andar',
    'Bloco A - 2º andar',
    'Bloco A - 3º andar',
    'Bloco B - Térreo',
    'Bloco B - 1º andar',
    'Bloco B - 2º andar',
    'Bloco B - 3º andar',
    'Área comum',
    'Estacionamento',
    'Piscina',
    'Academia',
  ];

  bool get _isValid =>
      _titleCtrl.text.isNotEmpty &&
      _descCtrl.text.isNotEmpty &&
      _category != null &&
      _location != null;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickAttachment() async {
    final attachment = await showTicketAttachmentPicker(context);
    if (!mounted || attachment == null) return;

    setState(() => _draftAttachments.add(attachment));
  }

  void _removeDraftAttachment(String attachmentId) {
    setState(
      () => _draftAttachments.removeWhere((item) => item.id == attachmentId),
    );
  }

  Future<void> _create() async {
    if (!_isValid) return;
    setState(() => _loading = true);
    try {
      await ref
          .read(ticketsRepositoryProvider)
          .createTicket(
            title: _titleCtrl.text.trim(),
            category: _category!,
            location: _location!,
            description: _descCtrl.text.trim(),
            attachments: List<TicketDraftAttachment>.from(_draftAttachments),
          );
      ref.invalidate(ticketsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Chamado criado com sucesso!')),
        );
        context.go(AppRoutes.tickets);
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

  String _categoryLabel(TicketCategory c) {
    switch (c) {
      case TicketCategory.eletrica:
        return 'Elétrica';
      case TicketCategory.hidraulica:
        return 'Hidráulica';
      case TicketCategory.estrutural:
        return 'Estrutural';
      case TicketCategory.limpeza:
        return 'Limpeza';
      case TicketCategory.seguranca:
        return 'Segurança';
      case TicketCategory.outros:
        return 'Outros';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return CHScaffold(
      withTopBand: false,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
        children: [
          InlinePageHeader(
            title: 'Novo chamado',
            subtitle: 'Descreva o problema e indique o local para atendimento.',
            onBack: () => context.go(AppRoutes.tickets),
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
                  label: 'Título',
                  hint: 'Descreva brevemente o problema',
                  controller: _titleCtrl,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 16),
                Text(
                  'Categoria',
                  style: AppText.body.copyWith(
                    fontWeight: FontWeight.w600,
                    color: scheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<TicketCategory>(
                  initialValue: _category,
                  decoration: const InputDecoration(hintText: 'Selecione'),
                  items: TicketCategory.values.map((c) {
                    return DropdownMenuItem(
                      value: c,
                      child: Text(_categoryLabel(c)),
                    );
                  }).toList(),
                  onChanged: (v) => setState(() => _category = v),
                ),
                const SizedBox(height: 16),
                Text(
                  'Local',
                  style: AppText.body.copyWith(
                    fontWeight: FontWeight.w600,
                    color: scheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _location,
                  decoration: const InputDecoration(
                    hintText: 'Selecione o local',
                  ),
                  items: _locations.map((l) {
                    return DropdownMenuItem(value: l, child: Text(l));
                  }).toList(),
                  onChanged: (v) => setState(() => _location = v),
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: 'Descrição',
                  hint: 'Detalhe o problema...',
                  controller: _descCtrl,
                  maxLines: 5,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 18),
                Text(
                  'Anexos',
                  style: AppText.body.copyWith(
                    fontWeight: FontWeight.w600,
                    color: scheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Fotos, vídeos ou documentos ajudam na triagem do chamado.',
                  style: AppText.bodySmall.copyWith(
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.9),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 12),
                if (_draftAttachments.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.04)
                          : AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: scheme.outline.withValues(
                          alpha: isDark ? 0.22 : 0.08,
                        ),
                      ),
                    ),
                    child: Text(
                      'Nenhum anexo adicionado ainda.',
                      style: AppText.bodySmall.copyWith(
                        color: scheme.onSurfaceVariant.withValues(alpha: 0.9),
                      ),
                    ),
                  )
                else
                  Column(
                    children: [
                      for (final attachment in _draftAttachments) ...[
                        TicketAttachmentTile(
                          fileName: attachment.fileName,
                          type: attachment.type,
                          subtitle:
                              '${ticketAttachmentTypeLabel(attachment.type)} • ${attachment.sizeLabel}',
                          onRemove: () => _removeDraftAttachment(attachment.id),
                        ),
                        const SizedBox(height: 10),
                      ],
                    ],
                  ),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _pickAttachment,
                    icon: const Icon(Icons.attach_file_rounded, size: 18),
                    label: Text(
                      _draftAttachments.isEmpty
                          ? 'Adicionar anexo'
                          : 'Adicionar outro anexo',
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.04)
                        : AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: scheme.outline.withValues(
                        alpha: isDark ? 0.22 : 0.08,
                      ),
                    ),
                  ),
                  child: Text(
                    'Informe o máximo de detalhes possível para facilitar a triagem da administração.',
                    style: AppText.bodySmall.copyWith(
                      color: scheme.onSurfaceVariant.withValues(alpha: 0.9),
                      height: 1.4,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: PrimaryButton(
                    label: 'Criar chamado',
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
}
