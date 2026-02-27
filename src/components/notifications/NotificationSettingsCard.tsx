import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  useNotificationPreferences,
  type NotificationPreferenceCategory,
} from '@/hooks/useNotifications';
import { toast } from '@/hooks/use-toast';
import { CardHeaderStandard } from '@/components/system';
import {
  getFloatingNotificationsVisible,
  setFloatingNotificationsVisible,
  UI_PREFERENCES_CHANGED_EVENT,
  FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY,
} from '@/lib/ui-preferences';

interface NotificationSettingsCardProps {
  showHeader?: boolean;
}

export function NotificationSettingsCard({ showHeader = true }: NotificationSettingsCardProps) {
  const [showFloatingNotificationsWidget, setShowFloatingNotificationsWidget] = useState(
    getFloatingNotificationsVisible,
  );
  const {
    preferences,
    isLoading: preferencesLoading,
    isUpdating: preferencesUpdating,
    updateCategoryEnabled,
    updateEmailCategoryEnabled,
  } = useNotificationPreferences();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sync = () => setShowFloatingNotificationsWidget(getFloatingNotificationsVisible());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY) {
        sync();
      }
    };

    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, sync as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, sync as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleToggleCategoryPreference = async (
    category: NotificationPreferenceCategory,
    enabled: boolean,
  ) => {
    try {
      await updateCategoryEnabled(category, enabled);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      toast({
        title: 'Unable to update preferences',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleEmailCategoryPreference = async (
    category: NotificationPreferenceCategory,
    enabled: boolean,
  ) => {
    try {
      await updateEmailCategoryEnabled(category, enabled);
    } catch (error) {
      console.error('Failed to update email notification preferences:', error);
      toast({
        title: 'Unable to update email preferences',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const preferenceRows: Array<{
    key: NotificationPreferenceCategory;
    label: string;
    description: string;
    checked: boolean;
  }> = [
    {
      key: 'leave',
      label: 'Leave Workflow',
      description: 'Approvals, rejections, cancellation requests, and workflow stage notifications.',
      checked: preferences?.leave_enabled ?? true,
    },
    {
      key: 'admin',
      label: 'Workflow Configuration',
      description: 'Leave approval/cancellation workflow builder changes in HR Admin.',
      checked: preferences?.admin_enabled ?? true,
    },
    {
      key: 'system',
      label: 'System',
      description: 'General system-level notifications (reserved for future use).',
      checked: preferences?.system_enabled ?? true,
    },
  ];

  const emailPreferenceRows: Array<{
    key: NotificationPreferenceCategory;
    label: string;
    description: string;
    checked: boolean;
  }> = [
    {
      key: 'leave',
      label: 'Leave Workflow Emails',
      description: 'Queue email delivery for leave workflow notifications.',
      checked: preferences?.email_leave_enabled ?? false,
    },
    {
      key: 'admin',
      label: 'Workflow Config Emails',
      description: 'Queue email delivery for workflow builder configuration changes.',
      checked: preferences?.email_admin_enabled ?? false,
    },
    {
      key: 'system',
      label: 'System Emails',
      description: 'Queue email delivery for general system notifications (reserved for future use).',
      checked: preferences?.email_system_enabled ?? false,
    },
  ];

  return (
    <Card className="card-stat border-border/60 shadow-sm">
      {showHeader && (
        <CardHeaderStandard
          title="Notification Preferences"
          description="Notification categories and queued email delivery settings."
          className="p-6 pb-4"
          titleClassName="text-base"
        />
      )}
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Workspace UI
          </p>
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Label htmlFor="floating_notifications_widget" className="text-sm font-medium">
                Floating Notification Button
              </Label>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Show the quick notification widget in the top-right corner while browsing the app.
              </p>
            </div>
            <div className="self-end sm:self-auto">
              <Switch
                id="floating_notifications_widget"
                checked={showFloatingNotificationsWidget}
                onCheckedChange={(checked) => {
                  setShowFloatingNotificationsWidget(checked);
                  setFloatingNotificationsVisible(checked);
                }}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            In-App Notifications
          </p>
          <div className="space-y-3">
            {preferenceRows.map((row) => (
              <div
                key={row.key}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Label htmlFor={`notification_pref_${row.key}`} className="text-sm font-medium">
                    {row.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{row.description}</p>
                </div>
                <div className="self-end sm:self-auto">
                  <Switch
                    id={`notification_pref_${row.key}`}
                    checked={row.checked}
                    disabled={preferencesLoading || preferencesUpdating}
                    onCheckedChange={(checked) => void handleToggleCategoryPreference(row.key, checked)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Email Delivery Queue
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            These settings queue notification emails for background delivery. Delivery worker integration is configurable and may be disabled in some environments.
          </p>
          <div className="space-y-3">
            {emailPreferenceRows.map((row) => (
              <div
                key={`email_${row.key}`}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Label htmlFor={`email_notification_pref_${row.key}`} className="text-sm font-medium">
                    {row.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{row.description}</p>
                </div>
                <div className="self-end sm:self-auto">
                  <Switch
                    id={`email_notification_pref_${row.key}`}
                    checked={row.checked}
                    disabled={preferencesLoading || preferencesUpdating}
                    onCheckedChange={(checked) => void handleToggleEmailCategoryPreference(row.key, checked)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
