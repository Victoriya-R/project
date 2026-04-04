import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, PlugZap, Trash2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { FormField, SelectInput } from '../../components/common/FormField';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useI18n } from '../../i18n/provider';
import { equipmentApi } from '../../services/api/client';
import { useAuthStore } from '../../store/auth-store';
import { Equipment, SwitchCabinet } from '../../types/entities';
import { formatNumber, formatPercent } from '../../utils/format';
import { getApiErrorMessage } from '../../utils/api-error';

function RackUnit({
  item,
  unit,
  active,
  canManage,
  onSelect,
  onRemove
}: {
  item?: Equipment;
  unit: number;
  active: boolean;
  canManage: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full grid-cols-[56px_1fr_auto] items-center gap-3 rounded-xl border p-2 text-left transition ${item ? 'border-brand-100 bg-brand-50/60' : 'border-slate-200 bg-white'} ${active ? 'ring-2 ring-brand-500' : ''}`}
    >
      <div className="rounded-lg bg-slate-950 px-2 py-2 text-center text-xs font-semibold text-white">U{unit}</div>
      {item ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-slate-500">{item.model}</span>
            <StatusBadge status={item.status} />
          </div>
        </div>
      ) : (
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('cabinet.availableSlot')}</p>
      )}
      {item && canManage ? (
        <span
          className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-rose-600"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </span>
      ) : null}
    </button>
  );
}

export function RackVisualizer({ cabinet }: { cabinet: SwitchCabinet }) {
  const { t } = useI18n();
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [placementSuccess, setPlacementSuccess] = useState<string | null>(null);
  const equipmentQuery = useApiQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });
  const canManage = Boolean(role);

  const equipmentById = useMemo(() => {
    const allEquipment = equipmentQuery.data?.data ?? [];
    return new Map(allEquipment.map((item) => [item.id, item]));
  }, [equipmentQuery.data]);

  const rackEquipment = useMemo(() => {
    const fromCabinet = (cabinet.equipment ?? []).map((item) => {
      const linked = equipmentById.get(item.id);
      return {
        ...item,
        weight: item.weight ?? linked?.weight ?? 0,
        energy_consumption: item.energy_consumption ?? linked?.energy_consumption ?? 0
      };
    });

    if (fromCabinet.length) {
      return fromCabinet;
    }

    return (equipmentQuery.data?.data ?? []).filter((item) => item.switch_cabinet_id === cabinet.id);
  }, [cabinet.equipment, cabinet.id, equipmentById, equipmentQuery.data]);

  const units = Array.from({ length: 12 }).map((_, index) => ({ unit: 12 - index, equipment: rackEquipment[index] }));
  const currentWeight = rackEquipment.reduce((sum, item) => sum + Number(item.weight ?? 0), 0);
  const currentEnergy = rackEquipment.reduce((sum, item) => sum + Number(item.energy_consumption ?? 0), 0);
  const unassignedEquipment = useMemo(() => (equipmentQuery.data?.data ?? []).filter((item) => !item.switch_cabinet_id), [equipmentQuery.data]);
  const selectedEquipment = useMemo(
    () => unassignedEquipment.find((item) => item.id === Number(selectedEquipmentId)),
    [unassignedEquipment, selectedEquipmentId]
  );

  const parseStartUnit = (selectedSlot: number | null) => {
    if (!selectedSlot) return null;
    const parsed = Number(String(selectedSlot).replace(/^U/i, ''));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['cabinet-detail', String(cabinet.id)] }),
      queryClient.invalidateQueries({ queryKey: ['cabinet-list'] }),
      queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    ]);
  };

  const placeMutation = useMutation({
    mutationFn: () => {
      const startUnit = parseStartUnit(selectedUnit);
      if (!startUnit) {
        throw new Error(t('cabinet.selectSlotPrompt'));
      }
      const unitSize = Number(
        selectedEquipment?.unit_size
        ?? (selectedEquipment as Equipment & { unit?: number } | undefined)?.unit
        ?? 1
      );

      return equipmentApi.placeInCabinet(
        Number(selectedEquipmentId),
        cabinet.id,
        startUnit,
        Number.isFinite(unitSize) && unitSize > 0 ? unitSize : 1
      );
    },
    onSuccess: async () => {
      setPlacementError(null);
      setPlacementSuccess(t('cabinet.placeSuccess'));
      setSelectedEquipmentId('');
      await invalidate();
    },
    onError: (error) => {
      setPlacementSuccess(null);
      setPlacementError(getApiErrorMessage(error, t('crud.error.save')));
    }
  });

  const removeMutation = useMutation({
    mutationFn: (equipmentId: number) => equipmentApi.removeFromCabinet(equipmentId),
    onSuccess: async () => {
      setPlacementError(null);
      setPlacementSuccess(t('cabinet.removeSuccess'));
      await invalidate();
    },
    onError: (error) => {
      setPlacementSuccess(null);
      setPlacementError(getApiErrorMessage(error, t('crud.error.delete')));
    }
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="rounded-[28px] border border-slate-200 bg-slate-900 p-4 shadow-soft">
        <div className="rounded-[22px] bg-slate-800 p-4">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>{cabinet.name}</span>
            <span>{cabinet.serial_number}</span>
          </div>
          <div className="space-y-2">
            {units.map((slot) => (
              <RackUnit
                key={slot.unit}
                unit={slot.unit}
                item={slot.equipment}
                active={selectedUnit === slot.unit}
                canManage={canManage}
                onSelect={() => {
                  setSelectedUnit(slot.unit);
                  setPlacementError(null);
                  setPlacementSuccess(null);
                }}
                onRemove={() => slot.equipment && removeMutation.mutate(slot.equipment.id)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">{t('cabinet.capacityOverview')}</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-500">{t('cabinet.weightUsage')}</span><span className="font-medium text-slate-900">{formatNumber(currentWeight, ' kg')} / {formatNumber(cabinet.weight, ' kg')}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min((currentWeight / cabinet.weight) * 100, 100)}%` }} /></div>
              <p className="mt-2 text-xs text-slate-500">{t('cabinet.load', { value: formatPercent((currentWeight / cabinet.weight) * 100) })}</p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-500">{t('cabinet.energyUsage')}</span><span className="font-medium text-slate-900">{formatNumber(currentEnergy, ' W')} / {formatNumber(cabinet.energy_limit, ' W')}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${(currentEnergy / cabinet.energy_limit) > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((currentEnergy / cabinet.energy_limit) * 100, 100)}%` }} /></div>
              <p className="mt-2 text-xs text-slate-500">{t('cabinet.load', { value: formatPercent((currentEnergy / cabinet.energy_limit) * 100) })}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">{t('cabinet.placementTitle')}</h3>
          <p className="mt-2 text-sm text-slate-500">{t('cabinet.placementDescription')}</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label={t('cabinet.selectedSlot')}>
                <div className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900">{selectedUnit ? `U${selectedUnit}` : t('cabinet.selectSlotPrompt')}</div>
              </FormField>
              <FormField label={t('cabinet.availableEquipment')}>
                <SelectInput value={selectedEquipmentId} onChange={(event) => setSelectedEquipmentId(event.target.value)} disabled={!canManage}>
                  <option value="">{t('common.select')}</option>
                  {unassignedEquipment.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.model}</option>)}
                </SelectInput>
              </FormField>
            </div>
            <Button
              icon={<ArrowRight className="h-4 w-4" />}
              disabled={!canManage || !selectedUnit || !selectedEquipmentId || placeMutation.isPending}
              onClick={() => {
                setPlacementError(null);
                setPlacementSuccess(null);
                placeMutation.mutate();
              }}
            >
              {t('cabinet.placeEquipment')}
            </Button>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <PlugZap className="mt-0.5 h-4 w-4 text-brand-600" />
              <p>{t('cabinet.slotApiHint')}</p>
            </div>
          </div>
          {placementError ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{placementError}</div> : null}
          {placementSuccess ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{placementSuccess}</div> : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">{t('cabinet.warnings')}</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>{currentWeight > cabinet.weight ? t('cabinet.weightExceeded') : t('cabinet.weightWithin')}</li>
            <li>{currentEnergy > cabinet.energy_limit ? t('cabinet.energyExceeded') : t('cabinet.energyWithin')}</li>
            <li>{t('cabinet.futureReady')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
