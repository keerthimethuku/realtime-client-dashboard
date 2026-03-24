import React from 'react';
import { useListActivity } from '@workspace/api-client-react';
import { Card, CardContent, Spinner, Badge } from '@/components/ui';
import { formatDateTime, getStatusColor } from '@/lib/utils';
import { Activity as ActivityIcon } from 'lucide-react';

export default function Activity() {
  const { data: activity, isLoading } = useListActivity({ limit: 50 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display flex items-center gap-2">
        <ActivityIcon className="w-6 h-6 text-primary" /> Global Activity Feed
      </h1>

      {isLoading ? <Spinner /> : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {activity?.map(event => (
                <div key={event.id} className="p-6 hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-primary">{event.userName}</span>
                      <span className="text-muted-foreground">{event.action}</span>
                    </div>
                    <p className="font-medium text-foreground text-lg">{event.taskTitle}</p>
                    <p className="text-sm text-muted-foreground mt-1">Project: {event.projectName}</p>
                    
                    {event.fromStatus && event.toStatus && (
                      <div className="flex items-center gap-3 mt-3 text-sm">
                        <Badge variant="outline">{event.fromStatus.replace('_', ' ')}</Badge>
                        <span className="text-muted-foreground font-bold">→</span>
                        <Badge className={getStatusColor(event.toStatus)}>{event.toStatus.replace('_', ' ')}</Badge>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap bg-muted/30 px-3 py-1.5 rounded-lg border">
                    {formatDateTime(event.createdAt)}
                  </div>
                </div>
              ))}
              
              {activity?.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  No activity recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
