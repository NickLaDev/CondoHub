import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/services/errors';
import type { Channel, CreateChannelRequest, UpdateChannelRequest } from '@/modules/channels/types';

interface ChannelFormProps {
  channel?: Channel;
  onSubmit: (data: CreateChannelRequest | UpdateChannelRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: unknown;
}

interface FormData {
  name: string;
  description: string;
}

export function ChannelForm({ channel, onSubmit, onCancel, isSubmitting, error }: ChannelFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: channel?.name || '',
      description: channel?.description || '',
    },
  });

  useEffect(() => {
    reset({ name: channel?.name || '', description: channel?.description || '' });
  }, [channel, reset]);

  const submit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="page-stack form-sheet">
      {error ? (
        <div className="inline-feedback inline-feedback--error">{getErrorMessage(error as Error)}</div>
      ) : null}

      <label className="field">
        <span className="field__label">Nome do canal</span>
        <input
          {...register('name', { required: 'Nome e obrigatorio' })}
          className="field__input"
          placeholder="Ex: Avisos gerais"
        />
      </label>
      {errors.name ? <p className="field__error">{errors.name.message}</p> : null}

      <label className="field">
        <span className="field__label">Descricao</span>
        <textarea
          rows={4}
          {...register('description')}
          className="field__input form-sheet__textarea"
          placeholder="Resumo rapido do objetivo deste canal"
        />
      </label>

      <div className="modal__actions form-sheet__actions">
        <button type="button" onClick={onCancel} className="button button--ghost">
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting} className="button button--primary">
          {isSubmitting ? 'Salvando...' : channel ? 'Salvar alteracoes' : 'Criar canal'}
        </button>
      </div>
    </form>
  );
}
