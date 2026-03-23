import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api/client';
import { useI18n } from '../../i18n/provider';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../../components/common/Button';
import { FormField, TextInput } from '../../components/common/FormField';
import { getApiErrorMessage } from '../../utils/api-error';
import { BrandMark } from '../../components/branding/BrandMark';

export function LoginCard() {
  const { login } = useAuthStore();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authError = sessionStorage.getItem('dcim_auth_error');
    if (authError) {
      setError(authError);
      sessionStorage.removeItem('dcim_auth_error');
    }
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await authApi.login(username, password);
      login(result.token, result.user);
      setMessage(t('auth.backendLogin'));
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Не удалось выполнить вход. Проверьте логин, пароль и повторите попытку.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-soft">
      <div className="mb-8">
        <BrandMark imageClassName="h-16 w-16" titleClassName="text-2xl font-semibold text-slate-900" />
        <p className="mt-4 text-sm text-slate-500">{t('auth.subtitle')}</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <FormField label={t('auth.username')}>
          <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin_1" autoComplete="username" />
        </FormField>
        <FormField label={t('auth.password')}>
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </FormField>
        {message ? <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">{message}</div> : null}
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? t('auth.signingIn') : t('auth.login')}</Button>
      </form>
      <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-900">{t('auth.demoRoles')}</p>
        <p className="mt-2">{t('auth.demoHint')}</p>
      </div>
    </div>
  );
}
