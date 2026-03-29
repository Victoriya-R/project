import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { FilterBar } from '../components/common/FilterBar';
import { FormField, SelectInput, TextArea, TextInput } from '../components/common/FormField';
import { LoadingState } from '../components/common/LoadingState';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { accessManagementApi, incidentsApi } from '../services/api/client';
import { Incident, IncidentPriority, IncidentStatus, ManagedUser } from '../types/entities';
import { getApiErrorMessage } from '../utils/api-error';
import { cn } from '../utils/cn';

const priorityBadgeMap: Record<IncidentPriority, string> = {
  low: 'bg-slate-100 text-slate-700 ring-slate-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  high: 'bg-orange-50 text-orange-700 ring-orange-200',
  critical: 'bg-rose-50 text-rose-700 ring-rose-200'
};

const statusBadgeMap: Record<IncidentStatus, string> = {
  open: 'bg-blue-50 text-blue-700 ring-blue-200',
  in_progress: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closed: 'bg-slate-100 text-slate-700 ring-slate-200'
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const PriorityBadge = ({ priority }: { priority: IncidentPriority }) => (
  <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', priorityBadgeMap[priority])}>{priority}</span>
);

const IncidentStatusBadge = ({ status }: { status: IncidentStatus }) => (
  <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', statusBadgeMap[status])}>{status}</span>
);

const toNumberOrUndefined = (value: string): number | undefined => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

export function IncidentsPage() {
  const queryClient = useQueryClient();
  const [priority, setPriority] = useState<'' | IncidentPriority>('');
  const [status, setStatus] = useState<'' | IncidentStatus>('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [alertId, setAlertId] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [resolutionCommentDraft, setResolutionCommentDraft] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filters = useMemo(() => {
    const next: {
      priority?: IncidentPriority;
      status?: IncidentStatus;
      assignee_user_id?: number;
      alert_id?: number;
    } = {};

    const assigneeIdAsNumber = toNumberOrUndefined(assigneeUserId);
    const alertIdAsNumber = toNumberOrUndefined(alertId);

    if (priority) next.priority = priority;
    if (status) next.status = status;
    if (assigneeIdAsNumber !== undefined) next.assignee_user_id = assigneeIdAsNumber;
    if (alertIdAsNumber !== undefined) next.alert_id = alertIdAsNumber;

    return next;
  }, [alertId, assigneeUserId, priority, status]);

  const incidentsQuery = useApiQuery({
    queryKey: ['incidents', filters],
    queryFn: () => incidentsApi.list(filters)
  });

  const usersQuery = useQuery({
    queryKey: ['managed-users'],
    queryFn: () => accessManagementApi.list()
  });

  const incidentDetailsQuery = useQuery({
    queryKey: ['incident-detail', String(selectedIncident?.id ?? '')],
    queryFn: () => incidentsApi.getById(selectedIncident?.id ?? 0),
    enabled: Boolean(selectedIncident?.id)
  });

  const refreshIncidents = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['incidents'] }),
      queryClient.invalidateQueries({ queryKey: ['incident-detail'] })
    ]);
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: IncidentStatus }) => incidentsApi.updateStatus(id, nextStatus),
    onSuccess: async (updatedIncident) => {
      setFeedback({ type: 'success', message: `Статус инцидента #${updatedIncident.id} обновлён.` });
      if (selectedIncident?.id === updatedIncident.id) {
        setSelectedIncident(updatedIncident);
      }
      await refreshIncidents();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Не удалось обновить статус инцидента.') });
    }
  });

  const updateIncidentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { assignee_user_id?: number | null; resolution_comment?: string | null } }) => incidentsApi.update(id, payload),
    onSuccess: async (updatedIncident) => {
      setFeedback({ type: 'success', message: `Инцидент #${updatedIncident.id} обновлён.` });
      if (selectedIncident?.id === updatedIncident.id) {
        setSelectedIncident(updatedIncident);
      }
      await refreshIncidents();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Не удалось обновить инцидент.') });
    }
  });

  const incidents = incidentsQuery.data?.data ?? [];
  const users = usersQuery.data ?? [];

  const getAssigneeLabel = (incident: Pick<Incident, 'assignee_user_id'>) => {
    if (!incident.assignee_user_id) {
      return '—';
    }

    const matchedUser = users.find((user) => user.id === incident.assignee_user_id);
    return matchedUser ? `${matchedUser.username} (#${matchedUser.id})` : String(incident.assignee_user_id);
  };

  const handleOpenDetails = (incident: Incident) => {
    setFeedback(null);
    setSelectedIncident(incident);
    setResolutionCommentDraft(incident.resolution_comment ?? '');
  };

  const handleSaveDetails = () => {
    if (!selectedIncident) {
      return;
    }

    const normalizedComment = resolutionCommentDraft.trim();
    const payload: { assignee_user_id?: number | null; resolution_comment?: string | null } = {
      resolution_comment: normalizedComment.length > 0 ? normalizedComment : null,
      assignee_user_id: selectedIncident.assignee_user_id ?? null
    };

    setFeedback(null);
    updateIncidentMutation.mutate({ id: selectedIncident.id, payload });
  };

  const renderActions = (incident: Incident) => {
    const disableActions = updateStatusMutation.isPending || updateIncidentMutation.isPending;

    return (
      <div className="flex flex-wrap gap-2">
        {incident.status !== 'in_progress' && incident.status !== 'closed' ? (
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-xs"
            disabled={disableActions}
            onClick={() => {
              setFeedback(null);
              updateStatusMutation.mutate({ id: incident.id, nextStatus: 'in_progress' });
            }}
          >
            В работу
          </Button>
        ) : null}

        {incident.status !== 'resolved' && incident.status !== 'closed' ? (
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-xs"
            disabled={disableActions}
            onClick={() => {
              setFeedback(null);
              updateStatusMutation.mutate({ id: incident.id, nextStatus: 'resolved' });
            }}
          >
            Resolve
          </Button>
        ) : null}

        {incident.status !== 'closed' ? (
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-xs"
            disabled={disableActions}
            onClick={() => {
              setFeedback(null);
              updateStatusMutation.mutate({ id: incident.id, nextStatus: 'closed' });
            }}
          >
            Close
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Инциденты"
        description="Список инцидентов с фильтрами, деталями и базовыми действиями"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Инциденты' }]} />}
      />

      {feedback ? (
        <div className={cn('rounded-2xl border px-4 py-3 text-sm', feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>
          {feedback.message}
        </div>
      ) : null}

      <FilterBar>
        <FormField label="Priority">
          <SelectInput value={priority} onChange={(event) => setPriority(event.target.value as '' | IncidentPriority)}>
            <option value="">Все</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </SelectInput>
        </FormField>

        <FormField label="Status">
          <SelectInput value={status} onChange={(event) => setStatus(event.target.value as '' | IncidentStatus)}>
            <option value="">Все</option>
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="resolved">resolved</option>
            <option value="closed">closed</option>
          </SelectInput>
        </FormField>

        <FormField label="Assignee">
          <SelectInput value={assigneeUserId} onChange={(event) => setAssigneeUserId(event.target.value)}>
            <option value="">Все</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.username} (#{user.id})</option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="Alert ID">
          <TextInput
            inputMode="numeric"
            placeholder="Например, 25"
            value={alertId}
            onChange={(event) => setAlertId(event.target.value)}
          />
        </FormField>
      </FilterBar>

      {incidentsQuery.isLoading ? <LoadingState label="Загружаем инциденты..." /> : null}

      {incidentsQuery.isError ? <ErrorState title="Не удалось загрузить инциденты" description={getApiErrorMessage(incidentsQuery.error, 'Проверьте доступность API incidents и попробуйте снова.')} /> : null}

      {!incidentsQuery.isLoading && !incidentsQuery.isError && incidents.length === 0 ? (
        <EmptyState title="Инциденты не найдены" description="Сейчас нет инцидентов по выбранным фильтрам." />
      ) : null}

      {!incidentsQuery.isLoading && !incidentsQuery.isError && incidents.length > 0 ? (
        <DataTable
          data={incidents}
          getRowKey={(row) => row.id}
          columns={[
            { key: 'priority', header: 'Priority', render: (row) => <PriorityBadge priority={row.priority} /> },
            {
              key: 'title',
              header: 'Title',
              render: (row) => (
                <button
                  type="button"
                  className="text-left font-semibold text-brand-700 hover:text-brand-800"
                  onClick={() => handleOpenDetails(row)}
                >
                  {row.title}
                </button>
              )
            },
            { key: 'status', header: 'Status', render: (row) => <IncidentStatusBadge status={row.status} /> },
            { key: 'assignee_user_id', header: 'Assignee', render: (row) => getAssigneeLabel(row) },
            { key: 'alert_id', header: 'Alert ID', render: (row) => row.alert_id ?? '—' },
            { key: 'created_at', header: 'Создан', render: (row) => formatDate(row.created_at) },
            { key: 'updated_at', header: 'Обновлён', render: (row) => formatDate(row.updated_at) },
            { key: 'resolved_at', header: 'Resolved', render: (row) => formatDate(row.resolved_at) },
            { key: 'actions', header: 'Действия', render: renderActions }
          ]}
        />
      ) : null}

      <Modal open={Boolean(selectedIncident)} title={`Инцидент #${selectedIncident?.id ?? ''}`} onClose={() => setSelectedIncident(null)}>
        {incidentDetailsQuery.isLoading ? <LoadingState label="Загружаем детали инцидента..." /> : null}

        {incidentDetailsQuery.isError ? (
          <ErrorState title="Не удалось загрузить детали инцидента" description={getApiErrorMessage(incidentDetailsQuery.error, 'Попробуйте открыть инцидент повторно.')} />
        ) : null}

        {!incidentDetailsQuery.isLoading && !incidentDetailsQuery.isError && incidentDetailsQuery.data ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">title</p>
              <p className="font-medium text-slate-900">{incidentDetailsQuery.data.title}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">description</p>
              <p>{incidentDetailsQuery.data.description ?? '—'}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">priority</p>
                <PriorityBadge priority={incidentDetailsQuery.data.priority} />
              </div>
              <div>
                <p className="text-xs text-slate-500">status</p>
                <IncidentStatusBadge status={incidentDetailsQuery.data.status} />
              </div>
              <div>
                <p className="text-xs text-slate-500">alert_id</p>
                <p>{incidentDetailsQuery.data.alert_id ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">assignee_user_id</p>
                <p>{getAssigneeLabel(incidentDetailsQuery.data)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">created_at</p>
                <p>{formatDate(incidentDetailsQuery.data.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">updated_at</p>
                <p>{formatDate(incidentDetailsQuery.data.updated_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">resolved_at</p>
                <p>{formatDate(incidentDetailsQuery.data.resolved_at)}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Ответственный">
                <SelectInput
                  value={selectedIncident?.assignee_user_id ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedIncident((current) => {
                      if (!current) return current;
                      return {
                        ...current,
                        assignee_user_id: value === '' ? null : Number(value)
                      };
                    });
                  }}
                >
                  <option value="">Не назначен</option>
                  {users.map((user: ManagedUser) => (
                    <option key={user.id} value={user.id}>{user.username} (#{user.id})</option>
                  ))}
                </SelectInput>
              </FormField>

              <div className="flex items-end">
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={!selectedIncident || updateIncidentMutation.isPending}
                  onClick={() => {
                    if (!selectedIncident) return;
                    setFeedback(null);
                    updateIncidentMutation.mutate({
                      id: selectedIncident.id,
                      payload: {
                        assignee_user_id: selectedIncident.assignee_user_id ?? null
                      }
                    });
                  }}
                >
                  Сохранить assignee
                </Button>
              </div>
            </div>

            <FormField label="resolution_comment">
              <TextArea
                rows={4}
                placeholder="Комментарий по решению/закрытию инцидента"
                value={resolutionCommentDraft}
                onChange={(event) => setResolutionCommentDraft(event.target.value)}
              />
            </FormField>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={handleSaveDetails}
                disabled={!selectedIncident || updateIncidentMutation.isPending}
              >
                Сохранить комментарий
              </Button>

              {incidentDetailsQuery.data.status !== 'resolved' && incidentDetailsQuery.data.status !== 'closed' ? (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (!selectedIncident) return;
                    setFeedback(null);

                    const normalizedComment = resolutionCommentDraft.trim();
                    try {
                      if (normalizedComment) {
                        await updateIncidentMutation.mutateAsync({
                          id: selectedIncident.id,
                          payload: { resolution_comment: normalizedComment }
                        });
                      }

                      await updateStatusMutation.mutateAsync({ id: selectedIncident.id, nextStatus: 'resolved' });
                    } catch {
                      // mutation-level error feedback is handled in onError callbacks
                    }
                  }}
                  disabled={updateStatusMutation.isPending || updateIncidentMutation.isPending}
                >
                  Resolve с комментарием
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
