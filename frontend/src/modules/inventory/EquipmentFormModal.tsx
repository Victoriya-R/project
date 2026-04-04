import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { FormField, SelectInput, TextInput } from '../../components/common/FormField';
import { Modal } from '../../components/common/Modal';
import { useI18n } from '../../i18n/provider';
import { EntityStatus, Equipment, UpsEntity } from '../../types/entities';

interface EquipmentFormState {
  name: string;
  type: 'server' | 'patchPanel' | 'ups';
  model: string;
  serial: string;
  status: EntityStatus;
  weight: string;
  energy_consumption: string;
  rack_unit_size: string;
  server_ip_address: string;
  server_memory_slots: string;
  server_cpu: string;
  server_os: string;
  server_ports: string;
  server_port_type: 'patch' | 'power';
  patch_ports: string;
  patch_port_type: 'patch' | 'power';
  ups_capacity: string;
  ups_battery_life: string;
}

const defaultState: EquipmentFormState = {
  name: '',
  type: 'server',
  model: '',
  serial: '',
  status: 'active',
  weight: '',
  energy_consumption: '',
  rack_unit_size: '1',
  server_ip_address: '',
  server_memory_slots: '',
  server_cpu: '',
  server_os: '',
  server_ports: '',
  server_port_type: 'patch',
  patch_ports: '',
  patch_port_type: 'patch',
  ups_capacity: '',
  ups_battery_life: ''
};

function isPositiveNumber(value: string) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}
function isNonNegativeNumber(value: string) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function toFormState(entity?: Equipment | UpsEntity | null): EquipmentFormState {
  if (!entity) return defaultState;

  const type = 'type' in entity && entity.type ? entity.type : 'ups';
  return {
    name: entity.name ?? '',
    type,
    model: 'model' in entity ? entity.model ?? '' : 'UPS',
    serial: 'serial' in entity ? entity.serial ?? '' : '',
    status: entity.status ?? 'active',
    weight: String(('weight' in entity ? entity.weight : undefined) ?? ''),
    energy_consumption: String(('energy_consumption' in entity ? entity.energy_consumption : undefined) ?? ''),
    rack_unit_size: String((('rack_unit_size' in entity ? entity.rack_unit_size : undefined) ?? ('unit_size' in entity ? entity.unit_size : undefined)) ?? 1),
    server_ip_address: '',
    server_memory_slots: '',
    server_cpu: '',
    server_os: '',
    server_ports: '',
    server_port_type: 'patch',
    patch_ports: '',
    patch_port_type: 'patch',
    ups_capacity: 'upsData' in entity ? String(entity.upsData.capacity ?? '') : '',
    ups_battery_life: 'upsData' in entity ? String(entity.upsData.battery_life ?? '') : ''
  };
}

