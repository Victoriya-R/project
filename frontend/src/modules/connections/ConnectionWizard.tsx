import { useMemo, useState } from 'react';
import { Cable, Equipment, Port, UpsEntity } from '../../types/entities';
import { Button } from '../../components/common/Button';
import { FormField, SelectInput } from '../../components/common/FormField';

interface Props {
  cables: Cable[];
  equipment: Equipment[];
  upsItems: UpsEntity[];
  portsMap: Record<number, Port[]>;
}

export function ConnectionWizard({ cables, equipment, upsItems, portsMap }: Props) {
  const [cableId, setCableId] = useState<number | ''>('');
  const [sourceId, setSourceId] = useState<number | ''>('');
  const [targetId, setTargetId] = useState<number | ''>('');
  const [sourcePortId, setSourcePortId] = useState<number | ''>('');
  const [targetPortId, setTargetPortId] = useState<number | ''>('');

  const deviceOptions = useMemo(() => [...equipment.filter((item) => item.type !== 'ups'), ...upsItems.map((item) => ({ id: item.id, name: item.name, type: 'ups' as const, model: 'UPS', serial: '', status: item.status }))], [equipment, upsItems]);
  const cable = cables.find((item) => item.id === Number(cableId));
  const compatiblePortType = cable?.type === 'powerCable' ? 'power' : 'patch';

  const compatiblePorts = (deviceId: number | '') => {
    if (!deviceId) return [];
    return (portsMap[Number(deviceId)] ?? []).filter((port) => port.port_type === compatiblePortType && port.status === 'available');
  };

  const errors = [] as string[];
  if (sourceId && targetId && Number(sourceId) === Number(targetId)) errors.push('Выберите два разных устройства для соединения.');
  if (sourcePortId && targetPortId && Number(sourcePortId) === Number(targetPortId)) errors.push('Нельзя соединить порт сам с собой.');
  if (cable && !compatiblePortType) errors.push('Для выбранного кабеля не удалось определить тип совместимых портов.');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Connection creation flow</h3>
          <p className="mt-1 text-sm text-slate-500">Кабель → устройство A → порт A → устройство B → порт B. UI показывает только совместимые свободные порты.</p>
        </div>
        <Button variant="secondary">Save draft</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <FormField label="1. Cable">
          <SelectInput value={cableId} onChange={(e) => setCableId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Select cable</option>
            {cables.map((item) => <option key={item.id} value={item.id}>{item.type} · {item.length}m</option>)}
          </SelectInput>
        </FormField>
        <FormField label="2. Device A">
          <SelectInput value={sourceId} onChange={(e) => { setSourceId(e.target.value ? Number(e.target.value) : ''); setSourcePortId(''); }}>
            <option value="">Select device</option>
            {deviceOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectInput>
        </FormField>
        <FormField label="3. Port A" hint={compatiblePortType ? `Showing ${compatiblePortType} ports only` : 'Select cable first'}>
          <SelectInput value={sourcePortId} onChange={(e) => setSourcePortId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Select port</option>
            {compatiblePorts(sourceId).map((port) => <option key={port.id} value={port.id}>Port {port.port_number} · {port.status}</option>)}
          </SelectInput>
        </FormField>
        <FormField label="4. Device B">
          <SelectInput value={targetId} onChange={(e) => { setTargetId(e.target.value ? Number(e.target.value) : ''); setTargetPortId(''); }}>
            <option value="">Select device</option>
            {deviceOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectInput>
        </FormField>
        <FormField label="5. Port B">
          <SelectInput value={targetPortId} onChange={(e) => setTargetPortId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Select port</option>
            {compatiblePorts(targetId).map((port) => <option key={port.id} value={port.id}>Port {port.port_number} · {port.status}</option>)}
          </SelectInput>
        </FormField>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Validation</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{cable ? `Cable ${cable.type} selected; compatible port type: ${compatiblePortType}.` : 'Выберите кабель, чтобы отфильтровать совместимые порты.'}</li>
          <li>{sourcePortId && targetPortId ? 'Оба порта выбраны. Готово к отправке в API.' : 'Выберите оба порта для завершения сценария.'}</li>
        </ul>
        {errors.length ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      </div>
    </div>
  );
}
