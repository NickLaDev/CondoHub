class AppRoutes {
  AppRoutes._();

  static const login = '/login';
  static const invite = '/invite';
  static const instanceSelection = '/select-condo';

  static const home = '/app/home';
  static const mural = '/app/mural';
  static const muralDetail = '/app/mural/:id';
  static const tickets = '/app/tickets';
  static const ticketNew = '/app/tickets/new';
  static const ticketDetail = '/app/tickets/:id';
  static const comm = '/app/comm';
  static const channels = '/app/channels';
  static const channelDetail = '/app/channels/:id';
  static const channelNewPost = '/app/channels/:id/new-post';
  static const channelPostDetail = '/app/channels/:id/posts/:postId';
  static const inbox = '/app/inbox';
  static const services = '/app/services';
  static const settings = '/app/settings';
  static const deliveries = '/app/deliveries';
  static const deliveryDetail = '/app/deliveries/:id';
  static const packages = '/app/packages';
  static const packageDetail = '/app/packages/:id';
  static const support = '/app/support';
  static const supportDetail = '/app/support/:id';
  static const qr = '/app/qr';
  static const visitors = '/app/visitors';
  static const visitorNew = '/app/visitors/new';
  static const documents = '/app/documents';
  static const documentDetail = '/app/documents/:id';
  static const access = '/app/access';
  static const accessNew = '/app/access/new';
  static const accessEdit = '/app/access/:id/edit';
  static const cameras = '/app/cameras';
  static const cameraLive = '/app/cameras/:id';

  static String muralDetailLocation(String id) => '/app/mural/$id';
  static String ticketDetailLocation(String id) => '/app/tickets/$id';
  static String channelLocation(String id) => '/app/channels/$id';
  static String channelNewPostLocation(String id) =>
      '/app/channels/$id/new-post';
  static String channelPostDetailLocation(String channelId, String postId) =>
      '/app/channels/$channelId/posts/$postId';
  static String deliveryDetailLocation(String id) => '/app/deliveries/$id';
  static String packageDetailLocation(String id) => '/app/packages/$id';
  static String supportDetailLocation(String id) => '/app/support/$id';
  static String documentDetailLocation(String id) => '/app/documents/$id';
  static String accessEditLocation(String id) => '/app/access/$id/edit';
  static String cameraLiveLocation(String id) => '/app/cameras/$id';
}
