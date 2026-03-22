import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { ConnectionWizard } from '../modules/connections/ConnectionWizard';
import { buildDeviceOptions, overlayConnectionStatuses, resolveConnectionRows } from '../modules/connections/utils';
import { cablesApi, connectionsApi, equipmentApi, upsApi } from '../services/api/client';
import { Connection, Port } from '../types/entities';
import { getApiErrorMessage } from '../utils/api-error';

export function ConnectionsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const cables = useApiQuery({ queryKey: ['cables'], queryFn: cablesApi.list });
  const connections = useApiQuery({ queryKey: ['connections'], queryFn: connectionsApi.list });
  const equipment = useApiQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });
  const ups = useApiQuery({ queryKey: ['ups'], queryFn: upsApi.list });
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Connection | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const devices = useMemo(() => buildDeviceOptions(equipment.data?.data ?? [], ups.data?.data ?? []), [equipment.data?.data, ups.data?.data]);

  const portQueries = useQueries({
    queries: devices.map((device) => ({
      queryKey: ['ports', device.type === 'ups' ? 'ups' : 'equipment', device.id],
      queryFn: () => (device.type === 'ups' ? upsApi.ports(device.id) : equipmentApi.ports(device.id))
    }))
  });

  const rawPortsMap = useMemo<Record<number, Port[]>>(
    () =>
      Object.fromEntries(
        devices.map((device, index) => [
          device.id,
          portQueries[index]?.data?.data?.map((port) => ({ ...port, equipment_id: port.equipment_id ?? device.id })) ?? []
        ])
      ) as Record<number, Port[]>,
    [devices, portQueries]
  );

  const portsMap = useMemo(
    () => overlayConnectionStatuses(rawPortsMap, connections.data?.data ?? []),
    [rawPortsMap, connections.data?.data]
  );

  const resolvedConnections = useMemo(
    () => resolveConnectionRows(connections.data?.data ?? [], cables.data?.data ?? [], devices, portsMap),
    [connections.data?.data, cables.data?.data, devices, portsMap]
  );

  const invalidateConnectionState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['connections'] }),
      queryClient.invalidateQueries({ queryKey: ['ports'] }),
      queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      queryClient.invalidateQueries({ queryKey: ['ups'] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Connection>) => connectionsApi.create(payload),
    onSuccess: async () => {
      setSubmitError(null);
      setFeedback({ type: 'success', message: t('connections.toast.created') });
      setActiveConnection(null);
      await invalidateConnectionState();
    },
    onError: (error) => {
      setSubmitError(getApiErrorMessage(error, t('connections.toast.errorCreate')));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Connection> }) => connectionsApi.update(id, payload),
    onSuccess: async () => {
      setSubmitError(null);
      setFeedback({ type: 'success', message: t('connections.toast.updated') });
      setActiveConnection(null);
      await invalidateConnectionState();
    },
    onError: (error) => {
      setSubmitError(getApiErrorMessage(error, t('connections.toast.errorUpdate')));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => connectionsApi.remove(id),
    onSuccess: async () => {
      setDeleteError(null);
      setDeleteTarget(null);
      setFeedback({ type: 'success', message: t('connections.toast.deleted') });
      if (activeConnection) {
        setActiveConnection(null);
      }
      await invalidateConnectionState();
    },
    onError: (error) => {
      setDeleteError(getApiErrorMessage(error, t('connections.toast.errorDelete')));
    }
  });

  const handleSubmit = (payload: { cable_id: number; a_port_id: number; b_port_id: number; status?: Connection['status'] }) => {
    setFeedback(null);
    setSubmitError(null);

    if (activeConnection) {
      updateMutation.mutate({ id: activeConnection.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('connections.title')} description={t('connections.description')} breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.connections') }]} />} />
      <MockBanner meta={connections.data?.meta?.usingMock ? connections.data.meta : cables.data?.meta} />

      {feedback ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {feedback.message}
        </div>
      ) : null}

      <ConnectionWizard
        cables={cables.data?.data ?? []}
        equipment={equipment.data?.data ?? []}
        upsItems={ups.data?.data ?? []}
        portsMap={portsMap}
        connections={connections.data?.data ?? []}
        mode={activeConnection ? 'edit' : 'create'}
        initialConnection={activeConnection}
        submitting={createMutation.isPending || updateMutation.isPending}
        submitError={submitError}
        onCancelEdit={() => {
          setActiveConnection(null);
          setSubmitError(null);
        }}
        onSubmit={handleSubmit}
      />

      <DataTable
        columns={[
          { key: 'id', header: t('connections.connection'), render: (row) => <Link className="font-semibold text-brand-700 hover:text-brand-800" to={`/connections/${row.id}`}>#{row.id}</Link> },
          { key: 'cable', header: t('connections.cable'), render: (row) => row.cableLabel },
          { key: 'devices', header: t('connections.devices'), render: (row) => `${row.sourceDeviceName} ↔ ${row.targetDeviceName}` },
          { key: 'a', header: t('connections.portA'), render: (row) => `${row.sourceDeviceName} · ${row.sourcePortLabel}` },
          { key: 'b', header: t('connections.portB'), render: (row) => `${row.targetDeviceName} · ${row.targetPortLabel}` },
          { key: 'status', header: t('equipment.status'), render: (row) => <StatusBadge status={row.status ?? 'active'} /> },
          {
            key: 'actions',
            header: t('equipment.actions'),
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => { setActiveConnection(row); setSubmitError(null); setFeedback(null); }}>
                  {t('connections.edit')}
                </Button>
                <Link className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100" to={`/connections/${row.id}`}>
                  {t('common.open')}
                </Link>
                <Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => { setDeleteTarget(row); setDeleteError(null); }}>
                  {t('common.delete')}
                </Button>
              </div>
            )
          }
        ]}
        data={resolvedConnections}
        getRowKey={(row) => row.id}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={t('connections.deleteTitle')}
        description={t('connections.deleteDescription', { id: deleteTarget?.id ?? '' })}
        confirmLabel={t('common.delete')}
        error={deleteError}
        loading={deleteMutation.isPending}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
