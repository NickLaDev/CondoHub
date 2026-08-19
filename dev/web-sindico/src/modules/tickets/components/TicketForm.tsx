import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';
import { getErrorMessage } from '@/services/errors';
import type { Unit } from '@/modules/structure/types';
import type { CreateTicketRequest } from '@/modules/tickets/types';

interface TicketFormProps {
  instanceKey: string;
  units: Unit[];
  onSubmit: (data: CreateTicketRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: unknown;
}

interface TicketFormData {
  unitId: string;
  category: string;
  location: string;
  description: string;
  attachmentIds: string[];
}

function getUnitLabel(unit: Unit) {
  return `${unit.block.name} - ${unit.number}`;
}

export function TicketForm({
  instanceKey,
  units,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
}: TicketFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TicketFormData>({
    defaultValues: {
      unitId: '',
      category: '',
      location: '',
      description: '',
      attachmentIds: [],
    },
  });

  useEffect(() => {
    reset({
      unitId: '',
      category: '',
      location: '',
      description: '',
      attachmentIds: [],
    });
  }, [reset]);

  const submit = async (data: TicketFormData) => {
    await onSubmit({
      unitId: data.unitId || undefined,
      category: data.category.trim() || undefined,
      location: data.location.trim() || undefined,
      description: data.description.trim(),
      attachmentIds: data.attachmentIds,
    });
  };

  return (
    <form className="page-stack" onSubmit={handleSubmit(submit)}>
      {error ? (
        <div className="inline-feedback inline-feedback--error">
          {getErrorMessage(error)}
        </div>
      ) : null}

      <label className="field">
        <span className="field__label">Unidade</span>
        <select className="field__input" {...register('unitId')}>
          <option value="">Selecionar unidade</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {getUnitLabel(unit)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">Categoria</span>
        <input
          className="field__input"
          type="text"
          placeholder="Ex.: Manutencao, limpeza, seguranca"
          {...register('category')}
        />
      </label>

      <label className="field">
        <span className="field__label">Local</span>
        <input
          className="field__input"
          type="text"
          placeholder="Ex.: Bloco A, garagem, hall"
          {...register('location')}
        />
      </label>

      <label className="field">
        <span className="field__label">Descricao</span>
        <textarea
          className="field__input"
          rows={5}
          placeholder="Descreva o chamado com o maximo de contexto util."
          {...register('description', {
            required: 'Descricao obrigatoria',
            minLength: {
              value: 5,
              message: 'A descricao deve ter ao menos 5 caracteres.',
            },
          })}
        />
      </label>
      {errors.description ? (
        <p className="field__error">{errors.description.message}</p>
      ) : null}

      <AttachmentUploader
        instanceKey={instanceKey}
        multiple
        onChange={(attachmentIds) => setValue('attachmentIds', attachmentIds)}
      />

      <div className="modal__actions">
        <button
          type="button"
          className="button button--ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="button button--primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : 'Criar ticket'}
        </button>
      </div>
    </form>
  );
}
