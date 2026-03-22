import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { FormField, TextArea, TextInput } from '../../components/common/FormField';
import { Modal } from '../../components/common/Modal';
import { useI18n } from '../../i18n/provider';
import { Zone } from '../../types/entities';

interface ZoneFormState {
  name: string;
  description: string;
  address: string;
  phone: string;
  employee: string;
  site: string;
}

const emptyState: ZoneFormState = {
  name: '',
  description: '',
  address: '',
  phone: '',
  employee: '',
  site: ''
};

function toFormState(zone?: Zone | null): ZoneFormState {
  if (!zone) return emptyState;
  return {
    name: zone.name ?? '',
    description: zone.description ?? '',
    address: zone.address ?? '',
    phone: zone.phone ?? '',
    employee: zone.employee ?? '',
    site: zone.site ?? ''
  };
}

export function ZoneFormModal({
  open,
  zone,
  loading,
  submitError,
  onClose,
  onSubmit
}: {
  open: boolean;
  zone?: Zone | null;
  loading?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (payload: ZoneFormState) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<ZoneFormState>(emptyState);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(zone));
      setTouched(false);
    }
  }, [open, zone]);

  const errors = useMemo(() => ({
    name: form.name.trim() ? '' : t('crud.validation.required')
  }), [form.name, t]);

  const hasErrors = Object.values(errors).some(Boolean);

  const updateField = (field: keyof ZoneFormState, value: string) => {
    setTouched(true);
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Modal open={open} onClose={onClose} title={zone ? t('zones.edit') : t('zones.create')}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (hasErrors) return;
          onSubmit({
            name: form.name.trim(),
            description: form.description.trim(),
            address: form.address.trim(),
            phone: form.phone.trim(),
            employee: form.employee.trim(),
            site: form.site.trim()
          });
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label={t('zones.form.name')} error={touched ? errors.name : undefined}>
            <TextInput value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder={t('zones.form.namePlaceholder')} />
          </FormField>
          <FormField label={t('zones.form.site')}>
            <TextInput value={form.site} onChange={(e) => updateField('site', e.target.value)} placeholder={t('zones.form.sitePlaceholder')} />
          </FormField>
          <FormField label={t('zones.form.employee')}>
            <TextInput value={form.employee} onChange={(e) => updateField('employee', e.target.value)} placeholder={t('zones.form.employeePlaceholder')} />
          </FormField>
          <FormField label={t('zones.form.phone')}>
            <TextInput value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder={t('zones.form.phonePlaceholder')} />
          </FormField>
        </div>
        <FormField label={t('zones.form.address')}>
          <TextInput value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder={t('zones.form.addressPlaceholder')} />
        </FormField>
        <FormField label={t('zones.form.description')}>
          <TextArea rows={4} value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder={t('zones.form.descriptionPlaceholder')} />
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
