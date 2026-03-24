import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link, useLocation } from 'wouter';
import { cn, getInitials } from '@/lib/utils';
import { 
  LayoutDashboard, FolderKanban, CheckSquare, 
  Users, Building2, Activity, Bell, LogOut, Loader2
} from 'lucide-react';
import { useListNotifications, useMarkAllNotificationsRead } from '@workspace/api-client-react';
import { Button } from './ui';
import { motion, AnimatePresence } from 'framer-motion';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  const { data: notificationsData } = useListNotifications({ unreadOnly: true });
  const markAllRead = useMarkAllNotificationsRead({
    mutation: { onSuccess: () => setIsNotificationsOpen(false) }
  });

  if (!user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'project_manager', 'developer'] },
    { href: '/projects', label: 'Projects', icon: FolderKanban, roles: ['admin', 'project_manager'] },
    { href: '/tasks', label: 'My Tasks', icon: CheckSquare, roles: ['developer', 'project_manager'] },
    { href: '/clients', label: 'Clients', icon: Building2, roles: ['admin', 'project_manager'] },
    { href: '/users', label: 'Users', icon: Users, roles: ['admin'] },
    { href: '/activity', label: 'Activity Feed', icon: Activity, roles: ['admin', 'project_manager', 'developer'] },
  ].filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b">
          <div className="flex items-center gap-2 text-primary font-display font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center text-white">
              V
            </div>
            Velozity
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}>
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-primary">
              {getInitials(user.name)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate w-32">{user.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="h-16 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0">
          <h1 className="font-display font-semibold text-lg capitalize">
            {location === '/' ? 'Dashboard' : location.split('/')[1].replace('-', ' ')}
          </h1>
          
          <div className="flex items-center gap-4 relative">
            <button 
              className="relative p-2 rounded-full hover:bg-accent transition-colors"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {notificationsData?.unreadCount ? (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-background animate-pulse" />
              ) : null}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-80 bg-card border shadow-2xl rounded-xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b flex justify-between items-center bg-muted/50">
                    <h3 className="font-semibold">Notifications</h3>
                    {notificationsData?.unreadCount ? (
                      <button 
                        onClick={() => markAllRead.mutate()}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    ) : null}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notificationsData?.notifications?.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No new notifications
                      </div>
                    ) : (
                      notificationsData?.notifications?.map(n => (
                        <div key={n.id} className={cn("p-4 border-b last:border-0", n.isRead ? "opacity-60" : "bg-primary/5")}>
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
