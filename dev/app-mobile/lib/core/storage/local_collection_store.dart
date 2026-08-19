import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Generic SharedPreferences-backed JSON list store.
///
/// Used by the offline-first repositories (visitors, documents, authorized
/// access) while the backend endpoints are not available yet. Each store is
/// scoped per tenant so different condominiums never share local data.
///
/// When the backend ships these resources, the matching `Remote*Repository`
/// can replace the `Local*Repository` in `providers.dart` without touching the
/// UI layer.
class LocalCollectionStore {
  LocalCollectionStore({
    required SharedPreferences preferences,
    required String namespace,
    required String tenant,
  })  : _prefs = preferences,
        _key = 'local_store.$namespace.${tenant.isEmpty ? 'default' : tenant}';

  final SharedPreferences _prefs;
  final String _key;

  bool get hasValue => _prefs.containsKey(_key);

  List<Map<String, dynamic>> readAll() {
    final raw = _prefs.getString(_key);
    if (raw == null || raw.trim().isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return const [];
      return decoded
          .whereType<Map<String, dynamic>>()
          .toList(growable: false);
    } catch (_) {
      return const [];
    }
  }

  Future<void> writeAll(List<Map<String, dynamic>> items) async {
    await _prefs.setString(_key, jsonEncode(items));
  }
}
