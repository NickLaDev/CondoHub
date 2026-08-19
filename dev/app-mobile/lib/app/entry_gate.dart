import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import 'animated_entry_screen.dart';

class EntryGate extends StatefulWidget {
  const EntryGate({super.key, required this.child});

  final Widget child;

  @override
  State<EntryGate> createState() => _EntryGateState();
}

class _EntryGateState extends State<EntryGate> {
  var _isEntryVisible = true;

  @override
  Widget build(BuildContext context) {
    if (!_isEntryVisible) return widget.child;

    return Stack(
      fit: StackFit.expand,
      children: [
        widget.child,
        Positioned.fill(
          child: AbsorbPointer(
            child: AnimatedEntryScreen(
              logo: Image.asset(
                'assets/brand/logo_sem_fundo.png',
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) {
                  return const CHMarkLogo(
                    primaryColor: AppColors.primaryBlue,
                    secondaryColor: AppColors.secondaryGray,
                  );
                },
              ),
              primaryColor: AppColors.primaryBlue,
              secondaryColor: AppColors.secondaryGray,
              onFinished: () {
                if (!mounted) return;
                setState(() => _isEntryVisible = false);
              },
            ),
          ),
        ),
      ],
    );
  }
}
