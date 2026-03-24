import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useGetAdminDashboard, useGetPmDashboard, useGetDeveloperDashboard } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner } from '@/components/ui';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Users, FolderKanban, CheckSquare, AlertCircle, Clock } from 'lucide-react';
import { cn, getPriorityColor, getStatusColor, formatDate } from '@/lib/utils';
import { Link } from 'wouter';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function AdminView() {
  const { data, isLoading } = useGetAdminDashboard();
  if (isLoading) return <Spinner />;
  if (!data) return null;

  const pieData = Object.entries(data.tasksByStatus).map(([name, value]) => ({
    name: name.replace('_', ' '), value
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Projects" value={data.totalProjects} icon={FolderKanban} color="text-blue-500" bg="bg-blue-500/10" />
        <StatCard title="Total Tasks" value={data.totalTasks} icon={CheckSquare} color="text-emerald-500" bg="bg-emerald-500/10" />
        <StatCard title="Overdue Tasks" value={data.overdueTaskCount} icon={AlertCircle} color="text-red-500" bg="bg-red-500/10" />
        <StatCard title="Online Users" value={data.activeUsersOnline} icon={Users} color="text-primary" bg="bg-primary/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                  {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip cursor={{ fill: '#334155', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PmView() {
  const { data, isLoading } = useGetPmDashboard();
  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(data.tasksByPriority).map(([priority, count]) => (
          <Card key={priority} className="border-t-4" style={{ borderTopColor: priority === 'critical' ? '#ef4444' : priority === 'high' ? '#f59e0b' : priority === 'medium' ? '#3b82f6' : '#64748b' }}>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground capitalize">{priority} Priority</p>
              <h3 className="text-2xl font-bold mt-1">{count}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>My Projects</CardTitle>
            <Link href="/projects" className="text-sm text-primary hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {data.projects.map(project => (
                <Link key={project.id} href={`/projects/${project.id}`} className="block p-4 rounded-lg bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border transition-colors">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{project.name}</h4>
                    <Badge className={getStatusColor(project.status)}>{project.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <span>Tasks: {project.completedTaskCount} / {project.taskCount}</span>
                    {project.overdueTaskCount > 0 && <span className="text-red-400">{project.overdueTaskCount} Overdue</span>}
                  </div>
                </Link>
              ))}
              {data.projects.length === 0 && <p className="text-sm text-muted-foreground">No active projects.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-4">
              {data.upcomingDueDates.map(task => (
                <Link key={task.id} href={`/tasks`} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
                  <div className={`p-2 rounded-full ${task.isOverdue ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-medium text-sm truncate">{task.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{task.projectName}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium ${task.isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {task.dueDate ? formatDate(task.dueDate) : 'No date'}
                    </p>
                    <Badge className={cn("mt-1 text-[10px] px-1 py-0", getPriorityColor(task.priority))}>{task.priority}</Badge>
                  </div>
                </Link>
              ))}
              {data.upcomingDueDates.length === 0 && <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DeveloperView() {
  const { data, isLoading } = useGetDeveloperDashboard();
  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(data.tasksByStatus).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="p-4 text-center">
              <h3 className="text-2xl font-bold">{count}</h3>
              <p className="text-xs font-medium text-muted-foreground mt-1 capitalize">{status.replace('_', ' ')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Current Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mt-2">
            {data.assignedTasks.map(task => (
              <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:border-primary/30 transition-colors gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    <Badge className={getStatusColor(task.status)}>{task.status.replace('_', ' ')}</Badge>
                    {task.isOverdue && <Badge variant="destructive">Overdue</Badge>}
                  </div>
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{task.projectName}</p>
                </div>
                <div className="flex items-center gap-4">
                  {task.dueDate && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(task.dueDate)}
                    </div>
                  )}
                  <Link href={`/tasks`}>
                    <Button variant="secondary" size="sm">Update Status</Button>
                  </Link>
                </div>
              </div>
            ))}
            {data.assignedTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>You have no assigned tasks. Time for a break!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="overflow-hidden relative">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-display font-bold mt-2">{value}</h3>
          </div>
          <div className={`p-4 rounded-2xl ${bg}`}>
            <Icon className={`w-8 h-8 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  if (user.role === 'admin') return <AdminView />;
  if (user.role === 'project_manager') return <PmView />;
  return <DeveloperView />;
}
