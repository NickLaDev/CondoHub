import 'package:flutter/material.dart';
import '../models/announcement.dart';
import '../models/delivery.dart';
import '../models/ticket.dart';

enum AppLanguage { ptBr, enUs }

extension AppLanguageX on AppLanguage {
  Locale get locale {
    switch (this) {
      case AppLanguage.ptBr:
        return const Locale('pt', 'BR');
      case AppLanguage.enUs:
        return const Locale('en', 'US');
    }
  }

  String get storageKey {
    switch (this) {
      case AppLanguage.ptBr:
        return 'pt_BR';
      case AppLanguage.enUs:
        return 'en_US';
    }
  }

  static AppLanguage fromStorageKey(String? value) {
    return switch (value) {
      'en_US' => AppLanguage.enUs,
      _ => AppLanguage.ptBr,
    };
  }
}

class AppStrings {
  const AppStrings._(this.appLanguage);

  final AppLanguage appLanguage;

  static AppStrings of(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final selectedLanguage = locale.languageCode == 'en'
        ? AppLanguage.enUs
        : AppLanguage.ptBr;
    return AppStrings._(selectedLanguage);
  }

  bool get isEnglish => appLanguage == AppLanguage.enUs;

  String get appTitle => 'CondoHub';

  String get start => isEnglish ? 'Home' : 'Início';
  String get mural => isEnglish ? 'Announcements' : 'Mural';
  String get tickets => isEnglish ? 'Tickets' : 'Chamados';
  String get communication => isEnglish ? 'Communication' : 'Comunicação';
  String get services => isEnglish ? 'Services' : 'Serviços';
  String get settings => isEnglish ? 'Settings' : 'Configurações';
  String get condo => isEnglish ? 'Condo' : 'Condomínio';
  String get resident => isEnglish ? 'Resident' : 'Morador';
  String get defaultCondoName =>
      isEnglish ? 'Flower Residence' : 'Residencial das Flores';
  String get defaultUnitLabel =>
      isEnglish ? 'Tower A - Apt 101' : 'Bloco A - Apt 101';
  String get errorLabel => isEnglish ? 'Error' : 'Erro';

