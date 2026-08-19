import 'package:flutter/material.dart';

import '../../../core/models/authorized_person.dart';

String authorizedTypeLabel(AuthorizedType type) => switch (type) {
      AuthorizedType.diarista => 'Diarista',
      AuthorizedType.baba => 'Babá',
      AuthorizedType.cuidador => 'Cuidador(a)',
      AuthorizedType.professor => 'Professor(a)',
      AuthorizedType.prestador => 'Prestador de serviço',
      AuthorizedType.outro => 'Outro',
    };

IconData authorizedTypeIcon(AuthorizedType type) => switch (type) {
      AuthorizedType.diarista => Icons.cleaning_services_outlined,
      AuthorizedType.baba => Icons.child_care_outlined,
      AuthorizedType.cuidador => Icons.volunteer_activism_outlined,
      AuthorizedType.professor => Icons.school_outlined,
      AuthorizedType.prestador => Icons.handyman_outlined,
      AuthorizedType.outro => Icons.badge_outlined,
    };
