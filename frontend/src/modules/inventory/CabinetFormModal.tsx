import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { FormField, SelectInput, TextArea, TextInput } from '../../components/common/FormField';
import { Modal } from '../../components/common/Modal';
import { useI18n } from '../../i18n/provider';
import { SwitchCabinet, Zone } from '../../types/entities';

interface CabinetFormState {
  name: string;
  serial_number: string;
  weight: string;
  energy_consumption: string;
  energy_limit: string;
  employee: string;
  zone_id: string;
  description: string;
}

const emptyState: CabinetFormState = {
  name: '',
  serial_number: '',
  weight: '',
  energy_consumption: '0',
  energy_limit: '',
  employee: '',
  zone_id: '',
  description: ''
};

function toFormState(cabinet?: SwitchCabinet | null): CabinetFormState {
  if (!cabinet) return emptyState;
  return {
    name: cabinet.name ?? '',
    serial_number: cabinet.serial_number ?? '',
    weight: String(cabinet.weight ?? ''),
    energy_consumption: String(cabinet.energy_consumption ?? 0),
    energy_limit: String(cabinet.energy_limit ?? ''),
    employee: cabinet.employee ?? '',
    zone_id: cabinet.zone_id ? String(cabinet.zone_id) : '',
    description: cabinet.description ?? ''
  };
}

function isPositiveNumber(value: string) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function isNonNegativeNumber(value: string) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

export function CabinetFormModal({
  open,
  cabinet,
  zones,
  loading,
  submitError,
  onClose,
  onSubmit
}: {
  open: boolean;
  cabinet?: SwitchCabinet | null;
  zones: Zone[];
  loading?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    serial_number: string;
    weight: number;
    energy_consumption: number;
    energy_limit: number;
    employee?: string;
    zone_id?: number | null;
    description?: string;
  }) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<CabinetFormState>(emptyState);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(cabinet));
      setTouched(false);
    }
  }, [cabinet, open]);

  const errors = useMemo(() => ({
    name: form.name.trim() ? '' : t('crud.validation.required'),
    serial_number: form.serial_number.trim() ? '' : t('crud.validation.required'),
    weight: isPositiveNumber(form.weight) ? '' : t('crud.validation.positiveNumber'),
    energy_consumption: isNonNegativeNumber(form.energy_consumption) ? '' : t('crud.validation.nonNegativeNumber'),
    energy_limit: isPositiveNumber(form.energy_limit) ? '' : t('crud.validation.positiveNumber')
  }), [form, t]);

  const hasErrors = Object.values(errors).some(Boolean);

  const updateField = (field: keyof CabinetFormState, value: string) => {
    setTouched(true);
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Modal open={open} onClose={onClose} title={cabinet ? t('cabinet.edit') : t('cabinet.create')}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (hasErrors) return;
          onSubmit({
            name: form.name.trim(),
            serial_number: form.serial_number.trim(),
            weight: Number(form.weight),
            energy_consumption: Number(form.energy_consumption),
            energy_limit: Number(form.energy_limit),
            employee: form.employee.trim() || undefined,
            zone_id: form.zone_id ? Number(form.zone_id) : null,
            description: form.description.trim() || undefined
          });
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label={t('cabinet.form.name')} error={touched ? errors.name : undefined}>
            <TextInput value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder={t('cabinet.form.namePlaceholder')} />
          </FormField>
          <FormField label={t('cabinet.form.serial')} error={touched ? errors.serial_number : undefined}>
            <TextInput value={form.serial_number} onChange={(e) => updateField('serial_number', e.target.value)} placeholder={t('cabinet.form.serialPlaceholder')} />
          </FormField>
          <FormField label={t('cabinet.form.weight')} error={touched ? errors.weight : undefined}>
            <TextInput type="number" min="1" value={form.weight} onChange={(e) => updateField('weight', e.target.value)} placeholder="600" />
          </FormField>
          <FormField label={t('cabinet.form.energyCurrent')} error={touched ? errors.energy_consumption : undefined}>
            <TextInput type="number" min="0" value={form.energy_consumption} onChange={(e) => updateField('energy_consumption', e.target.value)} placeholder="0" />
          </FormField>
          <FormField label={t('cabinet.form.energyLimit')} error={touched ? errors.energy_limit : undefined}>
            <TextInput type="number" min="1" value={form.energy_limit} onChange={(e) => updateField('energy_limit', e.target.value)} placeholder="5000" />
          </FormField>
          <FormField label={t('cabinet.form.zone')}>
            <SelectInput value={form.zone_id} onChange={(e) => updateField('zone_id', e.target.value)}>
              <option value="">{t('common.unassigned')}</option>
              {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </SelectInput>
          </FormField>
          <FormField label={t('cabinet.form.employee')}>
            <TextInput value={form.employee} onChange={(e) => updateField('employee', e.target.value)} placeholder={t('cabinet.form.employeePlaceholder')} />
          </FormField>
        </div>
        <FormField label={t('cabinet.form.description')}>
          <TextArea rows={4} value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder={t('cabinet.form.descriptionPlaceholder')} />
        </FormField>
        {submitError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div> : null}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={loading || hasErrors}>{loading ? t('crud.saving') : t('crud.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
