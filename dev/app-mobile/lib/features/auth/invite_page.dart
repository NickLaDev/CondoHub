import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/routes.dart';
import '../../core/localization/app_strings.dart';
import '../../core/models/invite_acceptance.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_text.dart';
import '../../core/ui/buttons.dart';
import '../../core/ui/text_field.dart';

enum _InviteStep { token, registration }

class InvitePage extends ConsumerStatefulWidget {
  const InvitePage({super.key});

  @override
  ConsumerState<InvitePage> createState() => _InvitePageState();
}

class _InvitePageState extends ConsumerState<InvitePage> {
  final _tokenFormKey = GlobalKey<FormState>();
  final _registrationFormKey = GlobalKey<FormState>();
  final _tokenCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();

  _InviteStep _step = _InviteStep.token;
  bool _loading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _tokenCtrl.dispose();
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmPasswordCtrl.dispose();
    super.dispose();
  }

  void _goBack() {
    if (_loading) return;

    if (_step == _InviteStep.registration) {
      setState(() {
        _step = _InviteStep.token;
        _errorMessage = null;
      });
      return;
    }

    context.go(AppRoutes.login);
  }

  void _continueToRegistration() {
    final formState = _tokenFormKey.currentState;
    if (formState == null || !formState.validate()) return;

    setState(() {
      _step = _InviteStep.registration;
      _errorMessage = null;
    });
  }

  Future<void> _acceptInvite() async {
    final formState = _registrationFormKey.currentState;
    if (formState == null || !formState.validate()) return;

    final email = _emailCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      await ref
          .read(authStateProvider.notifier)
          .acceptInvite(
            InviteAcceptanceInput(
              token: _tokenCtrl.text.trim(),
              name: _nameCtrl.text.trim(),
              password: _passwordCtrl.text,
              email: email.isEmpty ? null : email,
              phone: phone.isEmpty ? null : phone,
            ),
          );

      if (!mounted) return;
      context.go(AppRoutes.home);
    } catch (error) {
      if (!mounted) return;

      final message = error is Exception
          ? error.toString().replaceFirst('Exception: ', '')
          : error.toString();

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

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.inviteTitle),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _goBack,
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Container(
              padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
              decoration: BoxDecoration(
                color: scheme.surface.withValues(alpha: isDark ? 0.94 : 1),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: scheme.outline.withValues(alpha: isDark ? 0.4 : 0.16),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.28 : 0.06),
                    blurRadius: isDark ? 16 : 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: _step == _InviteStep.token
                    ? _InviteTokenStep(
                        key: const ValueKey('invite-step-token'),
                        formKey: _tokenFormKey,
                        tokenController: _tokenCtrl,
                        strings: strings,
                        scheme: scheme,
                        errorMessage: _errorMessage,
                        onContinue: _continueToRegistration,
                      )
                    : _InviteRegistrationStep(
                        key: const ValueKey('invite-step-registration'),
                        formKey: _registrationFormKey,
                        token: _tokenCtrl.text.trim(),
                        nameController: _nameCtrl,
                        emailController: _emailCtrl,
                        phoneController: _phoneCtrl,
                        passwordController: _passwordCtrl,
                        confirmPasswordController: _confirmPasswordCtrl,
                        strings: strings,
                        scheme: scheme,
                        errorMessage: _errorMessage,
                        loading: _loading,
                        obscurePassword: _obscurePassword,
                        obscureConfirmPassword: _obscureConfirmPassword,
                        onBack: _goBack,
                        onSubmit: _acceptInvite,
                        onTogglePasswordVisibility: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                        onToggleConfirmPasswordVisibility: () {
                          setState(() {
                            _obscureConfirmPassword = !_obscureConfirmPassword;
                          });
                        },
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InviteTokenStep extends StatelessWidget {
  const _InviteTokenStep({
    super.key,
    required this.formKey,
    required this.tokenController,
    required this.strings,
    required this.scheme,
    required this.errorMessage,
    required this.onContinue,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController tokenController;
  final AppStrings strings;
  final ColorScheme scheme;
  final String? errorMessage;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.card_giftcard, size: 64, color: scheme.primary),
          const SizedBox(height: 24),
          Text(strings.inviteCodeStepTitle, style: AppText.heading2),
          const SizedBox(height: 8),
          Text(
            strings.inviteCodeStepBody,
            style: AppText.bodySmall.copyWith(color: scheme.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
          if (errorMessage != null) ...[
            const SizedBox(height: 20),
            _InviteErrorBanner(message: errorMessage!),
          ],
          const SizedBox(height: 32),
          AppTextField(
            label: strings.inviteCodeLabel,
            hint: strings.inviteCodeHint,
            controller: tokenController,
            prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20),
            validator: (value) {
              if ((value ?? '').trim().length < 4) {
                return strings.invalidInviteCode;
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: PrimaryButton(
              key: const ValueKey('invite-continue-button'),
              label: strings.continueLabel,
              onPressed: onContinue,
            ),
          ),
        ],
      ),
    );
  }
}

class _InviteRegistrationStep extends StatelessWidget {
  const _InviteRegistrationStep({
    super.key,
    required this.formKey,
    required this.token,
    required this.nameController,
    required this.emailController,
    required this.phoneController,
    required this.passwordController,
    required this.confirmPasswordController,
    required this.strings,
    required this.scheme,
    required this.errorMessage,
    required this.loading,
    required this.obscurePassword,
    required this.obscureConfirmPassword,
    required this.onBack,
    required this.onSubmit,
    required this.onTogglePasswordVisibility,
    required this.onToggleConfirmPasswordVisibility,
  });

  final GlobalKey<FormState> formKey;
  final String token;
  final TextEditingController nameController;
  final TextEditingController emailController;
  final TextEditingController phoneController;
  final TextEditingController passwordController;
  final TextEditingController confirmPasswordController;
  final AppStrings strings;
  final ColorScheme scheme;
  final String? errorMessage;
  final bool loading;
  final bool obscurePassword;
  final bool obscureConfirmPassword;
  final VoidCallback onBack;
  final VoidCallback onSubmit;
  final VoidCallback onTogglePasswordVisibility;
  final VoidCallback onToggleConfirmPasswordVisibility;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.verified_user_outlined, size: 64, color: scheme.primary),
          const SizedBox(height: 24),
          Text(
            strings.registrationStepTitle,
            style: AppText.heading2,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            strings.registrationStepBody,
            style: AppText.bodySmall.copyWith(color: scheme.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: scheme.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: scheme.primary.withValues(alpha: 0.14)),
            ),
            child: Row(
              children: [
                Icon(Icons.vpn_key_outlined, size: 18, color: scheme.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        strings.inviteSummaryLabel,
                        style: AppText.caption.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(token, style: AppText.subtitle),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (errorMessage != null) ...[
            const SizedBox(height: 20),
            _InviteErrorBanner(message: errorMessage!),
          ],
          const SizedBox(height: 24),
          AppTextField(
            label: strings.fullName,
            hint: strings.fullNameHint,
            controller: nameController,
            prefixIcon: const Icon(Icons.person_outline, size: 20),
            validator: (value) {
              if ((value ?? '').trim().isEmpty) {
                return strings.fullNameRequired;
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          AppTextField(
            label: '${strings.email} (${strings.optionalFieldSuffix})',
            hint: strings.emailHint,
            controller: emailController,
            keyboardType: TextInputType.emailAddress,
            prefixIcon: const Icon(Icons.email_outlined, size: 20),
            validator: (value) {
              final normalized = (value ?? '').trim();
              if (normalized.isEmpty) return null;
              if (!normalized.contains('@')) {
                return strings.invalidEmail;
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          AppTextField(
            label: '${strings.phone} (${strings.optionalFieldSuffix})',
            hint: '(11) 99999-9999',
            controller: phoneController,
            keyboardType: TextInputType.phone,
            prefixIcon: const Icon(Icons.phone_outlined, size: 20),
          ),
          const SizedBox(height: 16),
          AppTextField(
            label: strings.password,
            controller: passwordController,
            obscureText: obscurePassword,
            prefixIcon: const Icon(Icons.lock_outline, size: 20),
            suffixIcon: IconButton(
              onPressed: onTogglePasswordVisibility,
              icon: Icon(
                obscurePassword ? Icons.visibility_off : Icons.visibility,
                size: 20,
              ),
            ),
            validator: (value) {
              if ((value ?? '').isEmpty) return strings.passwordRequired;
              if ((value ?? '').length < 4) return strings.shortPassword;
              return null;
            },
          ),
          const SizedBox(height: 16),
          AppTextField(
            label: strings.confirmPassword,
            controller: confirmPasswordController,
            obscureText: obscureConfirmPassword,
            prefixIcon: const Icon(Icons.lock_outline, size: 20),
            suffixIcon: IconButton(
              onPressed: onToggleConfirmPasswordVisibility,
              icon: Icon(
                obscureConfirmPassword
                    ? Icons.visibility_off
                    : Icons.visibility,
                size: 20,
              ),
            ),
            validator: (value) {
              if ((value ?? '').isEmpty) {
                return strings.confirmPasswordRequired;
              }
              if (value != passwordController.text) {
                return strings.passwordMismatch;
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: PrimaryButton(
              key: const ValueKey('invite-submit-button'),
              label: strings.finishRegistration,
              onPressed: onSubmit,
              isLoading: loading,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlineButton(
              key: const ValueKey('invite-back-button'),
              label: strings.back,
              onPressed: loading ? null : onBack,
            ),
          ),
        ],
      ),
    );
  }
}

class _InviteErrorBanner extends StatelessWidget {
  const _InviteErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.error.withValues(alpha: 0.18)),
      ),
      child: Text(
        message,
        style: AppText.bodySmall.copyWith(color: scheme.error),
      ),
    );
  }
}
