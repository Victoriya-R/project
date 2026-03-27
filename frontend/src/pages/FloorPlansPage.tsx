import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { DataTable } from '../components/common/DataTable';
import { FormField, TextInput } from '../components/common/FormField';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { FloorPlanScene } from '../modules/floorplans/FloorPlanScene';
import { floorplansApi } from '../services/api/client';
import { FloorPlan, FloorPlanRack } from '../types/entities';
import { getApiErrorMessage } from '../utils/api-error';

const defaultRackEquipment = [
  { id: 1, name: 'Core Switch', unit: 1, type: 'switch', status: 'active' as const },
  { id: 2, name: 'Edge Router', unit: 2, type: 'router', status: 'active' as const },
  { id: 3, name: 'UPS Module', unit: 4, type: 'ups', status: 'maintenance' as const }
];

export function FloorPlansPage() {
  const queryClient = useQueryClient();
  const plansQuery = useApiQuery({ queryKey: ['floorplans'], queryFn: floorplansApi.list });
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedRackId, setSelectedRackId] = useState<number | null>(null);
  const [rack2D, setRack2D] = useState<FloorPlanRack | null>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [newRackName, setNewRackName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const plans = plansQuery.data?.data ?? [];
  const selectedPlan = useMemo(() => plans.find((item) => item.id === selectedPlanId) ?? plans[0] ?? null, [plans, selectedPlanId]);

  useEffect(() => {
    if (!selectedPlan && selectedPlanId !== null) {
      setSelectedPlanId(null);
      setRack2D(null);
      setSelectedRackId(null);
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

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['floorplans'] }),
      queryClient.invalidateQueries({ queryKey: ['floorplan-detail'] })
    ]);
  };

  const createPlan = useMutation({
    mutationFn: floorplansApi.create,
    onSuccess: async () => {
      setNewPlanName('');
      setErrorMessage(null);
      await invalidate();
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error, 'Ошибка создания плана.'))
  });

  const removePlan = useMutation({
    mutationFn: floorplansApi.remove,
    onSuccess: async () => {
      setRack2D(null);
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
      setErrorMessage(null);
      await invalidate();
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error, 'Ошибка создания стойки.'))
  });

  const saveRack = useMutation({
    mutationFn: ({ rackId, equipment }: { rackId: number; equipment: FloorPlanRack['equipment'] }) => floorplansApi.updateRack(rackId, { equipment }),
    onSuccess: async (_response, variables) => {
      const rack = await floorplansApi.rack2d(variables.rackId);
      setRack2D(rack);
      setErrorMessage(null);
      await invalidate();
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error, 'Ошибка обновления стойки.'))
  });

  const renderPlan = detailQuery.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="3D план помещения"
        description="Создание, хранение и просмотр 3D модели помещения со стойками и оборудованием."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: '3D Floor Plans' }]} />}
      />

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto] md:items-end">
        <FormField label="Новый план помещения">
          <TextInput value={newPlanName} onChange={(event) => setNewPlanName(event.target.value)} placeholder="Например: Машзал А" />
        </FormField>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => createPlan.mutate({ name: newPlanName || 'Новый план', width: 14, depth: 10, height: 3.2 })}>
          Создать план
        </Button>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'План', render: (row: FloorPlan) => <button className="font-semibold text-brand-700" onClick={() => setSelectedPlanId(row.id)}>{row.name}</button> },
          { key: 'size', header: 'Размер (Ш×Г×В)', render: (row: FloorPlan) => `${row.width} × ${row.depth} × ${row.height} м` },
          { key: 'updated', header: 'Изменён', render: (row: FloorPlan) => new Date(row.updated_at).toLocaleString('ru-RU') },
          {
            key: 'actions',
            header: 'Действия',
            render: (row: FloorPlan) => (
              <Button variant="ghost" className="px-2.5" onClick={() => removePlan.mutate(row.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )
          }
        ]}
        data={plans}
      />

      {renderPlan ? (
        <>
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto] md:items-end">
            <FormField label="Добавить стойку на план">
              <TextInput value={newRackName} onChange={(event) => setNewRackName(event.target.value)} placeholder="Rack-A1" />
            </FormField>
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => createRack.mutate({
                floorplan_id: renderPlan.id,
                name: newRackName || `Rack-${(renderPlan.racks?.length ?? 0) + 1}`,
                x: 1 + (renderPlan.racks?.length ?? 0),
                z: 1.2,
                rotation_y: 0,
                equipment: defaultRackEquipment
              })}
            >
              Добавить стойку
            </Button>
          </div>

          <FloorPlanScene
            floorPlan={renderPlan}
            selectedRackId={selectedRackId}
            onSelectRack={async (rack) => {
              setSelectedRackId(rack.id);
              const rackData = await floorplansApi.rack2d(rack.id);
              setRack2D(rackData);
            }}
          />
        </>
      ) : null}

      {rack2D ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">2D вид стойки: {rack2D.name}</h3>
            <Button
              icon={<Save className="h-4 w-4" />}
              onClick={() => saveRack.mutate({ rackId: rack2D.id, equipment: rack2D.equipment })}
            >
              Сохранить стойку
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: rack2D.unit_capacity }).map((_, index) => {
              const unit = rack2D.unit_capacity - index;
              const item = rack2D.equipment.find((equipment) => equipment.unit === unit);

              return (
                <button
                  key={unit}
                  type="button"
                  className={`rounded-lg border p-2 text-left text-xs ${item ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-slate-50'}`}
                  onClick={() => {
                    if (!item) {
                      const next = [...rack2D.equipment, {
                        id: Date.now(),
                        name: `Server U${unit}`,
                        unit,
                        type: 'server',
                        status: 'active' as const
                      }];
                      setRack2D({ ...rack2D, equipment: next });
                    }
                  }}
                >
                  <div className="font-semibold">U{unit}</div>
                  <div className="text-slate-600">{item?.name ?? 'Свободно'}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {errorMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
    </div>
  );
}
