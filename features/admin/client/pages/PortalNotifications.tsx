import { trpc } from '@shared/lib/trpc';
import { Bell, CheckCheck } from "lucide-react";
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent } from '@shared/ui/card';

export default function PortalNotifications() {
  const utils = trpc.useUtils();
  const { data: notifications = [], isLoading } = trpc.portal.dashboard.notifications.useQuery();

  const markRead = trpc.portal.dashboard.markNotificationRead.useMutation({
    onSuccess: () => utils.portal.dashboard.notifications.invalidate(),
  });

  const markAllRead = trpc.portal.dashboard.markAllNotificationsRead.useMutation({
    onSuccess: () => utils.portal.dashboard.notifications.invalidate(),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {notifications.length === 0 ? "No unread notifications" : `${notifications.length} unread`}
          </p>
        </div>
        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Bell className="w-10 h-10 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-sm">You're all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: { id: number; title: string; body: string | null; read: boolean; createdAt: Date }) => (
            <Card key={n.id} className={n.read ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {!n.read && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{n.body ?? ""}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {new Date(n.createdAt instanceof Date ? n.createdAt : Number(n.createdAt)).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => markRead.mutate({ id: n.id })}
                    disabled={markRead.isPending}
                  >
                    Dismiss
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
