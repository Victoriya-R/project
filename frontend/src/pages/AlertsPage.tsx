import axios from 'axios';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { FilterBar } from '../components/common/FilterBar';
import { FormField, SelectInput } from '../components/common/FormField';
import { LoadingState } from '../components/common/LoadingState';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { alertsApi } from '../services/api/client';
import { Alert, AlertSeverity, AlertSourceType, AlertStatus } from '../types/entities';
import { getApiErrorMessage } from '../utils/api-error';
import { cn } from '../utils/cn';

const severityBadgeMap: Record<AlertSeverity, string> = {
  info: 'bg-slate-100 text-slate-700 ring-slate-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  critical: 'bg-rose-50 text-rose-700 ring-rose-200'
};

const statusBadgeMap: Record<AlertStatus, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-200',
  acknowledged: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  muted: 'bg-slate-100 text-slate-700 ring-slate-200'
};

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const SeverityBadge = ({ severity }: { severity: AlertSeverity }) => (
  <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', severityBadgeMap[severity])}>{severity}</span>
);

const AlertStatusBadge = ({ status }: { status: AlertStatus }) => (
  <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', statusBadgeMap[status])}>{status}</span>
);

const parseAlertStatuses = (value: string | null): AlertStatus[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is AlertStatus => ['new', 'acknowledged', 'resolved', 'muted'].includes(item));
};

