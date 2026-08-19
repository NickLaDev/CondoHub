import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/services/errors';
import { getBlocks } from '@/modules/structure/services/blocks.service';
import { getUnits } from '@/modules/structure/services/units.service';
import type { Block } from '@/modules/structure/types';
import type { Resident, CreateResidentRequest, UpdateResidentRequest } from '@/modules/users/types';
import type { Unit } from '@/modules/structure/types';

interface ResidentFormProps {
  instanceKey: string;
  resident?: Resident;
  onSubmit: (data: CreateResidentRequest | UpdateResidentRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: unknown;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  blockId: string;
  unitId: string;
}

export function ResidentForm({ instanceKey, resident, onSubmit, onCancel, isSubmitting, error }: ResidentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      name: resident?.name || '',
      email: resident?.email || '',
      phone: resident?.phone || '',
      blockId: resident?.unit.block.id || '',
      unitId: resident?.unitId || '',
    },
  });

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const selectedBlockId = watch('blockId');

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        const response = await getBlocks(instanceKey, { limit: 100 });
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
    const loadUnits = async () => {
      if (!selectedBlockId) {
        setUnits([]);
        return;
      }

      setUnitsLoading(true);
      try {
        const response = await getUnits(instanceKey, { blockId: selectedBlockId, limit: 100 });
        setUnits(response.data.filter((unit: Unit) => unit.status === 'active'));
        // Reset unit selection if current unit is not in the new block
        if (resident && resident.unit.block.id !== selectedBlockId) {
          setValue('unitId', '');
        }
      } catch (err) {
        console.error('Failed to load units:', err);
        setUnits([]);
      } finally {
        setUnitsLoading(false);
      }
    };

    loadUnits();
  }, [instanceKey, selectedBlockId, resident, setValue]);

  useEffect(() => {
    if (resident) {
      reset({
        name: resident.name,
        email: resident.email,
        phone: resident.phone || '',
        blockId: resident.unit.block.id,
        unitId: resident.unitId,
      });
    }
  }, [resident, reset]);

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
        <label className="block text-sm font-medium text-gray-700">
          Nome
        </label>
        <input
          type="text"
          {...register('name', {
            required: 'Nome é obrigatório',
            minLength: { value: 2, message: 'Nome deve ter pelo menos 2 caracteres' },
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Nome completo"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
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

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Telefone
        </label>
        <input
          type="text"
          {...register('phone')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="(11) 99999-9999"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Bloco
        </label>
        <select
          {...register('blockId', { required: 'Bloco é obrigatório' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          disabled={blocksLoading}
        >
          <option value="">Selecione um bloco</option>
          {blocks.map((block) => (
            <option key={block.id} value={block.id}>
              {block.name}
            </option>
          ))}
        </select>
        {errors.blockId && (
          <p className="mt-1 text-sm text-red-600">{errors.blockId.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Unidade
        </label>
        <select
          {...register('unitId', { required: 'Unidade é obrigatória' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          disabled={unitsLoading || !selectedBlockId}
        >
          <option value="">
            {unitsLoading ? 'Carregando unidades...' : 'Selecione uma unidade'}
          </option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.number}
            </option>
          ))}
        </select>
        {errors.unitId && (
          <p className="mt-1 text-sm text-red-600">{errors.unitId.message}</p>
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
          {isSubmitting ? 'Salvando...' : resident ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  );
}