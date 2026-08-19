import 'package:flutter/material.dart';

import '../../../core/models/visitor.dart';
import '../../../core/theme/app_colors.dart';

export '../../../core/util/date_format.dart' show formatDate;

String visitorTypeLabel(VisitorType type) => switch (type) {
      VisitorType.visitante => 'Visitante',
      VisitorType.prestador => 'Prestador de serviço',
    };

IconData visitorTypeIcon(VisitorType type) => switch (type) {
      VisitorType.visitante => Icons.person_outline_rounded,
      VisitorType.prestador => Icons.handyman_outlined,
    };

String visitorStatusLabel(VisitorStatus status) => switch (status) {
      VisitorStatus.agendado => 'Agendado',
      VisitorStatus.liberado => 'Liberado',
      VisitorStatus.expirado => 'Expirado',
    };

Color visitorStatusColor(VisitorStatus status) => switch (status) {
      VisitorStatus.agendado => AppColors.info,
      VisitorStatus.liberado => AppColors.success,
      VisitorStatus.expirado => AppColors.secondaryGray,
    };
