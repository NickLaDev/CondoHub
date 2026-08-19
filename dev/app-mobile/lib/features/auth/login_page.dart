import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/routes.dart';
import '../../core/localization/app_strings.dart';
import '../../core/network/api_exception.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/ui/buttons.dart';
import '../../core/ui/text_field.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  bool _loading = false;
  bool _obscure = true;
  String? _errorMessage;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    final email = _emailCtrl.text.trim();
    final password = _passwordCtrl.text;

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final next = await ref
          .read(authStateProvider.notifier)
          .login(email: email, password: password);
      if (!mounted) return;
      if (next.requiresInstanceSelection) {
        context.go(AppRoutes.instanceSelection);
        return;
      }
      context.go(AppRoutes.home);
    } catch (error) {
      if (!mounted) return;
      final strings = AppStrings.of(context);
      final message = _friendlyLoginError(error, strings);

      setState(() => _errorMessage = message);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  String _friendlyLoginError(Object error, AppStrings strings) {
    if (error is ApiException) {
      return switch (error.code) {
        'AUTH_INVALID' ||
        'INVALID_CREDENTIALS' => strings.loginInvalidCredentials,
        'NETWORK_ERROR' => strings.loginServerUnavailable,
        _ => error.message.isEmpty ? strings.loginGenericError : error.message,
      };
    }

    return strings.loginGenericError;
  }

  void _forgotPassword() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ForgotPasswordSheet(ref: ref),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.backgroundSoftIce,
      body: Stack(
        children: [
          const Positioned.fill(child: _LoginBackground()),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
                    decoration: BoxDecoration(
                      color: scheme.surface.withValues(
                        alpha: isDark ? 0.94 : 1,
                      ),
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                        color: scheme.outline.withValues(
                          alpha: isDark ? 0.4 : 0.16,
                        ),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(
                            alpha: isDark ? 0.28 : 0.06,
                          ),
                          blurRadius: isDark ? 16 : 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: scheme.primary.withValues(
                                  alpha: isDark ? 0.28 : 0.12,
                                ),
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: scheme.primary.withValues(
                                    alpha: isDark ? 0.18 : 0.1,
                                  ),
                                  blurRadius: 18,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Transform.translate(
                                offset: const Offset(0, 2),
                                child: Image.asset(
                                  'assets/brand/logo_sem_fundo.png',
                                  semanticLabel: strings.appTitle,
                                  width: 56,
                                  height: 56,
                                  fit: BoxFit.contain,
                                  alignment: Alignment.center,
                                  errorBuilder: (context, error, stackTrace) =>
                                      Icon(
                                        Icons.apartment,
                                        color: scheme.primary,
                                        size: 40,
                                      ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(strings.appTitle, style: AppText.heading1),
                          const SizedBox(height: 6),
                          Text(
                            strings.loginSubtitle,
                            style: AppText.bodySmall.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 32),
                          AppTextField(
                            label: strings.email,
                            hint: strings.emailHint,
                            controller: _emailCtrl,
                            keyboardType: TextInputType.emailAddress,
                            semanticsLabel: strings.email,
                            prefixIcon: const Icon(
                              Icons.email_outlined,
                              size: 20,
                            ),
                            validator: (value) {
                              final currentValue = (value ?? '').trim();
                              if (currentValue.isEmpty) {
                                return strings.emailRequired;
                              }
                              if (!currentValue.contains('@')) {
                                return strings.invalidEmail;
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          AppTextField(
                            label: strings.password,
                            hint: '••••••••',
                            controller: _passwordCtrl,
                            obscureText: _obscure,
                            semanticsLabel: strings.password,
                            prefixIcon: const Icon(
                              Icons.lock_outline,
                              size: 20,
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscure
                                    ? Icons.visibility_off
                                    : Icons.visibility,
                                size: 20,
                              ),
                              onPressed: () =>
                                  setState(() => _obscure = !_obscure),
                            ),
                            validator: (value) {
                              final currentValue = value ?? '';
                              if (currentValue.isEmpty) {
                                return strings.passwordRequired;
                              }
                              if (currentValue.length < 4) {
                                return strings.shortPassword;
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: _forgotPassword,
                              child: Text(strings.forgotPassword),
                            ),
                          ),
                          if (_errorMessage != null) ...[
                            const SizedBox(height: 8),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.error.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: AppColors.error.withValues(
                                    alpha: 0.16,
                                  ),
                                ),
                              ),
                              child: Text(
                                _errorMessage!,
                                style: AppText.body.copyWith(
                                  color: AppColors.error,
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 16),
                          PrimaryButton(
                            label: strings.signIn,
                            onPressed: _login,
                            isLoading: _loading,
                          ),
                          const SizedBox(height: 16),
                          OutlineButton(
                            label: strings.haveInvite,
                            onPressed: () => context.go(AppRoutes.invite),
                            icon: Icons.card_giftcard,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginBackground extends StatelessWidget {
  const _LoginBackground();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IgnorePointer(
      child: Stack(
        fit: StackFit.expand,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: isDark
                  ? AppColors.darkShellBackgroundGradient
                  : AppColors.shellBackgroundGradient,
            ),
          ),
          Align(
            alignment: const Alignment(1.1, -0.95),
            child: FractionallySizedBox(
              widthFactor: 0.9,
              child: AspectRatio(
                aspectRatio: 1,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: isDark
                          ? [
                              AppColors.accentBlue.withValues(alpha: 0.12),
                              AppColors.primaryBlue.withValues(alpha: 0.08),
                              Colors.transparent,
                            ]
                          : [
                              AppColors.primaryBlue.withValues(alpha: 0.2),
                              const Color(0xFF18365F).withValues(alpha: 0.12),
                              Colors.transparent,
                            ],
                      stops: const [0, 0.42, 1],
                    ),
                  ),
                ),
              ),
            ),
          ),
          Align(
            alignment: const Alignment(-1.05, -0.85),
            child: FractionallySizedBox(
              widthFactor: 0.72,
              child: AspectRatio(
                aspectRatio: 1,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: isDark
                          ? [
                              Colors.white.withValues(alpha: 0.04),
                              Colors.transparent,
                            ]
                          : [
                              Colors.white.withValues(alpha: 0.3),
                              Colors.transparent,
                            ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: isDark
                    ? [
                        const Color(0xFF173150),
                        const Color(0xFF121D2D).withValues(alpha: 0.96),
                        Colors.transparent,
                      ]
                    : [
                        AppColors.primaryBlue,
                        const Color(0xFF18365F).withValues(alpha: 0.92),
                        Colors.transparent,
                      ],
                stops: const [0, 0.58, 1],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ForgotPasswordSheet extends StatefulWidget {
  const _ForgotPasswordSheet({required this.ref});

  final WidgetRef ref;

  @override
  State<_ForgotPasswordSheet> createState() => _ForgotPasswordSheetState();
}

class _ForgotPasswordSheetState extends State<_ForgotPasswordSheet> {
  final _ctrl = TextEditingController();
  bool _sent = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);

    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        24,
        24,
        24 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(strings.resetPassword, style: AppText.heading3),
          const SizedBox(height: 16),
          if (!_sent) ...[
            AppTextField(
              label: strings.registeredEmail,
              hint: strings.emailHint,
              controller: _ctrl,
              keyboardType: TextInputType.emailAddress,
              semanticsLabel: strings.registeredEmail,
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: strings.sendLink,
              onPressed: () async {
                await widget.ref
                    .read(authRepositoryProvider)
                    .requestPasswordReset(_ctrl.text);
                setState(() => _sent = true);
              },
            ),
          ] else ...[
            const Icon(Icons.check_circle, color: AppColors.success, size: 48),
            const SizedBox(height: 12),
            Text(
              strings.resetLinkSentTo(_ctrl.text),
              style: AppText.body,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: strings.close,
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ],
      ),
    );
  }
}