  String get loginSubtitle => isEnglish
      ? 'Smart management for your condo'
      : 'Gestão inteligente do seu condomínio';
  String get email => isEnglish ? 'Email' : 'E-mail';
  String get emailHint => isEnglish ? 'your@email.com' : 'seu@email.com';
  String get password => isEnglish ? 'Password' : 'Senha';
  String get forgotPassword =>
      isEnglish ? 'Forgot my password' : 'Esqueci minha senha';
  String get signIn => isEnglish ? 'Sign in' : 'Entrar';
  String get haveInvite => isEnglish ? 'I have an invite' : 'Tenho um convite';
  String get inviteTitle => isEnglish ? 'Accept invite' : 'Aceitar convite';
  String get inviteCodeStepTitle =>
      isEnglish ? 'Enter your invite code' : 'Informe seu código de convite';
  String get inviteCodeStepBody => isEnglish
      ? 'Use the code sent by your condo to continue.'
      : 'Use o código enviado pelo condomínio para continuar.';
  String get inviteCodeLabel => isEnglish ? 'Invite code' : 'Código do convite';
  String get inviteCodeHint => isEnglish ? 'Ex: ABC123' : 'Ex: ABC123';
  String get invalidInviteCode => isEnglish
      ? 'Enter a valid invite code'
      : 'Informe um código de convite válido';
  String get continueLabel => isEnglish ? 'Continue' : 'Continuar';
  String get registrationStepTitle =>
      isEnglish ? 'Create your access' : 'Crie seu acesso';
  String get registrationStepBody => isEnglish
      ? 'Complete your details to activate access to the app.'
      : 'Preencha seus dados para ativar seu acesso ao aplicativo.';
  String get fullName => isEnglish ? 'Full name' : 'Nome completo';
  String get fullNameHint => isEnglish ? 'Your full name' : 'Seu nome completo';
  String get fullNameRequired =>
      isEnglish ? 'Enter your full name' : 'Informe o nome completo';
  String get phone => isEnglish ? 'Phone' : 'Telefone';
  String get optionalFieldSuffix => isEnglish ? 'optional' : 'opcional';
  String get confirmPassword =>
      isEnglish ? 'Confirm password' : 'Confirmar senha';
  String get confirmPasswordRequired =>
      isEnglish ? 'Confirm your password' : 'Confirme sua senha';
  String get passwordMismatch =>
      isEnglish ? 'Passwords do not match' : 'As senhas não conferem';
  String get finishRegistration =>
      isEnglish ? 'Finish registration' : 'Concluir cadastro';
  String get back => isEnglish ? 'Back' : 'Voltar';
  String get inviteSummaryLabel => isEnglish ? 'Invite code' : 'Convite';
  String get emailRequired =>
      isEnglish ? 'Enter your email' : 'Informe o e-mail';
  String get invalidEmail => isEnglish ? 'Invalid email' : 'E-mail inválido';
  String get passwordRequired =>
      isEnglish ? 'Enter your password' : 'Informe a senha';
  String get shortPassword =>
      isEnglish ? 'Minimum 4 characters' : 'Mínimo 4 caracteres';
  String get loginGenericError => isEnglish
      ? 'Could not sign in. Check your data and try again.'
      : 'Não foi possível entrar. Revise os dados e tente novamente.';
  String get loginInvalidCredentials =>
      isEnglish ? 'Invalid email or password.' : 'E-mail ou senha inválidos.';
  String get loginServerUnavailable => isEnglish
      ? 'Could not reach the server. Check whether the backend is running.'
      : 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.';
  String get instanceSelectionTitle =>
      isEnglish ? 'Choose your condo' : 'Escolha seu condomínio';
  String get instanceSelectionBody => isEnglish
      ? 'Select which condo you want to access now.'
      : 'Selecione qual condomínio você quer acessar agora.';
  String instanceSelectionUnit(String unitLabel) =>
      isEnglish ? 'Unit $unitLabel' : 'Unidade $unitLabel';
  String instanceSelectionRoles(String roles) =>
      isEnglish ? 'Profile: $roles' : 'Perfil: $roles';
  String get instanceSelectionExpired => isEnglish
      ? 'Your selection expired. Sign in again to continue.'
      : 'Sua seleção expirou. Faça login novamente para continuar.';
  String get instanceSelectionNotAllowed => isEnglish
      ? 'This condo is not available for this sign-in.'
      : 'Este condomínio não está disponível para este login.';
  String get instanceSelectionSuspended => isEnglish
      ? 'This condo is currently suspended.'
      : 'Este condomínio está suspenso no momento.';
  String get instanceSelectionGenericError => isEnglish
      ? 'Could not select this condo. Try again.'
      : 'Não foi possível selecionar este condomínio. Tente novamente.';
  String get backToLogin => isEnglish ? 'Back to sign in' : 'Voltar ao login';
  String get resetPassword => isEnglish ? 'Reset password' : 'Recuperar senha';
  String get registeredEmail =>
      isEnglish ? 'Registered email' : 'E-mail cadastrado';
  String get sendLink => isEnglish ? 'Send link' : 'Enviar link';
  String resetLinkSentTo(String email) => isEnglish
      ? 'We sent a recovery link to $email'
      : 'Enviamos um link de recuperação para $email';
  String get close => isEnglish ? 'Close' : 'Fechar';

  String get urgentAlerts => isEnglish ? 'Urgent alerts' : 'Avisos urgentes';
  String get noUrgentAlertsTitle =>
      isEnglish ? 'No urgent announcements' : 'Nenhum aviso urgente';
  String get noUrgentAlertsBody => isEnglish
      ? 'Important notices will appear here when needed.'
      : 'Quando houver algum aviso crítico, ele aparecerá aqui.';
  String pendingDeliveriesTitle(int count) {
    if (isEnglish) {
      if (count == 0) return 'No pending deliveries';
      if (count == 1) return '1 pending delivery';
      return '$count pending deliveries';
    }
    if (count == 0) return 'Nenhuma encomenda aguardando';
    if (count == 1) return '1 encomenda aguardando';
    return '$count encomendas aguardando';
  }

  String get pendingDeliveriesSubtitle =>
      isEnglish ? 'Check at the front desk' : 'Retire na portaria';
  String get quickAccess => isEnglish ? 'Quick access' : 'Acesso rápido';
  String get latestAnnouncements =>
      isEnglish ? 'Latest announcements' : 'Últimos avisos';
  String get deliveries => isEnglish ? 'Deliveries' : 'Encomendas';
  String get support => isEnglish ? 'Support' : 'Atendimento';
  String get myQrCode => isEnglish ? 'My QR Code' : 'Meu QR Code';

