import 'instance_selection.dart';

class User {
  final String id;
  final String name;
  final String email;
  final String role;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });
}

class Condo {
  final String id;
  final String name;
  final String instanceKey;

  const Condo({
    required this.id,
    required this.name,
    required this.instanceKey,
  });
}

class Unit {
  final String id;
  final String block;
  final String number;

  const Unit({required this.id, required this.block, required this.number});

  String get label => 'Bloco $block - Apt $number';
}

class AuthState {
  final bool isAuthenticated;
  final String? instanceKey;
  final String? accessToken;
  final String? refreshToken;
  final int? expiresInSec;
  final User? user;
  final Condo? condo;
  final Unit? unit;
  final PendingInstanceSelection? pendingInstanceSelection;

  const AuthState({
    this.isAuthenticated = false,
    this.instanceKey,
    this.accessToken,
    this.refreshToken,
    this.expiresInSec,
    this.user,
    this.condo,
    this.unit,
    this.pendingInstanceSelection,
  });

  bool get requiresInstanceSelection => pendingInstanceSelection != null;

  AuthState copyWith({
    bool? isAuthenticated,
    String? instanceKey,
    String? accessToken,
    String? refreshToken,
    int? expiresInSec,
    User? user,
    Condo? condo,
    Unit? unit,
    PendingInstanceSelection? pendingInstanceSelection,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      instanceKey: instanceKey ?? this.instanceKey,
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      expiresInSec: expiresInSec ?? this.expiresInSec,
      user: user ?? this.user,
      condo: condo ?? this.condo,
      unit: unit ?? this.unit,
      pendingInstanceSelection:
          pendingInstanceSelection ?? this.pendingInstanceSelection,
    );
  }
}
