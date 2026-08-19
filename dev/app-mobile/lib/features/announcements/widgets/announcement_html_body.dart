import 'package:flutter/material.dart';

import '../../../core/theme/app_text.dart';

class AnnouncementHtmlBody extends StatelessWidget {
  const AnnouncementHtmlBody({
    super.key,
    required this.html,
    required this.color,
  });

  final String html;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SelectableText(
      _toPlainText(html),
      style: AppText.body.copyWith(color: color, height: 1.65),
    );
  }

  static String _toPlainText(String rawHtml) {
    return rawHtml
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</p\s*>', caseSensitive: false), '\n\n')
        .replaceAll(RegExp(r'<p[^>]*>', caseSensitive: false), '')
        .replaceAll(RegExp(r'<li[^>]*>', caseSensitive: false), '* ')
        .replaceAll(RegExp(r'</li\s*>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</ul\s*>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'<[^>]+>', caseSensitive: false), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .trim();
  }
}
