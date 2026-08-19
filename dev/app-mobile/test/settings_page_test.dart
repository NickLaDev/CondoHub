import 'package:condohub_mobile/core/providers/providers.dart';
import 'package:condohub_mobile/features/settings/settings_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Finder _findAnyText(Iterable<String> values) {
  return find.byWidgetPredicate(
    (widget) => widget is Text && values.contains(widget.data),
    description: 'Text matching any of ${values.join(', ')}',
  );
}

void main() {
  testWidgets('Settings page updates dark mode preference', (tester) async {
    final container = ProviderContainer();
    addTearDown(() {
      container.read(appSettingsProvider.notifier).setDarkMode(false);
      container.dispose();
    });

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: SettingsPage()),
      ),
    );
    await tester.pumpAndSettle();

    expect(container.read(appSettingsProvider).isDarkMode, false);
    final darkModeTileLabel = _findAnyText([
      'Modo escuro/claro',
      'Dark / light mode',
    ]);
    expect(darkModeTileLabel, findsOneWidget);

    await tester.tap(darkModeTileLabel);
    await tester.pumpAndSettle();
    expect(container.read(appSettingsProvider).isDarkMode, true);

    await tester.tap(darkModeTileLabel);
    await tester.pumpAndSettle();
    expect(container.read(appSettingsProvider).isDarkMode, false);
  });
}
