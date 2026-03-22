import { useEffect, useMemo, useState } from 'react';
import { Cable, Connection, Equipment, Port, UpsEntity } from '../../types/entities';
import { useI18n } from '../../i18n/provider';
import { Button } from '../../components/common/Button';
import { FormField, SelectInput } from '../../components/common/FormField';
import { buildDeviceOptions, getCompatiblePortType } from './utils';

interface SubmitPayload {
  cable_id: number;
  a_port_id: number;
  b_port_id: number;
  status: Connection['status'];
}

interface Props {
  cables: Cable[];
  equipment: Equipment[];
  upsItems: UpsEntity[];
  portsMap: Record<number, Port[]>;
  connections: Connection[];
  mode?: 'create' | 'edit';
  initialConnection?: Connection | null;
  submitting?: boolean;
  submitError?: string | null;
  onSubmit: (payload: SubmitPayload) => void;
  onCancelEdit?: () => void;
}

export function ConnectionWizard({
  cables,
  equipment,
  upsItems,
  portsMap,
  connections,
  mode = 'create',
  initialConnection,
  submitting,
  submitError,
  onSubmit,
  onCancelEdit
}: Props) {
  const { t } = useI18n();
  const [cableId, setCableId] = useState<number | ''>('');
  const [sourceId, setSourceId] = useState<number | ''>('');
  const [targetId, setTargetId] = useState<number | ''>('');
  const [sourcePortId, setSourcePortId] = useState<number | ''>('');
  const [targetPortId, setTargetPortId] = useState<number | ''>('');

  const deviceOptions = useMemo(() => buildDeviceOptions(equipment, upsItems), [equipment, upsItems]);
  const cable = cables.find((item) => item.id === Number(cableId));
  const compatiblePortType = getCompatiblePortType(cable?.type);
  const editingConnectionId = initialConnection?.id;

  useEffect(() => {
    if (!initialConnection) {
      setCableId('');
      setSourceId('');
      setTargetId('');
      setSourcePortId('');
      setTargetPortId('');
      return;
    }

    const sourcePort = Object.values(portsMap).flat().find((port) => port.id === initialConnection.a_port_id);
    const targetPort = Object.values(portsMap).flat().find((port) => port.id === initialConnection.b_port_id);

    setCableId(initialConnection.cable_id);
    setSourceId(sourcePort?.equipment_id ?? '');
    setTargetId(targetPort?.equipment_id ?? '');
    setSourcePortId(initialConnection.a_port_id);
    setTargetPortId(initialConnection.b_port_id);
  }, [initialConnection, portsMap]);

  const occupiedPortIds = useMemo(() => new Set(connections.flatMap((connection) => [connection.a_port_id, connection.b_port_id]).map(Number)), [connections]);

  const compatiblePorts = (deviceId: number | '', selectedPortId: number | '') => {
    if (!deviceId || !compatiblePortType) return [];

    return (portsMap[Number(deviceId)] ?? []).filter((port) => {
      if (port.port_type !== compatiblePortType) {
        return false;
      }

      if (selectedPortId && Number(port.id) === Number(selectedPortId)) {
        return true;
      }

      return !occupiedPortIds.has(Number(port.id)) && port.status !== 'disabled';
    });
  };

  const errors = [] as string[];
  if (sourceId && targetId && Number(sourceId) === Number(targetId)) errors.push(t('connections.error.sameDevice'));
  if (sourcePortId && targetPortId && Number(sourcePortId) === Number(targetPortId)) errors.push(t('connections.error.samePort'));
  if (cable && !compatiblePortType) errors.push(t('connections.error.cableType'));

  const canSubmit = Boolean(cableId && sourceId && targetId && sourcePortId && targetPortId && errors.length === 0);

  const handleSubmit = () => {
    if (!canSubmit) return;

    onSubmit({
      cable_id: Number(cableId),
      a_port_id: Number(sourcePortId),
      b_port_id: Number(targetPortId),
      status: initialConnection?.status ?? 'active'
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {mode === 'edit' ? t('connections.editTitle') : t('connections.wizardTitle')}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'edit' ? t('connections.editDesc') : t('connections.wizardDesc')}
          </p>
        </div>
        <div className="flex gap-3">
          {mode === 'edit' && onCancelEdit ? (
            <Button variant="secondary" onClick={onCancelEdit} disabled={submitting}>
              {t('common.cancel')}
            </Button>
          ) : null}
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? t('crud.saving') : mode === 'edit' ? t('connections.update') : t('connections.connect')}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <FormField label={t('connections.step.cable')}>
          <SelectInput
            value={cableId}
            onChange={(e) => {
              setCableId(e.target.value ? Number(e.target.value) : '');
              setSourcePortId('');
              setTargetPortId('');
            }}
          >
            <option value="">{t('connections.selectCable')}</option>
            {cables.map((item) => (
              <option key={item.id} value={item.id}>
                {t(`cables.type.${item.type}` as const)} · {item.length}m
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label={t('connections.step.deviceA')}>
          <SelectInput
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value ? Number(e.target.value) : '');
              setSourcePortId('');
            }}
          >
            <option value="">{t('connections.selectDevice')}</option>
            {deviceOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label={t('connections.step.portA')} hint={compatiblePortType ? t('connections.portHint', { type: compatiblePortType }) : t('connections.selectCableHint')}>
          <SelectInput value={sourcePortId} onChange={(e) => setSourcePortId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{t('connections.selectPort')}</option>
            {compatiblePorts(sourceId, sourcePortId).map((port) => (
              <option key={port.id} value={port.id}>
                {t('ports.port', { number: port.port_number })} · {t(`ports.${port.status}` as const)}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label={t('connections.step.deviceB')}>
          <SelectInput
            value={targetId}
            onChange={(e) => {
              setTargetId(e.target.value ? Number(e.target.value) : '');
              setTargetPortId('');
            }}
          >
            <option value="">{t('connections.selectDevice')}</option>
            {deviceOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label={t('connections.step.portB')}>
          <SelectInput value={targetPortId} onChange={(e) => setTargetPortId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{t('connections.selectPort')}</option>
            {compatiblePorts(targetId, targetPortId).map((port) => (
              <option key={port.id} value={port.id}>
                {t('ports.port', { number: port.port_number })} · {t(`ports.${port.status}` as const)}
              </option>
            ))}
          </SelectInput>
        </FormField>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-900">{t('connections.validation')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{cable ? t('connections.validationCable', { type: t(`cables.type.${cable.type}` as const), portType: compatiblePortType ?? '—' }) : t('connections.validationChooseCable')}</li>
          <li>{sourcePortId && targetPortId ? t('connections.validationReady') : t('connections.validationNeedPorts')}</li>
          {editingConnectionId ? <li>{t('connections.validationEditing', { id: editingConnectionId })}</li> : null}
        </ul>
        {errors.length ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
        {submitError ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{submitError}</div> : null}
      </div>
    </div>
  );
}
