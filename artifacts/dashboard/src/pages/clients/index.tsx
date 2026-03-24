import React, { useState } from 'react';
import { useListClients, useCreateClient } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Spinner } from '@/components/ui';
import { Building2, Plus, Mail } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const { data: clients, isLoading } = useListClients();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '' });
  const [creating, setCreating] = useState(false);

  const createClient = useCreateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        setShowCreate(false);
        setForm({ name: '', email: '', company: '' });
      }
    }
  });

  if (isLoading) return <Spinner />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createClient.mutateAsync({ data: form });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Clients</h2>
          <p className="text-muted-foreground mt-1">{clients?.length || 0} clients</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Client</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Contact Name</label>
                <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <input type="email" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Company</label>
                <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} required />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" disabled={creating}>{creating ? 'Adding...' : 'Add Client'}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients?.map(c => (
          <Card key={c.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{c.company}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{c.name}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {c.email}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {clients?.length === 0 && (
          <div className="col-span-3 text-center py-20 text-muted-foreground">
            No clients yet. Add your first client.
          </div>
        )}
      </div>
    </div>
  );
}
