import { http } from '@/services/http';

export async function getAttachmentUrl(instanceKey: string, attachmentId: string): Promise<{ url: string }> {
  const response = await http.get<{ url: string }>(
    `/api/v1/${instanceKey}/attachments/${attachmentId}/url`,
    {
      tenantKey: instanceKey,
    },
  );
  return response.data;
}
