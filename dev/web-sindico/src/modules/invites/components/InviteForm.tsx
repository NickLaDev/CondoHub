import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/services/errors';
import { getBlocks } from '@/modules/structure/services/blocks.service';
import { getUnits } from '@/modules/structure/services/units.service';
import type { Block } from '@/modules/structure/types';
import type { Unit } from '@/modules/structure/types';
import type { InviteType, CreateInviteRequest } from '@/modules/invites/types';

interface InviteFormProps {
  instanceKey: string;
  onSubmit: (data: CreateInviteRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: unknown;
}

interface FormData {
  type: InviteType;
  email: string;
  unitId: string;
  expiresInDays: number;
}

const inviteTypeOptions = [
  { value: 'MORADOR', label: 'Morador' },
  { value: 'SINDICO_ADMIN', label: 'Síndico Administrador' },
  { value: 'FUNC_ENTREGAS', label: 'Funcionário de Entregas' },
  { value: 'FUNC_MANUTENCAO', label: 'Funcionário de Manutenção' },
] as const;

export function InviteForm({ instanceKey, onSubmit, onCancel, isSubmitting, error }: InviteFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      type: 'MORADOR',
      email: '',
      unitId: '',
      expiresInDays: 7,
    },
  });

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const selectedType = watch('type');
  const selectedBlockId = watch('unitId') ? units.find(u => u.id === watch('unitId'))?.blockId : '';

  useEffect(() => {
    const loadData = async () => {
      try {
        const [blocksResponse, unitsResponse] = await Promise.all([
          getBlocks(instanceKey, { limit: 100 }),
          getUnits(instanceKey, { limit: 1000 })
        ]);

        setBlocks(blocksResponse.data.filter((block: Block) => block.status === 'active'));
        setUnits(unitsResponse.data.filter((unit: Unit) => unit.status === 'active'));
      } catch (err) {
        console.error('Failed to load blocks and units:', err);
      } finally {
        setBlocksLoading(false);
      }
    };

    loadData();
  }, [instanceKey]);

  useEffect(() => {
    if (selectedType !== 'MORADOR') {
      setValue('unitId', '');
    }
  }, [selectedType, setValue]);

  const onFormSubmit = async (data: FormData) => {
    const submitData: CreateInviteRequest = {
      type: data.type,
      email: data.email,
      expiresInDays: data.expiresInDays,
    };

    if (data.type === 'MORADOR') {
      submitData.unitId = data.unitId;
    }

    await onSubmit(submitData);
  };

  const isMoradorType = selectedType === 'MORADOR';

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {error ? (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{getErrorMessage(error as Error)}</div>
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Tipo de Convite
        </label>
        <select
          {...register('type', { required: 'Tipo é obrigatório' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {inviteTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          {...register('email', {
            required: 'Email é obrigatório',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Email inválido',
            },
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="email@exemplo.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {isMoradorType && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Unidade
          </label>
          <select
            {...register('unitId', {
              required: isMoradorType ? 'Unidade é obrigatória para convites de morador' : false
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            disabled={blocksLoading}
          >
            <option value="">
              {blocksLoading ? 'Carregando unidades...' : 'Selecione uma unidade'}
            </option>
            {units.map((unit) => {
              const block = blocks.find(b => b.id === unit.blockId);
              return (
                <option key={unit.id} value={unit.id}>
                  {block?.name || 'Bloco'} - {unit.number}
                </option>
              );
            })}
          </select>
          {errors.unitId && (
            <p className="mt-1 text-sm text-red-600">{errors.unitId.message}</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Expira em (dias)
        </label>
        <input
          type="number"
          min="1"
          max="30"
          {...register('expiresInDays', {
            required: 'Prazo de expiração é obrigatório',
            min: { value: 1, message: 'Mínimo 1 dia' },
            max: { value: 30, message: 'Máximo 30 dias' },
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="7"
        />
        {errors.expiresInDays && (
          <p className="mt-1 text-sm text-red-600">{errors.expiresInDays.message}</p>
        )}
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
          {isSubmitting ? 'Enviando...' : 'Enviar Convite'}
        </button>
      </div>
    </form>
  );
}