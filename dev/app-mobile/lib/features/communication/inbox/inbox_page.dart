import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/models/inbox.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/ch_scaffold.dart';
import '../../../core/ui/chips.dart';
import '../../../core/ui/inline_page_header.dart';

class InboxPage extends ConsumerStatefulWidget {
  const InboxPage({super.key});

  @override
  ConsumerState<InboxPage> createState() => _InboxPageState();
}

class _InboxPageState extends ConsumerState<InboxPage> {
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  StreamSubscription<List<InboxMessage>>? _messagesSub;
  List<InboxMessage> _messages = [];

  @override
  void initState() {
    super.initState();
    _listenToUpdates();
    _loadInitial();
  }

  void _listenToUpdates() {
    _messagesSub = ref.read(inboxRepositoryProvider).messagesStream.listen((
      msgs,
    ) {
      if (!mounted) return;
      setState(() => _messages = List.from(msgs));
      _scrollToBottom();
    });
  }

  Future<void> _loadInitial() async {
    final msgs = await ref.read(inboxRepositoryProvider).getMessages();
    if (mounted) {
      setState(() => _messages = List.from(msgs));
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _messagesSub?.cancel();
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_msgCtrl.text.trim().isEmpty) return;
    final text = _msgCtrl.text.trim();
    _msgCtrl.clear();
    setState(() {});

    try {
      await ref.read(inboxRepositoryProvider).sendMessage(text);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Erro ao enviar mensagem.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return CHScaffold(
      withTopBand: false,
      body: Column(
        children: [
          InlinePageHeader(
            title: 'Atendimento',
            subtitle: 'Converse com a administração em um canal privado.',
            onBack: () => context.go(AppRoutes.comm),
            trailing: PopupMenuButton<String>(
              tooltip: 'Alterar status',
              onSelected: (value) async {
                try {
                  await ref.read(inboxRepositoryProvider).updateStatus(value);
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Status atualizado')),
                  );
                } catch (_) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Falha ao atualizar status')),
                  );
                }
              },
              itemBuilder: (_) => const [
                PopupMenuItem(
                  value: 'ABERTO',
                  child: Text('Marcar como Aberto'),
                ),
                PopupMenuItem(
                  value: 'EM_ATENDIMENTO',
                  child: Text('Em Atendimento'),
                ),
                PopupMenuItem(value: 'RESOLVIDO', child: Text('Resolvido')),
                PopupMenuItem(value: 'ARQUIVADO', child: Text('Arquivado')),
              ],
              child: const StatusChip(
                label: 'Aberto',
                statusColor: AppColors.success,
              ),
            ),
          ),
          Expanded(
            child: Container(
              margin: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.xs,
                AppSpacing.lg,
                0,
              ),
              decoration: BoxDecoration(
                color: isDark ? scheme.surface : Colors.white,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(AppRadius.xl),
                ),
                border: Border.all(
                  color: scheme.outline.withValues(alpha: isDark ? 0.24 : 0.10),
                ),
              ),
              child: ListView.builder(
                controller: _scrollCtrl,
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.lg,
                  AppSpacing.lg,
                  AppSpacing.lg,
                ),
                itemCount: _messages.length,
                itemBuilder: (_, i) => _MessageBubble(message: _messages[i]),
              ),
            ),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.sm,
              AppSpacing.lg,
              AppSpacing.lg,
            ),
            decoration: BoxDecoration(
              color: isDark ? scheme.surface : Colors.white,
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(AppRadius.xl),
              ),
              border: Border(
                left: BorderSide(
                  color: scheme.outline.withValues(alpha: isDark ? 0.24 : 0.10),
                ),
                right: BorderSide(
                  color: scheme.outline.withValues(alpha: isDark ? 0.24 : 0.10),
                ),
                bottom: BorderSide(
                  color: scheme.outline.withValues(alpha: isDark ? 0.24 : 0.10),
                ),
              ),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _msgCtrl,
                      decoration: const InputDecoration(
                        hintText: 'Digite sua mensagem...',
                        isDense: true,
                      ),
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: _msgCtrl.text.trim().isNotEmpty ? _send : null,
                      borderRadius: AppRadius.all(AppRadius.md),
                      child: Ink(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: _msgCtrl.text.trim().isNotEmpty
                              ? scheme.primary
                              : scheme.onSurface.withValues(alpha: 0.06),
                          borderRadius: AppRadius.all(AppRadius.md),
                        ),
                        child: Icon(
                          Icons.send_rounded,
                          color: _msgCtrl.text.trim().isNotEmpty
                              ? scheme.onPrimary
                              : scheme.onSurfaceVariant,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});
  final InboxMessage message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final isAdmin = message.isFromAdmin;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        mainAxisAlignment: isAdmin
            ? MainAxisAlignment.start
            : MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isAdmin)
            CircleAvatar(
              radius: 16,
              backgroundColor: scheme.primary,
              child: Icon(
                Icons.support_agent,
                color: scheme.onPrimary,
                size: 18,
              ),
            ),
          if (isAdmin) const SizedBox(width: AppSpacing.sm),
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.md,
              ),
              decoration: BoxDecoration(
                color: isAdmin
                    ? (isDark
                          ? Colors.white.withValues(alpha: 0.06)
                          : AppColors.surfaceVariant)
                    : scheme.primary.withValues(alpha: isDark ? 0.90 : 0.96),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(AppRadius.lg),
                  topRight: const Radius.circular(AppRadius.lg),
                  bottomLeft: Radius.circular(
                    isAdmin ? AppRadius.xs : AppRadius.lg,
                  ),
                  bottomRight: Radius.circular(
                    isAdmin ? AppRadius.lg : AppRadius.xs,
                  ),
                ),
                border: isAdmin
                    ? Border.all(
                        color: scheme.outline.withValues(
                          alpha: isDark ? 0.24 : 0.10,
                        ),
                      )
                    : null,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (isAdmin)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                      child: Text(
                        'Administração',
                        style: AppText.caption.copyWith(
                          fontWeight: FontWeight.w600,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  Text(
                    message.body,
                    style: AppText.body.copyWith(
                      color: isAdmin ? scheme.onSurface : scheme.onPrimary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    _formatTime(message.createdAt),
                    style: AppText.overline.copyWith(
                      color: isAdmin
                          ? scheme.onSurfaceVariant
                          : scheme.onPrimary.withValues(alpha: 0.78),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (!isAdmin) const SizedBox(width: AppSpacing.sm),
          if (!isAdmin)
            CircleAvatar(
              radius: 16,
              backgroundColor: scheme.secondary,
              child: Icon(Icons.person, color: scheme.onSecondary, size: 18),
            ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
