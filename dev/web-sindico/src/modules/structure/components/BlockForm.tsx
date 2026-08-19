import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/services/errors';
import type { Block, CreateBlockRequest, UpdateBlockRequest } from '@/modules/structure/types.ts';

interface BlockFormProps {
  block?: Block;
  onSubmit: (data: CreateBlockRequest | UpdateBlockRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: unknown;
}

interface FormData {
  name: string;
}

export function BlockForm({ block, onSubmit, onCancel, isSubmitting, error }: BlockFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: block?.name || '',
    },
  });

  useEffect(() => {
    reset({ name: block?.name || '' });
  }, [block, reset]);

  const onFormSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="page-stack form-sheet">
      {error ? (
        <div className="inline-feedback inline-feedback--error">
          {getErrorMessage(error as Error)}
        </div>
      ) : null}

      <label className="field">
        <span className="field__label">Nome</span>
        <input
          type="text"
          {...register('name', {
            required: 'Nome e obrigatorio',
            minLength: { value: 2, message: 'Nome deve ter pelo menos 2 caracteres.' },
          })}
          className="field__input"
          placeholder="Ex: Bloco A"
        />
      </label>
      {errors.name ? <p className="field__error">{errors.name.message}</p> : null}

      <div className="modal__actions form-sheet__actions">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="button button--ghost"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="button button--primary"
        >
          {isSubmitting ? 'Salvando...' : block ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  );
}
