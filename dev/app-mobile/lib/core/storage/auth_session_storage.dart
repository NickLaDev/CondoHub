import 'package:shared_preferences/shared_preferences.dart';

import '../models/identity.dart';

class AuthSessionStorage {
  const AuthSessionStorage(this._preferences);

  final SharedPreferences _preferences;

  static const instanceKeyKey = 'auth_session.instance_key';
  static const accessTokenKey = 'auth_session.access_token';
  static const refreshTokenKey = 'auth_session.refresh_token';
  static const expiresInSecKey = 'auth_session.expires_in_sec';
  static const userIdKey = 'auth_session.user.id';
  static const userNameKey = 'auth_session.user.name';
  static const userEmailKey = 'auth_session.user.email';
  static const userRoleKey = 'auth_session.user.role';
  static const condoIdKey = 'auth_session.condo.id';
  static const condoNameKey = 'auth_session.condo.name';
  static const condoInstanceKeyKey = 'auth_session.condo.instance_key';
  static const unitIdKey = 'auth_session.unit.id';
  static const unitBlockKey = 'auth_session.unit.block';
  static const unitNumberKey = 'auth_session.unit.number';

  static const _allKeys = [
    instanceKeyKey,
    accessTokenKey,
    refreshTokenKey,
    expiresInSecKey,
    userIdKey,
    userNameKey,
    userEmailKey,
    userRoleKey,
    condoIdKey,
    condoNameKey,
    condoInstanceKeyKey,
    unitIdKey,
    unitBlockKey,
    unitNumberKey,
  ];

  Future<void> save(AuthState state) async {
    if (!state.isAuthenticated) {
      await clear();
      return;
    }

    final user = state.user;
    final instanceKey = state.instanceKey;
    final accessToken = state.accessToken;
    final refreshToken = state.refreshToken;
    final expiresInSec = state.expiresInSec;

    if (user == null ||
        instanceKey == null ||
        accessToken == null ||
        refreshToken == null ||
        expiresInSec == null) {
      throw StateError('Cannot save incomplete auth session');
    }

    await Future.wait([
      _preferences.setString(instanceKeyKey, instanceKey),
      _preferences.setString(accessTokenKey, accessToken),
      _preferences.setString(refreshTokenKey, refreshToken),
      _preferences.setInt(expiresInSecKey, expiresInSec),
      _preferences.setString(userIdKey, user.id),
      _preferences.setString(userNameKey, user.name),
      _preferences.setString(userEmailKey, user.email),
      _preferences.setString(userRoleKey, user.role),
    ]);

    final condo = state.condo;
    if (condo == null) {
      await _removeKeys([condoIdKey, condoNameKey, condoInstanceKeyKey]);
    } else {
      await Future.wait([
        _preferences.setString(condoIdKey, condo.id),
        _preferences.setString(condoNameKey, condo.name),
        _preferences.setString(condoInstanceKeyKey, condo.instanceKey),
      ]);
    }

    final unit = state.unit;
    if (unit == null) {
      await _removeKeys([unitIdKey, unitBlockKey, unitNumberKey]);
    } else {
      await Future.wait([
        _preferences.setString(unitIdKey, unit.id),
        _preferences.setString(unitBlockKey, unit.block),
        _preferences.setString(unitNumberKey, unit.number),
      ]);
    }
  }

  AuthState? read() {
    if (!_hasAnyStoredValue()) return null;

    final instanceKey = _requiredString(instanceKeyKey);
    final accessToken = _requiredString(accessTokenKey);
    final refreshToken = _requiredString(refreshTokenKey);
    final expiresInSec = _requiredInt(expiresInSecKey);
    final user = User(
      id: _requiredString(userIdKey),
      name: _requiredString(userNameKey),
      email: _requiredString(userEmailKey),
      role: _requiredString(userRoleKey),
    );

    return AuthState(
      isAuthenticated: true,
      instanceKey: instanceKey,
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresInSec: expiresInSec,
      user: user,
      condo: _readCondo(),
      unit: _readUnit(),
    );
  }

  Future<void> clear() {
    return _removeKeys(_allKeys);
  }

  Future<void> _removeKeys(Iterable<String> keys) async {
    await Future.wait(keys.map(_preferences.remove));
  }

  bool _hasAnyStoredValue() {
    return _allKeys.any(_preferences.containsKey);
  }

  String _requiredString(String key) {
    final value = _preferences.getString(key);
    if (value == null || value.trim().isEmpty) {
      throw StateError('Missing auth session value: $key');
    }
    return value;
  }

  int _requiredInt(String key) {
    final value = _preferences.getInt(key);
    if (value == null) {
      throw StateError('Missing auth session value: $key');
    }
    return value;
  }

  Condo? _readCondo() {
    final hasCondo = [
      condoIdKey,
      condoNameKey,
      condoInstanceKeyKey,
    ].any(_preferences.containsKey);
    if (!hasCondo) return null;

    return Condo(
      id: _requiredString(condoIdKey),
      name: _requiredString(condoNameKey),
      instanceKey: _requiredString(condoInstanceKeyKey),
    );
  }

  Unit? _readUnit() {
    final hasUnit = [
      unitIdKey,
      unitBlockKey,
      unitNumberKey,
    ].any(_preferences.containsKey);
    if (!hasUnit) return null;

    return Unit(
      id: _requiredString(unitIdKey),
      block: _requiredString(unitBlockKey),
      number: _requiredString(unitNumberKey),
    );
  }
}
