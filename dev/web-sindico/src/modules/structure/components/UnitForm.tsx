import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/services/errors';
import { getBlocks } from '@/modules/structure/services/blocks.service';
import type { Block, Unit, CreateUnitRequest, UpdateUnitRequest } from '@/modules/structure/types';

interface UnitFormProps {
  instanceKey: string;
  unit?: Unit;
  onSubmit: (data: CreateUnitRequest | UpdateUnitRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: unknown;
}

interface FormData {
  blockId: string;
  number: string;
}

export function UnitForm({ instanceKey, unit, onSubmit, onCancel, isSubmitting, error }: UnitFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      blockId: unit?.blockId || '',
      number: unit?.number || '',
    },
  });

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        const response = await getBlocks(instanceKey, { limit: 100 }); // Get all active blocks
        setBlocks(response.data.filter((block: Block) => block.status === 'active'));
      } catch (err) {
        console.error('Failed to load blocks:', err);
      } finally {
        setBlocksLoading(false);
      }
    };

    loadBlocks();
  }, [instanceKey]);

  useEffect(() => {
    if (unit) {
      reset({ blockId: unit.blockId, number: unit.number });
    }
  }, [unit, reset]);

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

      <div className="field">
        <label className="field__label">
          Bloco
        </label>
        <select
          {...register('blockId', { required: 'Bloco e obrigatorio' })}
          className="field__input"
          disabled={blocksLoading}
        >
          <option value="">Selecione um bloco</option>
          {blocks.map((block) => (
            <option key={block.id} value={block.id}>
              {block.name}
            </option>
          ))}
        </select>
        {errors.blockId ? <p className="field__error">{errors.blockId.message}</p> : null}
      </div>

      <div className="field">
        <label className="field__label">
          Numero da unidade
        </label>
        <input
          type="text"
          {...register('number', {
            required: 'Numero e obrigatorio',
            minLength: { value: 1, message: 'Numero deve ter pelo menos 1 caractere.' },
          })}
          className="field__input"
          placeholder="Ex: 101"
        />
        {errors.number ? <p className="field__error">{errors.number.message}</p> : null}
      </div>

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
          {isSubmitting ? 'Salvando...' : unit ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  );
}
