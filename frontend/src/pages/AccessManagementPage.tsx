import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { DataTable } from '../components/common/DataTable';
import { FormField, SelectInput, TextInput } from '../components/common/FormField';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/common/PageHeader';
import { accessManagementApi } from '../services/api/client';
import { useAuthStore } from '../store/auth-store';
import { ManagedUser } from '../types/entities';
import { getApiErrorMessage } from '../utils/api-error';

function UserFormModal({
  open,
  title,
  initialUser,
  loading,
  error,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  initialUser: ManagedUser | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: { username: string; password?: string; role: 'admin' | 'user' }) => void;
}) {
  const [username, setUsername] = useState(initialUser?.username ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>(initialUser?.role ?? 'user');

  const userId = initialUser?.id;
  if (userId !== undefined && username !== initialUser?.username) {
    // noop, local component intentionally re-renders with latest initial state through key prop
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ username, password: password || undefined, role });
        }}
      >
        <FormField label="Логин">
          <TextInput value={username} onChange={(event) => setUsername(event.target.value)} placeholder="new_user" />
        </FormField>
        <FormField label={initialUser ? 'Новый пароль' : 'Пароль'} hint={initialUser ? 'Оставьте пустым, если менять пароль не нужно.' : undefined}>
          <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
        </FormField>
        <FormField label="Роль">
          <SelectInput value={role} onChange={(event) => setRole(event.target.value as 'admin' | 'user')}>
            <option value="admin">admin</option>
            <option value="user">user</option>
          </SelectInput>
        </FormField>
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</Button>
        </div>
      </form>
    </Modal>
  );
}

const buildUserDedupKey = (managedUser: ManagedUser) => managedUser.id;

const dedupeUsers = (users: ManagedUser[]) => {
  const seenIds = new Set<number>();
  const seenUsernames = new Set<string>();
  const seenEmails = new Set<string>();

  return users.filter((managedUser) => {
    const normalizedUsername = managedUser.username.trim().toLowerCase();
    const normalizedEmail = managedUser.email?.trim().toLowerCase();

    if (seenIds.has(managedUser.id) || seenUsernames.has(normalizedUsername) || (normalizedEmail ? seenEmails.has(normalizedEmail) : false)) {
      return false;
    }

    seenIds.add(managedUser.id);
    seenUsernames.add(normalizedUsername);

    if (normalizedEmail) {
      seenEmails.add(normalizedEmail);
    }

    return true;
  });
};

export function AccessManagementPage() {
  const user = useAuthStore((state) => state.user);
  const isSuperuser = Boolean(user?.isSuperuser);
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['access-users'],
    queryFn: accessManagementApi.list,
    enabled: isSuperuser
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['access-users'] });
  };

  const createMutation = useMutation({
    mutationFn: accessManagementApi.create,
    onSuccess: async () => {
      setFormOpen(false);
      setSelectedUser(null);
      setSubmitError(null);
      await invalidate();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, 'Не удалось зарегистрировать пользователя.'))
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { username: string; password?: string; role: 'admin' | 'user' }) => accessManagementApi.update(selectedUser?.id ?? 0, payload),
    onSuccess: async () => {
      setFormOpen(false);
      setSelectedUser(null);
      setSubmitError(null);
      await invalidate();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, 'Не удалось обновить пользователя.'))
  });

  const deleteMutation = useMutation({
    mutationFn: () => accessManagementApi.remove(selectedUser?.id ?? 0),
    onSuccess: async () => {
      setDeleteOpen(false);
      setSelectedUser(null);
      setDeleteError(null);
      await invalidate();
    },
    onError: (error) => setDeleteError(getApiErrorMessage(error, 'Не удалось удалить пользователя.'))
  });

  const tableData = useMemo(() => dedupeUsers(usersQuery.data ?? []), [usersQuery.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Управление доступом"
        description="Только суперпользователь admin_1 может регистрировать, изменять и удалять пользователей."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Управление доступом' }]} />}
        actions={isSuperuser ? <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setSelectedUser(null); setSubmitError(null); setFormOpen(true); }}>Добавить пользователя</Button> : undefined}
      />

      {!isSuperuser ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-4 text-sm text-slate-500">
          Панель недоступна для вашей учетной записи. Для управления пользователями войдите под суперпользователем admin_1.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-soft">
            После регистрации новый пользователь получает логин и пароль и работает только со своей инфраструктурой. Роль назначается сразу при создании.
          </div>
          <DataTable
            getRowKey={buildUserDedupKey}
            columns={[
              { key: 'username', header: 'Логин', render: (row) => <div><p className="font-semibold text-slate-900">{row.username}</p><p className="text-xs text-slate-500">{row.email ?? '—'}</p></div> },
              { key: 'role', header: 'Роль', render: (row) => row.isSuperuser ? 'superuser' : row.role },
              { key: 'scope', header: 'Доступ', render: (row) => row.isSuperuser ? 'Управление пользователями и собственной инфраструктурой' : 'Только собственная инфраструктура' },
              {
                key: 'actions',
                header: 'Действия',
                render: (row) => row.isSuperuser ? <span className="text-slate-400">Недоступно</span> : (
                  <div className="flex gap-2">
                    <Button variant="ghost" className="px-2.5" onClick={() => { setSelectedUser(row); setSubmitError(null); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" className="px-2.5" onClick={() => { setSelectedUser(row); setDeleteError(null); setDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )
              }
            ]}
            data={tableData}
          />
        </>
      )}

      <UserFormModal
        key={selectedUser?.id ?? 'create'}
        open={formOpen}
        title={selectedUser ? `Изменить ${selectedUser.username}` : 'Регистрация пользователя'}
        initialUser={selectedUser}
        loading={createMutation.isPending || updateMutation.isPending}
        error={submitError}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) => {
          setSubmitError(null);
          if (selectedUser) {
            updateMutation.mutate(payload);
            return;
          }
          createMutation.mutate({ ...payload, password: payload.password ?? '' });
        }}
      />

      <ConfirmModal
        open={deleteOpen}
        title="Удалить пользователя"
        description={selectedUser ? `Пользователь ${selectedUser.username} будет удалён.` : 'Подтвердите удаление пользователя.'}
        confirmLabel="Удалить"
        loading={deleteMutation.isPending}
        error={deleteError}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
