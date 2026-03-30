import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { FilterBar } from '../components/common/FilterBar';
import { FormField, SelectInput } from '../components/common/FormField';
import { LoadingState } from '../components/common/LoadingState';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { notificationSettingsApi, notificationsApi } from '../services/api/client';
import { NotificationSettings, NotificationType } from '../types/entities';
import { getApiErrorMessage } from '../utils/api-error';
import { cn } from '../utils/cn';

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const typeLabels: Record<NotificationType, string> = {
  alert_created: 'alert_created',
  incident_created: 'incident_created',
  incident_status_changed: 'incident_status_changed',
  incident_assigned: 'incident_assigned'
};

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [isReadFilter, setIsReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<'' | NotificationType>('');

  const filters = useMemo(() => {
    const next: { is_read?: boolean; type?: NotificationType } = {};

    if (isReadFilter === 'read') next.is_read = true;
    if (isReadFilter === 'unread') next.is_read = false;
    if (typeFilter) next.type = typeFilter;

    return next;
  }, [isReadFilter, typeFilter]);

  const notificationsQuery = useApiQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationsApi.list(filters)
  });

  const settingsQuery = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => notificationSettingsApi.get()
  });

  const refreshNotifications = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications-header'] })
    ]);
  };

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: refreshNotifications
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: refreshNotifications
  });

  const settingsMutation = useMutation({
    mutationFn: (payload: Partial<NotificationSettings>) => notificationSettingsApi.update(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    }
  });

  const notifications = notificationsQuery.data?.data ?? [];

  const handleToggleSetting = (field: keyof Pick<NotificationSettings, 'in_app_enabled' | 'alert_created_enabled' | 'incident_created_enabled' | 'incident_status_changed_enabled' | 'incident_assigned_enabled'>) => {
    const settings = settingsQuery.data;
    if (!settings) return;

    settingsMutation.mutate({ [field]: !settings[field] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Уведомления"
        description="Список уведомлений, управление прочтением и пользовательские настройки"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Уведомления' }]} />}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Список уведомлений</h3>
          <Button variant="secondary" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            Отметить все как прочитанные
          </Button>
        </div>

        <FilterBar>
          <FormField label="Статус">
            <SelectInput value={isReadFilter} onChange={(event) => setIsReadFilter(event.target.value as 'all' | 'unread' | 'read')}>
              <option value="all">Все</option>
              <option value="unread">Непрочитанные</option>
              <option value="read">Прочитанные</option>
            </SelectInput>
          </FormField>

          <FormField label="Тип">
            <SelectInput value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as '' | NotificationType)}>
              <option value="">Все</option>
              <option value="alert_created">alert_created</option>
              <option value="incident_created">incident_created</option>
              <option value="incident_status_changed">incident_status_changed</option>
              <option value="incident_assigned">incident_assigned</option>
            </SelectInput>
          </FormField>
        </FilterBar>

        {notificationsQuery.isLoading ? <LoadingState label="Загружаем уведомления..." /> : null}
        {notificationsQuery.isError ? <ErrorState title="Не удалось загрузить уведомления" description={getApiErrorMessage(notificationsQuery.error, 'Проверьте API уведомлений и повторите попытку.')} /> : null}

        {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0 ? (
          <EmptyState title="Нет уведомлений" description="По выбранным фильтрам ничего не найдено." />
        ) : null}

        <div className="mt-4 space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className={cn('rounded-xl border px-4 py-3', notification.is_read ? 'border-slate-200 bg-slate-50' : 'border-brand-200 bg-brand-50/30')}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  <p className="text-sm text-slate-600">{notification.message}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{typeLabels[notification.type]}</span>
                    <span>{formatDate(notification.created_at)}</span>
                    <span>{notification.is_read ? 'Прочитано' : 'Непрочитано'}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!notification.is_read ? (
                    <Button
                      variant="ghost"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => markReadMutation.mutate(notification.id)}
                      disabled={markReadMutation.isPending}
                    >
                      Отметить как прочитанное
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Настройки уведомлений</h3>

        {settingsQuery.isLoading ? <LoadingState label="Загружаем настройки..." /> : null}
        {settingsQuery.isError ? <ErrorState title="Не удалось загрузить настройки" description={getApiErrorMessage(settingsQuery.error, 'Проверьте API notification-settings и повторите попытку.')} /> : null}

        {settingsQuery.data ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: 'in_app_enabled', label: 'in_app_enabled' },
              { key: 'alert_created_enabled', label: 'alert_created_enabled' },
              { key: 'incident_created_enabled', label: 'incident_created_enabled' },
              { key: 'incident_status_changed_enabled', label: 'incident_status_changed_enabled' },
              { key: 'incident_assigned_enabled', label: 'incident_assigned_enabled' }
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settingsQuery.data[item.key as keyof NotificationSettings])}
                  onChange={() => handleToggleSetting(item.key as keyof Pick<NotificationSettings, 'in_app_enabled' | 'alert_created_enabled' | 'incident_created_enabled' | 'incident_status_changed_enabled' | 'incident_assigned_enabled'>)}
                  disabled={settingsMutation.isPending}
                />
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
