import { Paperclip } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getAttachmentUrl } from '@/services/attachments.service';

const EMPTY_ATTACHMENT_IDS: string[] = [];

interface AttachmentLinksProps {
  instanceKey: string;
  attachmentIds?: string[];
}

export function AttachmentLinks({
  instanceKey,
  attachmentIds = EMPTY_ATTACHMENT_IDS,
}: AttachmentLinksProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [failedIds, setFailedIds] = useState<string[]>([]);

  const attachmentKey = useMemo(
    () => attachmentIds.slice().sort().join('|'),
    [attachmentIds],
  );
  const sortedAttachmentIds = useMemo(
    () => (attachmentKey ? attachmentKey.split('|') : []),
    [attachmentKey],
  );

  useEffect(() => {
    let isMounted = true;

    if (!sortedAttachmentIds.length) {
      return undefined;
    }

    void Promise.allSettled(
      sortedAttachmentIds.map(async (attachmentId) => ({
        attachmentId,
        payload: await getAttachmentUrl(instanceKey, attachmentId),
      })),
    ).then((results) => {
      if (!isMounted) {
        return;
      }

      const nextUrls: Record<string, string> = {};
      const nextFailedIds: string[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          nextUrls[result.value.attachmentId] = result.value.payload.url;
          return;
        }

        const failedId =
          sortedAttachmentIds[results.indexOf(result)] ?? `attachment-${results.indexOf(result)}`;
        nextFailedIds.push(failedId);
      });

      setUrls(nextUrls);
      setFailedIds(nextFailedIds);
    });

    return () => {
      isMounted = false;
    };
  }, [instanceKey, sortedAttachmentIds]);

  if (!attachmentIds.length) {
    return null;
  }

  return (
    <div className="attachment-links">
      {attachmentIds.map((attachmentId) => {
        const url = urls[attachmentId];
        const hasFailed = failedIds.includes(attachmentId);

        if (hasFailed) {
          return (
            <span key={attachmentId} className="attachment-links__item attachment-links__item--muted">
              <Paperclip size={14} />
              <span>{attachmentId}</span>
            </span>
          );
        }

        if (!url) {
          return (
            <span key={attachmentId} className="attachment-links__item attachment-links__item--muted">
              <Paperclip size={14} />
              <span>Preparando {attachmentId}</span>
            </span>
          );
        }

        return (
          <a
            key={attachmentId}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="attachment-links__item"
          >
            <Paperclip size={14} />
            <span>{attachmentId}</span>
          </a>
        );
      })}
    </div>
  );
}
