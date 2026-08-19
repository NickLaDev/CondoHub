import 'dart:async';
import '../models/qr.dart';

abstract class QrRepository {
  Stream<QrState> get qrStream;
  Future<QrState> generate();
  Future<QrVerificationResult> verify(String token);
  void dispose();
}
