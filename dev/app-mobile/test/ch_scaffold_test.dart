import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:condohub_mobile/core/ui/ch_scaffold.dart';
import 'package:condohub_mobile/core/ui/ch_top_band.dart';

void main() {
  group('CHScaffold variants', () {
    testWidgets('compact variant shows CHTopBand', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: CHScaffold(body: Text('body content'))),
      );
      expect(find.byType(CHTopBand), findsOneWidget);
      expect(find.text('body content'), findsOneWidget);
    });

    testWidgets('home variant shows homeHeaderContent', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: CHScaffold(
            headerVariant: CHHeaderVariant.home,
            homeHeaderContent: Text('Welcome Home'),
            body: Text('home body'),
          ),
        ),
      );
      expect(find.text('Welcome Home'), findsOneWidget);
      expect(find.text('home body'), findsOneWidget);
    });

    testWidgets('fullNavy variant renders with gradient background', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: CHScaffold(
            headerVariant: CHHeaderVariant.fullNavy,
            title: 'QR Test',
            homeHeaderContent: const Text('Condo Name'),
            body: const Text('qr content'),
          ),
        ),
      );
      expect(find.byType(CHTopBand), findsOneWidget);
      expect(find.text('Condo Name'), findsOneWidget);
      expect(find.text('qr content'), findsOneWidget);
    });
  });

  group('CHHeaderVariant enum', () {
    test('has 3 values: compact, home, fullNavy', () {
      expect(CHHeaderVariant.values.length, 3);
      expect(CHHeaderVariant.values, contains(CHHeaderVariant.compact));
      expect(CHHeaderVariant.values, contains(CHHeaderVariant.home));
      expect(CHHeaderVariant.values, contains(CHHeaderVariant.fullNavy));
    });
  });
}
