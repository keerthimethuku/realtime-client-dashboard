import React, { useState } from 'react';
import { useListProjects, useCreateProject, useListClients } from '@workspace/api-client-react';
import { Card, CardContent, Button, Badge, Input, Select, Modal, Spinner } from '@/components/ui';
import { getStatusColor, formatDate } from '@/lib/utils';
import { Plus, Search, FolderKanban } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

export default function Projects() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const { data: projects, isLoading } = useListProjects({ status: statusFilter || undefined });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredProjects = projects?.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </Select>
        </div>
        
        {user?.role !== 'developer' && (
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        )}
      </div>

      {isLoading ? <Spinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <Card key={project.id} className="hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Badge className={getStatusColor(project.status)}>{project.status.replace('_', ' ')}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(project.createdAt)}</span>
                </div>
                <h3 className="font-display text-xl font-bold mb-2 text-foreground truncate">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-6 h-10 line-clamp-2">{project.description || 'No description provided.'}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Client</span>
                    <span className="text-sm font-medium truncate w-24">{project.clientName}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Tasks</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{project.completedTaskCount}/{project.taskCount}</span>
                    </div>
                  </div>
                </div>
                
                <Link href={`/projects/${project.id}`} className="absolute inset-0 z-10">
                  <span className="sr-only">View Project</span>
                </Link>
              </CardContent>
            </Card>
          ))}
          
          {filteredProjects.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card border rounded-xl border-dashed">
              <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No projects found</h3>
              <p>Try adjusting your filters or create a new project.</p>
            </div>
          )}
        </div>
      )}

      {user?.role !== 'developer' && (
        <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

function CreateProjectModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const { data: clients } = useListClients();
  const createMutation = useCreateProject({
    mutation: {
      onSuccess: () => {
        onClose();
        setName('');
        setDescription('');
        setClientId('');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: { name, description, clientId: Number(clientId), status: 'active' } });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Project Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Client</label>
          <Select value={clientId} onChange={e => setClientId(e.target.value)} required>
            <option value="">Select a client...</option>
            {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Description</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
