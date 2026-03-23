import { PropsWithChildren, useMemo } from 'react';
import { Activity, Cable, ChartColumn, Cpu, LayoutDashboard, LockKeyhole, LogOut, Map, ShieldCheck, SquareStack } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useI18n } from '../../i18n/provider';
import { Button } from '../common/Button';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { cn } from '../../utils/cn';
import { BrandMark } from '../branding/BrandMark';

export function AppShell({ children }: PropsWithChildren) {
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const role = user?.role ?? 'user';
  const isSuperuser = Boolean(user?.isSuperuser);
  const quickSearchPlaceholder = useMemo(() => t('app.searchPlaceholder'), [t]);

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/equipment', label: t('nav.equipment'), icon: Cpu },
    { to: '/ups', label: t('nav.ups'), icon: ShieldCheck },
    { to: '/switch-cabinets', label: t('nav.switchCabinets'), icon: SquareStack },
    { to: '/zones', label: t('nav.zones'), icon: Map },
    { to: '/connections', label: t('nav.connections'), icon: Activity },
    { to: '/cables', label: t('nav.cables'), icon: Cable },
    { to: '/reports', label: t('nav.reports'), icon: ChartColumn },
    { to: '/access-management', label: 'Управление доступом', icon: LockKeyhole, disabled: !isSuperuser }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-white px-5 py-6">
          <Link to="/" className="rounded-3xl bg-slate-950 px-4 py-4 text-white shadow-soft transition hover:bg-slate-900">
            <BrandMark imageClassName="h-12 w-12" titleClassName="text-xl font-semibold text-white" />
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
                <h2 className="text-xl font-semibold">{t('app.title')}</h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <LanguageSwitcher />

                <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 sm:w-80" placeholder={quickSearchPlaceholder} />
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
