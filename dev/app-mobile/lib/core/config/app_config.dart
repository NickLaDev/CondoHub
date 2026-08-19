import 'dart:io' show Platform;

class AppConfig {
  const AppConfig._();

  static String get apiBaseUrl {
    const env = String.fromEnvironment('CONDOHUB_API_BASE_URL');
    if (env.isNotEmpty) return env;
    // Android emulator maps 10.0.2.2 → host localhost; iOS simulator uses localhost directly
    return Platform.isAndroid
        ? 'http://10.0.2.2:3000/api/v1'
        : 'http://localhost:3000/api/v1';
  }
}
