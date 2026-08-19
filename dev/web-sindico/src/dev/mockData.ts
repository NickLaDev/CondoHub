import type { Announcement } from '@/modules/announcements/types';
import type { Channel, ChannelComment, ChannelPost } from '@/modules/channels/types';
import type { CondoProfile } from '@/modules/condo/types';
import type { DeliveryEvent, DeliverySummary } from '@/modules/deliveries/types';
import type { InboxMessage, InboxThread } from '@/modules/inbox/types';
import type { Invite } from '@/modules/invites/types';
import type { InstanceLogEntry } from '@/modules/logs/types';
import type { Block, Unit } from '@/modules/structure/types';
import type {
  TicketMessage,
  TicketStatusHistoryItem,
  TicketSummary,
} from '@/modules/tickets/types';
import type { TurnInfo } from '@/modules/turns/types';
import type { Resident, Staff } from '@/modules/users/types';

export interface DevMockAttachment {
  id: string;
  fileName: string;
  contentType: string;
  url: string;
  createdAt: string;
}

export interface DevMockState {
  instanceKey: string;
  condoProfile: CondoProfile;
  blocks: Block[];
  units: Unit[];
  residents: Resident[];
  staff: Staff[];
  invites: Invite[];
  announcements: Announcement[];
  channels: Channel[];
  channelPosts: Record<string, ChannelPost[]>;
  channelComments: Record<string, ChannelComment[]>;
  inboxThreads: InboxThread[];
  inboxMessages: Record<string, InboxMessage[]>;
  tickets: TicketSummary[];
  ticketMessages: Record<string, TicketMessage[]>;
  ticketStatusHistory: Record<string, TicketStatusHistoryItem[]>;
  deliveries: DeliverySummary[];
  deliveryEvents: Record<string, DeliveryEvent[]>;
  currentTurn: TurnInfo | null;
  turnHistory: TurnInfo[];
  logs: InstanceLogEntry[];
  attachments: Record<string, DevMockAttachment>;
}

const states = new Map<string, DevMockState>();

