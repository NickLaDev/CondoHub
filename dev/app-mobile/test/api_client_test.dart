import 'dart:async';
import 'dart:convert';

import 'package:condohub_mobile/core/network/api_client.dart';
import 'package:condohub_mobile/core/network/api_exception.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('get resolves relative paths against the configured base URL', () async {
    late http.Request capturedRequest;
    final client = ApiClient(
      baseUrl: 'http://10.0.2.2:3000/api/v1',
      httpClient: MockClient((request) async {
        capturedRequest = request;
        return http.Response(jsonEncode({'ok': true}), 200);
      }),
    );

    final response = await client.get('/teste');

    expect(response, {'ok': true});
    expect(capturedRequest.url.toString(), 'http://10.0.2.2:3000/api/v1/teste');
  });

  test('post sends JSON body and bearer token when provided', () async {
    late http.Request capturedRequest;
    final client = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      httpClient: MockClient((request) async {
        capturedRequest = request;
        return http.Response(jsonEncode({'created': true}), 201);
      }),
    );

    final response = await client.post(
      '/demo-condo/auth/login',
      body: {'email': 'morador@condohub.local'},
      accessToken: 'token-123',
      headers: {'X-Instance-Key': 'demo-condo'},
    );

    expect(response, {'created': true});
    expect(capturedRequest.headers['Accept'], 'application/json');
    expect(capturedRequest.headers['Content-Type'], 'application/json');
    expect(capturedRequest.headers['Authorization'], 'Bearer token-123');
    expect(capturedRequest.headers['X-Instance-Key'], 'demo-condo');
    expect(jsonDecode(capturedRequest.body), {
      'email': 'morador@condohub.local',
    });
  });

  test('put and patch send JSON body and bearer token when provided', () async {
    final capturedRequests = <http.Request>[];
    final client = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      httpClient: MockClient((request) async {
        capturedRequests.add(request);
        return http.Response(jsonEncode({'ok': true}), 200);
      }),
    );

    final putResponse = await client.put(
      '/demo-condo/profile',
      body: {'name': 'Residencial Demo'},
      accessToken: 'put-token',
      headers: {'X-Trace-Id': 'put-trace'},
    );
    final patchResponse = await client.patch(
      '/demo-condo/profile',
      body: {'name': 'Residencial Atualizado'},
      accessToken: 'patch-token',
      headers: {'X-Trace-Id': 'patch-trace'},
    );

    expect(putResponse, {'ok': true});
    expect(patchResponse, {'ok': true});
    expect(capturedRequests, hasLength(2));
    expect(capturedRequests.first.method, 'PUT');
    expect(
      capturedRequests.first.url.toString(),
      'http://localhost:3000/api/v1/demo-condo/profile',
    );
    expect(capturedRequests.first.headers['Content-Type'], 'application/json');
    expect(capturedRequests.first.headers['Authorization'], 'Bearer put-token');
    expect(capturedRequests.first.headers['X-Trace-Id'], 'put-trace');
    expect(jsonDecode(capturedRequests.first.body), {
      'name': 'Residencial Demo',
    });
    expect(capturedRequests.last.method, 'PATCH');
    expect(
      capturedRequests.last.headers['Authorization'],
      'Bearer patch-token',
    );
    expect(capturedRequests.last.headers['X-Trace-Id'], 'patch-trace');
    expect(jsonDecode(capturedRequests.last.body), {
      'name': 'Residencial Atualizado',
    });
  });

  test('authenticated request with valid token does not refresh', () async {
    var refreshCount = 0;
    late http.Request capturedRequest;
    final client = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      refreshAccessToken: () async {
        refreshCount += 1;
        return 'new-token';
      },
      httpClient: MockClient((request) async {
        capturedRequest = request;
        return http.Response(jsonEncode({'ok': true}), 200);
      }),
    );

    final response = await client.get(
      '/demo-condo/protected',
      accessToken: 'valid-token',
    );

    expect(response, {'ok': true});
    expect(refreshCount, 0);
    expect(capturedRequest.headers['Authorization'], 'Bearer valid-token');
  });

  test('401 refreshes access token and retries request once', () async {
    final capturedRequests = <http.Request>[];
    var refreshCount = 0;
    final client = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      refreshAccessToken: () async {
        refreshCount += 1;
        return 'new-access-token';
      },
      httpClient: MockClient((request) async {
        capturedRequests.add(request);
        if (capturedRequests.length == 1) {
          return http.Response(
            jsonEncode({'code': 'TOKEN_EXPIRED', 'message': 'Token expired'}),
            401,
          );
        }

        return http.Response(jsonEncode({'ok': true}), 200);
      }),
    );

    final response = await client.get(
      '/demo-condo/protected',
      accessToken: 'old-access-token',
      headers: {'X-Instance-Key': 'demo'},
    );

    expect(response, {'ok': true});
    expect(refreshCount, 1);
    expect(capturedRequests, hasLength(2));
    expect(
      capturedRequests.first.headers['Authorization'],
      'Bearer old-access-token',
    );
    expect(
      capturedRequests.last.headers['Authorization'],
      'Bearer new-access-token',
    );
    expect(capturedRequests.last.headers['X-Instance-Key'], 'demo');
  });

  test('invalid refresh clears session and does not retry request', () async {
    var refreshCount = 0;
    var clearCount = 0;
    var requestCount = 0;
    final client = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      refreshAccessToken: () async {
        refreshCount += 1;
        throw const ApiException(
          statusCode: 401,
          code: 'AUTH_INVALID',
          message: 'Invalid refresh token',
        );
      },
      clearSession: () async {
        clearCount += 1;
      },
      httpClient: MockClient((request) async {
        requestCount += 1;
        return http.Response(
          jsonEncode({'code': 'TOKEN_EXPIRED', 'message': 'Token expired'}),
          401,
        );
      }),
    );

    await expectLater(
      client.get('/demo-condo/protected', accessToken: 'old-access-token'),
      throwsA(
        isA<ApiException>()
            .having((error) => error.statusCode, 'statusCode', 401)
            .having((error) => error.code, 'code', 'AUTH_INVALID'),
      ),
    );

    expect(requestCount, 1);
    expect(refreshCount, 1);
    expect(clearCount, 1);
  });

  test(
    'network error during refresh keeps session and does not retry',
    () async {
      var clearCount = 0;
      var requestCount = 0;
      final client = ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        refreshAccessToken: () async {
          throw const ApiException(
            statusCode: 0,
            code: 'NETWORK_ERROR',
            message: 'Nao foi possivel conectar ao servidor',
          );
        },
        clearSession: () async {
          clearCount += 1;
        },
        httpClient: MockClient((request) async {
          requestCount += 1;
          return http.Response(
            jsonEncode({'code': 'TOKEN_EXPIRED', 'message': 'Token expired'}),
            401,
          );
        }),
      );

      await expectLater(
        client.get('/demo-condo/protected', accessToken: 'old-access-token'),
        throwsA(
          isA<ApiException>()
              .having((error) => error.statusCode, 'statusCode', 0)
              .having((error) => error.code, 'code', 'NETWORK_ERROR'),
        ),
      );

      expect(requestCount, 1);
      expect(clearCount, 0);
    },
  );

  test('auth endpoints do not trigger auto refresh', () async {
    for (final path in [
      '/auth/login',
      '/auth/select-instance',
      '/auth/refresh',
    ]) {
      var refreshCount = 0;
      var requestCount = 0;
      final client = ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        refreshAccessToken: () async {
          refreshCount += 1;
          return 'new-access-token';
        },
        httpClient: MockClient((request) async {
          requestCount += 1;
          return http.Response(
            jsonEncode({'code': 'AUTH_INVALID', 'message': 'Unauthorized'}),
            401,
          );
        }),
      );

      await expectLater(
        client.post(path, accessToken: 'old-access-token'),
        throwsA(isA<ApiException>()),
      );

      expect(requestCount, 1, reason: path);
      expect(refreshCount, 0, reason: path);
    }
  });

  test('second 401 after retry clears session without refresh loop', () async {
    var refreshCount = 0;
    var clearCount = 0;
    var requestCount = 0;
    final client = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      refreshAccessToken: () async {
        refreshCount += 1;
        return 'new-access-token';
      },
      clearSession: () async {
        clearCount += 1;
      },
      httpClient: MockClient((request) async {
        requestCount += 1;
        return http.Response(
          jsonEncode({'code': 'TOKEN_EXPIRED', 'message': 'Token expired'}),
          401,
        );
      }),
    );

    await expectLater(
      client.delete('/demo-condo/protected', accessToken: 'old-access-token'),
      throwsA(
        isA<ApiException>()
            .having((error) => error.statusCode, 'statusCode', 401)
            .having((error) => error.code, 'code', 'TOKEN_EXPIRED'),
      ),
    );

    expect(requestCount, 2);
    expect(refreshCount, 1);
    expect(clearCount, 1);
  });

  test(
    'missing refreshed token propagates original 401 without retry',
    () async {
      var refreshCount = 0;
      var clearCount = 0;
      var requestCount = 0;
      final client = ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        refreshAccessToken: () async {
          refreshCount += 1;
          return null;
        },
        clearSession: () async {
          clearCount += 1;
        },
        httpClient: MockClient((request) async {
          requestCount += 1;
          return http.Response(
            jsonEncode({'code': 'AUTH_REQUIRED', 'message': 'Unauthorized'}),
            401,
          );
        }),
      );

      await expectLater(
        client.get('/demo-condo/protected', accessToken: 'old-access-token'),
        throwsA(
          isA<ApiException>()
              .having((error) => error.statusCode, 'statusCode', 401)
              .having((error) => error.code, 'code', 'AUTH_REQUIRED'),
        ),
      );

      expect(requestCount, 1);
      expect(refreshCount, 1);
      expect(clearCount, 0);
    },
  );

  test('simultaneous 401 responses share a single refresh', () async {
    final refreshCompleter = Completer<String>();
    final capturedRequests = <http.Request>[];
    var refreshCount = 0;
    final client = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      refreshAccessToken: () {
        refreshCount += 1;
        return refreshCompleter.future;
      },
      httpClient: MockClient((request) async {
        capturedRequests.add(request);
        if (request.headers['Authorization'] == 'Bearer old-access-token') {
          return http.Response(
            jsonEncode({'code': 'TOKEN_EXPIRED', 'message': 'Token expired'}),
            401,
          );
        }

        return http.Response(jsonEncode({'ok': true}), 200);
      }),
    );

    final first = client.get(
      '/demo-condo/first',
      accessToken: 'old-access-token',
    );
    final second = client.get(
      '/demo-condo/second',
      accessToken: 'old-access-token',
    );
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);

    expect(refreshCount, 1);

    refreshCompleter.complete('new-access-token');
    await expectLater(Future.wait([first, second]), completes);

    expect(
      capturedRequests
          .where(
            (request) =>
                request.headers['Authorization'] == 'Bearer old-access-token',
          )
          .length,
      2,
    );
    expect(
      capturedRequests
          .where(
            (request) =>
                request.headers['Authorization'] == 'Bearer new-access-token',
          )
          .length,
      2,
    );
  });

  test('delete treats empty 204 responses as success', () async {
    final client = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1/',
      httpClient: MockClient((request) async {
        return http.Response('', 204);
      }),
    );

    expect(await client.delete('demo-condo/session'), isNull);
  });

  test('non-2xx response throws ApiException with JSON details', () async {
    final client = ApiClient(
      baseUrl: 'http://localhost:3000/api/v1',
      httpClient: MockClient((request) async {
        return http.Response(
          jsonEncode({
            'code': 'AUTH_INVALID_CREDENTIALS',
            'message': 'Credenciais invalidas',
            'error': 'invalid_credentials',
          }),
          401,
        );
      }),
    );

    await expectLater(
      client.post('/demo-condo/auth/login'),
      throwsA(
        isA<ApiException>()
            .having((error) => error.statusCode, 'statusCode', 401)
            .having((error) => error.code, 'code', 'AUTH_INVALID_CREDENTIALS')
            .having(
              (error) => error.message,
              'message',
              'Credenciais invalidas',
            )
            .having((error) => error.error, 'error', 'invalid_credentials'),
      ),
    );
  });
}
