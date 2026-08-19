class QrState {
  final String code;
  final String payload;
  final int expiresInSeconds;
  final DateTime generatedAt;

  QrState({
    required this.code,
    required this.payload,
    required this.expiresInSeconds,
    required this.generatedAt,
  });

  bool get isExpired =>
      DateTime.now().difference(generatedAt).inSeconds >= expiresInSeconds;

  int get remainingSeconds {
    final elapsed = DateTime.now().difference(generatedAt).inSeconds;
    final remaining = expiresInSeconds - elapsed;
    return remaining > 0 ? remaining : 0;
  }
}

class QrVerificationResult {
  const QrVerificationResult({
    required this.ok,
    this.unitId,
    this.subjectUserId,
    this.reason,
  });

  final bool ok;
  final String? unitId;
  final String? subjectUserId;
  final String? reason;
}
