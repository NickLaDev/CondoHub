import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/routes.dart';
import '../../core/localization/app_strings.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/ui/ch_scaffold.dart';
import '../../core/ui/inline_page_header.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(appSettingsProvider);
    final settingsNotifier = ref.read(appSettingsProvider.notifier);
    final profileAsync = ref.watch(profileSnapshotProvider);
    final strings = AppStrings.of(context);
    final visitSoundLabel = _soundLabel(strings, settings.visitSound);

    return CHScaffold(
      withTopBand: false,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
        children: [
          InlinePageHeader(
            title: strings.settings,
            subtitle: 'Ajuste aparência, idioma e sons do aplicativo.',
            onBack: () => context.go(AppRoutes.home),
          ),
          Text(strings.appearance, style: AppText.subtitle),
          const SizedBox(height: 8),
          _SettingsPanel(
            child: SwitchListTile.adaptive(
              value: settings.isDarkMode,
              onChanged: settingsNotifier.setDarkMode,
              title: Text(strings.darkMode),
              subtitle: Text(
                strings.darkModeDescription,
                style: AppText.bodySmall.copyWith(height: 1.35),
              ),
              secondary: Icon(
                settings.isDarkMode ? Icons.dark_mode : Icons.light_mode,
                color: AppColors.accent,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            ),
          ),
          const SizedBox(height: 18),
          Text(strings.notifications, style: AppText.subtitle),
          const SizedBox(height: 8),
          _SettingsPanel(
            child: Column(
              children: [
                SwitchListTile.adaptive(
                  value: settings.isMuted,
                  onChanged: settingsNotifier.setMuted,
                  title: Text(strings.muteNotifications),
                  subtitle: Text(
                    strings.muteNotificationsDescription,
                    style: AppText.bodySmall.copyWith(height: 1.35),
                  ),
                  secondary: Icon(
                    settings.isMuted ? Icons.volume_off : Icons.volume_up,
                    color: settings.isMuted
                        ? AppColors.textSecondary
                        : AppColors.accent,
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                ),
                const Divider(height: 1),
                ListTile(
                  enabled: !settings.isMuted,
                  leading: Icon(
                    Icons.music_note_outlined,
                    color: settings.isMuted
                        ? AppColors.textSecondary
                        : AppColors.accent,
                  ),
                  title: Text(strings.newVisit),
                  subtitle: Text(
                    settings.isMuted
                        ? strings.enableSoundFirst
                        : '${strings.currentSound(visitSoundLabel)}\n${strings.chooseVisitSound}',
                    style: AppText.bodySmall.copyWith(height: 1.4),
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: settings.isMuted
                      ? null
                      : () => _showSoundSelector(
                          context,
                          settings.visitSound,
                          settingsNotifier,
                        ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Text(strings.language, style: AppText.subtitle),
          const SizedBox(height: 8),
          _SettingsPanel(
            child: ListTile(
              leading: const Icon(Icons.translate, color: AppColors.accent),
              title: Text(strings.language),
              subtitle: Text(
                '${strings.languageDescription}\n${strings.languageName(settings.language)}',
                style: AppText.bodySmall.copyWith(height: 1.4),
              ),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => _showLanguageSelector(
                context,
                settings.language,
                settingsNotifier,
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () {
                settingsNotifier.restoreDefaultSounds();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(strings.restoredSoundsMessage)),
                );
              },
              icon: const Icon(Icons.settings_backup_restore),
              label: Text(strings.restoreDefaultSounds),
            ),
          ),
          const SizedBox(height: 18),
          Text(strings.profileAndAccess, style: AppText.subtitle),
          const SizedBox(height: 8),
          _SettingsPanel(
            child: profileAsync.when(
              data: (profile) {
                final roles = profile.roles.isEmpty
                    ? 'Perfil não informado'
                    : profile.roles.join(', ');
                final unit = profile.unitId == null
                    ? 'Unidade não vinculada'
                    : 'Unidade ${profile.unitId}';

                return Column(
                  children: [
                    ListTile(
                      leading: const Icon(
                        Icons.person_outline_rounded,
                        color: AppColors.accent,
                      ),
                      title: Text(profile.userName ?? profile.userId),
                      subtitle: Text(
                        '${profile.condoName}\n$roles',
                        style: AppText.bodySmall.copyWith(height: 1.35),
                      ),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(
                        Icons.apartment_rounded,
                        color: AppColors.accent,
                      ),
                      title: Text(unit),
                      subtitle: Text('Instância ${profile.instanceId}'),
                    ),
                  ],
                );
              },
              loading: () => const Padding(
                padding: EdgeInsets.all(18),
                child: Row(
                  children: [
                    SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    SizedBox(width: 12),
                    Text('Carregando perfil...'),
                  ],
                ),
              ),
              error: (error, _) => ListTile(
                leading: const Icon(
                  Icons.cloud_off_rounded,
                  color: AppColors.warning,
                ),
                title: const Text('Perfil indisponível'),
                subtitle: Text(
                  error.toString(),
                  style: AppText.bodySmall.copyWith(height: 1.35),
                ),
                trailing: IconButton(
                  tooltip: 'Tentar novamente',
                  icon: const Icon(Icons.refresh_rounded),
                  onPressed: () => ref.invalidate(profileSnapshotProvider),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          _SettingsPanel(
            borderColor: AppColors.error.withValues(alpha: 0.12),
            child: ListTile(
              leading: const Icon(Icons.logout_rounded, color: AppColors.error),
              title: Text(
                strings.logout,
                style: const TextStyle(
                  color: AppColors.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: Text(strings.logoutDescription),
              onTap: () => _confirmLogout(context, ref),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showSoundSelector(
    BuildContext context,
    VisitNotificationSound selected,
    AppSettingsNotifier notifier,
  ) async {
    final strings = AppStrings.of(context);
    final chosen = await showModalBottomSheet<VisitNotificationSound>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  title: Text(
                    strings.newVisit,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(strings.chooseVisitSound),
                ),
                RadioGroup<VisitNotificationSound>(
                  groupValue: selected,
                  onChanged: (value) {
                    if (value != null) Navigator.of(context).pop(value);
                  },
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (final sound in VisitNotificationSound.values)
                        RadioListTile<VisitNotificationSound>(
                          value: sound,
                          title: Text(_soundLabel(strings, sound)),
                          subtitle: Text(_soundDescription(strings, sound)),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (chosen != null) {
      notifier.setVisitSound(chosen);
    }
  }

  Future<void> _showLanguageSelector(
    BuildContext context,
    AppLanguage selected,
    AppSettingsNotifier notifier,
  ) async {
    final strings = AppStrings.of(context);
    final chosen = await showModalBottomSheet<AppLanguage>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: RadioGroup<AppLanguage>(
            groupValue: selected,
            onChanged: (value) {
              if (value != null) Navigator.of(context).pop(value);
            },
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  title: Text(
                    strings.chooseLanguage,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(strings.languageDescription),
                ),
                for (final language in AppLanguage.values)
                  RadioListTile<AppLanguage>(
                    value: language,
                    title: Text(strings.languageName(language)),
                  ),
              ],
            ),
          ),
        );
      },
    );

    if (chosen != null) {
      notifier.setLanguage(chosen);
    }
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final strings = AppStrings.of(context);
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(strings.confirmLogoutTitle),
          content: Text(strings.confirmLogoutBody),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(strings.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(strings.logout),
            ),
          ],
        );
      },
    );

    if (shouldLogout != true) return;

    await ref.read(authStateProvider.notifier).logout();
    if (!context.mounted) return;
    context.go(AppRoutes.login);
  }
}

String _soundLabel(AppStrings strings, VisitNotificationSound sound) {
  return strings.soundLabel(AppSettingsNotifier.soundToKey(sound));
}

String _soundDescription(AppStrings strings, VisitNotificationSound sound) {
  return strings.soundDescription(AppSettingsNotifier.soundToKey(sound));
}

class _SettingsPanel extends StatelessWidget {
  const _SettingsPanel({required this.child, this.borderColor});

  final Widget child;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? scheme.surface : Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color:
              borderColor ??
              scheme.outline.withValues(alpha: isDark ? 0.24 : 0.1),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.16 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }
}
