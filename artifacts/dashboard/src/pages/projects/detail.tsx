import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { useGetProject, useListProjectTasks, useCreateTask, useListActivity } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Modal, Input, Select, Textarea, Spinner } from '@/components/ui';
import { getStatusColor, getPriorityColor, formatDate, formatDateTime, getInitials } from '@/lib/utils';
import { CheckSquare, Clock, Plus, Activity as ActivityIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function ProjectDetail() {
  const [, params] = useRoute('/projects/:id');
  const projectId = Number(params?.id);
  const { user } = useAuth();
  
  const { data: project, isLoading: loadingProject } = useGetProject(projectId);
  const { data: tasks, isLoading: loadingTasks } = useListProjectTasks(projectId);
  const { data: activity } = useListActivity({ projectId, limit: 10 });
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  if (loadingProject || loadingTasks) return <Spinner />;
  if (!project) return <div>Project not found</div>;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-display font-bold">{project.name}</h1>
            <Badge className={getStatusColor(project.status)}>{project.status.replace('_', ' ')}</Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">{project.description}</p>
          <div className="flex items-center gap-4 mt-4 text-sm font-medium">
            <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground">Client: {project.clientName}</span>
            <span className="text-muted-foreground">Created {formatDate(project.createdAt)}</span>
          </div>
        </div>
        
        {user?.role !== 'developer' && (
          <Button onClick={() => setIsTaskModalOpen(true)} className="shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
            <CheckSquare className="w-5 h-5 text-primary" /> Tasks
          </h2>
          
          <div className="grid gap-3">
            {tasks?.map(task => (
              <Card key={task.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      <Badge className={getStatusColor(task.status)}>{task.status.replace('_', ' ')}</Badge>
                      {task.isOverdue && <Badge variant="destructive">Overdue</Badge>}
                    </div>
                    <h4 className="font-semibold text-lg">{task.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 sm:border-l border-white/5 pt-3 sm:pt-0 sm:pl-4 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      {task.assigneeName ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-accent text-xs flex items-center justify-center font-bold text-primary">
                            {getInitials(task.assigneeName)}
                          </div>
                          <span className="text-sm font-medium">{task.assigneeName}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Unassigned</span>
                      )}
                    </div>
                    {task.dueDate && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(task.dueDate)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {tasks?.length === 0 && (
              <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground">
                No tasks in this project yet.
              </div>
            )}
          </div>
        </div>

        {/* Activity Sidebar */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
            <ActivityIcon className="w-5 h-5 text-primary" /> Recent Activity
          </h2>
          <Card className="bg-card/50">
            <CardContent className="p-0">
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {activity?.map(event => (
                  <div key={event.id} className="p-4 hover:bg-white/5 transition-colors">
                    <p className="text-sm">
                      <span className="font-semibold text-foreground">{event.userName}</span>{' '}
                      <span className="text-muted-foreground">{event.action}</span>{' '}
                      <span className="font-medium text-foreground">{event.taskTitle}</span>
                    </p>
                    {event.fromStatus && event.toStatus && (
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <Badge variant="outline">{event.fromStatus.replace('_', ' ')}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge className={getStatusColor(event.toStatus)}>{event.toStatus.replace('_', ' ')}</Badge>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{formatDateTime(event.createdAt)}</p>
                  </div>
                ))}
                {(!activity || activity.length === 0) && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No recent activity.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateTaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        projectId={projectId} 
      />
    </div>
  );
}

function CreateTaskModal({ isOpen, onClose, projectId }: { isOpen: boolean, onClose: () => void, projectId: number }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low'|'medium'|'high'|'critical'>('medium');
  const [dueDate, setDueDate] = useState('');
  
  const createMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        onClose();
        setTitle('');
        setDescription('');
        setPriority('medium');
        setDueDate('');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ 
      id: projectId, 
      data: { 
        title, 
        description, 
        priority, 
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined 
      } 
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Task Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Description</label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Priority</label>
            <Select value={priority} onChange={e => setPriority(e.target.value as any)} required>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Due Date</label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
