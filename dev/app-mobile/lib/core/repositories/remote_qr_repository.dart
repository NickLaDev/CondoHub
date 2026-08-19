import 'dart:async';

import '../models/qr.dart';
import '../network/tenant_api_context.dart';
import 'qr_repository.dart';

class RemoteQrRepository implements QrRepository {
  RemoteQrRepository({required TenantApiContext tenantApiContext})
      : _ctx = tenantApiContext;

  final TenantApiContext _ctx;
  final _controller = StreamController<QrState>.broadcast();
  Future<QrState>? _inFlight;
  bool _disposed = false;

  @override
  Stream<QrState> get qrStream => _controller.stream;

  @override
  Future<QrState> generate() {
    if (_disposed) throw StateError('RemoteQrRepository já foi descartado.');
    return _inFlight ??= _generate().whenComplete(() => _inFlight = null);
  }

  Future<QrState> _generate() async {
    final r = await _ctx.post('/qr/signature');
    final map = r as Map<String, dynamic>;
    final token = map['token']?.toString() ?? '';
    final expiresAt = DateTime.tryParse(map['expiresAt']?.toString() ?? '');
    final now = DateTime.now();
    final expiresIn = expiresAt == null
        ? 60
        : expiresAt.difference(now).inSeconds.clamp(1, 24 * 60 * 60);
    final state = QrState(
      code: _shortCode(token),
      payload: token,
      expiresInSeconds: expiresIn,
      generatedAt: now,
    );
    if (!_disposed) _controller.add(state);
    return state;
  }

  @override
  Future<QrVerificationResult> verify(String token) async {
    final r = await _ctx.post('/qr/verify', body: {'token': token});
    final map = r as Map<String, dynamic>;
    return QrVerificationResult(
      ok: map['ok'] == true,
      unitId: map['unitId']?.toString(),
      subjectUserId: map['subjectUserId']?.toString(),
      reason: map['reason']?.toString(),
    );
  }

  @override
  void dispose() {
    _disposed = true;
    _controller.close();
  }

  String _shortCode(String token) {
    final compact = token.replaceAll(RegExp(r'[^A-Za-z0-9]'), '');
    if (compact.length <= 6) return compact.padLeft(6, '0');
    return compact.substring(compact.length - 6).toUpperCase();
  }
}
