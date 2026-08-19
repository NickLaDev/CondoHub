import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/routes.dart';
import '../../core/models/ticket.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/ui/ch_scaffold.dart';
import '../../core/ui/chips.dart';
import '../../core/ui/inline_page_header.dart';
import 'ticket_attachment_support.dart';

class TicketDetailPage extends ConsumerStatefulWidget {
  const TicketDetailPage({super.key, required this.id});

  final String id;

  @override
  ConsumerState<TicketDetailPage> createState() => _TicketDetailPageState();
}

class _TicketDetailPageState extends ConsumerState<TicketDetailPage> {
  final _messageCtrl = TextEditingController();
  bool _addingAttachment = false;
  bool _sendingMessage = false;
  bool _reopeningTicket = false;

  @override
  void dispose() {
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _refreshTicket() async {
    ref.invalidate(ticketDetailProvider(widget.id));
    ref.invalidate(ticketAttachmentsProvider(widget.id));
    ref.invalidate(ticketMessagesProvider(widget.id));
    ref.invalidate(ticketStatusHistoryProvider(widget.id));

    await Future.wait([
      ref.read(ticketDetailProvider(widget.id).future),
      ref.read(ticketAttachmentsProvider(widget.id).future),
      ref.read(ticketMessagesProvider(widget.id).future),
      ref.read(ticketStatusHistoryProvider(widget.id).future),
    ]);
  }

  Future<void> _addAttachment() async {
    if (_addingAttachment) return;

    final selected = await showTicketAttachmentPicker(context);
    if (!mounted || selected == null) return;

    setState(() => _addingAttachment = true);
    try {
      await ref
          .read(ticketsRepositoryProvider)
          .addAttachment(widget.id, selected);
      ref.invalidate(ticketAttachmentsProvider(widget.id));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Anexo ${selected.fileName} adicionado.')),
        );
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erro: $error')));
    } finally {
      if (mounted) {
        setState(() => _addingAttachment = false);
      }
    }
  }

  Future<void> _sendMessage() async {
    final body = _messageCtrl.text.trim();
    if (body.isEmpty || _sendingMessage) return;

    setState(() => _sendingMessage = true);
    try {
      await ref.read(ticketsRepositoryProvider).addMessage(widget.id, body);
      _messageCtrl.clear();
      ref.invalidate(ticketMessagesProvider(widget.id));
      if (mounted) {
        setState(() {});
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mensagem enviada no chamado.')),
        );
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erro: $error')));
    } finally {
      if (mounted) {
        setState(() => _sendingMessage = false);
      }
    }
  }

