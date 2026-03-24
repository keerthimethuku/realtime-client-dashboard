import React, { useState } from 'react';
import { useListMyTasks, useUpdateTask } from '@workspace/api-client-react';
import { Card, CardContent, Badge, Select, Spinner } from '@/components/ui';
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';
import { Clock, CheckSquare } from 'lucide-react';

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: tasks, isLoading } = useListMyTasks({ status: statusFilter || undefined });
  const updateTask = useUpdateTask();

  const handleStatusChange = (taskId: number, newStatus: string) => {
    updateTask.mutate({ id: taskId, data: { status: newStatus as any } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold font-display">My Assigned Tasks</h1>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-48">
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="done">Done</option>
        </Select>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="grid gap-4">
          {tasks?.map(task => (
            <Card key={task.id} className="hover:border-primary/30 transition-all shadow-sm">
              <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                      {task.projectName}
                    </span>
                    {task.isOverdue && <Badge variant="destructive" className="animate-pulse">OVERDUE</Badge>}
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{task.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 max-w-3xl">{task.description}</p>
                </div>
                
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 md:gap-3 min-w-[200px]">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className={task.isOverdue ? 'text-red-400 font-semibold' : 'text-muted-foreground'}>
                      {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Status:</span>
                    <Select 
                      value={task.status} 
                      onChange={e => handleStatusChange(task.id, e.target.value)}
                      className={getStatusColor(task.status) + " border"}
                      disabled={updateTask.isPending}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {tasks?.length === 0 && (
            <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl border-dashed">
              <CheckSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-semibold text-foreground mb-2">You're all caught up!</h3>
              <p>No tasks found for the current filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
