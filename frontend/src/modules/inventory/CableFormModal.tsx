import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { FormField, SelectInput, TextInput } from '../../components/common/FormField';
import { Modal } from '../../components/common/Modal';
import { useI18n } from '../../i18n/provider';
import { Cable, CableType, EntityStatus } from '../../types/entities';

type AllowedEquipmentType = Cable['equipment_type_allowed'];

interface CableFormState {
  type: CableType;
  length: string;
  status: EntityStatus;
  equipment_type_allowed: AllowedEquipmentType;
}

const compatibilityMap: Record<CableType, AllowedEquipmentType[]> = {
  patchCord: ['patchPanel', 'server'],
  powerCable: ['automaton', 'server', 'ups']
};

const defaultState: CableFormState = {
  type: 'patchCord',
  length: '',
  status: 'active',
  equipment_type_allowed: 'patchPanel'
};

function isPositiveNumber(value: string) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function toFormState(cable?: Cable | null): CableFormState {
  if (!cable) return defaultState;

  return {
    type: cable.type,
    length: String(cable.length ?? ''),
    status: cable.status,
    equipment_type_allowed: cable.equipment_type_allowed
  };
}

export function CableFormModal({
  open,
  loading,
  submitError,
  cable,
  onClose,
  onSubmit
}: {
  open: boolean;
  loading?: boolean;
  submitError?: string | null;
  cable?: Cable | null;
  onClose: () => void;
  onSubmit: (payload: CableFormState) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<CableFormState>(defaultState);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(toFormState(cable));
    setTouched(false);
  }, [cable, open]);

  const allowedEquipment = compatibilityMap[form.type];
  const equipmentLabels: Record<AllowedEquipmentType, string> = {
    patchPanel: t('equipment.type.patchPanel'),
    server: t('equipment.type.server'),
    ups: t('equipment.type.ups'),
    automaton: t('equipment.type.automaton')
  };

  useEffect(() => {
    if (!allowedEquipment.includes(form.equipment_type_allowed)) {
      setForm((current) => ({ ...current, equipment_type_allowed: allowedEquipment[0] }));
    }
  }, [allowedEquipment, form.equipment_type_allowed]);

  const errors = useMemo(() => ({
    length: !isPositiveNumber(form.length) ? t('crud.validation.positiveNumber') : '',
    equipment_type_allowed: !allowedEquipment.includes(form.equipment_type_allowed) ? t('cables.form.compatibilityMismatch') : ''
  }), [allowedEquipment, form.equipment_type_allowed, form.length, t]);

  const hasErrors = Object.values(errors).some(Boolean);

  const setField = <K extends keyof CableFormState>(field: K, value: CableFormState[K]) => {
    setTouched(true);
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Modal open={open} onClose={onClose} title={t('cables.create')}>
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
          <FormField label={t('cables.form.type')}>
            <SelectInput value={form.type} onChange={(event) => setField('type', event.target.value as CableType)}>
              <option value="patchCord">{t('cables.type.patchCord')}</option>
              <option value="powerCable">{t('cables.type.powerCable')}</option>
            </SelectInput>
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

          <FormField label={t('cables.form.length')} error={touched ? errors.length : undefined}>
            <TextInput
              type="number"
              min="1"
              value={form.length}
              onChange={(event) => setField('length', event.target.value)}
              placeholder="5"
            />
          </FormField>

          <FormField
            label={t('cables.form.compatibility')}
            hint={t(form.type === 'patchCord' ? 'cables.form.patchCompatibilityHint' : 'cables.form.powerCompatibilityHint')}
            error={touched ? errors.equipment_type_allowed : undefined}
          >
            <SelectInput
              value={form.equipment_type_allowed}
              onChange={(event) => setField('equipment_type_allowed', event.target.value as AllowedEquipmentType)}
            >
              {allowedEquipment.map((item) => (
                <option key={item} value={item}>{equipmentLabels[item]}</option>
              ))}
            </SelectInput>
          </FormField>
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
