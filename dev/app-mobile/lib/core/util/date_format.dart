// Lightweight pt-BR date/time formatting helpers.
//
// Kept dependency-free (no `intl` locale initialization) so they are safe to
// call anywhere, including widget tests.

String _pad2(int v) => v.toString().padLeft(2, '0');

/// `dd/MM/yyyy`
String formatDate(DateTime date) =>
    '${_pad2(date.day)}/${_pad2(date.month)}/${date.year}';

/// `dd/MM/yyyy HH:mm`
String formatDateTime(DateTime date) =>
    '${formatDate(date)} ${_pad2(date.hour)}:${_pad2(date.minute)}';

/// Formats minutes-from-midnight as `HH:mm`.
String formatMinutes(int minutesFromMidnight) {
  final clamped = minutesFromMidnight.clamp(0, 24 * 60 - 1);
  return '${_pad2(clamped ~/ 60)}:${_pad2(clamped % 60)}';
}

const _weekdayShort = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
  7: 'Dom',
};

const _weekdayLong = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
  7: 'Domingo',
};

String weekdayShort(int weekday) => _weekdayShort[weekday] ?? '';
String weekdayLong(int weekday) => _weekdayLong[weekday] ?? '';

/// Human readable summary of a set of weekdays (1=Mon … 7=Sun).
/// Collapses common cases ("Todos os dias", "Seg a Sex", "Fim de semana").
String formatWeekdays(Set<int> weekdays) {
  if (weekdays.isEmpty) return 'Nenhum dia';
  final sorted = weekdays.toList()..sort();
  if (sorted.length == 7) return 'Todos os dias';
  if (_listEquals(sorted, const [1, 2, 3, 4, 5])) return 'Seg a Sex';
  if (_listEquals(sorted, const [6, 7])) return 'Fim de semana';
  return sorted.map(weekdayShort).join(', ');
}

bool _listEquals(List<int> a, List<int> b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}
