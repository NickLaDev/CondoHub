import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException({
    required this.statusCode,
    required this.message,
    this.code,
    this.error,
    this.body,
  });

  final int statusCode;
  final String message;
  final String? code;
  final String? error;
  final Object? body;

  factory ApiException.fromResponse(http.Response response) {
    final decodedBody = _tryDecodeJson(response.body);
    final bodyMap = decodedBody is Map<String, dynamic> ? decodedBody : null;
    final code = _stringValue(bodyMap?['code']);
    final error = _stringValue(bodyMap?['error']);
    final message =
        _stringValue(bodyMap?['message']) ??
        error ??
        response.reasonPhrase ??
        'Erro HTTP ${response.statusCode}';

    return ApiException(
      statusCode: response.statusCode,
      message: message,
      code: code,
      error: error,
      body: decodedBody,
    );
  }

  @override
  String toString() {
    final codeSuffix = code == null ? '' : ' [$code]';
    return 'ApiException $statusCode$codeSuffix: $message';
  }

  static Object? _tryDecodeJson(String rawBody) {
    final trimmed = rawBody.trim();
    if (trimmed.isEmpty) return null;

    try {
      return jsonDecode(trimmed);
    } on FormatException {
      return rawBody;
    }
  }

  static String? _stringValue(Object? value) {
    if (value is String && value.trim().isNotEmpty) {
      return value;
    }
    return null;
  }
}
