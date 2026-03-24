import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io('/', {
      path: '/socket.io',
      auth: { token: accessToken },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });

    socket.on('activity_event', ({ event }: { event: any }) => {
      queryClient.setQueriesData({ queryKey: ['/api/activity'] }, (old: any) => {
        if (!old) return [event];
        return [event, ...old].slice(0, 50);
      });
    });

    socket.on('task_updated', ({ task }: { task: any }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      if (task?.projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${task.projectId}/tasks`] });
      }
    });

    socket.on('notification', ({ notification }: { notification: any }) => {
      toast({
        title: notification.title,
        description: notification.message,
      });
      queryClient.setQueriesData({ queryKey: ['/api/notifications'] }, (old: any) => {
        if (!old) return { notifications: [notification], unreadCount: 1 };
        return {
          notifications: [notification, ...(old.notifications || [])],
          unreadCount: (old.unreadCount || 0) + 1,
        };
      });
    });

    socket.on('online_users_count', ({ count }: { count: number }) => {
      if (user.role === 'admin') {
        queryClient.setQueriesData({ queryKey: ['/api/dashboard/admin'] }, (old: any) => {
          if (!old) return old;
          return { ...old, activeUsersOnline: count };
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, accessToken, queryClient, toast]);

  return (
    <>
      {children}
    </>
  );
}
