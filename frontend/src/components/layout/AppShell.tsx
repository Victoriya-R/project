import { FormEvent, PropsWithChildren, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Bell, BellRing, Cable, ChartColumn, Cpu, LayoutDashboard, LockKeyhole, LogOut, Map, Search, ShieldCheck, SquareStack, Unplug, Boxes, Siren } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useI18n } from '../../i18n/provider';
import { notificationSettingsApi, notificationsApi } from '../../services/api/client';
import { Button } from '../common/Button';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { BrandLogo } from '../common/BrandLogo';
import { cn } from '../../utils/cn';

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

export function AppShell({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const role = user?.role ?? 'user';
  const isSuperuser = Boolean(user?.isSuperuser);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const quickSearchPlaceholder = useMemo(() => t('app.searchPlaceholder'), [t]);
  const navigate = useNavigate();

  const notificationsQuery = useQuery({
    queryKey: ['notifications-header'],
    queryFn: () => notificationsApi.list({ limit: 5 }),
    refetchInterval: 15000
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 15000
  });

  const settingsQuery = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => notificationSettingsApi.get(),
    refetchInterval: 30000
  });

  const refreshNotifications = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications-header'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    ]);
  };

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: refreshNotifications
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: refreshNotifications
  });

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/equipment', label: t('nav.equipment'), icon: Cpu },
    { to: '/ups', label: t('nav.ups'), icon: ShieldCheck },
    { to: '/switch-cabinets', label: t('nav.switchCabinets'), icon: SquareStack },
    { to: '/zones', label: t('nav.zones'), icon: Map },
    { to: '/connections', label: t('nav.connections'), icon: Activity },
    { to: '/alerts', label: 'Алерты', icon: BellRing },
    { to: '/incidents', label: 'Инциденты', icon: Siren },
    { to: '/notifications', label: 'Уведомления', icon: Bell },
    { to: '/cables', label: t('nav.cables'), icon: Cable },
    { to: '/reports', label: t('nav.reports'), icon: ChartColumn },
    { to: '/floorplans', label: '3D планы', icon: Boxes },
    { to: '/access-management', label: 'Управление доступом', icon: LockKeyhole, disabled: !isSuperuser }
  ];

  const unreadCount = unreadCountQuery.data?.count ?? 0;
  const canShowInApp = settingsQuery.data?.in_app_enabled ?? true;
  const runQuickSearch = () => {
    const query = quickSearch.trim();

    if (!query) {
      return;
    }

    navigate(`/equipment?search=${encodeURIComponent(query)}`);
  };

  const onSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    runQuickSearch();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-white px-5 py-6">
          <Link
            to="/"
            aria-label="Dashboard"
            className="flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-white shadow-soft"
          >
            <div className="rounded-xl bg-white/10 p-2">
              <Unplug className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Data Center</p>
              <p className="truncate text-[11px] text-slate-400">Corporate workspace</p>
            </div>
          </Link>
          <nav className="mt-8 space-y-1">
            {navItems.map(({ to, label, icon: Icon, disabled }) => disabled ? (
              <div key={to} className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
            ) : (
              <NavLink key={to} to={to} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t('app.enterpriseWorkspace')}</p>
                <div className="mt-1 flex items-center gap-3">
                  <BrandLogo iconClassName="h-10 w-10" />
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">Data Center</h2>
                    <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Сборка v1.4.2
                    </span>
                  </div>
                </div>
                </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <LanguageSwitcher />

                <form className="flex w-full items-center gap-2 sm:w-80" onSubmit={onSearchSubmit}>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    placeholder={quickSearchPlaceholder}
                    value={quickSearch}
                    onChange={(event) => setQuickSearch(event.target.value)}
                    aria-label={quickSearchPlaceholder}
                  />
                  <Button type="submit" variant="secondary" className="px-3" aria-label="Поиск">
                    <Search className="h-4 w-4" />
                  </Button>
                </form>

                <div className="relative">
                  <Button variant="secondary" className="relative" onClick={() => setIsNotificationOpen((value) => !value)}>
                    <Bell className="h-4 w-4" />
                    Уведомления
                    {canShowInApp && unreadCount > 0 ? (
                      <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : null}
                  </Button>

                  {isNotificationOpen ? (
                    <div className="absolute right-0 z-20 mt-2 w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Последние уведомления</p>
                        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => markAllAsReadMutation.mutate()}>
                          Прочитать все
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {(notificationsQuery.data?.data ?? []).map((notification) => (
                          <div key={notification.id} className={cn('rounded-xl border px-3 py-2', notification.is_read ? 'border-slate-200 bg-slate-50' : 'border-brand-200 bg-brand-50/30')}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-slate-900">{notification.title}</p>
                                <p className="line-clamp-2 text-xs text-slate-600">{notification.message}</p>
                                <p className="mt-1 text-[11px] text-slate-500">{formatDate(notification.created_at)}</p>
                              </div>
                              {!notification.is_read ? (
                                <Button variant="ghost" className="px-2 py-1 text-[11px]" onClick={() => markAsReadMutation.mutate(notification.id)}>
                                  Прочитано
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        ))}

                        {(notificationsQuery.data?.data ?? []).length === 0 ? (
                          <p className="rounded-xl border border-slate-200 px-3 py-4 text-center text-xs text-slate-500">Уведомлений пока нет.</p>
                        ) : null}
                      </div>

                      <Link className="mt-3 block text-right text-xs font-medium text-brand-700 hover:text-brand-800" to="/notifications" onClick={() => setIsNotificationOpen(false)}>
                        Открыть /notifications
                      </Link>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-2 text-sm">
                  <p className="font-medium text-slate-900">{user?.username ?? 'demo_user'}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{role}</p>
                </div>

                <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={logout}>{t('app.logout')}</Button>

              </div>
            </div>
          </header>
          <div className="flex-1 px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
