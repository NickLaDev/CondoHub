import 'package:flutter/material.dart';

import '../../core/ui/ch_scaffold.dart';

class SupportDetailPage extends StatelessWidget {
  const SupportDetailPage({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context) {
    return CHScaffold(
      title: 'Detalhe do suporte',
      body: Center(child: Text('Support Detail: $id')),
    );
  }
}