  String get appearance => isEnglish ? 'Appearance' : 'Aparência';
  String get darkMode => isEnglish ? 'Dark / light mode' : 'Modo escuro/claro';
  String get darkModeDescription => isEnglish
      ? 'Toggle the app theme with one touch.'
      : 'Deslize para a direita ou esquerda e altere o tema com um toque.';
  String get notifications => isEnglish ? 'Notifications' : 'Notificações';
  String get muteNotifications =>
      isEnglish ? 'Mute notifications' : 'Deixar no mudo';
  String get muteNotificationsDescription => isEnglish
      ? 'Disable sound for notifications.'
      : 'Sem som quando notificar.';
  String get newVisit => isEnglish ? 'New visitor' : 'Nova visita';
  String get chooseVisitSound => isEnglish
      ? 'Choose the sound played when the app notifies a new visitor.'
      : 'Escolha o som tocado quando o app notificar uma nova visita.';
  String get enableSoundFirst => isEnglish
      ? 'Enable sound to choose the visitor notification tone.'
      : 'Ative o som para escolher o toque de nova visita.';
  String currentSound(String label) =>
      isEnglish ? 'Current sound: $label' : 'Som atual: $label';
  String get restoreDefaultSounds =>
      isEnglish ? 'Restore default sounds' : 'Restaurar padrão dos sons';
  String get restoredSoundsMessage => isEnglish
      ? 'Sounds restored to the app default.'
      : 'Sons restaurados para o padrão do aplicativo.';
  String get language => isEnglish ? 'Language' : 'Idioma';
  String get languageDescription => isEnglish
      ? 'Choose the app language.'
      : 'Escolha o idioma do aplicativo.';
  String get chooseLanguage =>
      isEnglish ? 'Choose language' : 'Escolher idioma';
  String get profileAndAccess =>
      isEnglish ? 'Profile and access' : 'Perfil e acesso';
  String get logout => isEnglish ? 'Log out' : 'Sair da conta';
  String get logoutDescription => isEnglish
      ? 'End the current session on this device.'
      : 'Encerrar a sessão atual neste dispositivo.';
  String get cancel => isEnglish ? 'Cancel' : 'Cancelar';
  String get confirmLogoutTitle => isEnglish ? 'Log out now?' : 'Sair agora?';
  String get confirmLogoutBody => isEnglish
      ? 'You will return to the login screen.'
      : 'Você será levado de volta para a tela de login.';

  String languageName(AppLanguage appLanguage) {
    return switch (appLanguage) {
      AppLanguage.ptBr => 'Português (Brasil)',
      AppLanguage.enUs => 'English (US)',
    };
  }

  String soundLabel(String soundKey) {
    return switch ((soundKey, isEnglish)) {
      ('defaultTone', false) => 'Padrão CondoHub',
      ('softBell', false) => 'Campainha suave',
      ('shortChime', false) => 'Toque curto',
      ('classicDoorbell', false) => 'Campainha clássica',
      ('defaultTone', true) => 'CondoHub default',
      ('softBell', true) => 'Soft bell',
      ('shortChime', true) => 'Short chime',
      ('classicDoorbell', true) => 'Classic doorbell',
      _ => soundKey,
    };
  }

  String soundDescription(String soundKey) {
    return switch ((soundKey, isEnglish)) {
      ('defaultTone', false) => 'Toque original do aplicativo.',
      ('softBell', false) =>
        'Som discreto e agradável para notificações rápidas.',
      ('shortChime', false) => 'Aviso curto para quem prefere alertas rápidos.',
      ('classicDoorbell', false) =>
        'Som tradicional de campainha para nova visita.',
      ('defaultTone', true) => 'Original app sound.',
      ('softBell', true) => 'Soft and subtle sound for quick alerts.',
      ('shortChime', true) => 'Short alert for faster notifications.',
      ('classicDoorbell', true) => 'Traditional doorbell tone.',
      _ => soundKey,
    };
  }

  String get servicesDeliveriesSubtitle =>
      isEnglish ? 'Track your incoming packages' : 'Acompanhe suas entregas';
  String get servicesQrSubtitle =>
      isEnglish ? 'Access and identification' : 'Acesso e identificação';

  String get allDeliveries => isEnglish ? 'All' : 'Todas';
  String get waitingDeliveries => isEnglish ? 'Waiting' : 'Aguardando';
  String get deliveredDeliveries => isEnglish ? 'Delivered' : 'Entregues';
  String get missedDeliveries => isEnglish ? 'Missed' : 'Não entregues';
  String get noDeliveriesInCategory => isEnglish
      ? 'No deliveries in this category.'
      : 'Nenhuma encomenda nesta categoria.';

  String deliveryStatus(DeliveryStatus status) {
    return switch ((status, isEnglish)) {
      (DeliveryStatus.aguardando, false) => 'Aguardando',
      (DeliveryStatus.emDistribuicao, false) => 'Em distribuição',
      (DeliveryStatus.entregue, false) => 'Entregue',
      (DeliveryStatus.naoEntregue, false) => 'Não entregue',
      (DeliveryStatus.aguardando, true) => 'Waiting',
      (DeliveryStatus.emDistribuicao, true) => 'Out for delivery',
      (DeliveryStatus.entregue, true) => 'Delivered',
      (DeliveryStatus.naoEntregue, true) => 'Not delivered',
    };
  }