export function AlertsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const severityParam = searchParams.get('severity');
  const statusParam = searchParams.get('status');
  const sourceTypeParam = searchParams.get('source_type');
  const statusExcludeParam = searchParams.get('status_exclude');

  const initialSeverity = severityParam === 'info' || severityParam === 'warning' || severityParam === 'critical' ? severityParam : '';
  const initialStatus = statusParam === 'new' || statusParam === 'acknowledged' || statusParam === 'resolved' || statusParam === 'muted' ? statusParam : '';
  const initialSourceType = sourceTypeParam === 'rack' || sourceTypeParam === 'equipment' || sourceTypeParam === 'cable' || sourceTypeParam === 'connection' || sourceTypeParam === 'ups' || sourceTypeParam === 'zone' ? sourceTypeParam : '';

  const [severity, setSeverity] = useState<'' | AlertSeverity>(initialSeverity);
  const [status, setStatus] = useState<'' | AlertStatus>(initialStatus);
  const [sourceType, setSourceType] = useState<'' | AlertSourceType>(initialSourceType);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filters = useMemo(() => {
    const next: { severity?: AlertSeverity; status?: AlertStatus; source_type?: AlertSourceType } = {};
    if (severity) next.severity = severity;
    if (status) next.status = status;
    if (sourceType) next.source_type = sourceType;
    return next;
  }, [severity, sourceType, status]);

  const query = useApiQuery({
    queryKey: ['alerts', filters],
    queryFn: () => alertsApi.list(filters)
  });

  const alertDetailsQuery = useQuery({
    queryKey: ['alert-detail', String(selectedAlert?.id ?? '')],
    queryFn: () => alertsApi.getById(selectedAlert?.id ?? 0),
    enabled: Boolean(selectedAlert?.id)
  });

  const refreshAlerts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['alert-detail'] })
    ]);
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: AlertStatus }) => alertsApi.updateStatus(id, nextStatus),
    onSuccess: async (updatedAlert) => {
      setFeedback({ type: 'success', message: `Статус алерта #${updatedAlert.id} обновлён.` });
      if (selectedAlert?.id === updatedAlert.id) {
        setSelectedAlert(updatedAlert);
      }
      await refreshAlerts();
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Не удалось обновить статус алерта.') });
    }
  });

  const createIncidentMutation = useMutation({
    mutationFn: (id: number) => alertsApi.createIncident(id),
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Инцидент успешно создан из алерта.' });
      await refreshAlerts();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const message = typeof error.response.data?.error === 'string'
          ? error.response.data.error
          : 'По этому алерту уже существует открытый инцидент';
        setFeedback({ type: 'error', message });
        return;
      }

      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Не удалось создать инцидент из алерта.') });
    }
  });

  const excludedStatuses = useMemo(() => parseAlertStatuses(statusExcludeParam), [statusExcludeParam]);
  const alerts = useMemo(() => {
    const base = query.data?.data ?? [];

    if (excludedStatuses.length === 0) {
      return base;
    }

    return base.filter((alert) => !excludedStatuses.includes(alert.status));
  }, [excludedStatuses, query.data?.data]);

  const renderActions = (alert: Alert) => {
    if (alert.status === 'muted') {
      return <span className="text-xs text-slate-400">—</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {alert.status !== 'acknowledged' && alert.status !== 'resolved' ? (
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-xs"
            onClick={() => {
              setFeedback(null);
              updateStatusMutation.mutate({ id: alert.id, nextStatus: 'acknowledged' });
            }}
            disabled={updateStatusMutation.isPending}
          >
            Подтвердить
          </Button>
        ) : null}
        {alert.status !== 'resolved' ? (
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-xs"
            onClick={() => {
              setFeedback(null);
              updateStatusMutation.mutate({ id: alert.id, nextStatus: 'resolved' });
            }}
            disabled={updateStatusMutation.isPending}
          >
            Resolve
          </Button>
        ) : null}
        <Button
          variant="ghost"
          className="px-3 py-1.5 text-xs"
          onClick={() => {
            setFeedback(null);
            createIncidentMutation.mutate(alert.id);
          }}
          disabled={createIncidentMutation.isPending || alert.status === 'resolved'}
        >
          Создать инцидент
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Алерты"
        description="Список алертов с фильтрами, деталями и действиями"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Алерты' }]} />}
      />

      {feedback ? (
        <div className={cn('rounded-2xl border px-4 py-3 text-sm', feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>
          {feedback.message}
        </div>
      ) : null}

      <FilterBar>
        <FormField label="Severity">
          <SelectInput
            value={severity}
            onChange={(event) => setSeverity(event.target.value as '' | AlertSeverity)}
          >
            <option value="">Все</option>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="critical">critical</option>
          </SelectInput>
        </FormField>

        <FormField label="Status">
          <SelectInput
            value={status}
            onChange={(event) => setStatus(event.target.value as '' | AlertStatus)}
          >
            <option value="">Все</option>
            <option value="new">new</option>
            <option value="acknowledged">acknowledged</option>
            <option value="resolved">resolved</option>
            <option value="muted">muted</option>
          </SelectInput>
        </FormField>

        <FormField label="Source type">
          <SelectInput
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as '' | AlertSourceType)}
          >
            <option value="">Все</option>
            <option value="rack">rack</option>
            <option value="equipment">equipment</option>
            <option value="cable">cable</option>
            <option value="connection">connection</option>
            <option value="ups">ups</option>
            <option value="zone">zone</option>
          </SelectInput>
        </FormField>
      </FilterBar>

      {query.isLoading ? <LoadingState label="Загружаем алерты..." /> : null}

      {query.isError ? <ErrorState title="Не удалось загрузить алерты" description={getApiErrorMessage(query.error, 'Проверьте доступность API alerts и попробуйте снова.')} /> : null}

      {!query.isLoading && !query.isError && alerts.length === 0 ? (
        <EmptyState title="Алерты не найдены" description="Сейчас нет алертов по выбранным фильтрам." />
      ) : null}

      {!query.isLoading && !query.isError && alerts.length > 0 ? (
        <DataTable
          data={alerts}
          getRowKey={(row) => row.id}
          columns={[
            { key: 'severity', header: 'Severity', render: (row) => <SeverityBadge severity={row.severity} /> },
            {
              key: 'title',
              header: 'Title',
              render: (row) => (
                <button
                  type="button"
                  className="text-left font-semibold text-brand-700 hover:text-brand-800"
                  onClick={() => {
                    setFeedback(null);
                    setSelectedAlert(row);
                  }}
                >
                  {row.title}
                </button>
              )
            },
            { key: 'source_type', header: 'Source type', render: (row) => row.source_type },
            { key: 'source_id', header: 'Source ID', render: (row) => row.source_id },
            { key: 'status', header: 'Status', render: (row) => <AlertStatusBadge status={row.status} /> },
            { key: 'created_at', header: 'Создан', render: (row) => formatDate(row.created_at) },
            { key: 'rule_code', header: 'Rule code', render: (row) => row.rule_code ?? '—' },
            { key: 'description', header: 'Описание', render: (row) => row.description ?? '—' },
            { key: 'actions', header: 'Действия', render: renderActions }
          ]}
        />
      ) : null}

      <Modal open={Boolean(selectedAlert)} title={`Алерт #${selectedAlert?.id ?? ''}`} onClose={() => setSelectedAlert(null)}>
        {alertDetailsQuery.isLoading ? <LoadingState label="Загружаем детали алерта..." /> : null}

        {alertDetailsQuery.isError ? (
          <ErrorState title="Не удалось загрузить детали алерта" description={getApiErrorMessage(alertDetailsQuery.error, 'Попробуйте открыть алерт повторно.')} />
        ) : null}

        {!alertDetailsQuery.isLoading && !alertDetailsQuery.isError && alertDetailsQuery.data ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">title</p>
              <p className="font-medium text-slate-900">{alertDetailsQuery.data.title}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">description</p>
              <p>{alertDetailsQuery.data.description ?? '—'}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">severity</p>
                <SeverityBadge severity={alertDetailsQuery.data.severity} />
              </div>
              <div>
                <p className="text-xs text-slate-500">status</p>
                <AlertStatusBadge status={alertDetailsQuery.data.status} />
              </div>
              <div>
                <p className="text-xs text-slate-500">source_type</p>
                <p>{alertDetailsQuery.data.source_type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">source_id</p>
                <p>{alertDetailsQuery.data.source_id}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">rule_code</p>
                <p>{alertDetailsQuery.data.rule_code ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">created_at</p>
                <p>{formatDate(alertDetailsQuery.data.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">updated_at</p>
                <p>{formatDate(alertDetailsQuery.data.updated_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">resolved_at</p>
                <p>{formatDate(alertDetailsQuery.data.resolved_at)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
