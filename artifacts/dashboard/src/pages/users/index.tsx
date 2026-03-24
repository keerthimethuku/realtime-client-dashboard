import React, { useState } from 'react';
import { useListUsers, useCreateUser, useDeleteUser, useUpdateUser } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner } from '@/components/ui';
import { Users, Plus, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  project_manager: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  developer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useListUsers();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'developer' as any });
  const [creating, setCreating] = useState(false);

  const createUser = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        setShowCreate(false);
        setForm({ name: '', email: '', password: '', role: 'developer' });
      }
    }
  });

  const deleteUser = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      }
    }
  });

  if (currentUser?.role !== 'admin') {
    return <div className="text-center py-20 text-muted-foreground">Access denied.</div>;
  }

  if (isLoading) return <Spinner />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createUser.mutateAsync({ data: form });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground mt-1">{users?.length || 0} team members</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Name</label>
                <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <input type="email" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Password</label>
                <input type="password" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Role</label>
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}>
                  <option value="developer">Developer</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create User'}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users?.map(u => (
          <Card key={u.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                    {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                {u.id !== currentUser?.id && (
                  <button
                    onClick={() => deleteUser.mutate({ id: u.id })}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-4">
                <Badge className={ROLE_COLORS[u.role] || ''} variant="outline">
                  {u.role.replace('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
