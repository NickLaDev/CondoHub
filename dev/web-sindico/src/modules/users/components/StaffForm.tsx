import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/services/errors';
import type { Staff, CreateStaffRequest, UpdateStaffRequest, StaffRole } from '@/modules/users/types';

interface StaffFormProps {
  instanceKey: string;
  staff?: Staff;
  onSubmit: (data: CreateStaffRequest | UpdateStaffRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: unknown;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
}

const roleOptions = [
  { value: 'FUNC_ENTREGAS', label: 'Funcionário de Entregas' },
  { value: 'FUNC_MANUTENCAO', label: 'Funcionário de Manutenção' },
] as const;

export function StaffForm({ instanceKey, staff, onSubmit, onCancel, isSubmitting, error }: StaffFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: staff?.name || '',
      email: staff?.email || '',
      phone: staff?.phone || '',
      role: staff?.role || 'FUNC_ENTREGAS',
    },
  });

  useEffect(() => {
    if (staff) {
      reset({
        name: staff.name,
        email: staff.email,
        phone: staff.phone || '',
        role: staff.role,
      });
    }
  }, [staff, reset]);

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
          Função
        </label>
        <select
          {...register('role', { required: 'Função é obrigatória' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.role && (
          <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
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
          {isSubmitting ? 'Salvando...' : staff ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  );
}