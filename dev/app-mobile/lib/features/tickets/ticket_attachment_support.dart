import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../core/models/ticket.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';

Future<TicketDraftAttachment?> showTicketAttachmentPicker(
  BuildContext context,
) async {
  final result = await FilePicker.platform.pickFiles(withData: true);
  if (result == null || result.files.isEmpty) return null;
  final file = result.files.first;
  final bytes = file.bytes;
  if (bytes == null) return null;
  final ext = (file.extension ?? '').toLowerCase();
  return TicketDraftAttachment(
    id: 'draft-${DateTime.now().microsecondsSinceEpoch}',
    fileName: file.name,
    type: _typeFromExtension(ext),
    sizeLabel: _formatSize(bytes.length),
    contentType: _contentTypeFromExtension(ext),
    bytes: bytes,
  );
}

TicketAttachmentType _typeFromExtension(String ext) {
  if ({'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'}.contains(ext)) {
    return TicketAttachmentType.imagem;
  }
  if ({'mp4', 'mov', 'avi', 'mkv', 'webm'}.contains(ext)) {
    return TicketAttachmentType.video;
  }
  return TicketAttachmentType.documento;
}

String _contentTypeFromExtension(String ext) => switch (ext) {
      'jpg' || 'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'gif' => 'image/gif',
      'webp' => 'image/webp',
      'heic' => 'image/heic',
      'mp4' => 'video/mp4',
      'mov' => 'video/quicktime',
      'pdf' => 'application/pdf',
      'doc' => 'application/msword',
      'docx' =>
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      _ => 'application/octet-stream',
    };

String _formatSize(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
  return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
}

class TicketAttachmentTile extends StatelessWidget {
  const TicketAttachmentTile({
    super.key,
    required this.fileName,
    required this.type,
    required this.subtitle,
    this.onRemove,
  });

  final String fileName;
  final TicketAttachmentType type;
  final String subtitle;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final accent = ticketAttachmentTypeColor(type);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.03)
            : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: scheme.outline.withValues(alpha: isDark ? 0.2 : 0.1),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.06)
                  : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: scheme.outline.withValues(alpha: isDark ? 0.18 : 0.08),
              ),
            ),
            child: Icon(
              ticketAttachmentTypeIcon(type),
              size: 20,
              color: accent,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fileName,
                  style: AppText.body.copyWith(
                    color: scheme.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: AppText.caption.copyWith(
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ),
          if (onRemove != null) ...[
            const SizedBox(width: 8),
            IconButton(
              onPressed: onRemove,
              icon: Icon(
                Icons.close_rounded,
                size: 18,
                color: scheme.onSurfaceVariant,
              ),
              tooltip: 'Remover anexo',
            ),
          ],
        ],
      ),
    );
  }
}

String ticketAttachmentTypeLabel(TicketAttachmentType type) => switch (type) {
      TicketAttachmentType.imagem => 'Imagem',
      TicketAttachmentType.video => 'Vídeo',
      TicketAttachmentType.documento => 'Documento',
    };

IconData ticketAttachmentTypeIcon(TicketAttachmentType type) => switch (type) {
      TicketAttachmentType.imagem => Icons.image_outlined,
      TicketAttachmentType.video => Icons.videocam_outlined,
      TicketAttachmentType.documento => Icons.description_outlined,
    };

Color ticketAttachmentTypeColor(TicketAttachmentType type) => switch (type) {
      TicketAttachmentType.imagem => AppColors.info,
      TicketAttachmentType.video => AppColors.accent,
      TicketAttachmentType.documento => AppColors.warning,
    };

String ticketAttachmentCountLabel(int count) =>
    count == 1 ? '1 anexo' : '$count anexos';