export function EquipmentFormModal({
  open,
  mode,
  equipment,
  loading,
  submitError,
  onClose,
  onSubmit
}: {
  open: boolean;
  mode: 'create' | 'edit';
  equipment?: Equipment | UpsEntity | null;
  loading?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (payload: EquipmentFormState) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<EquipmentFormState>(defaultState);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(equipment));
      setTouched(false);
    }
  }, [equipment, open]);

  const errors = useMemo(() => ({
    name: form.name.trim() ? '' : t('crud.validation.required'),
    model: mode === 'create' && form.type !== 'ups' && !form.model.trim() ? t('crud.validation.required') : '',
    serial: mode === 'create' && form.type !== 'ups' && !form.serial.trim() ? t('crud.validation.required') : '',
    server_ip_address: mode === 'create' && form.type === 'server' && !form.server_ip_address.trim() ? t('crud.validation.required') : '',
    server_memory_slots: mode === 'create' && form.type === 'server' && !isPositiveNumber(form.server_memory_slots) ? t('crud.validation.positiveNumber') : '',
    server_cpu: mode === 'create' && form.type === 'server' && !form.server_cpu.trim() ? t('crud.validation.required') : '',
    server_os: mode === 'create' && form.type === 'server' && !form.server_os.trim() ? t('crud.validation.required') : '',
    server_ports: mode === 'create' && form.type === 'server' && !isPositiveNumber(form.server_ports) ? t('crud.validation.positiveNumber') : '',
    patch_ports: mode === 'create' && form.type === 'patchPanel' && !isPositiveNumber(form.patch_ports) ? t('crud.validation.positiveNumber') : '',
    weight: form.weight.trim() && !isNonNegativeNumber(form.weight) ? t('crud.validation.nonNegativeNumber') : '',
    energy_consumption: form.energy_consumption.trim() && !isNonNegativeNumber(form.energy_consumption) ? t('crud.validation.nonNegativeNumber') : '',
    rack_unit_size: form.rack_unit_size.trim() && !isPositiveNumber(form.rack_unit_size) ? t('crud.validation.positiveNumber') : '',
    ups_capacity: form.type === 'ups' && !isPositiveNumber(form.ups_capacity) ? t('crud.validation.positiveNumber') : '',
    ups_battery_life: form.type === 'ups' && !isPositiveNumber(form.ups_battery_life) ? t('crud.validation.positiveNumber') : ''
  }), [form, mode, t]);

  const hasErrors = Object.values(errors).some(Boolean);
  const isReadOnlyStructure = mode === 'edit' && form.type !== 'ups';

  const setField = (field: keyof EquipmentFormState, value: string) => {
    setTouched(true);
    setForm((current) => ({ ...current, [field]: value as never }));
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === 'create' ? t('equipment.create') : t('equipment.edit')}>
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
          <FormField label={t('equipment.form.type')}>
            <SelectInput value={form.type} onChange={(e) => setField('type', e.target.value)} disabled={mode === 'edit'}>
              <option value="server">{t('equipment.type.server')}</option>
              <option value="patchPanel">{t('equipment.type.patchPanel')}</option>
              <option value="ups">{t('equipment.type.ups')}</option>
            </SelectInput>
          </FormField>
          <FormField label={t('equipment.form.status')}>
            <SelectInput value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="active">{t('status.active')}</option>
              <option value="inactive">{t('status.inactive')}</option>
              <option value="maintenance">{t('status.maintenance')}</option>
              <option value="warning">{t('status.warning')}</option>
              <option value="planned">{t('status.planned')}</option>
            </SelectInput>
          </FormField>
          <FormField label={t('equipment.form.name')} error={touched ? errors.name : undefined}>
            <TextInput value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder={t('equipment.form.namePlaceholder')} />
          </FormField>
          <FormField label={t('equipment.form.model')} error={touched ? errors.model : undefined} hint={isReadOnlyStructure ? t('equipment.form.modelReadonly') : undefined}>
            <TextInput value={form.model} onChange={(e) => setField('model', e.target.value)} placeholder={t('equipment.form.modelPlaceholder')} disabled={form.type === 'ups' || isReadOnlyStructure} />
          </FormField>
          <FormField label={t('equipment.form.serial')} error={touched ? errors.serial : undefined} hint={isReadOnlyStructure ? t('equipment.form.serialReadonly') : undefined}>
            <TextInput value={form.serial} onChange={(e) => setField('serial', e.target.value)} placeholder={t('equipment.form.serialPlaceholder')} disabled={form.type === 'ups' || isReadOnlyStructure} />
          </FormField>
          <FormField label={t('equipment.form.weight')} error={touched ? errors.weight : undefined}>
            <TextInput type="number" min="0" value={form.weight} onChange={(e) => setField('weight', e.target.value)} placeholder="18" />
          </FormField>
          <FormField label={t('equipment.form.energyConsumption')} error={touched ? errors.energy_consumption : undefined}>
            <TextInput type="number" min="0" value={form.energy_consumption} onChange={(e) => setField('energy_consumption', e.target.value)} placeholder="650" />
          </FormField>
          <FormField label={t('equipment.form.rackUnitSize')} error={touched ? errors.rack_unit_size : undefined}>
            <TextInput type="number" min="1" value={form.rack_unit_size} onChange={(e) => setField('rack_unit_size', e.target.value)} placeholder="1" />
          </FormField>
        </div>

        {form.type === 'server' ? (
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <FormField label={t('equipment.form.serverIp')} error={touched ? errors.server_ip_address : undefined}>
              <TextInput value={form.server_ip_address} onChange={(e) => setField('server_ip_address', e.target.value)} placeholder="10.0.0.15" disabled={mode === 'edit'} />
            </FormField>
            <FormField label={t('equipment.form.serverMemorySlots')} error={touched ? errors.server_memory_slots : undefined}>
              <TextInput type="number" min="1" value={form.server_memory_slots} onChange={(e) => setField('server_memory_slots', e.target.value)} placeholder="8" disabled={mode === 'edit'} />
            </FormField>
            <FormField label={t('equipment.form.serverCpu')} error={touched ? errors.server_cpu : undefined}>
              <TextInput value={form.server_cpu} onChange={(e) => setField('server_cpu', e.target.value)} placeholder="2x Xeon Gold" disabled={mode === 'edit'} />
            </FormField>
            <FormField label={t('equipment.form.serverOs')} error={touched ? errors.server_os : undefined}>
              <TextInput value={form.server_os} onChange={(e) => setField('server_os', e.target.value)} placeholder="Ubuntu 24.04 LTS" disabled={mode === 'edit'} />
            </FormField>
            <FormField label={t('equipment.form.serverPorts')} error={touched ? errors.server_ports : undefined}>
              <TextInput type="number" min="1" value={form.server_ports} onChange={(e) => setField('server_ports', e.target.value)} placeholder="4" disabled={mode === 'edit'} />
            </FormField>
            <FormField label={t('equipment.form.serverPortType')}>
              <SelectInput value={form.server_port_type} onChange={(e) => setField('server_port_type', e.target.value)} disabled={mode === 'edit'}>
                <option value="patch">Patch</option>
                <option value="power">Power</option>
              </SelectInput>
            </FormField>
          </div>
        ) : null}

        {form.type === 'patchPanel' ? (
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <FormField label={t('equipment.form.patchPorts')} error={touched ? errors.patch_ports : undefined}>
              <TextInput type="number" min="1" value={form.patch_ports} onChange={(e) => setField('patch_ports', e.target.value)} placeholder="24" disabled={mode === 'edit'} />
            </FormField>
            <FormField label={t('equipment.form.patchPortType')}>
              <SelectInput value={form.patch_port_type} onChange={(e) => setField('patch_port_type', e.target.value)} disabled={mode === 'edit'}>
                <option value="patch">Patch</option>
                <option value="power">Power</option>
              </SelectInput>
            </FormField>
          </div>
        ) : null}

        {form.type === 'ups' ? (
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <FormField label={t('equipment.form.upsCapacity')} error={touched ? errors.ups_capacity : undefined}>
              <TextInput type="number" min="1" value={form.ups_capacity} onChange={(e) => setField('ups_capacity', e.target.value)} placeholder="5000" />
            </FormField>
            <FormField label={t('equipment.form.upsBatteryLife')} error={touched ? errors.ups_battery_life : undefined}>
              <TextInput type="number" min="1" value={form.ups_battery_life} onChange={(e) => setField('ups_battery_life', e.target.value)} placeholder="45" />
            </FormField>
          </div>
        ) : null}

        {isReadOnlyStructure ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{t('equipment.editStructureHint')}</div> : null}
        {submitError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div> : null}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={loading || hasErrors}>{loading ? t('crud.saving') : t('crud.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
