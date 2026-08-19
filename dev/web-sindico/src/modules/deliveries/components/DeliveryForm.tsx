import { useForm } from 'react-hook-form';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';
import { getErrorMessage } from '@/services/errors';
import type { Unit } from '@/modules/structure/types';
import type { CreateDeliveryRequest } from '@/modules/deliveries/types';

interface DeliveryFormProps {
  instanceKey: string;
  units: Unit[];
  onSubmit: (data: CreateDeliveryRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: unknown;
}

interface DeliveryFormData {
  unitId: string;
  recipientName: string;
  attachmentIdEvidence: string;
}

export function DeliveryForm({
  instanceKey,
  units,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
}: DeliveryFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DeliveryFormData>({
    defaultValues: {
      unitId: '',
      recipientName: '',
      attachmentIdEvidence: '',
    },
  });

  const submit = async (data: DeliveryFormData) => {
    await onSubmit({
      unitId: data.unitId,
      recipientName: data.recipientName.trim() || undefined,
      attachmentIdEvidence: data.attachmentIdEvidence || undefined,
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
        <select
          className="field__input"
          {...register('unitId', { required: 'Selecione a unidade.' })}
        >
          <option value="">Selecionar unidade</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.block.name} - {unit.number}
            </option>
          ))}
        </select>
      </label>
      {errors.unitId ? <p className="field__error">{errors.unitId.message}</p> : null}

      <label className="field">
        <span className="field__label">Destinatario</span>
        <input
          className="field__input"
          type="text"
          placeholder="Nome do destinatario, se aplicavel"
          {...register('recipientName')}
        />
      </label>

      <AttachmentUploader
        instanceKey={instanceKey}
        multiple={false}
        onChange={(attachmentIds) => setValue('attachmentIdEvidence', attachmentIds[0] ?? '')}
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
          {isSubmitting ? 'Registrando...' : 'Registrar chegada'}
        </button>
      </div>
    </form>
  );
}