  String ticketStatus(TicketStatus status) {
    return switch ((status, isEnglish)) {
      (TicketStatus.aberto, false) => 'Aberto',
      (TicketStatus.emAnalise, false) => 'Em análise',
      (TicketStatus.emExecucao, false) => 'Em execução',
      (TicketStatus.resolvido, false) => 'Resolvido',
      (TicketStatus.fechado, false) => 'Fechado',
      (TicketStatus.reaberto, false) => 'Reaberto',
      (TicketStatus.aberto, true) => 'Open',
      (TicketStatus.emAnalise, true) => 'In review',
      (TicketStatus.emExecucao, true) => 'In progress',
      (TicketStatus.resolvido, true) => 'Resolved',
      (TicketStatus.fechado, true) => 'Closed',
      (TicketStatus.reaberto, true) => 'Reopened',
    };
  }

  String ticketCategory(TicketCategory category) {
    return switch ((category, isEnglish)) {
      (TicketCategory.eletrica, false) => 'Elétrica',
      (TicketCategory.hidraulica, false) => 'Hidráulica',
      (TicketCategory.estrutural, false) => 'Estrutural',
      (TicketCategory.limpeza, false) => 'Limpeza',
      (TicketCategory.seguranca, false) => 'Segurança',
      (TicketCategory.outros, false) => 'Outros',
      (TicketCategory.eletrica, true) => 'Electrical',
      (TicketCategory.hidraulica, true) => 'Plumbing',
      (TicketCategory.estrutural, true) => 'Structural',
      (TicketCategory.limpeza, true) => 'Cleaning',
      (TicketCategory.seguranca, true) => 'Security',
      (TicketCategory.outros, true) => 'Other',
    };
  }

  String announcementTag(AnnouncementTag tag) {
    return switch ((tag, isEnglish)) {
      (AnnouncementTag.aviso, false) => 'AVISO',
      (AnnouncementTag.evento, false) => 'EVENTO',
      (AnnouncementTag.urgente, false) => 'URGENTE',
      (AnnouncementTag.comunicado, false) => 'COMUNICADO',
      (AnnouncementTag.aviso, true) => 'NOTICE',
      (AnnouncementTag.evento, true) => 'EVENT',
      (AnnouncementTag.urgente, true) => 'URGENT',
      (AnnouncementTag.comunicado, true) => 'UPDATE',
    };
  }

  String get noAnnouncementsNow =>
      isEnglish ? 'No announcements right now' : 'Nenhum aviso no momento';
  String get noAnnouncementsBody => isEnglish
      ? 'When there are new notices, they will show up here.'
      : 'Quando houver comunicados, eles aparecerão aqui.';
  String get muralHeaderEyebrow =>
      isEnglish ? 'Official communication' : 'Comunicação oficial';
  String get muralHeaderSubtitle => isEnglish
      ? 'Important notices, updates and events from your condo.'
      : 'Avisos, comunicados e eventos importantes do seu condomínio.';
  String muralItemsCount(int count) {
    if (isEnglish) {
      return count == 1 ? '1 item' : '$count items';
    }
    return count == 1 ? '1 item' : '$count itens';
  }

  String get announcementDetail =>
      isEnglish ? 'Announcement detail' : 'Detalhe do aviso';
  String get announcementNotFound =>
      isEnglish ? 'Announcement not found' : 'Aviso não encontrado';
  String get acknowledge => isEnglish ? 'Acknowledge' : 'Marcar como ciente';
  String get acknowledgeShort => isEnglish ? 'Acknowledge' : 'Ciente';
  String get acknowledgedAlready => isEnglish
      ? 'You have acknowledged this announcement'
      : 'Você marcou como ciente';
  String get acknowledgedSuccess => isEnglish
      ? 'Announcement marked as acknowledged.'
      : 'Aviso marcado como ciente.';
  String get acknowledgeHint => isEnglish
      ? 'Tap Acknowledge to confirm you have read it.'
      : 'Toque em Ciente para confirmar a leitura.';
  String get acknowledgementRegistered =>
      isEnglish ? 'Confirmation recorded.' : 'Confirmação registrada.';

  String get filterByStatus =>
      isEnglish ? 'Filter by status' : 'Filtrar por status';
  String get allTickets => isEnglish ? 'All' : 'Todos';
}
