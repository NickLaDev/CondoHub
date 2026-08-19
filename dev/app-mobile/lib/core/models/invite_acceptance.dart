class InviteAcceptanceInput {
  const InviteAcceptanceInput({
    required this.token,
    required this.name,
    required this.password,
    this.email,
    this.phone,
  });

  final String token;
  final String name;
  final String password;
  final String? email;
  final String? phone;
}
