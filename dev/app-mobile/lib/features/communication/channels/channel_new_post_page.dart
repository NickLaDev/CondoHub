import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/routes.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/ui/app_status_view.dart';
import '../../../core/ui/buttons.dart';
import '../../../core/ui/ch_scaffold.dart';
import '../../../core/ui/inline_page_header.dart';

class ChannelNewPostPage extends ConsumerStatefulWidget {
  const ChannelNewPostPage({super.key, required this.channelId});

  final String channelId;

  @override
  ConsumerState<ChannelNewPostPage> createState() => _ChannelNewPostPageState();
}

class _ChannelNewPostPageState extends ConsumerState<ChannelNewPostPage> {
  final _ctrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _publish() async {
    if (_ctrl.text.trim().isEmpty) return;

    setState(() => _loading = true);
    try {
      await ref
          .read(channelsRepositoryProvider)
          .createPost(widget.channelId, _ctrl.text.trim());
      ref.invalidate(channelPostsProvider(widget.channelId));
      ref.invalidate(channelsProvider);

      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Post publicado.')));
      context.go(AppRoutes.channelLocation(widget.channelId));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_friendlyErrorMessage(error))));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final channel = ref.watch(channelProvider(widget.channelId));
    final canPost = channel?.canPost ?? true;

    return CHScaffold(
      withTopBand: false,
      body: Column(
        children: [
          InlinePageHeader(
            title: 'Novo post',
            subtitle: channel == null
                ? 'Crie uma nova publicacao para este canal.'
                : 'Publicando em ${channel.name}.',
            onBack: () => context.go(AppRoutes.channelLocation(widget.channelId)),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: canPost
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Conteudo',
                          style: AppText.subtitle.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Expanded(
                          child: TextField(
                            controller: _ctrl,
                            maxLines: null,
                            expands: true,
                            textAlignVertical: TextAlignVertical.top,
                            decoration: const InputDecoration(
                              hintText: 'O que voce quer compartilhar?',
                              border: OutlineInputBorder(),
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(height: 16),
                        PrimaryButton(
                          label: 'Publicar',
                          onPressed:
                              _ctrl.text.trim().isNotEmpty ? _publish : null,
                          isLoading: _loading,
                        ),
                      ],
                    )
                  : AppStatusView.empty(
                      icon: Icons.lock_outline_rounded,
                      title: 'Publicacao indisponivel',
                      message:
                          'Voce nao tem permissao para criar posts neste canal.',
                      action: OutlinedButton(
                        onPressed: () =>
                            context.go(AppRoutes.channelLocation(widget.channelId)),
                        child: const Text('Voltar'),
                      ),
                    ),
            ),
          ),
        ],
      ),
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

  return 'Nao foi possivel publicar agora.';
}
