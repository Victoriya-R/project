import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { authApi } from '../../services/api/client';
import { useI18n } from '../../i18n/provider';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../../components/common/Button';
import { FormField, TextInput } from '../../components/common/FormField';

export function LoginCard() {
  const { login } = useAuthStore();
  const { t } = useI18n();
  const [username, setUsername] = useState('admin_1');
  const [password, setPassword] = useState('12345');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const result = await authApi.login(username, password);
    login(result.token, result.user);
    setMessage(result.meta.usingMock ? t('auth.demoFallback') : t('auth.backendLogin'));
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-soft">
      <div className="mb-8 flex items-center gap-4">
        <div className="rounded-2xl bg-brand-50 p-3 text-brand-600"><ShieldCheck className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('auth.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('auth.subtitle')}</p>
        </div>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <FormField label={t('auth.username')}>
          <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin_1" />
        </FormField>
        <FormField label={t('auth.password')}>
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </FormField>
        {message ? <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">{message}</div> : null}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? t('auth.signingIn') : t('auth.login')}</Button>
      </form>
      <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-900">{t('auth.demoRoles')}</p>
        <p className="mt-2">{t('auth.demoHint')}</p>
      </div>
    </div>
  );
}
