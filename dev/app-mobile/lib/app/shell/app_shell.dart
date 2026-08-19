import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../routes.dart';
import 'bottom_nav.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  int _indexFromLocation(String location) {
    if (location.startsWith(AppRoutes.mural)) return 1;
    if (location.startsWith(AppRoutes.tickets)) return 2;
    if (location.startsWith(AppRoutes.comm) ||
        location.startsWith(AppRoutes.channels) ||
        location.startsWith(AppRoutes.inbox)) {
      return 3;
    }
    if (location.startsWith(AppRoutes.services) ||
        location.startsWith(AppRoutes.settings) ||
        location.startsWith(AppRoutes.deliveries) ||
        location.startsWith(AppRoutes.qr) ||
        location.startsWith(AppRoutes.visitors) ||
        location.startsWith(AppRoutes.documents) ||
        location.startsWith(AppRoutes.access) ||
        location.startsWith(AppRoutes.cameras) ||
        location.startsWith(AppRoutes.packages) ||
        location.startsWith(AppRoutes.support)) {
      return 4;
    }
    return 0;
  }

  String _routeFromIndex(int index) {
    switch (index) {
      case 0:
        return AppRoutes.home;
      case 1:
        return AppRoutes.mural;
      case 2:
        return AppRoutes.tickets;
      case 3:
        return AppRoutes.comm;
      case 4:
        return AppRoutes.services;
      default:
        return AppRoutes.home;
    }
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final currentIndex = _indexFromLocation(location);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shellBackground = isDark
        ? AppColors.darkBackground
        : AppColors.background;

    return ColoredBox(
      color: shellBackground,
      child: Column(
        children: [
          Expanded(child: child),
          BottomNav(
            key: const ValueKey('bottom-nav-visible'),
            currentIndex: currentIndex,
            onTap: (index) {
              if (index == currentIndex) return;
              context.go(_routeFromIndex(index));
            },
          ),
        ],
      ),
    );
  }
}
