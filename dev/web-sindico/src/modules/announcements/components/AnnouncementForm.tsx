import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/services/errors';
import type {
  Announcement,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '@/modules/announcements/types';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';

interface AnnouncementFormProps {
  instanceKey: string;
  announcement?: Announcement;
  onSubmit: (data: CreateAnnouncementRequest | UpdateAnnouncementRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: unknown;
}

interface FormData {
  title: string;
  body: string;
  requireAck: boolean;
  attachmentIds: string[];
}

export function AnnouncementForm({
  instanceKey,
  announcement,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: AnnouncementFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      title: announcement?.title || '',
      body: announcement?.body || '',
      requireAck: announcement?.requireAck || false,
      attachmentIds: announcement?.attachmentIds || [],
    },
  });

  useEffect(() => {
    reset({
      title: announcement?.title || '',
      body: announcement?.body || '',
      requireAck: announcement?.requireAck || false,
      attachmentIds: announcement?.attachmentIds || [],
    });
  }, [announcement, reset]);

  const onFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {error ? (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{getErrorMessage(error as Error)}</div>
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-gray-700">Título</label>
        <input
          type="text"
          {...register('title', {
            required: 'Título é obrigatório',
            minLength: { value: 3, message: 'Título deve ter ao menos 3 caracteres' },
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Corpo</label>
        <textarea
          {...register('body', {
            required: 'Texto do comunicado é obrigatório',
            minLength: { value: 5, message: 'Corpo deve conter ao menos 5 caracteres' },
          })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.body && <p className="mt-1 text-sm text-red-600">{errors.body.message}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" {...register('requireAck')} id="requireAck" />
        <label htmlFor="requireAck" className="text-sm text-gray-700">
          Requer confirmação de leitura
        </label>
      </div>

      <div>
        <AttachmentUploader
          instanceKey={instanceKey}
          multiple
          initialAttachmentIds={announcement?.attachmentIds || []}
          onChange={(attachmentIds) => setValue('attachmentIds', attachmentIds)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando...' : announcement ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  );
}
