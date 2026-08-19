import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'api_exception.dart';

typedef AccessTokenRefresher = Future<String?> Function();
typedef SessionClearer = Future<void> Function();

class ApiClient {
  ApiClient({
    http.Client? httpClient,
    String? baseUrl,
    AccessTokenRefresher? refreshAccessToken,
    SessionClearer? clearSession,
  }) : _httpClient = httpClient ?? http.Client(),
       _shouldCloseClient = httpClient == null,
       _baseUri = Uri.parse(baseUrl ?? AppConfig.apiBaseUrl),
       _refreshAccessToken = refreshAccessToken,
       _clearSession = clearSession;

  final http.Client _httpClient;
  final bool _shouldCloseClient;
  final Uri _baseUri;
  final AccessTokenRefresher? _refreshAccessToken;
  final SessionClearer? _clearSession;
  Future<String?>? _refreshInFlight;

  Future<Object?> get(
    String path, {
    Map<String, String>? headers,
    String? accessToken,
  }) async {
    return _sendWithAutoRefresh(
      path: path,
      accessToken: accessToken,
      request: (token) => _httpClient.get(
        _resolve(path),
        headers: _buildHeaders(headers: headers, accessToken: token),
      ),
    );
  }

  Future<Object?> post(
    String path, {
    Object? body,
    Map<String, String>? headers,
    String? accessToken,
  }) async {
    return _sendWithAutoRefresh(
      path: path,
      accessToken: accessToken,
      request: (token) => _httpClient.post(
        _resolve(path),
        headers: _buildHeaders(
          headers: headers,
          accessToken: token,
          hasJsonBody: body != null,
        ),
        body: body == null ? null : jsonEncode(body),
      ),
    );
  }

  Future<Object?> put(
    String path, {
    Object? body,
    Map<String, String>? headers,
    String? accessToken,
  }) async {
    return _sendWithAutoRefresh(
      path: path,
      accessToken: accessToken,
      request: (token) => _httpClient.put(
        _resolve(path),
        headers: _buildHeaders(
          headers: headers,
          accessToken: token,
          hasJsonBody: body != null,
        ),
        body: body == null ? null : jsonEncode(body),
      ),
    );
  }

  Future<Object?> patch(
    String path, {
    Object? body,
    Map<String, String>? headers,
    String? accessToken,
  }) async {
    return _sendWithAutoRefresh(
      path: path,
      accessToken: accessToken,
      request: (token) => _httpClient.patch(
        _resolve(path),
        headers: _buildHeaders(
          headers: headers,
          accessToken: token,
          hasJsonBody: body != null,
        ),
        body: body == null ? null : jsonEncode(body),
      ),
    );
  }

  Future<Object?> delete(
    String path, {
    Object? body,
    Map<String, String>? headers,
    String? accessToken,
  }) async {
    return _sendWithAutoRefresh(
      path: path,
      accessToken: accessToken,
      request: (token) => _httpClient.delete(
        _resolve(path),
        headers: _buildHeaders(
          headers: headers,
          accessToken: token,
          hasJsonBody: body != null,
        ),
        body: body == null ? null : jsonEncode(body),
      ),
    );
  }

  void close() {
    if (_shouldCloseClient) {
      _httpClient.close();
    }
  }

  Uri _resolve(String path) {
    final base = _baseUri.toString().endsWith('/')
        ? _baseUri
        : Uri.parse('${_baseUri.toString()}/');
    final relativePath = path.replaceFirst(RegExp(r'^/+'), '');
    return base.resolve(relativePath);
  }

  Map<String, String> _buildHeaders({
    Map<String, String>? headers,
    String? accessToken,
    bool hasJsonBody = false,
  }) {
    return {
      'Accept': 'application/json',
      if (hasJsonBody) 'Content-Type': 'application/json',
      ...?headers,
      if (accessToken != null && accessToken.trim().isNotEmpty)
        'Authorization': 'Bearer $accessToken',
    };
  }