  Future<void> _reopenTicket() async {
    if (_reopeningTicket) return;

    setState(() => _reopeningTicket = true);
    try {
      await ref.read(ticketsRepositoryProvider).reopenTicket(widget.id);
      ref.invalidate(ticketDetailProvider(widget.id));
      ref.invalidate(ticketStatusHistoryProvider(widget.id));
      ref.invalidate(ticketMessagesProvider(widget.id));
      ref.invalidate(ticketsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Chamado reaberto com sucesso.')),
        );
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Erro: $error')));
    } finally {
      if (mounted) {
        setState(() => _reopeningTicket = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticketAsync = ref.watch(ticketDetailProvider(widget.id));
    final attachmentsAsync = ref.watch(ticketAttachmentsProvider(widget.id));
    final historyAsync = ref.watch(ticketStatusHistoryProvider(widget.id));
    final messagesAsync = ref.watch(ticketMessagesProvider(widget.id));

    return CHScaffold(
      withTopBand: false,
      body: ticketAsync.when(
        data: (ticket) {
          if (ticket == null) {
            return const Center(child: Text('Chamado não encontrado'));
          }

          return RefreshIndicator(
            onRefresh: _refreshTicket,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
              children: [
                InlinePageHeader(
                  title: 'Detalhe do chamado',
                  subtitle:
                      'Acompanhe prioridade, histórico e mensagens do atendimento.',
                  onBack: () => context.go(AppRoutes.tickets),
                ),
                _TicketSummaryCard(ticket: ticket),
                const SizedBox(height: 16),
                _DetailPanel(
                  title: 'Resumo do atendimento',
                  child: Column(
                    children: [
                      _InfoTile(
                        icon: Icons.category_rounded,
                        label: 'Categoria',
                        value: _categoryLabel(ticket.category),
                      ),
                      const SizedBox(height: 10),
                      _InfoTile(
                        icon: Icons.location_on_outlined,
                        label: 'Local',
                        value: ticket.location,
                      ),
                      const SizedBox(height: 10),
                      _InfoTile(
                        icon: Icons.flag_rounded,
                        label: 'Prioridade',
                        value: _priorityLabel(ticket.priority),
                        accentColor: _priorityColor(ticket.priority),
                      ),
                      const SizedBox(height: 10),
                      _InfoTile(
                        icon: Icons.access_time_rounded,
                        label: 'Criado em',
                        value: _formatFull(ticket.createdAt),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _DetailPanel(
                  title: 'Anexos do chamado',
                  child: Column(
                    children: [
                      attachmentsAsync.when(
                        data: (attachments) {
                          if (attachments.isEmpty) {
                            return const _EmptyPanelState(
                              icon: Icons.attach_file_rounded,
                              title: 'Nenhum anexo por enquanto',
                              subtitle:
                                  'Adicione fotos, vídeos ou documentos para complementar o atendimento.',
                            );
                          }

                          return Column(
                            children: [
                              for (final attachment in attachments) ...[
                                TicketAttachmentTile(
                                  fileName: attachment.fileName,
                                  type: attachment.type,
                                  subtitle:
                                      '${ticketAttachmentTypeLabel(attachment.type)} • ${attachment.sizeLabel} • ${attachment.uploadedByName} • ${_formatFull(attachment.createdAt)}',
                                ),
                                const SizedBox(height: 10),
                              ],
                            ],
                          );
                        },
                        loading: () => const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                        error: (error, _) => _PanelErrorState(error: error),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _addingAttachment ? null : _addAttachment,
                          icon: _addingAttachment
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.attach_file_rounded, size: 18),
                          label: Text(
                            _addingAttachment
                                ? 'Adicionando anexo...'
                                : 'Adicionar anexo',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _DetailPanel(
                  title: 'Histórico real',
                  child: historyAsync.when(
                    data: (events) {
                      if (events.isEmpty) {
                        return const _EmptyPanelState(
                          icon: Icons.timeline_outlined,
                          title: 'Nenhuma movimentação registrada',
                          subtitle:
                              'As mudanças de status do chamado aparecerão aqui.',
                        );
                      }

                      return Column(
                        children: [
                          for (final entry in events.asMap().entries)
                            _TimelineItem(
                              label: _historyLabel(entry.value),
                              date:
                                  '${_formatFull(entry.value.createdAt)} • ${entry.value.actorName}',
                              color: _statusColor(entry.value.toStatus),
                              isLast: entry.key == events.length - 1,
                            ),
                        ],
                      );
                    },
                    loading: () => const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (error, _) => _PanelErrorState(error: error),
                  ),
                ),
                const SizedBox(height: 16),
                _DetailPanel(
                  title: 'Mensagens do chamado',
                  child: Column(
                    children: [
                      messagesAsync.when(
                        data: (messages) {
                          if (messages.isEmpty) {
                            return const _EmptyPanelState(
                              icon: Icons.forum_outlined,
                              title: 'Nenhuma mensagem por enquanto',
                              subtitle:
                                  'Use este espaço para complementar o chamado com novos detalhes.',
                            );
                          }

                          return Column(
                            children: [
                              for (final message in messages) ...[
                                _TicketMessageCard(message: message),
                                const SizedBox(height: 10),
                              ],
                            ],
                          );
                        },
                        loading: () => const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                        error: (error, _) => _PanelErrorState(error: error),
                      ),
                      const SizedBox(height: 10),
                      _TicketMessageComposer(
                        controller: _messageCtrl,
                        isSending: _sendingMessage,
                        onChanged: (_) => setState(() {}),
                        onSend: _sendMessage,
                      ),
                    ],
                  ),
                ),
                if (ticket.canReopen) ...[
                  const SizedBox(height: 16),
                  _DetailPanel(
                    title: 'Ações',
                    child: SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _reopeningTicket ? null : _reopenTicket,
                        icon: _reopeningTicket
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.refresh_rounded, size: 18),
                        label: Text(
                          _reopeningTicket
                              ? 'Reabrindo chamado...'
                              : 'Reabrir chamado',
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erro: $error')),
      ),
    );
  }
}

class _TicketSummaryCard extends StatelessWidget {
  const _TicketSummaryCard({required this.ticket});

  final Ticket ticket;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final statusColor = _statusColor(ticket.status);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? scheme.surface : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark
              ? scheme.outline.withValues(alpha: 0.3)
              : statusColor.withValues(alpha: 0.12),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.22 : 0.045),
            blurRadius: isDark ? 18 : 14,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusChip(
                label: _statusLabel(ticket.status),
                statusColor: statusColor,
              ),
              const SizedBox(width: 8),
              TagChip(
                label: _categoryLabel(ticket.category),
                color: scheme.primary.withValues(alpha: isDark ? 0.18 : 0.08),
                textColor: scheme.primary,
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            ticket.title,
            style: AppText.heading2.copyWith(
              color: scheme.onSurface,
              fontWeight: FontWeight.w700,
              height: 1.14,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            ticket.description,
            style: AppText.body.copyWith(
              color: scheme.onSurfaceVariant.withValues(alpha: 0.9),
              height: 1.5,
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _MetaBadge(
                icon: Icons.location_on_outlined,
                label: ticket.location,
              ),
              _MetaBadge(
                icon: Icons.flag_outlined,
                label: _priorityLabel(ticket.priority),
                accentColor: _priorityColor(ticket.priority),
              ),
              _MetaBadge(
                icon: Icons.schedule_rounded,
                label: _formatFull(ticket.createdAt),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DetailPanel extends StatelessWidget {
  const _DetailPanel({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? scheme.surface : Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.24 : 0.1),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.16 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: AppText.subtitle.copyWith(
              fontWeight: FontWeight.w700,
              color: scheme.onSurface,
            ),
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    this.accentColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? accentColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = Theme.of(context).colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.03)
            : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.2 : 0.1),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: (accentColor ?? scheme.primary).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 18, color: accentColor ?? scheme.primary),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: AppText.bodySmall.copyWith(
              color: scheme.onSurfaceVariant.withValues(alpha: 0.88),
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: AppText.body.copyWith(
                fontWeight: FontWeight.w600,
                color: accentColor ?? scheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineItem extends StatelessWidget {
  const _TimelineItem({
    required this.label,
    required this.date,
    required this.color,
    this.isLast = false,
  });

  final String label;
  final String date;
  final Color color;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.7)),
                boxShadow: [
                  BoxShadow(
                    color: color.withValues(alpha: 0.25),
                    blurRadius: 6,
                  ),
                ],
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 52,
                color: scheme.outline.withValues(alpha: isDark ? 0.4 : 0.26),
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.03)
                  : AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: scheme.outline.withValues(alpha: isDark ? 0.2 : 0.08),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: AppText.body.copyWith(
                    fontWeight: FontWeight.w600,
                    color: scheme.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  date,
                  style: AppText.caption.copyWith(
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.88),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _MetaBadge extends StatelessWidget {
  const _MetaBadge({required this.icon, required this.label, this.accentColor});

  final IconData icon;
  final String label;
  final Color? accentColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final color = accentColor ?? scheme.onSurfaceVariant;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.04)
            : Colors.white.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.22 : 0.12),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: AppText.caption.copyWith(
              color: accentColor ?? scheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _TicketMessageCard extends StatelessWidget {
  const _TicketMessageCard({required this.message});

  final TicketMessage message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = message.isFromCurrentUser
        ? scheme.primary
        : scheme.onSurfaceVariant;

    return Align(
      alignment: message.isFromCurrentUser
          ? Alignment.centerRight
          : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: message.isFromCurrentUser
                ? scheme.primary.withValues(alpha: isDark ? 0.22 : 0.1)
                : (isDark
                      ? Colors.white.withValues(alpha: 0.04)
                      : AppColors.surfaceMuted),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: message.isFromCurrentUser
                  ? scheme.primary.withValues(alpha: 0.18)
                  : scheme.outline.withValues(alpha: isDark ? 0.2 : 0.1),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                message.authorName,
                style: AppText.bodySmall.copyWith(
                  color: accent,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                message.body,
                style: AppText.body.copyWith(
                  color: scheme.onSurface,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _formatFull(message.createdAt),
                style: AppText.caption.copyWith(
                  color: scheme.onSurfaceVariant.withValues(alpha: 0.84),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TicketMessageComposer extends StatelessWidget {
  const _TicketMessageComposer({
    required this.controller,
    required this.isSending,
    required this.onChanged,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool isSending;
  final ValueChanged<String> onChanged;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final canSend = controller.text.trim().isNotEmpty && !isSending;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.03) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.2 : 0.1),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              onChanged: onChanged,
              decoration: InputDecoration(
                hintText: 'Adicionar mensagem ao chamado',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : AppColors.surfaceMuted,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          FilledButton(
            onPressed: canSend ? onSend : null,
            style: FilledButton.styleFrom(
              minimumSize: const Size(52, 46),
              padding: const EdgeInsets.symmetric(horizontal: 14),
            ),
            child: isSending
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send_rounded, size: 18),
          ),
        ],
      ),
    );
  }
}

class _EmptyPanelState extends StatelessWidget {
  const _EmptyPanelState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Icon(icon, size: 26, color: scheme.onSurfaceVariant),
          const SizedBox(height: 10),
          Text(
            title,
            style: AppText.subtitle.copyWith(
              fontWeight: FontWeight.w700,
              color: scheme.onSurface,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: AppText.bodySmall.copyWith(
              color: scheme.onSurfaceVariant,
              height: 1.4,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _PanelErrorState extends StatelessWidget {
  const _PanelErrorState({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    return _EmptyPanelState(
      icon: Icons.error_outline,
      title: 'Nao foi possivel carregar',
      subtitle: '$error',
    );
  }
}

Color _statusColor(TicketStatus status) {
  switch (status) {
    case TicketStatus.aberto:
      return AppColors.info;
    case TicketStatus.emAnalise:
      return AppColors.warning;
    case TicketStatus.emExecucao:
      return AppColors.accent;
    case TicketStatus.resolvido:
      return AppColors.success;
    case TicketStatus.fechado:
      return AppColors.textSecondary;
    case TicketStatus.reaberto:
      return AppColors.urgent;
  }
}

String _statusLabel(TicketStatus status) {
  switch (status) {
    case TicketStatus.aberto:
      return 'Aberto';
    case TicketStatus.emAnalise:
      return 'Em análise';
    case TicketStatus.emExecucao:
      return 'Em execução';
    case TicketStatus.resolvido:
      return 'Resolvido';
    case TicketStatus.fechado:
      return 'Fechado';
    case TicketStatus.reaberto:
      return 'Reaberto';
  }
}

String _categoryLabel(TicketCategory category) {
  switch (category) {
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

String _priorityLabel(TicketPriority priority) {
  switch (priority) {
    case TicketPriority.baixa:
      return 'Baixa';
    case TicketPriority.media:
      return 'Média';
    case TicketPriority.alta:
      return 'Alta';
    case TicketPriority.urgente:
      return 'Urgente';
  }
}

Color _priorityColor(TicketPriority priority) {
  switch (priority) {
    case TicketPriority.baixa:
      return AppColors.success;
    case TicketPriority.media:
      return AppColors.info;
    case TicketPriority.alta:
      return AppColors.warning;
    case TicketPriority.urgente:
      return AppColors.urgent;
  }
}

String _historyLabel(TicketStatusEvent event) {
  if (event.fromStatus == null) {
    return 'Chamado aberto';
  }

  if (event.toStatus == TicketStatus.reaberto) {
    return 'Chamado reaberto';
  }

  return 'Status alterado para ${_statusLabel(event.toStatus)}';
}

String _formatFull(DateTime dt) {
  return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} '
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}
