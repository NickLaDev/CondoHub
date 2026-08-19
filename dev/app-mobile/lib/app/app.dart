import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/localization/app_strings.dart';
import '../core/providers/providers.dart';
import '../core/theme/app_theme.dart';
import 'entry_gate.dart';
import 'router.dart';

class CondoHubApp extends ConsumerWidget {
  const CondoHubApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final settings = ref.watch(appSettingsProvider);

    return MaterialApp.router(
      title: 'CondoHub',
      debugShowCheckedModeBanner: false,
      locale: settings.language.locale,
      supportedLocales: AppLanguage.values
          .map((language) => language.locale)
          .toList(growable: false),
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: settings.isDarkMode ? ThemeMode.dark : ThemeMode.light,
      routerConfig: router,
      builder: (context, child) {
        return EntryGate(child: child ?? const SizedBox.shrink());
      },
    );
  }
}