  Future<http.Response> _send(Future<http.Response> Function() request) async {
    try {
      return await request();
    } on http.ClientException catch (error) {
      throw ApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Nao foi possivel conectar ao servidor',
        error: error.message,
      );
    }
  }

  void _log(http.Response response) {
    final method = response.request?.method ?? '?';
    final url = response.request?.url;
    final path = url?.path ?? '';
    final query = (url?.query.isNotEmpty ?? false) ? '?${url!.query}' : '';
    debugPrint('[HTTP] $method $path$query → ${response.statusCode}');
  }

  Future<Object?> _sendWithAutoRefresh({
    required String path,
    required String? accessToken,
    required Future<http.Response> Function(String? accessToken) request,
  }) async {
    try {
      final response = await _send(() => request(accessToken));
      _log(response);
      return _handleResponse(response);
    } on ApiException catch (error) {
      if (!_shouldAttemptRefresh(
        error: error,
        path: path,
        accessToken: accessToken,
      )) {
        rethrow;
      }

      final refreshedAccessToken = await _refreshForRetry();
      if (refreshedAccessToken == null || refreshedAccessToken.trim().isEmpty) {
        rethrow;
      }

      try {
        final retryResponse = await _send(() => request(refreshedAccessToken));
        _log(retryResponse);
        return _handleResponse(retryResponse);
      } on ApiException catch (retryError) {
        if (retryError.statusCode == 401) {
          await _clearSessionSafely();
        }
        rethrow;
      }
    }
  }

  Future<String?> _refreshForRetry() async {
    final existingRefresh = _refreshInFlight;
    if (existingRefresh != null) return existingRefresh;

    final refreshAccessToken = _refreshAccessToken;
    if (refreshAccessToken == null) return null;

    final refresh = _runRefresh(refreshAccessToken);
    _refreshInFlight = refresh;
    return refresh;
  }

  Future<String?> _runRefresh(AccessTokenRefresher refreshAccessToken) async {
    try {
      return await refreshAccessToken();
    } on ApiException catch (error) {
      if (_shouldClearSessionAfterRefreshError(error)) {
        await _clearSessionSafely();
      }
      rethrow;
    } finally {
      _refreshInFlight = null;
    }
  }

  bool _shouldAttemptRefresh({
    required ApiException error,
    required String path,
    required String? accessToken,
  }) {
    return error.statusCode == 401 &&
        accessToken != null &&
        accessToken.trim().isNotEmpty &&
        _refreshAccessToken != null &&
        !_isAuthEndpoint(path);
  }

  bool _shouldClearSessionAfterRefreshError(ApiException error) {
    if (error.statusCode == 401 || error.statusCode == 403) return true;

    return switch (error.code) {
      'AUTH_INVALID' ||
      'AUTH_REQUIRED' ||
      'INVALID_REFRESH_TOKEN' ||
      'SESSION_REVOKED' ||
      'TOKEN_EXPIRED' => true,
      _ => false,
    };
  }

  Future<void> _clearSessionSafely() async {
    try {
      await _clearSession?.call();
    } catch (_) {
      // Preserve the request error; session cleanup is best effort here.
    }
  }

  bool _isAuthEndpoint(String path) {
    final normalizedPath = _normalizePath(path);
    return normalizedPath.endsWith('/auth/login') ||
        normalizedPath.endsWith('/auth/select-instance') ||
        normalizedPath.endsWith('/auth/refresh');
  }

  String _normalizePath(String path) {
    final uri = Uri.tryParse(path);
    final uriPath = uri?.path;
    final rawPath = uriPath != null && uriPath.isNotEmpty ? uriPath : path;
    final withoutTrailingSlash = rawPath.replaceFirst(RegExp(r'/+$'), '');
    if (withoutTrailingSlash.startsWith('/')) return withoutTrailingSlash;
    return '/$withoutTrailingSlash';
  }

  Object? _handleResponse(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException.fromResponse(response);
    }

    final rawBody = response.body.trim();
    if (rawBody.isEmpty) return null;
    try {
      return jsonDecode(rawBody);
    } on FormatException {
      throw ApiException(
        statusCode: response.statusCode,
        code: 'API_RESPONSE_INVALID',
        message: 'Resposta invalida do servidor',
        body: response.body,
      );
    }
  }
}
