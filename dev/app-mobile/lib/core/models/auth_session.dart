import '../network/api_exception.dart';
import 'identity.dart';

class AuthSession {
  const AuthSession({
    required this.instanceKey,
    required this.accessToken,
    required this.refreshToken,
    required this.expiresInSec,
    required this.user,
    this.condo,
    this.unit,
  });

  final String instanceKey;
  final String accessToken;
  final String refreshToken;
  final int expiresInSec;
  final User user;
  final Condo? condo;
  final Unit? unit;

  factory AuthSession.fromApiResponse({
    required Map<String, dynamic> data,
    String? fallbackInstanceKey,
  }) {
    final userData = data['user'];
    if (userData is! Map<String, dynamic>) {
      throw ApiException(
        statusCode: 0,
        code: 'AUTH_RESPONSE_INVALID',
        message: 'Resposta de login sem usuario valido',
        body: data,
      );
    }

    final accessToken = _requiredString(data, 'accessToken');
    final refreshToken = _requiredString(data, 'refreshToken');
    final expiresInSec = _requiredInt(data, 'expiresInSec');
    final instanceKey =
        _optionalString(userData, 'instanceKey') ?? fallbackInstanceKey;
    if (instanceKey == null || instanceKey.trim().isEmpty) {
      throw ApiException(
        statusCode: 0,
        code: 'AUTH_RESPONSE_INVALID',
        message: 'Resposta de login sem instanceKey valido',
        body: data,
      );
    }
    final email = _stringValue(userData['email']) ?? '';
    final name = _stringValue(userData['name']) ?? email;

    return AuthSession(
      instanceKey: instanceKey,
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresInSec: expiresInSec,
      user: User(
        id: _stringValue(userData['id']) ?? '',
        name: name.isEmpty ? 'Usuario' : name,
        email: email,
        role:
            _stringValue(userData['role']) ??
            _firstString(userData['roles']) ??
            '',
      ),
      condo: _parseCondo(instanceKey, data['condo']),
      unit: _parseUnit(data['unit']),
    );
  }

  factory AuthSession.fromAuthState(AuthState state) {
    final instanceKey = state.instanceKey;
    final accessToken = state.accessToken;
    final refreshToken = state.refreshToken;
    final expiresInSec = state.expiresInSec;
    final user = state.user;

    if (!state.isAuthenticated ||
        instanceKey == null ||
        accessToken == null ||
        refreshToken == null ||
        expiresInSec == null ||
        user == null) {
      throw StateError('Cannot refresh incomplete auth session');
    }

    return AuthSession(
      instanceKey: instanceKey,
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresInSec: expiresInSec,
      user: user,
      condo: state.condo,
      unit: state.unit,
    );
  }

  AuthState toAuthState() {
    return AuthState(
      isAuthenticated: true,
      instanceKey: instanceKey,
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresInSec: expiresInSec,
      user: user,
      condo: condo,
      unit: unit,
    );
  }

  static Condo? _parseCondo(String instanceKey, Object? value) {
    if (value is! Map<String, dynamic>) return null;

    final id = _stringValue(value['id']);
    final name = _stringValue(value['name']);
    if (id == null || name == null) return null;

    return Condo(
      id: id,
      name: name,
      instanceKey: _stringValue(value['instanceKey']) ?? instanceKey,
    );
  }

  static Unit? _parseUnit(Object? value) {
    if (value is! Map<String, dynamic>) return null;

    final id = _stringValue(value['id']);
    if (id == null) return null;

    return Unit(
      id: id,
      block: _stringValue(value['block']) ?? '',
      number: _stringValue(value['number']) ?? '',
    );
  }

  static String _requiredString(Map<String, dynamic> data, String key) {
    final value = _optionalString(data, key);
    if (value != null) return value;

    throw ApiException(
      statusCode: 0,
      code: 'AUTH_RESPONSE_INVALID',
      message: 'Resposta de login sem $key valido',
      body: data,
    );
  }

  static String? _optionalString(Map<String, dynamic> data, String key) {
    return _stringValue(data[key]);
  }

  static int _requiredInt(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is int) return value;
    if (value is num) return value.toInt();

    throw ApiException(
      statusCode: 0,
      code: 'AUTH_RESPONSE_INVALID',
      message: 'Resposta de login sem $key valido',
      body: data,
    );
  }

  static String? _stringValue(Object? value) {
    if (value is String && value.trim().isNotEmpty) {
      return value;
    }
    return null;
  }

  static String? _firstString(Object? value) {
    if (value is! List) return null;

    for (final item in value) {
      final stringValue = _stringValue(item);
      if (stringValue != null) return stringValue;
    }
    return null;
  }
}
