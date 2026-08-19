import { useEffect, useMemo, useState } from 'react';
import { isDevMockApiEnabled } from '@/mocks';
import { uploadAttachmentInDevMode } from '@/mocks/mockApi';
import { Paperclip, Plus, X } from 'lucide-react';
import { getErrorMessage } from '@/services/errors';
import {
  completeUpload,
  presignUpload,
  uploadFileToSignedTarget,
} from '@/services/uploads.service';

export interface UploadedAttachment {
  fileName: string;
  attachmentId: string;
  url?: string;
}

interface UploadInfo {
  localId: string;
  fileName: string;
  source: 'initial' | 'upload';
  file?: File;
  progress: number;
  status: 'done' | 'uploading' | 'error';
  error?: string;
  attachmentId?: string;
}

const EMPTY_ATTACHMENT_IDS: string[] = [];

function createInitialUploads(attachmentIds: string[]): UploadInfo[] {
  return attachmentIds.map((attachmentId) => ({
    localId: `initial-${attachmentId}`,
    fileName: `Anexo ${attachmentId.slice(0, 8)}`,
    source: 'initial',
    progress: 100,
    status: 'done',
    attachmentId,
  }));
}

interface AttachmentUploaderProps {
  instanceKey: string;
  multiple?: boolean;
  initialAttachmentIds?: string[];
  onChange?: (attachmentIds: string[]) => void;
}

export function AttachmentUploader({
  instanceKey,
  multiple = true,
  initialAttachmentIds = EMPTY_ATTACHMENT_IDS,
  onChange,
}: AttachmentUploaderProps) {
  const [uploads, setUploads] = useState<UploadInfo[]>(() =>
    createInitialUploads(initialAttachmentIds),
  );

  const attachmentIds = useMemo(
    () =>
      uploads
        .filter((item) => item.status === 'done' && item.attachmentId)
        .map((item) => item.attachmentId as string),
    [uploads],
  );

  useEffect(() => {
    onChange?.(attachmentIds);
  }, [attachmentIds, onChange]);

  const startUpload = async (file: File, localId: string) => {
    setUploads((currentUploads) =>
      currentUploads.map((info) =>
        info.localId === localId ? { ...info, status: 'uploading', progress: 5 } : info,
      ),
    );

    try {
      if (isDevMockApiEnabled) {
        const uploaded = await uploadAttachmentInDevMode(instanceKey, file);

        setUploads((currentUploads) =>
          currentUploads.map((info) =>
            info.localId === localId
              ? { ...info, status: 'done', progress: 100, attachmentId: uploaded.attachmentId }
              : info,
          ),
        );
        return;
      }

      const presign = await presignUpload(instanceKey, {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      });

      await uploadFileToSignedTarget(presign, file, (progress) => {
        setUploads((currentUploads) =>
          currentUploads.map((info) =>
            info.localId === localId ? { ...info, progress } : info,
          ),
        );
      });

      await completeUpload(instanceKey, {
        attachmentId: presign.attachmentId,
        bucket: presign.bucket,
        path: presign.path,
      });

      setUploads((currentUploads) =>
        currentUploads.map((info) =>
          info.localId === localId
            ? { ...info, status: 'done', progress: 100, attachmentId: presign.attachmentId }
            : info,
        ),
      );
    } catch (error) {
      const message = getErrorMessage(error);
      setUploads((currentUploads) =>
        currentUploads.map((info) =>
          info.localId === localId
            ? { ...info, status: 'error', error: message, progress: 0 }
            : info,
        ),
      );
    }
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const nextUploads = files.map((file) => ({
      localId: `${file.name}-${Date.now()}-${Math.random()}`,
      fileName: file.name,
      source: 'upload' as const,
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploads((currentUploads) => (multiple ? [...currentUploads, ...nextUploads] : nextUploads));

    nextUploads.forEach((upload) => {
      void startUpload(upload.file, upload.localId);
    });
    event.target.value = '';
  };

  const removeUpload = (localId: string) => {
    setUploads((currentUploads) =>
      currentUploads.filter((item) => item.localId !== localId),
    );
  };

  return (
    <div className="attachment-uploader">
      <label className="attachment-uploader__trigger">
        <Plus size={16} />
        <span>Anexar arquivo{multiple ? 's' : ''}</span>
        <input
          type="file"
          className="attachment-uploader__input"
          multiple={multiple}
          onChange={handleFileSelection}
        />
      </label>

      {uploads.map((upload) => (
        <div key={upload.localId} className="attachment-uploader__item">
          <div className="attachment-uploader__item-copy">
            <div className="attachment-uploader__item-title">
              <Paperclip size={14} />
              <span>{upload.fileName}</span>
            </div>
            <p className="attachment-uploader__item-meta">
              {upload.status === 'uploading' && `Enviando ${upload.progress}%`}
              {upload.status === 'done' && 'Enviado'}
              {upload.status === 'error' && `Erro: ${upload.error}`}
            </p>
            {upload.status === 'uploading' ? (
              <div className="attachment-uploader__progress">
                <span style={{ width: `${upload.progress}%` }} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={`Remover ${upload.fileName}`}
            onClick={() => removeUpload(upload.localId)}
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {attachmentIds.length > 0 && (
        <div className="attachment-uploader__summary">
          Anexos registrados: {attachmentIds.length}
        </div>
      )}
    </div>
  );
}
