import '../network/api_exception.dart';

class InstanceSelectionOption {
  const InstanceSelectionOption({
    required this.instanceId,
    required this.instanceKey,
    required this.instanceName,
    required this.userId,
    required this.roles,
    this.unitId,
    this.unitLabel,
  });

  final String instanceId;
  final String instanceKey;
  final String instanceName;
  final String userId;
  final String? unitId;
  final String? unitLabel;
  final List<String> roles;

  factory InstanceSelectionOption.fromJson(Map<String, dynamic> data) {
    return InstanceSelectionOption(
      instanceId: _requiredString(data, 'instanceId'),
      instanceKey: _requiredString(data, 'instanceKey'),
      instanceName: _requiredString(data, 'instanceName'),
      userId: _requiredString(data, 'userId'),
      unitId: _stringValue(data['unitId']),
      unitLabel: _stringValue(data['unitLabel']),
      roles: _stringList(data['roles']),
    );
  }
}

class PendingInstanceSelection {
  const PendingInstanceSelection({
    required this.selectionToken,
    required this.options,
  });

  final String selectionToken;
  final List<InstanceSelectionOption> options;

  factory PendingInstanceSelection.fromApiResponse({
    required Map<String, dynamic> data,
  }) {
    final optionsValue = data['options'];
    if (optionsValue is! List) {
      throw ApiException(
        statusCode: 0,
        code: 'AUTH_RESPONSE_INVALID',
        message: 'Resposta de seleção sem opções válidas',
        body: data,
      );
    }

    final options = optionsValue.map((item) {
      if (item is! Map<String, dynamic>) {
        throw ApiException(
          statusCode: 0,
          code: 'AUTH_RESPONSE_INVALID',
          message: 'Resposta de seleção com opção inválida',
          body: data,
        );
      }
      return InstanceSelectionOption.fromJson(item);
    }).toList(growable: false);

    if (options.isEmpty) {
      throw ApiException(
        statusCode: 0,
        code: 'AUTH_RESPONSE_INVALID',
        message: 'Resposta de seleção sem opções disponíveis',
        body: data,
      );
    }

    return PendingInstanceSelection(
      selectionToken: _requiredString(data, 'selectionToken'),
      options: options,
    );
  }
}

String _requiredString(Map<String, dynamic> data, String key) {
  final value = _stringValue(data[key]);
  if (value != null) return value;

  throw ApiException(
    statusCode: 0,
    code: 'AUTH_RESPONSE_INVALID',
    message: 'Resposta de seleção sem $key válido',
    body: data,
  );
}

String? _stringValue(Object? value) {
  if (value is String && value.trim().isNotEmpty) {
    return value;
  }
  return null;
}

List<String> _stringList(Object? value) {
  if (value is! List) return const [];

  return value
      .whereType<String>()
      .where((item) => item.trim().isNotEmpty)
      .toList(growable: false);
}
