import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { FormField, SelectInput, TextInput } from '../components/common/FormField';
import { LoadingState } from '../components/common/LoadingState';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { FloorPlanScene } from '../modules/floorplans/FloorPlanScene';
import { floorplansApi, switchCabinetsApi, zonesApi } from '../services/api/client';
import { FloorPlan, FloorPlanRack, SwitchCabinet } from '../types/entities';
import { getApiErrorMessage } from '../utils/api-error';

type PlanFormState = {
  zone_id: string;
  name: string;
  width: string;
  depth: string;
  panel_size_x: string;
  panel_size_y: string;
  background_image_url: string;
};

const defaultPlanForm: PlanFormState = {
  zone_id: '',
  name: '',
  width: '12',
  depth: '8',
  panel_size_x: '0.6',
  panel_size_y: '0.6',
  background_image_url: ''
};

export function FloorPlansPage() {
  const queryClient = useQueryClient();
  const plansQuery = useApiQuery({ queryKey: ['floorplans'], queryFn: floorplansApi.list });
  const zonesQuery = useApiQuery({ queryKey: ['zone-list'], queryFn: zonesApi.list });
  const cabinetsQuery = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });


  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FloorPlan | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(defaultPlanForm);
  const [newRackCabinetId, setNewRackCabinetId] = useState('');
  const [planDraft, setPlanDraft] = useState<FloorPlan | null>(null);
  const saveTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const zones = zonesQuery.data?.data ?? [];
  const cabinets = cabinetsQuery.data?.data ?? [];
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedRackId, setSelectedRackId] = useState<number | null>(null);
  const [selectedRackUnit, setSelectedRackUnit] = useState<number | null>(null);
  const [newRackName, setNewRackName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rackFormError, setRackFormError] = useState<string | null>(null);

  const plans = plansQuery.data?.data ?? [];
  const selectedPlan = useMemo(() => plans.find((item) => item.id === selectedPlanId) ?? plans[0] ?? null, [plans, selectedPlanId]);

  useEffect(() => {
    if (!selectedPlan && selectedPlanId !== null) {
      setSelectedPlanId(null);
 
      setSelectedRackId(null);
      setSelectedRackUnit(null);
      return;
    }

    if (selectedPlan && selectedPlan.id !== selectedPlanId) {
      setSelectedPlanId(selectedPlan.id);
    }
  }, [selectedPlan, selectedPlanId]);

  const detailQuery = useApiQuery({
    queryKey: ['floorplan-detail', String(selectedPlan?.id ?? '')],
    queryFn: () => floorplansApi.detail3d(selectedPlan?.id ?? 0),
    enabled: Boolean(selectedPlan?.id)
  });


  useEffect(() => {
    if (detailQuery.data?.data) {
      setPlanDraft(detailQuery.data.data);
    }
  }, [detailQuery.data]);

  useEffect(() => {
    if (newRackCabinetId) {
      setRackFormError(null);
    }
  }, [newRackCabinetId]);

  useEffect(() => {
    setSelectedRackUnit(null);
  }, [selectedRackId]);


  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['floorplans'] }),
      queryClient.invalidateQueries({ queryKey: ['floorplan-detail'] })
    ]);
  };

  const createPlan = useMutation({
    mutationFn: floorplansApi.create,
    onSuccess: async () => {

      setPlanForm(defaultPlanForm);
      setPlanFormOpen(false);
      setErrorMessage(null);
      await invalidate();
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error, 'Ошибка создания плана.'))
  });

  const updatePlan = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<FloorPlan> }) => floorplansApi.update(id, payload),
    onSuccess: async () => {
      setPlanForm(defaultPlanForm);
      setEditingPlan(null);
      setPlanFormOpen(false);
      setErrorMessage(null);
      await invalidate();
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error, 'Ошибка обновления плана.'))
  });

  const removePlan = useMutation({
    mutationFn: floorplansApi.remove,
    onSuccess: async () => {
      setSelectedRackId(null);
      setErrorMessage(null);
      await invalidate();
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error, 'Ошибка удаления плана.'))
  });

  const createRack = useMutation({
    mutationFn: floorplansApi.createRack,
    onSuccess: async () => {
      setNewRackName('');

      setNewRackCabinetId('');
      setRackFormError(null);
      setErrorMessage(null);
      await invalidate();
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error, 'Ошибка создания стойки.'))
  });

  const updateRack = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<FloorPlanRack> }) => floorplansApi.updateRack(id, payload),
    onError: (error) => setErrorMessage(getApiErrorMessage(error, 'Ошибка обновления стойки.'))
  });

  const selectedPlanDraft = planDraft;
  const selectedRack = selectedPlanDraft?.racks?.find((rack) => rack.id === selectedRackId) ?? null;
  const isRackLinkSelected = Boolean(newRackCabinetId);
  const usedCabinetIds = useMemo(
    () => new Set((selectedPlanDraft?.racks ?? []).map((rack) => rack.switch_cabinet_id).filter((id): id is number => Number.isFinite(id ?? NaN))),
    [selectedPlanDraft?.racks]
  );

  const cabinetsForPlanZone = useMemo(() => {
    if (!selectedPlanDraft?.zone_id) {
      return [];
    }

    return cabinets.filter((cabinet) => Number(cabinet.zone_id) === Number(selectedPlanDraft.zone_id));
  }, [cabinets, selectedPlanDraft?.zone_id]);

  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm(defaultPlanForm);
    setPlanFormOpen(true);
  };

  const openEditPlan = (plan: FloorPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      zone_id: String(plan.zone_id),
      name: plan.name,
      width: String(plan.width),
      depth: String(plan.depth),
      panel_size_x: String(plan.panel_size_x),
      panel_size_y: String(plan.panel_size_y),
      background_image_url: plan.background_image_url ?? ''
    });
    setPlanFormOpen(true);
  };

  const upsertPlan = () => {
    const payload: Partial<FloorPlan> = {
      zone_id: Number(planForm.zone_id),
      name: planForm.name,
      width: Number(planForm.width),
      depth: Number(planForm.depth),
      panel_size_x: Number(planForm.panel_size_x),
      panel_size_y: Number(planForm.panel_size_y),
      background_image_url: planForm.background_image_url || null,
      grid_enabled: true,
      axis_x_label: 'X',
      axis_y_label: 'Y'
    };

    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, payload });
      return;
    }

    createPlan.mutate(payload);
  };

  const commitRackPosition = ({ rackId, x, z }: { rackId: number; x: number; z: number }) => {
    if (!planDraft) {
      return;
    }

    setPlanDraft({
      ...planDraft,
      racks: (planDraft.racks ?? []).map((rack) => (rack.id === rackId ? { ...rack, x, z } : rack))
    });

    if (saveTimersRef.current[rackId]) {
      clearTimeout(saveTimersRef.current[rackId]);
    }

    saveTimersRef.current[rackId] = setTimeout(() => {
      updateRack.mutate({ id: rackId, payload: { x, z } });
    }, 220);
  };

  const addRackToPlan = () => {
    if (!selectedPlanDraft) {
      return;
    }

    if (!newRackCabinetId) {
      setRackFormError('Выберите существующую стойку');
      return;
    }

    const selectedCabinetId = Number(newRackCabinetId);
    if (usedCabinetIds.has(selectedCabinetId)) {
      setRackFormError('Эта стойка уже добавлена на план. Выберите другую стойку.');
      return;
    }

    setRackFormError(null);
    createRack.mutate({
      floorplan_id: selectedPlanDraft.id,
      switch_cabinet_id: selectedCabinetId,
      name: newRackName || `Rittal-${(selectedPlanDraft.racks?.length ?? 0) + 1}`,
      x: 0,
      z: 0,
      width: 0.6,
      depth: 1,
      height: 2.2,
      unit_capacity: 42,
      equipment: []
    });
  };

  const rackSlots = useMemo(() => {
    if (!selectedRack) {
      return [];
    }

    const totalUnits = Math.max(1, selectedRack.unit_capacity);
    const occupiedByUnit = new Map<number, FloorPlanRack['equipment'][number]>();
    let fallbackCursor = totalUnits;

    selectedRack.equipment.forEach((equipment) => {
      const consumedUnits = Math.max(1, Number(equipment.unit) || 1);
      const hasExplicitStart = Number.isFinite(Number(equipment.startUnit));
      const startUnit = hasExplicitStart
        ? Math.max(1, Math.min(totalUnits, Number(equipment.startUnit)))
        : fallbackCursor;

      for (let offset = 0; offset < consumedUnits; offset += 1) {
        const unit = startUnit - offset;
        if (unit < 1 || unit > totalUnits || occupiedByUnit.has(unit)) {
          continue;
        }
        occupiedByUnit.set(unit, equipment);
      }

      if (!hasExplicitStart) {
        fallbackCursor = Math.max(1, fallbackCursor - consumedUnits);
      }
    });

    return Array.from({ length: totalUnits }).map((_, index) => {
      const unit = totalUnits - index;
      return { unit, equipment: occupiedByUnit.get(unit) ?? null };
    });
  }, [selectedRack]);

  if (plansQuery.isLoading || zonesQuery.isLoading || cabinetsQuery.isLoading) {
    return <LoadingState label="Загружаем планы помещений..." />;
  }

  if (plansQuery.error) {
    return <ErrorState title="Не удалось загрузить планы помещений" description={getApiErrorMessage(plansQuery.error, 'Не удалось загрузить планы')} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader

        title="План помещения"
        description="Основной режим редактирования — 2D. 3D режим используется для визуального контроля размещения стоек."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Floor Plan' }]} />}
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={openCreatePlan}>Создать план</Button>}
      />

      <DataTable
        columns={[
          { key: 'name', header: 'План', render: (row: FloorPlan) => <button className="font-semibold text-brand-700" onClick={() => setSelectedPlanId(row.id)}>{row.name}</button> },
          { key: 'zone', header: 'Зона', render: (row: FloorPlan) => row.zone_name ?? `#${row.zone_id}` },
          { key: 'size', header: 'Размер (Ш×Г)', render: (row: FloorPlan) => `${row.width} × ${row.depth} м` },
          { key: 'grid', header: 'Сетка', render: (row: FloorPlan) => `${row.grid_cells_x} × ${row.grid_cells_y} панелей` },
          {
            key: 'actions',
            header: 'Действия',
            render: (row: FloorPlan) => (

              <div className="flex items-center gap-2">
                <Button variant="ghost" className="px-2.5" onClick={() => openEditPlan(row)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" className="px-2.5" onClick={() => removePlan.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>

            )
          }
        ]}
        data={plans}
      />


      {!selectedPlanDraft ? (
        <EmptyState
          title="План помещения не выбран"
          description="Создайте план для существующей зоны. Для каждой зоны допустим только один план помещения."
          action={<Button icon={<Plus className="h-4 w-4" />} onClick={openCreatePlan}>Создать план</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto] md:items-end">
            <FormField label="Имя стойки на плане">
              <TextInput value={newRackName} onChange={(event) => setNewRackName(event.target.value)} placeholder="Rittal A-01" />
            </FormField>
            <FormField label="Связать с существующей стойкой">
              <SelectInput value={newRackCabinetId} onChange={(event) => setNewRackCabinetId(event.target.value)}>
                <option value="" disabled>Без связи</option>
                {cabinetsForPlanZone.map((cabinet: SwitchCabinet) => (
                  <option key={cabinet.id} value={cabinet.id} disabled={usedCabinetIds.has(cabinet.id)}>
                    {cabinet.name} · {cabinet.serial_number}{usedCabinetIds.has(cabinet.id) ? ' (уже на плане)' : ''}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <Button
              icon={<Plus className="h-4 w-4" />}
              disabled={!isRackLinkSelected}
              onClick={addRackToPlan}
            >
              Добавить стойку
            </Button>
          </div>
          {rackFormError ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{rackFormError}</div> : null}

          <FloorPlanScene

            floorPlan={selectedPlanDraft}
            selectedRackId={selectedRackId}
            mode={mode}
            onModeChange={setMode}
            onSelectRack={(rack) => setSelectedRackId(rack.id)}
            onRackPositionCommit={commitRackPosition}
          />

          {selectedRack ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Слоты стойки: {selectedRack.name}</h3>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">Режим просмотра</span>
              </div>
              <p className="mb-3 text-sm text-slate-500">Размещение оборудования по слотам доступно только для чтения: данные берутся из привязанной реальной стойки.</p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {rackSlots.map(({ unit, equipment: item }) => {
                  return (
                    <button
                      key={unit}
                      type="button"
                      className={`rounded-lg border p-2 text-left text-xs transition ${selectedRackUnit === unit ? 'ring-2 ring-cyan-300' : ''} ${item ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-slate-50'}`}
                      onClick={() => {
                        setSelectedRackUnit(unit);
                      }}
                    >
                      <div className="font-semibold">U{unit}</div>
                      <div className="text-slate-600">{item?.name ?? 'Свободно'}</div>
                    </button>
                  );
                })}
              </div>
              {selectedRackUnit ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  {(() => {
                    const selectedUnitEquipment = rackSlots.find((slot) => slot.unit === selectedRackUnit)?.equipment;
                    if (!selectedUnitEquipment) {
                      return (
                        <div>
                          <p className="font-semibold text-slate-900">U{selectedRackUnit}: Свободно</p>
                          <p className="text-slate-600">Слот пуст. Автоматическое создание фиктивного сервера отключено.</p>
                        </div>
                      );
                    }

                    return (
                      <div>
                        <p className="font-semibold text-slate-900">U{selectedRackUnit}: {selectedUnitEquipment.name}</p>
                        <p className="text-slate-600">Реальный объект из данных стойки (id: {selectedUnitEquipment.id}).</p>
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <Modal open={planFormOpen} title={editingPlan ? 'Редактировать план' : 'Создать план'} onClose={() => setPlanFormOpen(false)}>
        <div className="grid gap-3">
          <FormField label="Зона">
            <SelectInput value={planForm.zone_id} onChange={(event) => setPlanForm((current) => ({ ...current, zone_id: event.target.value }))}>
              <option value="">Выберите зону</option>
              {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </SelectInput>
          </FormField>
          <FormField label="Название плана">
            <TextInput value={planForm.name} onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ширина (м)">
              <TextInput type="number" value={planForm.width} onChange={(event) => setPlanForm((current) => ({ ...current, width: event.target.value }))} />
            </FormField>
            <FormField label="Глубина (м)">
              <TextInput type="number" value={planForm.depth} onChange={(event) => setPlanForm((current) => ({ ...current, depth: event.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Панель X (м)">
              <TextInput type="number" step="0.1" value={planForm.panel_size_x} onChange={(event) => setPlanForm((current) => ({ ...current, panel_size_x: event.target.value }))} />
            </FormField>
            <FormField label="Панель Y (м)">
              <TextInput type="number" step="0.1" value={planForm.panel_size_y} onChange={(event) => setPlanForm((current) => ({ ...current, panel_size_y: event.target.value }))} />
            </FormField>
          </div>
          <FormField label="Background image URL">
            <TextInput value={planForm.background_image_url} onChange={(event) => setPlanForm((current) => ({ ...current, background_image_url: event.target.value }))} />
          </FormField>
          <Button onClick={upsertPlan}>{editingPlan ? 'Сохранить изменения' : 'Создать план'}</Button>
        </div>
      </Modal>
      {errorMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
    </div>
  );
}