function atOffset({
  days = 0,
  hours = 0,
  minutes = 0,
}: {
  days?: number;
  hours?: number;
  minutes?: number;
}) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function textUrl(title: string, body: string) {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(`${title}\n\n${body}`)}`;
}

function createSeedAttachments() {
  const createdAt = atOffset({ days: -3 });

  return {
    'att-ann-001': {
      id: 'att-ann-001',
      fileName: 'comunicado-manutencao.txt',
      contentType: 'text/plain',
      url: textUrl(
        'Manutencao preventiva',
        'Documento gerado localmente para o modo mock do web-sindico.',
      ),
      createdAt,
    },
    'att-ticket-001': {
      id: 'att-ticket-001',
      fileName: 'foto-vazamento.txt',
      contentType: 'text/plain',
      url: textUrl(
        'Registro de vazamento',
        'Anexo local apenas para navegacao visual do frontend.',
      ),
      createdAt,
    },
    'att-delivery-001': {
      id: 'att-delivery-001',
      fileName: 'evidencia-entrega.txt',
      contentType: 'text/plain',
      url: textUrl(
        'Evidencia de entrega',
        'Arquivo de exemplo criado somente para o ambiente de desenvolvimento.',
      ),
      createdAt,
    },
    'att-post-001': {
      id: 'att-post-001',
      fileName: 'feira-condominio.txt',
      contentType: 'text/plain',
      url: textUrl(
        'Feira no condominio',
        'Material ilustrativo para o feed de canais em modo mock.',
      ),
      createdAt,
    },
  } satisfies Record<string, DevMockAttachment>;
}

function createSeedState(instanceKey: string): DevMockState {
  const attachments = createSeedAttachments();

  const blocks: Block[] = [
    {
      id: 'block-a',
      name: 'Bloco A',
      status: 'active',
      createdAt: atOffset({ days: -180 }),
      updatedAt: atOffset({ days: -7 }),
    },
    {
      id: 'block-b',
      name: 'Bloco B',
      status: 'active',
      createdAt: atOffset({ days: -175 }),
      updatedAt: atOffset({ days: -4 }),
    },
    {
      id: 'block-c',
      name: 'Torre Jardim',
      status: 'archived',
      createdAt: atOffset({ days: -250 }),
      updatedAt: atOffset({ days: -45 }),
    },
  ];

  const units: Unit[] = [
    {
      id: 'unit-a101',
      blockId: 'block-a',
      block: blocks[0],
      number: '101',
      status: 'active',
      createdAt: atOffset({ days: -160 }),
      updatedAt: atOffset({ days: -5 }),
    },
    {
      id: 'unit-a102',
      blockId: 'block-a',
      block: blocks[0],
      number: '102',
      status: 'active',
      createdAt: atOffset({ days: -160 }),
      updatedAt: atOffset({ days: -3 }),
    },
    {
      id: 'unit-a201',
      blockId: 'block-a',
      block: blocks[0],
      number: '201',
      status: 'active',
      createdAt: atOffset({ days: -155 }),
      updatedAt: atOffset({ days: -2 }),
    },
    {
      id: 'unit-b101',
      blockId: 'block-b',
      block: blocks[1],
      number: '101',
      status: 'active',
      createdAt: atOffset({ days: -150 }),
      updatedAt: atOffset({ days: -1 }),
    },
    {
      id: 'unit-b202',
      blockId: 'block-b',
      block: blocks[1],
      number: '202',
      status: 'active',
      createdAt: atOffset({ days: -150 }),
      updatedAt: atOffset({ hours: -6 }),
    },
    {
      id: 'unit-c001',
      blockId: 'block-c',
      block: blocks[2],
      number: '001',
      status: 'archived',
      createdAt: atOffset({ days: -220 }),
      updatedAt: atOffset({ days: -30 }),
    },
  ];

  const residents: Resident[] = [
    {
      id: 'resident-ana',
      name: 'Ana Ribeiro',
      email: 'ana.ribeiro@condohub.local',
      phone: '(11) 98888-1111',
      unitId: 'unit-a101',
      unit: {
        id: 'unit-a101',
        number: '101',
        block: { id: 'block-a', name: 'Bloco A' },
      },
      status: 'active',
      createdAt: atOffset({ days: -90 }),
      updatedAt: atOffset({ days: -2 }),
    },
    {
      id: 'resident-caio',
      name: 'Caio Martins',
      email: 'caio.martins@condohub.local',
      phone: '(11) 97777-2222',
      unitId: 'unit-a102',
      unit: {
        id: 'unit-a102',
        number: '102',
        block: { id: 'block-a', name: 'Bloco A' },
      },
      status: 'active',
      createdAt: atOffset({ days: -84 }),
      updatedAt: atOffset({ days: -1 }),
    },
    {
      id: 'resident-elisa',
      name: 'Elisa Souza',
      email: 'elisa.souza@condohub.local',
      phone: '(11) 96666-3333',
      unitId: 'unit-b101',
      unit: {
        id: 'unit-b101',
        number: '101',
        block: { id: 'block-b', name: 'Bloco B' },
      },
      status: 'inactive',
      createdAt: atOffset({ days: -70 }),
      updatedAt: atOffset({ days: -10 }),
    },
  ];

  const staff: Staff[] = [
    {
      id: 'staff-luiz',
      name: 'Luiz Entregas',
      email: 'luiz.entregas@condohub.local',
      phone: '(11) 95555-1111',
      role: 'FUNC_ENTREGAS',
      status: 'active',
      createdAt: atOffset({ days: -120 }),
      updatedAt: atOffset({ hours: -4 }),
    },
    {
      id: 'staff-marta',
      name: 'Marta Portaria',
      email: 'marta.portaria@condohub.local',
      phone: '(11) 95555-2222',
      role: 'FUNC_ENTREGAS',
      status: 'active',
      createdAt: atOffset({ days: -110 }),
      updatedAt: atOffset({ days: -1 }),
    },
    {
      id: 'staff-joao',
      name: 'Joao Manutencao',
      email: 'joao.manutencao@condohub.local',
      phone: '(11) 94444-1111',
      role: 'FUNC_MANUTENCAO',
      status: 'active',
      createdAt: atOffset({ days: -130 }),
      updatedAt: atOffset({ hours: -8 }),
    },
    {
      id: 'staff-clara',
      name: 'Clara Manutencao',
      email: 'clara.manutencao@condohub.local',
      phone: '(11) 94444-2222',
      role: 'FUNC_MANUTENCAO',
      status: 'inactive',
      createdAt: atOffset({ days: -95 }),
      updatedAt: atOffset({ days: -15 }),
    },
  ];

  const invites: Invite[] = [
    {
      id: 'invite-001',
      type: 'MORADOR',
      email: 'novo.morador@condohub.local',
      unitId: 'unit-a201',
      unit: {
        id: 'unit-a201',
        number: '201',
        block: { id: 'block-a', name: 'Bloco A' },
      },
      status: 'PENDING',
      expiresAt: atOffset({ days: 5 }),
      createdAt: atOffset({ days: -1 }),
      updatedAt: atOffset({ days: -1 }),
    },
    {
      id: 'invite-002',
      type: 'FUNC_ENTREGAS',
      email: 'entregas.novo@condohub.local',
      status: 'USED',
      expiresAt: atOffset({ days: -8 }),
      usedAt: atOffset({ days: -6 }),
      createdAt: atOffset({ days: -12 }),
      updatedAt: atOffset({ days: -6 }),
    },
    {
      id: 'invite-003',
      type: 'SINDICO_ADMIN',
      email: 'sindico.apoio@condohub.local',
      status: 'EXPIRED',
      expiresAt: atOffset({ days: -3 }),
      createdAt: atOffset({ days: -12 }),
      updatedAt: atOffset({ days: -3 }),
    },
  ];

  const announcements: Announcement[] = [
    {
      id: 'announcement-001',
      title: 'Manutencao do elevador social',
      body: 'A manutencao preventiva vai ocorrer na quarta-feira entre 9h e 12h.',
      requireAck: true,
      attachmentIds: ['att-ann-001'],
      ackCount: 18,
      totalAckRequired: 26,
      acknowledgements: [
        {
          id: 'ack-001',
          unitId: 'unit-a101',
          unitLabel: 'Bloco A - 101',
          userId: 'resident-ana',
          userName: 'Ana Ribeiro',
          ackAt: atOffset({ hours: -15 }),
        },
      ],
      createdAt: atOffset({ days: -2 }),
      updatedAt: atOffset({ hours: -10 }),
    },
    {
      id: 'announcement-002',
      title: 'Lavagem da garagem',
      body: 'Garagem 1 sera interditada parcialmente no sabado para higienizacao.',
      requireAck: false,
      createdAt: atOffset({ days: -5 }),
      updatedAt: atOffset({ days: -4 }),
    },
    {
      id: 'announcement-003',
      title: 'Reuniao extraordinaria',
      body: 'Comunicado encerrado e mantido apenas para historico de navegacao local.',
      requireAck: true,
      archived: true,
      archivedAt: atOffset({ days: -8 }),
      createdAt: atOffset({ days: -12 }),
      updatedAt: atOffset({ days: -8 }),
    },
  ];

  const channels: Channel[] = [
    {
      id: 'channel-avisos',
      name: 'Avisos da administracao',
      description: 'Canal oficial para comunicacoes do sindico.',
      visibility: 'PUBLIC',
      status: 'active',
      createdAt: atOffset({ days: -60 }),
      updatedAt: atOffset({ hours: -6 }),
    },
    {
      id: 'channel-servicos',
      name: 'Prestadores e servicos',
      description: 'Espaco para organizar demandas e ofertas internas.',
      visibility: 'PRIVATE',
      status: 'active',
      createdAt: atOffset({ days: -45 }),
      updatedAt: atOffset({ days: -1 }),
    },
    {
      id: 'channel-lazer',
      name: 'Vida em comunidade',
      description: 'Canal com feed pronto para testes visuais.',
      visibility: 'PUBLIC',
      status: 'active',
      createdAt: atOffset({ days: -30 }),
      updatedAt: atOffset({ hours: -12 }),
    },
  ];

  const channelPosts: Record<string, ChannelPost[]> = {
    'channel-avisos': [
      {
        id: 'post-001',
        channelId: 'channel-avisos',
        authorName: 'Síndico Dev',
        authorUserId: 'dev-user',
        body: 'Checklist semanal atualizado. Revisem a agenda de manutencao e os chamados criticos.',
        attachmentIds: ['att-post-001'],
        commentCount: 2,
        createdAt: atOffset({ hours: -9 }),
        updatedAt: atOffset({ hours: -8 }),
      },
    ],
    'channel-servicos': [
      {
        id: 'post-002',
        channelId: 'channel-servicos',
        authorName: 'Caio Martins',
        authorUserId: 'resident-caio',
        body: 'Alguem recomenda tecnico para fechadura digital no Bloco A?',
        commentCount: 1,
        createdAt: atOffset({ days: -1, hours: -2 }),
        updatedAt: atOffset({ days: -1, hours: -1 }),
      },
    ],
    'channel-lazer': [],
  };

  const channelComments: Record<string, ChannelComment[]> = {
    'post-001': [
      {
        id: 'comment-001',
        postId: 'post-001',
        authorName: 'Ana Ribeiro',
        authorUserId: 'resident-ana',
        body: 'Recebido. Vou confirmar a leitura com o restante do bloco.',
        createdAt: atOffset({ hours: -8 }),
        updatedAt: atOffset({ hours: -8 }),
      },
      {
        id: 'comment-002',
        postId: 'post-001',
        authorName: 'Síndico Dev',
        authorUserId: 'dev-user',
        body: 'Perfeito, obrigado pelo apoio.',
        createdAt: atOffset({ hours: -7 }),
        updatedAt: atOffset({ hours: -7 }),
      },
    ],
    'post-002': [
      {
        id: 'comment-003',
        postId: 'post-002',
        authorName: 'Joao Manutencao',
        authorUserId: 'staff-joao',
        body: 'Tenho um contato que costuma atender o condominio.',
        createdAt: atOffset({ hours: -14 }),
        updatedAt: atOffset({ hours: -14 }),
      },
    ],
  };

  const inboxThreads: InboxThread[] = [
    {
      id: 'thread-001',
      unitId: 'unit-a101',
      unit: { id: 'unit-a101', label: 'Bloco A - 101', blockName: 'Bloco A', number: '101' },
      unitLabel: 'Bloco A - 101',
      status: 'ABERTO',
      subject: 'Ruido na garagem',
      lastMessage: 'O barulho voltou depois das 22h.',
      lastMessageAt: atOffset({ hours: -3 }),
      updatedAt: atOffset({ hours: -3 }),
      createdAt: atOffset({ days: -1 }),
    },
    {
      id: 'thread-002',
      unitId: 'unit-b101',
      unit: { id: 'unit-b101', label: 'Bloco B - 101', blockName: 'Bloco B', number: '101' },
      unitLabel: 'Bloco B - 101',
      status: 'EM_ATENDIMENTO',
      subject: 'Lampada queimada no corredor',
      lastMessage: 'Equipe de manutencao foi acionada.',
      lastMessageAt: atOffset({ hours: -6 }),
      updatedAt: atOffset({ hours: -6 }),
      createdAt: atOffset({ days: -2 }),
    },
    {
      id: 'thread-003',
      unitId: 'unit-a201',
      unit: { id: 'unit-a201', label: 'Bloco A - 201', blockName: 'Bloco A', number: '201' },
      unitLabel: 'Bloco A - 201',
      status: 'RESOLVIDO',
      subject: 'Reserva do salao',
      lastMessage: 'Reserva confirmada para sabado.',
      lastMessageAt: atOffset({ days: -1, hours: -4 }),
      updatedAt: atOffset({ days: -1, hours: -4 }),
      createdAt: atOffset({ days: -4 }),
    },
  ];

  const inboxMessages: Record<string, InboxMessage[]> = {
    'thread-001': [
      {
        id: 'inbox-msg-001',
        threadId: 'thread-001',
        authorName: 'Ana Ribeiro',
        authorUserId: 'resident-ana',
        message: 'Boa noite, o portao da garagem fez muito ruido hoje.',
        isFromAdmin: false,
        createdAt: atOffset({ hours: -5 }),
        attachmentIds: [],
      },
      {
        id: 'inbox-msg-002',
        threadId: 'thread-001',
        authorName: 'Síndico Dev',
        authorUserId: 'dev-user',
        message: 'Obrigado pelo aviso. Ja encaminhei para verificacao.',
        isFromAdmin: true,
        createdAt: atOffset({ hours: -4 }),
        attachmentIds: [],
      },
      {
        id: 'inbox-msg-003',
        threadId: 'thread-001',
        authorName: 'Ana Ribeiro',
        authorUserId: 'resident-ana',
        message: 'O barulho voltou depois das 22h.',
        isFromAdmin: false,
        createdAt: atOffset({ hours: -3 }),
        attachmentIds: [],
      },
    ],
    'thread-002': [
      {
        id: 'inbox-msg-004',
        threadId: 'thread-002',
        authorName: 'Elisa Souza',
        authorUserId: 'resident-elisa',
        message: 'A lampada do corredor do 1o andar queimou novamente.',
        isFromAdmin: false,
        createdAt: atOffset({ hours: -8 }),
        attachmentIds: [],
      },
      {
        id: 'inbox-msg-005',
        threadId: 'thread-002',
        authorName: 'Síndico Dev',
        authorUserId: 'dev-user',
        message: 'Equipe de manutencao foi acionada.',
        isFromAdmin: true,
        createdAt: atOffset({ hours: -6 }),
        attachmentIds: [],
      },
    ],
    'thread-003': [
      {
        id: 'inbox-msg-006',
        threadId: 'thread-003',
        authorName: 'Morador Visitante',
        authorUserId: 'resident-caio',
        message: 'Reserva do salao para sabado a noite, por favor.',
        isFromAdmin: false,
        createdAt: atOffset({ days: -2 }),
        attachmentIds: [],
      },
      {
        id: 'inbox-msg-007',
        threadId: 'thread-003',
        authorName: 'Síndico Dev',
        authorUserId: 'dev-user',
        message: 'Reserva confirmada para sabado.',
        isFromAdmin: true,
        createdAt: atOffset({ days: -1, hours: -4 }),
        attachmentIds: [],
      },
    ],
  };

  const tickets: TicketSummary[] = [
    {
      id: 'ticket-001',
      title: 'Vazamento na prumada do Bloco A',
      category: 'Hidraulica',
      location: 'Bloco A - 2o andar',
      description: 'Vazamento recorrente proximo ao shaft tecnico.',
      status: 'EM_ANDAMENTO',
      priority: 'CRITICA',
      unitId: 'unit-a201',
      unitLabel: 'Bloco A - 201',
      unit: { id: 'unit-a201', label: 'Bloco A - 201' },
      assignee: { id: 'staff-joao', name: 'Joao Manutencao', role: 'FUNC_MANUTENCAO' },
      dueAt: atOffset({ hours: -2 }),
      createdAt: atOffset({ days: -1, hours: -6 }),
      updatedAt: atOffset({ hours: -1 }),
      overdue: true,
      attachmentIds: ['att-ticket-001'],
    },
    {
      id: 'ticket-002',
      title: 'Porta corta-fogo desalinhada',
      category: 'Seguranca',
      location: 'Bloco B - escada',
      description: 'A porta esta fechando com impacto acima do normal.',
      status: 'ABERTO',
      priority: 'ALTA',
      unitId: 'unit-b101',
      unitLabel: 'Bloco B - 101',
      unit: { id: 'unit-b101', label: 'Bloco B - 101' },
      assignee: { id: null, name: null, role: null },
      dueAt: atOffset({ hours: 10 }),
      createdAt: atOffset({ hours: -7 }),
      updatedAt: atOffset({ hours: -6 }),
      overdue: false,
      attachmentIds: [],
    },
    {
      id: 'ticket-003',
      title: 'Revisar iluminacao da garagem',
      category: 'Eletrica',
      location: 'Garagem 1',
      description: 'Tres lampadas apagadas na area de circulacao.',
      status: 'REABERTO',
      priority: 'MEDIA',
      unitId: 'unit-a101',
      unitLabel: 'Bloco A - 101',
      unit: { id: 'unit-a101', label: 'Bloco A - 101' },
      assignee: { id: 'staff-clara', name: 'Clara Manutencao', role: 'FUNC_MANUTENCAO' },
      dueAt: atOffset({ hours: 4 }),
      createdAt: atOffset({ days: -3 }),
      updatedAt: atOffset({ hours: -5 }),
      overdue: false,
      attachmentIds: [],
    },
    {
      id: 'ticket-004',
      title: 'Ajuste no interfone',
      category: 'Eletronica',
      location: 'Portaria',
      description: 'Audio com falhas na torre principal.',
      status: 'RESOLVIDO',
      priority: 'BAIXA',
      unitId: null,
      unitLabel: null,
      unit: { id: null, label: null },
      assignee: { id: 'staff-joao', name: 'Joao Manutencao', role: 'FUNC_MANUTENCAO' },
      dueAt: atOffset({ days: -1 }),
      createdAt: atOffset({ days: -5 }),
      updatedAt: atOffset({ days: -1 }),
      overdue: false,
      attachmentIds: [],
    },
  ];

  const ticketMessages: Record<string, TicketMessage[]> = {
    'ticket-001': [
      {
        id: 'ticket-msg-001',
        message: 'Foto do ponto de vazamento enviada para a equipe.',
        authorName: 'Síndico Dev',
        authorRole: 'SINDICO_ADMIN',
        createdAt: atOffset({ days: -1, hours: -5 }),
        attachmentIds: ['att-ticket-001'],
      },
      {
        id: 'ticket-msg-002',
        message: 'Equipe ja esta no local verificando a tubulacao.',
        authorName: 'Joao Manutencao',
        authorRole: 'FUNC_MANUTENCAO',
        createdAt: atOffset({ hours: -1 }),
        attachmentIds: [],
      },
    ],
    'ticket-002': [],
    'ticket-003': [
      {
        id: 'ticket-msg-003',
        message: 'Reabrindo porque duas lampadas voltaram a oscilar.',
        authorName: 'Síndico Dev',
        authorRole: 'SINDICO_ADMIN',
        createdAt: atOffset({ hours: -5 }),
        attachmentIds: [],
      },
    ],
    'ticket-004': [],
  };

  const ticketStatusHistory: Record<string, TicketStatusHistoryItem[]> = {
    'ticket-001': [
      {
        id: 'ticket-status-001',
        fromStatus: null,
        toStatus: 'ABERTO',
        actorName: 'Síndico Dev',
        createdAt: atOffset({ days: -1, hours: -6 }),
        reason: 'Chamado aberto no painel administrativo.',
      },
      {
        id: 'ticket-status-002',
        fromStatus: 'ABERTO',
        toStatus: 'EM_ANDAMENTO',
        actorName: 'Joao Manutencao',
        createdAt: atOffset({ hours: -2 }),
        reason: 'Equipe deslocada para atendimento.',
      },
    ],
    'ticket-002': [
      {
        id: 'ticket-status-003',
        fromStatus: null,
        toStatus: 'ABERTO',
        actorName: 'Síndico Dev',
        createdAt: atOffset({ hours: -7 }),
        reason: 'Aguardando triagem.',
      },
    ],
    'ticket-003': [
      {
        id: 'ticket-status-004',
        fromStatus: 'RESOLVIDO',
        toStatus: 'REABERTO',
        actorName: 'Síndico Dev',
        createdAt: atOffset({ hours: -5 }),
        reason: 'Problema voltou a acontecer.',
      },
    ],
    'ticket-004': [
      {
        id: 'ticket-status-005',
        fromStatus: 'EM_ANDAMENTO',
        toStatus: 'RESOLVIDO',
        actorName: 'Joao Manutencao',
        createdAt: atOffset({ days: -1 }),
        reason: 'Interfone regulado e testado.',
      },
    ],
  };

  const deliveries: DeliverySummary[] = [
    {
      id: 'delivery-001',
      code: 'ENC-1001',
      unitId: 'unit-a101',
      unitLabel: 'Bloco A - 101',
      recipientName: 'Ana Ribeiro',
      courierUserId: null,
      courierName: null,
      deliveredToName: null,
      failureReason: null,
      status: 'CHEGOU',
      createdAt: atOffset({ hours: -4 }),
      updatedAt: atOffset({ hours: -4 }),
      attachmentIds: [],
    },
    {
      id: 'delivery-002',
      code: 'ENC-1002',
      unitId: 'unit-b101',
      unitLabel: 'Bloco B - 101',
      recipientName: 'Elisa Souza',
      courierUserId: 'staff-luiz',
      courierName: 'Luiz Entregas',
      deliveredToName: null,
      failureReason: null,
      status: 'EM_DISTRIBUICAO',
      createdAt: atOffset({ hours: -6 }),
      updatedAt: atOffset({ hours: -2 }),
      attachmentIds: ['att-delivery-001'],
    },
    {
      id: 'delivery-003',
      code: 'ENC-1003',
      unitId: 'unit-a201',
      unitLabel: 'Bloco A - 201',
      recipientName: 'Morador A201',
      courierUserId: 'staff-marta',
      courierName: 'Marta Portaria',
      deliveredToName: 'Morador A201',
      failureReason: null,
      status: 'ENTREGUE',
      createdAt: atOffset({ days: -1 }),
      updatedAt: atOffset({ hours: -7 }),
      attachmentIds: [],
    },
    {
      id: 'delivery-004',
      code: 'ENC-1004',
      unitId: 'unit-a102',
      unitLabel: 'Bloco A - 102',
      recipientName: 'Caio Martins',
      courierUserId: 'staff-luiz',
      courierName: 'Luiz Entregas',
      deliveredToName: null,
      failureReason: 'Destinatario ausente na segunda tentativa.',
      status: 'NAO_ENTREGUE',
      createdAt: atOffset({ days: -2 }),
      updatedAt: atOffset({ days: -1, hours: -2 }),
      attachmentIds: [],
    },
  ];

  const deliveryEvents: Record<string, DeliveryEvent[]> = {
    'delivery-001': [
      {
        id: 'delivery-event-001',
        type: 'RECEIVED',
        description: 'Encomenda registrada na portaria.',
        actorName: 'Síndico Dev',
        createdAt: atOffset({ hours: -4 }),
        attachmentIds: [],
      },
    ],
    'delivery-002': [
      {
        id: 'delivery-event-002',
        type: 'RECEIVED',
        description: 'Objeto recebido na portaria.',
        actorName: 'Síndico Dev',
        createdAt: atOffset({ hours: -6 }),
        attachmentIds: [],
      },
      {
        id: 'delivery-event-003',
        type: 'ASSIGNED',
        description: 'Entrega atribuida para distribuicao.',
        actorName: 'Luiz Entregas',
        createdAt: atOffset({ hours: -2 }),
        attachmentIds: ['att-delivery-001'],
      },
    ],
    'delivery-003': [
      {
        id: 'delivery-event-004',
        type: 'COMPLETED',
        description: 'Entrega concluida com confirmacao local.',
        actorName: 'Marta Portaria',
        createdAt: atOffset({ hours: -7 }),
        attachmentIds: [],
      },
    ],
    'delivery-004': [
      {
        id: 'delivery-event-005',
        type: 'FAILED',
        description: 'Falha registrada por ausencia do destinatario.',
        actorName: 'Luiz Entregas',
        createdAt: atOffset({ days: -1, hours: -2 }),
        attachmentIds: [],
      },
    ],
  };

  const currentTurn: TurnInfo = {
    id: 'turn-open-001',
    actorName: 'Luiz Entregas',
    startedAt: atOffset({ hours: -5 }),
    endedAt: null,
    isOpen: true,
  };

  const turnHistory: TurnInfo[] = [
    currentTurn,
    {
      id: 'turn-closed-001',
      actorName: 'Marta Portaria',
      startedAt: atOffset({ days: -1, hours: -8 }),
      endedAt: atOffset({ days: -1, hours: -1 }),
      isOpen: false,
    },
  ];

  const logs: InstanceLogEntry[] = [
    {
      id: 'log-001',
      createdAt: atOffset({ minutes: -20 }),
      actorName: 'Síndico Dev',
      actorId: 'dev-user',
      action: 'DASHBOARD_VIEWED',
      entity: 'dashboard',
      requestId: 'req-dashboard-001',
      unitId: null,
      unitLabel: null,
      context: 'Resumo operacional consultado no modo mock.',
      detailsJson: { source: 'dev-mock' },
      ip: '127.0.0.1',
      userAgent: 'web-sindico/dev',
    },
    {
      id: 'log-002',
      createdAt: atOffset({ hours: -1 }),
      actorName: 'Joao Manutencao',
      actorId: 'staff-joao',
      action: 'TICKET_UPDATED',
      entity: 'ticket',
      requestId: 'req-ticket-001',
      unitId: 'unit-a201',
      unitLabel: 'Bloco A - 201',
      context: 'Ticket ticket-001 mantido em andamento.',
      detailsJson: { ticketId: 'ticket-001' },
      ip: '10.0.0.45',
      userAgent: 'web-sindico/dev',
    },
    {
      id: 'log-003',
      createdAt: atOffset({ hours: -2 }),
      actorName: 'Luiz Entregas',
      actorId: 'staff-luiz',
      action: 'DELIVERY_ASSIGNED',
      entity: 'delivery',
      requestId: 'req-delivery-002',
      unitId: 'unit-b101',
      unitLabel: 'Bloco B - 101',
      context: 'Entrega delivery-002 enviada para distribuicao.',
      detailsJson: { deliveryId: 'delivery-002' },
      ip: '10.0.0.22',
      userAgent: 'web-sindico/dev',
    },
    {
      id: 'log-004',
      createdAt: atOffset({ days: -1 }),
      actorName: 'Síndico Dev',
      actorId: 'dev-user',
      action: 'ANNOUNCEMENT_CREATED',
      entity: 'announcement',
      requestId: 'req-announcement-002',
      unitId: null,
      unitLabel: null,
      context: 'Comunicado operacional publicado.',
      detailsJson: { announcementId: 'announcement-002' },
      ip: '127.0.0.1',
      userAgent: 'web-sindico/dev',
    },
  ];

  return {
    instanceKey,
    condoProfile: {
      id: `condo-${instanceKey}`,
      name: `Condominio ${instanceKey.replace(/[-_]/g, ' ').trim() || 'Demo'}`,
      address: 'Rua das Palmeiras, 250 - Bairro Central',
      phone: '(11) 4000-9000',
      createdAt: atOffset({ days: -365 }),
      updatedAt: atOffset({ days: -2 }),
    },
    blocks,
    units,
    residents,
    staff,
    invites,
    announcements,
    channels,
    channelPosts,
    channelComments,
    inboxThreads,
    inboxMessages,
    tickets,
    ticketMessages,
    ticketStatusHistory,
    deliveries,
    deliveryEvents,
    currentTurn,
    turnHistory,
    logs,
    attachments,
  };
}

export function getDevMockState(instanceKey: string) {
  const normalizedKey = instanceKey.trim() || 'condohub';

  if (!states.has(normalizedKey)) {
    states.set(normalizedKey, createSeedState(normalizedKey));
  }

  return states.get(normalizedKey)!;
}

export function resolveDevAttachmentUrl(instanceKey: string, attachmentId: string) {
  return getDevMockState(instanceKey).attachments[attachmentId]?.url ?? null;
}

export async function registerDevAttachmentUpload(instanceKey: string, file: File) {
  const state = getDevMockState(instanceKey);
  const attachmentId = `att-upload-${crypto.randomUUID().slice(0, 8)}`;

  state.attachments[attachmentId] = {
    id: attachmentId,
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    url: URL.createObjectURL(file),
    createdAt: new Date().toISOString(),
  };

  return {
    attachmentId,
  };
}
