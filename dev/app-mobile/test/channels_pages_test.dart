import 'package:condohub_mobile/core/models/channel.dart';
import 'package:condohub_mobile/core/providers/providers.dart';
import 'package:condohub_mobile/core/repositories/channels_repository.dart';
import 'package:condohub_mobile/features/communication/channels/channel_post_detail_page.dart';
import 'package:condohub_mobile/features/communication/channels/channel_posts_page.dart';
import 'package:condohub_mobile/features/communication/channels/channels_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  testWidgets('ChannelsPage loads channels and navigates to channel posts', (
    tester,
  ) async {
    final repo = _FakeChannelsRepository(
      channels: const [
        Channel(
          id: 'ch-001',
          name: 'Geral',
          description: 'Avisos do condominio',
          canPost: true,
          canComment: true,
          postCount: 1,
        ),
      ],
      posts: {
        'ch-001': [
          ChannelPost(
            id: 'post-001',
            channelId: 'ch-001',
            authorName: 'Maria',
            body: 'Primeiro post real',
            createdAt: DateTime(2024, 1, 1, 12),
            commentCount: 0,
          ),
        ],
      },
    );

    final router = GoRouter(
      initialLocation: '/app/channels',
      routes: [
        GoRoute(
          path: '/app/comm',
          builder: (_, _) => const Scaffold(body: Text('Comunicacao')),
        ),
        GoRoute(
          path: '/app/channels',
          builder: (_, _) => const ChannelsPage(),
        ),
        GoRoute(
          path: '/app/channels/:id',
          builder: (_, state) =>
              ChannelPostsPage(channelId: state.pathParameters['id']!),
        ),
        GoRoute(
          path: '/app/channels/:id/new-post',
          builder: (_, state) =>
              Scaffold(body: Text("new:${state.pathParameters['id']}")),
        ),
        GoRoute(
          path: '/app/channels/:id/posts/:postId',
          builder: (_, state) => ChannelPostDetailPage(
            channelId: state.pathParameters['id']!,
            postId: state.pathParameters['postId']!,
          ),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [channelsRepositoryProvider.overrideWithValue(repo)],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Geral'), findsOneWidget);
    expect(find.text('Avisos do condominio'), findsOneWidget);
    expect(find.text('Postar'), findsOneWidget);

    await tester.tap(find.text('Geral'));
    await tester.pumpAndSettle();

    expect(find.text('Primeiro post real'), findsOneWidget);
    expect(find.byType(FloatingActionButton), findsOneWidget);
  });

  testWidgets('ChannelPostDetailPage creates a comment and refreshes comments', (
    tester,
  ) async {
    final repo = _FakeChannelsRepository(
      channels: const [
        Channel(
          id: 'ch-001',
          name: 'Geral',
          description: 'Avisos do condominio',
          canPost: true,
          canComment: true,
        ),
      ],
      posts: {
        'ch-001': [
          ChannelPost(
            id: 'post-001',
            channelId: 'ch-001',
            authorName: 'Maria',
            body: 'Detalhe do post',
            createdAt: DateTime(2024, 1, 1, 12),
            commentCount: 0,
          ),
        ],
      },
      comments: {
        'post-001': [],
      },
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [channelsRepositoryProvider.overrideWithValue(repo)],
        child: const MaterialApp(
          home: ChannelPostDetailPage(
            channelId: 'ch-001',
            postId: 'post-001',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Detalhe do post'), findsOneWidget);
    expect(find.text('Nenhum comentario ainda.'), findsOneWidget);

    await tester.enterText(
      find.byType(TextField),
      'Novo comentario pelo widget test',
    );
    await tester.pump();

    await tester.tap(find.byIcon(Icons.send_rounded));
    await tester.pump();
    await tester.pumpAndSettle();

    expect(repo.addCommentCallCount, 1);
    expect(repo.lastCommentBody, 'Novo comentario pelo widget test');
    expect(find.text('Novo comentario pelo widget test'), findsOneWidget);
  });
}

class _FakeChannelsRepository implements ChannelsRepository {
  _FakeChannelsRepository({
    required List<Channel> channels,
    Map<String, List<ChannelPost>>? posts,
    Map<String, List<ChannelComment>>? comments,
  })  : _channels = List<Channel>.from(channels),
        _posts = (posts ?? {}).map(
          (key, value) => MapEntry(key, List<ChannelPost>.from(value)),
        ),
        _comments = (comments ?? {}).map(
          (key, value) => MapEntry(key, List<ChannelComment>.from(value)),
        );

  final List<Channel> _channels;
  final Map<String, List<ChannelPost>> _posts;
  final Map<String, List<ChannelComment>> _comments;

  int addCommentCallCount = 0;
  String? lastCommentBody;
  int _nextCommentId = 1;

  @override
  Future<List<Channel>> getChannels() async {
    return List<Channel>.unmodifiable(_channels);
  }

  @override
  Future<List<ChannelPost>> getPosts(String channelId) async {
    final posts = _posts[channelId] ?? const <ChannelPost>[];
    return List<ChannelPost>.unmodifiable(
      posts
          .map(
            (post) => post.copyWith(
              commentCount: (_comments[post.id] ?? const <ChannelComment>[])
                  .length,
            ),
          )
          .toList(growable: false),
    );
  }

  @override
  Future<ChannelPost> createPost(String channelId, String body) async {
    final created = ChannelPost(
      id: 'post-created',
      channelId: channelId,
      authorName: 'Teste',
      body: body,
      createdAt: DateTime(2024, 1, 1, 13),
      commentCount: 0,
    );
    _posts.putIfAbsent(channelId, () => <ChannelPost>[]).insert(0, created);
    return created;
  }

  @override
  Future<List<ChannelComment>> getComments(String channelId, String postId) async {
    return List<ChannelComment>.unmodifiable(
      _comments[postId] ?? const <ChannelComment>[],
    );
  }

  @override
  Future<ChannelComment> addComment(
    String channelId,
    String postId,
    String body,
  ) async {
    addCommentCallCount += 1;
    lastCommentBody = body;

    final created = ChannelComment(
      id: 'comment-${_nextCommentId++}',
      postId: postId,
      authorName: 'Morador Teste',
      body: body,
      createdAt: DateTime(2024, 1, 1, 14),
    );
    _comments.putIfAbsent(postId, () => <ChannelComment>[]).add(created);
    return created;
  }

  @override
  Future<void> silenceUser(
    String channelId, {
    required String userId,
    int? minutes,
    String? reason,
  }) async {}

  @override
  Future<void> removePost(
    String channelId, {
    required String postId,
    String? reason,
  }) async {
    _posts[channelId]?.removeWhere((post) => post.id == postId);
  }

  @override
  Future<void> removeComment(
    String channelId, {
    required String commentId,
    String? reason,
  }) async {
    for (final comments in _comments.values) {
      comments.removeWhere((comment) => comment.id == commentId);
    }
  }
}
