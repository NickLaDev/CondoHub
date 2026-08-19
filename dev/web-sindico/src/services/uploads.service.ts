import { http } from '@/services/http';

export interface PresignRequest {
  filename: string;
  contentType: string;
  size: number;
}

export interface PresignResponse {
  attachmentId: string;
  signedUrl?: string;
  uploadUrl?: string;
  token?: string;
  bucket?: string;
  path?: string;
}

export async function presignUpload(
  instanceKey: string,
  data: PresignRequest,
): Promise<PresignResponse> {
  const res = await http.post<PresignResponse>(`/api/v1/${instanceKey}/uploads/presign`, data, {
    tenantKey: instanceKey,
  });
  return res.data;
}

export async function completeUpload(
  instanceKey: string,
  data: { attachmentId: string; bucket?: string; path?: string },
): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/uploads/complete`, data, {
    tenantKey: instanceKey,
  });
}

function resolveUploadUrl(presign: PresignResponse) {
  const candidateUrl = presign.uploadUrl ?? presign.signedUrl;

  if (!candidateUrl) {
    throw new Error('A API nÃ£o retornou uma URL de upload assinada.');
  }

  if (!presign.token || candidateUrl.includes('token=')) {
    return candidateUrl;
  }

  const separator = candidateUrl.includes('?') ? '&' : '?';
  return `${candidateUrl}${separator}token=${encodeURIComponent(presign.token)}`;
}

export async function uploadFileToSignedTarget(
  presign: PresignResponse,
  file: File,
  onProgress?: (progress: number) => void,
) {
  const targetUrl = resolveUploadUrl(presign);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', targetUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress?.(progress);
    };

    xhr.onerror = () => reject(new Error('NÃ£o foi possÃ­vel concluir o upload do arquivo.'));
    xhr.onabort = () => reject(new Error('Upload cancelado antes da conclusÃ£o.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(new Error(`Falha no upload: ${xhr.status}`));
    };

    xhr.send(file);
  });
}
