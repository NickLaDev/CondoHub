import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/models/channel.dart';
import '../../../core/network/api_exception.dart';
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

class ChannelsPage extends ConsumerWidget {
  const ChannelsPage({super.key});

  Future<void> _refreshChannels(WidgetRef ref) async {
    ref.invalidate(channelsProvider);
    await ref.read(channelsProvider.future);
  }

  Future<void> _openCreatePostDialog(
    BuildContext context,
    WidgetRef ref,
    List<Channel> channels,
  ) async {
    final postableChannels = channels
        .where((channel) => channel.canPost ?? true)
        .toList(growable: false);
    if (postableChannels.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Voce nao tem permissao para publicar em canais.'),
        ),
      );
      return;
    }

    final result = await showDialog<_NewPostData>(
      context: context,
      builder: (_) => _NewPostDialog(channels: postableChannels),
    );

    if (result == null || !context.mounted) return;

    try {
      await ref
          .read(channelsRepositoryProvider)
          .createPost(result.channelId, result.body);
      ref.invalidate(channelsProvider);
      ref.invalidate(channelPostsProvider(result.channelId));

      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Post publicado.')));
      context.go(AppRoutes.channelLocation(result.channelId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_friendlyErrorMessage(error))));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(channelsProvider);
    final channels = async.asData?.value;
    final canCreatePost =
        channels != null && channels.any((channel) => channel.canPost ?? true);

    return CHScaffold(
      withTopBand: false,
      body: Column(
        children: [
          InlinePageHeader(
            title: 'Canais',
            subtitle: 'Acompanhe as conversas por tema e publique novidades.',
            onBack: () => context.go(AppRoutes.comm),
          ),
          Expanded(
            child: async.when(
              data: (items) => RefreshIndicator(
                onRefresh: () => _refreshChannels(ref),
                child: items.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(
                          AppSpacing.lg,
                          AppSpacing.sm,
                          AppSpacing.lg,
                          AppSpacing.lg,
                        ),
                        children: [
                          const SizedBox(height: 120),
                          AppStatusView.empty(
                            icon: Icons.forum_outlined,
                            title: 'Sem canais disponiveis',
                            message:
                                'Os canais do condominio aparecerao aqui quando estiverem ativos.',
                          ),
                        ],
                      )
                    : ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(
                          AppSpacing.lg,
                          AppSpacing.sm,
                          AppSpacing.lg,
                          AppSpacing.lg,
                        ),
                        itemCount: items.length,
                        itemBuilder: (_, index) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.md),
                          child: _ChannelCard(channel: items[index]),
                        ),
                      ),
              ),
              loading: () =>
                  AppStatusView.loading(message: 'Carregando canais...'),
              error: (error, _) => AppStatusView.error(
                title: 'Nao foi possivel carregar os canais',
                message: _friendlyErrorMessage(error),
                action: OutlinedButton(
                  onPressed: () => _refreshChannels(ref),
                  child: const Text('Tentar novamente'),
                ),
              ),
            ),
          ),
          if (channels != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                0,
                AppSpacing.lg,
                AppSpacing.lg,
              ),
              child: SafeArea(
                top: false,
                child: ElevatedButton.icon(
                  onPressed: canCreatePost
                      ? () => _openCreatePostDialog(context, ref, channels)
                      : null,
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Novo post'),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ChannelCard extends StatelessWidget {
  const _ChannelCard({required this.channel});

  final Channel channel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final radius = AppRadius.all(AppRadius.lg);
    final permissions = _permissionLabels(channel);
    final description = channel.hasDescription
        ? channel.description
        : 'Canal de comunicacao do condominio.';

    return AuraCard(
      auraColor: AppColors.accent,
      intensity: 0.22,
      blurRadius: 28,
      spreadRadius: -10,
      offset: const Offset(0, 12),
      borderRadius: radius,
      child: Semantics(
        button: true,
        label: channel.name,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => context.go(AppRoutes.channelLocation(channel.id)),
            borderRadius: radius,
            child: Ink(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: isDark ? scheme.surface : Colors.white,
                borderRadius: radius,
                border: Border.all(
                  color: scheme.outline.withValues(alpha: isDark ? 0.3 : 0.14),
                ),
                boxShadow: AppShadows.level1(isDark: isDark),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.12),
                      borderRadius: AppRadius.all(AppRadius.md),
                    ),
                    child: const Icon(
                      Icons.forum_outlined,
                      color: AppColors.accent,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          channel.name,
                          style: AppText.subtitle.copyWith(
                            fontWeight: FontWeight.w700,
                            color: scheme.onSurface,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          description,
                          style: AppText.bodySmall.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (permissions.isNotEmpty) ...[
                          const SizedBox(height: AppSpacing.sm),
                          Wrap(
                            spacing: AppSpacing.xs,
                            runSpacing: AppSpacing.xs,
                            children: permissions
                                .map((label) => _PermissionChip(label: label))
                                .toList(growable: false),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (channel.hasPostCount)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: AppSpacing.xs,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.accent.withValues(alpha: 0.10),
                            borderRadius: AppRadius.all(AppRadius.pill),
                          ),
                          child: Text(
                            '${channel.postCount} posts',
                            style: AppText.caption.copyWith(
                              color: AppColors.accent,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      const SizedBox(height: AppSpacing.xs),
                      Icon(
                        Icons.chevron_right_rounded,
                        color: scheme.onSurfaceVariant,
                        size: 20,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<String> _permissionLabels(Channel channel) {
    final labels = <String>[];
    if ((channel.canPost ?? false)) labels.add('Postar');
    if ((channel.canComment ?? false)) labels.add('Comentar');
    if ((channel.canModerate ?? false)) labels.add('Moderar');
    return labels;
  }
}

class _PermissionChip extends StatelessWidget {
  const _PermissionChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: AppRadius.all(AppRadius.pill),
      ),
      child: Text(
        label,
        style: AppText.caption.copyWith(
          color: scheme.onSurfaceVariant,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _NewPostData {
  const _NewPostData({required this.channelId, required this.body});

  final String channelId;
  final String body;
}

class _NewPostDialog extends StatefulWidget {
  const _NewPostDialog({required this.channels});

  final List<Channel> channels;

  @override
  State<_NewPostDialog> createState() => _NewPostDialogState();
}

class _NewPostDialogState extends State<_NewPostDialog> {
  late String _selectedChannelId;
  final _postCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedChannelId = widget.channels.first.id;
  }

  @override
  void dispose() {
    _postCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final canPublish = _postCtrl.text.trim().isNotEmpty;
    final mediaQuery = MediaQuery.of(context);
    final availableHeight =
        mediaQuery.size.height - mediaQuery.viewInsets.bottom;
    final maxContentHeight = availableHeight > 0
        ? availableHeight * 0.6
        : mediaQuery.size.height * 0.6;

    return AlertDialog(
      title: const Text('Novo post'),
      content: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxContentHeight),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: _selectedChannelId,
                decoration: const InputDecoration(labelText: 'Canal'),
                items: widget.channels
                    .map(
                      (channel) => DropdownMenuItem(
                        value: channel.id,
                        child: Text(channel.name),
                      ),
                    )
                    .toList(growable: false),
                onChanged: (value) {
                  if (value == null) return;
                  setState(() => _selectedChannelId = value);
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _postCtrl,
                maxLines: 4,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: 'Conteudo',
                  hintText: 'O que voce quer compartilhar?',
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: canPublish
              ? () => Navigator.of(context).pop(
                  _NewPostData(
                    channelId: _selectedChannelId,
                    body: _postCtrl.text.trim(),
                  ),
                )
              : null,
          child: const Text('Publicar'),
        ),
      ],
    );
  }
}

String _friendlyErrorMessage(Object error) {
  if (error is ApiException) {
    if (error.code == 'NETWORK_ERROR') {
      return 'Nao foi possivel conectar ao servidor. Tente novamente.';
    }
    if (error.message.trim().isNotEmpty) {
      return error.message;
    }
  }

  return 'Nao foi possivel concluir a operacao agora.';
}
