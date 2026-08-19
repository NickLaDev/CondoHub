import { useMemo, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { FilterBar } from '@/components/filters/FilterBar';
import { ConfirmActionModal } from '@/components/modals/ConfirmActionModal';
import { FormModal } from '@/components/modals/FormModal';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { ChannelFeed } from '@/modules/channels/components/ChannelFeed';
import { ChannelForm } from '@/modules/channels/components/ChannelForm';
import { ChannelList } from '@/modules/channels/components/ChannelList';
import { CommentList } from '@/modules/channels/components/CommentList';
import { PostComposer } from '@/modules/channels/components/PostComposer';
import {
  createChannel,
  archiveChannel,
  getChannels,
  updateChannel,
} from '@/modules/channels/services/channels.service';
import {
  createChannelPost,
  createComment,
  deleteChannelPost,
  getChannelPosts,
  getComments,
  removeChannelContent,
  silenceChannelUser,
  updateChannelPost,
  updateChannelComment,
} from '@/modules/channels/services/channelPosts.service';
import type {
  Channel,
  ChannelPost,
  CreateChannelRequest,
  UpdateChannelRequest,
} from '@/modules/channels/types';
import { getErrorMessage, isForbiddenError } from '@/services/errors';
import { createEmptyPaginatedResponse } from '@/services/pagination';

const CHANNELS_PAGE_SIZE = 10;
const POSTS_PAGE_SIZE = 20;

function getChannelIdValue(id: unknown) {
  return String(id ?? '');
}

type ModerationIntent =
  | { kind: 'delete-post'; post: ChannelPost }
  | { kind: 'remove-post'; post: ChannelPost }
  | { kind: 'silence-user'; post: ChannelPost }
  | null;

function isChannelArchived(channel: Channel) {
  return Boolean(channel.archivedAt || channel.status === 'archived');
}

function getModerationCopy(intent: ModerationIntent) {
  if (!intent) {
    return {
      title: '',
      description: '',
      confirmLabel: 'Confirmar',
      variant: 'danger' as const,
    };
  }

  switch (intent.kind) {
    case 'delete-post':
      return {
        title: 'Excluir post logicamente',
        description: 'Esta acao oculta o post no canal, sem misturar contratos entre tenants.',
        confirmLabel: 'Excluir post',
        variant: 'danger' as const,
      };
    case 'remove-post':
      return {
        title: 'Moderar conteudo',
        description: 'Use esta acao quando o sindico precisar remover o conteudo do feed por moderacao.',
        confirmLabel: 'Aplicar moderacao',
        variant: 'warning' as const,
      };
    case 'silence-user':
      return {
        title: 'Silenciar usuario',
        description: 'O usuario autor ficara temporariamente silenciado neste canal por 60 minutos.',
        confirmLabel: 'Silenciar usuario',
        variant: 'warning' as const,
      };
  }
}

export function ChannelsPage() {
  const { instanceKey } = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  const [archiveChannelItem, setArchiveChannelItem] = useState<Channel | null>(null);
  const [activePost, setActivePost] = useState<ChannelPost | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [moderationIntent, setModerationIntent] = useState<ModerationIntent>(null);
  const [postEditBody, setPostEditBody] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<{ id: string; body: string } | null>(null);

  const page = Number(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const channelIdFromUrl = searchParams.get('channelId') || '';

  const channelListQuery = useQuery({
    queryKey: ['channels', instanceKey, { page, search }],
    queryFn: () =>
      getChannels(instanceKey, {
        page,
        limit: CHANNELS_PAGE_SIZE,
        search: search || undefined,
      }),
    enabled: Boolean(instanceKey),
    placeholderData: keepPreviousData,
  });

  const channelData =
    channelListQuery.data
    ?? createEmptyPaginatedResponse<Channel>({
      page,
      limit: CHANNELS_PAGE_SIZE,
    });

  const selectedChannelId = useMemo(() => {
    const firstChannelId = getChannelIdValue(channelData.data[0]?.id);
    if (!channelIdFromUrl) {
      return firstChannelId;
    }

    const urlSelectionExists = channelData.data.some(
      (item) => getChannelIdValue(item.id) === channelIdFromUrl,
    );
    return urlSelectionExists ? channelIdFromUrl : firstChannelId;
  }, [channelData.data, channelIdFromUrl]);

  const chosen = useMemo(
    () => channelData.data.find((item) => getChannelIdValue(item.id) === selectedChannelId) ?? null,
    [channelData.data, selectedChannelId],
  );

  const postsQuery = useQuery({
    queryKey: ['channels', instanceKey, selectedChannelId, 'posts'],
    queryFn: () => getChannelPosts(instanceKey, selectedChannelId, { page: 1, limit: POSTS_PAGE_SIZE }),
    enabled: Boolean(instanceKey && selectedChannelId),
  });

  const activeChannelPost = useMemo(() => {
    if (!activePost) {
      return null;
    }

    const postChannelId = getChannelIdValue(activePost.channelId);
    return !postChannelId || postChannelId === selectedChannelId ? activePost : null;
  }, [activePost, selectedChannelId]);

  const commentsQuery = useQuery({
    queryKey: ['channels', instanceKey, selectedChannelId, activeChannelPost?.id, 'comments'],
    queryFn: () =>
      getComments(instanceKey, selectedChannelId, activeChannelPost?.id ?? '', { page: 1, limit: 50 }),
    enabled: Boolean(instanceKey && selectedChannelId && activeChannelPost),
  });

  const createChannelMutation = useMutation({
    mutationFn: (createChannelData: CreateChannelRequest) => createChannel(instanceKey, createChannelData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', instanceKey] });
      setIsCreateModalOpen(false);
      setFeedbackMessage('Canal criado com sucesso.');
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChannelRequest }) =>
      updateChannel(instanceKey, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', instanceKey] });
      setEditChannel(null);
      setFeedbackMessage('Canal atualizado com sucesso.');
    },
  });

  const archiveChannelMutation = useMutation({
    mutationFn: (channelId: string) => archiveChannel(instanceKey, channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', instanceKey] });
      setArchiveChannelItem(null);
      setFeedbackMessage('Canal arquivado com sucesso.');
    },
  });

  const createPostMutation = useMutation({
    mutationFn: (payload: { text: string; attachmentIds: string[] }) =>
      createChannelPost(instanceKey, selectedChannelId, {
        body: payload.text,
        attachmentIds: payload.attachmentIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', instanceKey, selectedChannelId, 'posts'] });
      setFeedbackMessage('Post publicado com sucesso.');
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) =>
      createComment(instanceKey, selectedChannelId, postId, { body: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', instanceKey, selectedChannelId, 'posts'] });
      queryClient.invalidateQueries({
        queryKey: ['channels', instanceKey, selectedChannelId, activeChannelPost?.id, 'comments'],
      });
      setCommentDraft('');
      setFeedbackMessage('Comentario enviado com sucesso.');
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, body }: { postId: string; body: string }) =>
      updateChannelPost(instanceKey, selectedChannelId, postId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', instanceKey, selectedChannelId, 'posts'] });
      setPostEditBody(null);
      setFeedbackMessage('Post atualizado com sucesso.');
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ postId, commentId, body }: { postId: string; commentId: string; body: string }) =>
      updateChannelComment(instanceKey, selectedChannelId, postId, commentId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['channels', instanceKey, selectedChannelId, activeChannelPost?.id, 'comments'],
      });
      setEditingComment(null);
      setFeedbackMessage('Comentario atualizado com sucesso.');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: ({ postId }: { postId: string }) => deleteChannelPost(instanceKey, selectedChannelId, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', instanceKey, selectedChannelId] });
      setActivePost(null);
      setModerationIntent(null);
      setFeedbackMessage('Post removido logicamente.');
    },
  });

  const removeContentMutation = useMutation({
    mutationFn: ({ postId }: { postId: string }) =>
      removeChannelContent(instanceKey, selectedChannelId, {
        contentType: 'POST',
        contentId: postId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', instanceKey, selectedChannelId] });
      setModerationIntent(null);
      setFeedbackMessage('Moderacao aplicada com sucesso.');
    },
  });

  const silenceUserMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      silenceChannelUser(instanceKey, selectedChannelId, {
        userId,
        minutes: 60,
      }),
    onSuccess: () => {
      setModerationIntent(null);
      setFeedbackMessage('Usuario silenciado com sucesso.');
    },
  });

  const handleChannelSelect = (channel: Channel) => {
    const nextChannelId = getChannelIdValue(channel.id);
    if (nextChannelId === selectedChannelId) {
      return;
    }

    setActivePost(null);
    setCommentDraft('');
    setModerationIntent(null);

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('channelId', nextChannelId);
      return nextParams;
    });
  };

  const handlePageChange = (nextPage: number) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('page', String(nextPage));
      nextParams.delete('channelId');
      return nextParams;
    });
  };

  const handleCreateChannel = async (payload: CreateChannelRequest | UpdateChannelRequest) => {
    await createChannelMutation.mutateAsync(payload as CreateChannelRequest);
  };

  const handleUpdateChannel = async (payload: CreateChannelRequest | UpdateChannelRequest) => {
    if (!editChannel) {
      return;
    }

    await updateChannelMutation.mutateAsync({
      id: editChannel.id,
      data: payload as UpdateChannelRequest,
    });
  };

  const handleArchiveChannel = async () => {
    if (!archiveChannelItem) {
      return;
    }

    await archiveChannelMutation.mutateAsync(archiveChannelItem.id);
  };

  const handleCommentSubmit = async () => {
    if (!activeChannelPost) {
      return;
    }

    const trimmedComment = commentDraft.trim();
    if (!trimmedComment) {
      return;
    }

    await createCommentMutation.mutateAsync({
      postId: activeChannelPost.id,
      text: trimmedComment,
    });
  };

  const handleOpenSilence = (post: ChannelPost) => {
    if (!post.authorUserId) {
      setFeedbackMessage('O backend nao retornou authorUserId para este post.');
      return;
    }

    setModerationIntent({ kind: 'silence-user', post });
  };

  const handleConfirmModeration = async () => {
    if (!moderationIntent) {
      return;
    }

    if (moderationIntent.kind === 'delete-post') {
      await deletePostMutation.mutateAsync({ postId: moderationIntent.post.id });
      return;
    }

    if (moderationIntent.kind === 'remove-post') {
      await removeContentMutation.mutateAsync({ postId: moderationIntent.post.id });
      return;
    }

    if (!moderationIntent.post.authorUserId) {
      setModerationIntent(null);
      setFeedbackMessage('Nao foi possivel silenciar o usuario deste post.');
      return;
    }

    await silenceUserMutation.mutateAsync({ userId: moderationIntent.post.authorUserId });
  };

  const moderationCopy = getModerationCopy(moderationIntent);
  const isModerationLoading =
    deletePostMutation.isPending || removeContentMutation.isPending || silenceUserMutation.isPending;

  if (channelListQuery.isLoading) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Canais" description="Carregando canais do condominio..." />
          <div>Carregando canais...</div>
        </div>
      </PermissionGuard>
    );
  }

  if (channelListQuery.error && isForbiddenError(channelListQuery.error)) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Canais" description="Gerencie os canais de comunicacao do condominio." />
          <ErrorState
            title="Acesso negado aos canais"
            description="O backend retornou 403 para este modulo tenant."
            code="403"
          />
        </div>
      </PermissionGuard>
    );
  }

  if (channelListQuery.error) {
    return (
      <PermissionGuard allow={['SINDICO_ADMIN']}>
        <div className="page-stack">
          <PageHeader title="Canais" description="Gerencie os canais de comunicacao do condominio." />
          <ErrorState
            title="Falha ao carregar canais"
            description={getErrorMessage(channelListQuery.error)}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']}>
      <div className="page-stack">
        <PageHeader
          title="Canais"
          description="Administre canais, acompanhe o feed comunitario e prepare a moderacao do sindico."
          badge={postsQuery.isFetching ? 'Atualizando feed' : undefined}
          actions={
            <button type="button" className="button button--add" onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={16} /> Novo canal
            </button>
          }
        />

        {feedbackMessage ? (
          <div className="inline-feedback inline-feedback--success">{feedbackMessage}</div>
        ) : null}

        <div className="two-column-layout">
          <section className="panel-card">
            <div className="panel-card__header">
              <div>
                <h2>Lista de canais</h2>
                <p>A selecao acompanha a URL via query string.</p>
              </div>
            </div>
            <div className="panel-card__body page-stack">
              <FilterBar placeholder="Buscar canais..." />

              {channelData.data.length ? (
                <>
                  <div className="channels-page__list">
                    <ChannelList
                      channels={channelData.data}
                      selectedChannelId={selectedChannelId}
                      onSelect={handleChannelSelect}
                    />
                  </div>
                  <div className="table-pagination">
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => handlePageChange(Math.max(page - 1, 1))}
                      disabled={page <= 1}
                    >
                      Anterior
                    </button>
                    <span>
                      Pagina {channelData.pagination.page} de {channelData.pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => handlePageChange(Math.min(page + 1, channelData.pagination.totalPages))}
                      disabled={page >= channelData.pagination.totalPages}
                    >
                      Proxima
                    </button>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="Nenhum canal cadastrado"
                  description="Crie o primeiro canal desta instancia para habilitar a comunicacao comunitaria."
                  action={
                    <button type="button" className="button button--add" onClick={() => setIsCreateModalOpen(true)}>
                      Criar canal
                    </button>
                  }
                />
              )}
            </div>
          </section>

          <section className="panel-card" key={selectedChannelId || 'channel-detail-empty'}>
            {!chosen ? (
              <div className="panel-card__body">
                <EmptyState
                  title="Selecione um canal"
                  description="Escolha um canal na coluna lateral para ver o feed, comentarios e a moderacao."
                />
              </div>
            ) : (
              <>
                <div className="panel-card__header">
                  <div>
                    <h2>{chosen.name}</h2>
                    <p>{chosen.description || 'Canal sem descricao cadastrada.'}</p>
                  </div>
                  <div className="detail-section__meta">
                    <StatusBadge status={isChannelArchived(chosen) ? 'archived' : 'active'} />
                    <StatusBadge
                      status={chosen.visibility === 'PRIVATE' ? 'warning' : 'info'}
                      label={chosen.visibility === 'PRIVATE' ? 'Privado' : 'Publico'}
                    />
                  </div>
                </div>

                <div className="panel-card__body page-stack">
                  <div className="toolbar-row">
                    <div className="toolbar-row__spacer">
                      <span className="channels-page__selection-hint">
                        Canal selecionado via URL: {selectedChannelId}
                      </span>
                    </div>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => setEditChannel(chosen)}
                      >
                        Editar canal
                      </button>
                      <button
                        type="button"
                        className="button button--danger"
                        onClick={() => setArchiveChannelItem(chosen)}
                      >
                        Arquivar canal
                      </button>
                    </div>
                  </div>

                  <div className="page-stack">
                    <div className="channels-page__copy">
                      <h3>Feed de posts</h3>
                      <p>
                        Posts e comentarios ficam desacoplados do CRUD de canais e degradam com seguranca.
                      </p>
                    </div>

                    <PostComposer
                      instanceKey={instanceKey}
                      onCreatePost={async (payload) => {
                        await createPostMutation.mutateAsync(payload);
                      }}
                    />

                    {postsQuery.isLoading ? (
                      <div className="inline-feedback inline-feedback--info">Carregando posts...</div>
                    ) : postsQuery.error ? (
                      <ErrorState
                        title="Falha ao carregar posts"
                        description={getErrorMessage(postsQuery.error)}
                      />
                    ) : postsQuery.data?.unavailable ? (
                      <EmptyState
                        title="Feed aguardando integracao"
                        description="Os endpoints de posts ainda nao retornaram dados completos nesta instancia. A estrutura da UI ja esta pronta para integracao."
                      />
                    ) : postsQuery.data?.data.length ? (
                      <ChannelFeed
                        instanceKey={instanceKey}
                        posts={postsQuery.data.data}
                        onOpenComments={post => setActivePost(post)}
                        onDeletePost={post => setModerationIntent({ kind: 'delete-post', post })}
                        onRemoveContent={post => setModerationIntent({ kind: 'remove-post', post })}
                        onSilenceUser={handleOpenSilence}
                      />
                    ) : (
                      <EmptyState
                        title="Canal sem posts"
                        description="Este canal ainda nao recebeu publicacoes."
                      />
                    )}
                  </div>

                  <div className="page-stack">
                    <div className="channels-page__copy">
                      <h3>Comentarios e moderacao</h3>
                      <p>
                        Ao selecionar um post, o carregamento das mensagens ocorre de forma independente.
                      </p>
                    </div>

                    {!activeChannelPost ? (
                      <EmptyState
                        title="Nenhum post selecionado"
                        description="Escolha um item do feed para ver comentarios, responder e moderar o contexto." 
                      />
                    ) : (
                      <div className="detail-section channels-page__focus">
                        <div className="toolbar-row">
                          <div className="channels-page__copy">
                            <h4>Post em foco</h4>
                            <p>{activeChannelPost.authorName ?? activeChannelPost.author ?? 'Morador'}</p>
                          </div>
                          <div className="table-actions">
                            {postEditBody === null ? (
                              <button
                                type="button"
                                className="button button--ghost"
                                onClick={() => setPostEditBody(activeChannelPost.body ?? activeChannelPost.text ?? '')}
                              >
                                Editar post
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="button button--ghost"
                              onClick={() => {
                                setActivePost(null);
                                setCommentDraft('');
                                setPostEditBody(null);
                                setEditingComment(null);
                              }}
                            >
                              Fechar foco
                            </button>
                          </div>
                        </div>

                        {postEditBody !== null ? (
                          <div className="composer-panel">
                            <label className="field" htmlFor="post-edit-body">
                              <span className="field__label">Editar post</span>
                              <textarea
                                id="post-edit-body"
                                rows={4}
                                className="field__input composer-panel__input"
                                value={postEditBody}
                                onChange={(e) => setPostEditBody(e.target.value)}
                              />
                            </label>
                            <div className="composer-panel__actions">
                              <button
                                type="button"
                                className="button button--ghost"
                                onClick={() => setPostEditBody(null)}
                                disabled={updatePostMutation.isPending}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className="button button--primary"
                                onClick={() =>
                                  void updatePostMutation.mutateAsync({
                                    postId: activeChannelPost.id,
                                    body: postEditBody.trim(),
                                  })
                                }
                                disabled={!postEditBody.trim() || updatePostMutation.isPending}
                              >
                                {updatePostMutation.isPending ? 'Salvando...' : 'Salvar post'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <article className="message-bubble message-bubble--resident">
                            <div className="message-bubble__header">
                              <strong>Conteudo do post</strong>
                              <span>{new Date(activeChannelPost.createdAt).toLocaleString('pt-BR')}</span>
                            </div>
                            <p>{activeChannelPost.body ?? activeChannelPost.text ?? ''}</p>
                          </article>
                        )}

                        {commentsQuery.isLoading ? (
                          <div className="inline-feedback inline-feedback--info">Carregando comentarios...</div>
                        ) : commentsQuery.error ? (
                          <ErrorState
                            title="Falha ao carregar comentarios"
                            description={getErrorMessage(commentsQuery.error)}
                          />
                        ) : commentsQuery.data?.unavailable ? (
                          <EmptyState
                            title="Comentarios aguardando integracao"
                            description="A camada de comentarios esta pronta e vai se conectar assim que o backend expor os subrecursos desta instancia."
                          />
                        ) : (
                          <>
                            <CommentList
                              comments={commentsQuery.data?.data ?? []}
                              onEditComment={(comment) =>
                                setEditingComment({
                                  id: comment.id,
                                  body: comment.body ?? comment.text ?? '',
                                })
                              }
                            />
                            {editingComment ? (
                              <div className="composer-panel">
                                <label className="field" htmlFor="comment-edit-body">
                                  <span className="field__label">Editar comentario</span>
                                  <textarea
                                    id="comment-edit-body"
                                    rows={3}
                                    className="field__input composer-panel__input"
                                    value={editingComment.body}
                                    onChange={(e) =>
                                      setEditingComment((prev) =>
                                        prev ? { ...prev, body: e.target.value } : null,
                                      )
                                    }
                                  />
                                </label>
                                <div className="composer-panel__actions">
                                  <button
                                    type="button"
                                    className="button button--ghost"
                                    onClick={() => setEditingComment(null)}
                                    disabled={updateCommentMutation.isPending}
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    className="button button--primary"
                                    onClick={() =>
                                      void updateCommentMutation.mutateAsync({
                                        postId: activeChannelPost.id,
                                        commentId: editingComment.id,
                                        body: editingComment.body.trim(),
                                      })
                                    }
                                    disabled={!editingComment.body.trim() || updateCommentMutation.isPending}
                                  >
                                    {updateCommentMutation.isPending ? 'Salvando...' : 'Salvar comentario'}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </>
                        )}

                        <div className="composer-panel">
                          <label className="field" htmlFor="channel-comment-draft">
                            <span className="field__label">Novo comentario</span>
                            <textarea
                              id="channel-comment-draft"
                              rows={4}
                              className="field__input composer-panel__input"
                              value={commentDraft}
                              onChange={(event) => setCommentDraft(event.target.value)}
                              placeholder="Escreva uma resposta para o post selecionado..."
                            />
                          </label>
                          <div className="composer-panel__actions">
                            <button
                              type="button"
                              className="button button--ghost"
                              onClick={() => setCommentDraft('')}
                              disabled={!commentDraft.trim() || createCommentMutation.isPending}
                            >
                              Limpar
                            </button>
                            <button
                              type="button"
                              className="button button--primary"
                              onClick={() => void handleCommentSubmit()}
                              disabled={!commentDraft.trim() || createCommentMutation.isPending}
                            >
                              {createCommentMutation.isPending ? 'Enviando...' : 'Comentar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        <FormModal
          isOpen={isCreateModalOpen || Boolean(editChannel)}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditChannel(null);
          }}
          title={editChannel ? 'Editar canal' : 'Novo canal'}
        >
          <ChannelForm
            channel={editChannel ?? undefined}
            onSubmit={editChannel ? handleUpdateChannel : handleCreateChannel}
            onCancel={() => {
              setIsCreateModalOpen(false);
              setEditChannel(null);
            }}
            isSubmitting={createChannelMutation.isPending || updateChannelMutation.isPending}
            error={createChannelMutation.error || updateChannelMutation.error}
          />
        </FormModal>

        <ConfirmActionModal
          isOpen={Boolean(archiveChannelItem)}
          title="Arquivar canal"
          description="Tem certeza de que deseja arquivar este canal? Essa acao impede novas interacoes no feed."
          confirmLabel="Arquivar canal"
          onConfirm={() => void handleArchiveChannel()}
          onCancel={() => setArchiveChannelItem(null)}
          isLoading={archiveChannelMutation.isPending}
        />

        <ConfirmActionModal
          isOpen={Boolean(moderationIntent)}
          title={moderationCopy.title}
          description={moderationCopy.description}
          confirmLabel={moderationCopy.confirmLabel}
          variant={moderationCopy.variant}
          onConfirm={() => void handleConfirmModeration()}
          onCancel={() => setModerationIntent(null)}
          isLoading={isModerationLoading}
        />
      </div>
    </PermissionGuard>
  );
}
