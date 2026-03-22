import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { FormField, SelectInput, TextInput } from '../../components/common/FormField';
import { Modal } from '../../components/common/Modal';
import { useI18n } from '../../i18n/provider';
import { EntityStatus } from '../../types/entities';

export interface UpsCreateFormState {
  name: string;
  status: EntityStatus;
  capacity: string;
  battery_life: string;
  patch_port_count: string;
  power_port_count: string;
}

const defaultState: UpsCreateFormState = {
  name: '',
  status: 'active',
  capacity: '',
  battery_life: '',
  patch_port_count: '3',
  power_port_count: '3'
};

function isPositiveNumber(value: string) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

export function UpsCreateModal({
  open,
  loading,
  submitError,
  onClose,
  onSubmit
}: {
  open: boolean;
  loading?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (payload: UpsCreateFormState) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<UpsCreateFormState>(defaultState);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(defaultState);
    setTouched(false);
  }, [open]);

  const errors = useMemo(() => ({
    name: form.name.trim() ? '' : t('crud.validation.required'),
    capacity: isPositiveNumber(form.capacity) ? '' : t('crud.validation.positiveNumber'),
    battery_life: isPositiveNumber(form.battery_life) ? '' : t('crud.validation.positiveNumber'),
    patch_port_count: Number(form.patch_port_count) === 3 ? '' : t('ups.form.fixedPortCount'),
    power_port_count: Number(form.power_port_count) === 3 ? '' : t('ups.form.fixedPortCount')
  }), [form, t]);

  const hasErrors = Object.values(errors).some(Boolean);

  const setField = <K extends keyof UpsCreateFormState>(field: K, value: UpsCreateFormState[K]) => {
    setTouched(true);
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Modal open={open} onClose={onClose} title={t('ups.create')}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (hasErrors) return;
          onSubmit(form);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label={t('equipment.form.name')} error={touched ? errors.name : undefined}>
            <TextInput value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder={t('ups.form.namePlaceholder')} />
          </FormField>
          <FormField label={t('equipment.form.status')}>
            <SelectInput value={form.status} onChange={(event) => setField('status', event.target.value as EntityStatus)}>
              <option value="active">{t('status.active')}</option>
              <option value="inactive">{t('status.inactive')}</option>
              <option value="maintenance">{t('status.maintenance')}</option>
              <option value="warning">{t('status.warning')}</option>
              <option value="planned">{t('status.planned')}</option>
            </SelectInput>
          </FormField>
          <FormField label={t('equipment.form.upsCapacity')} error={touched ? errors.capacity : undefined}>
            <TextInput type="number" min="1" value={form.capacity} onChange={(event) => setField('capacity', event.target.value)} placeholder="5000" />
          </FormField>
          <FormField label={t('equipment.form.upsBatteryLife')} error={touched ? errors.battery_life : undefined}>
            <TextInput type="number" min="1" value={form.battery_life} onChange={(event) => setField('battery_life', event.target.value)} placeholder="45" />
          </FormField>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-900">{t('ups.form.portsTitle')}</h4>
            <p className="mt-1 text-sm text-slate-500">{t('ups.form.portsHint')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={t('ports.patch')} error={touched ? errors.patch_port_count : undefined}>
              <TextInput type="number" min="3" max="3" step="1" value={form.patch_port_count} onChange={(event) => setField('patch_port_count', event.target.value)} />
            </FormField>
            <FormField label={t('ports.power')} error={touched ? errors.power_port_count : undefined}>
              <TextInput type="number" min="3" max="3" step="1" value={form.power_port_count} onChange={(event) => setField('power_port_count', event.target.value)} />
            </FormField>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t('ups.form.fixedPortCountHint')}
          </div>
        </div>

        {submitError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div> : null}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={loading || hasErrors}>{loading ? t('crud.saving') : t('crud.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
