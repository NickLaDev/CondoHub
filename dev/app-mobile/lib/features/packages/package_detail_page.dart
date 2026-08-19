import 'package:flutter/material.dart';

import '../../core/ui/ch_scaffold.dart';

class PackageDetailPage extends StatelessWidget {
  const PackageDetailPage({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context) {
    return CHScaffold(
      title: 'Detalhe do pacote',
      body: Center(child: Text('Package Detail: $id')),
    );
  }
}
