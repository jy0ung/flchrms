import { useState } from 'react';
import { Save, Building2, Clock, Bell, Shield } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const SETTINGS_STORAGE_KEY = 'hrms.admin.settings';

interface AppSettings {
  companyName: string;
  timezone: string;
  dateFormat: string;
  emailNotifications: boolean;
  sessionTimeoutMinutes: number;
  maintenanceMode: boolean;
}

const defaultSettings: AppSettings = {
  companyName: 'FL Group',
  timezone: 'Asia/Kuala_Lumpur',
  dateFormat: 'DD/MM/YYYY',
  emailNotifications: true,
  sessionTimeoutMinutes: 30,
  maintenanceMode: false,
};

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: AppSettings) {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export default function AdminSettingsPage() {
  usePageTitle('Admin · Settings');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [dirty, setDirty] = useState(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    saveSettings(settings);
    setDirty(false);
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
    setDirty(false);
    toast.info('Settings reset to defaults');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure application-wide settings and preferences.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>Reset Defaults</Button>
          <Button onClick={handleSave} disabled={!dirty}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* General Settings */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            General
          </CardTitle>
          <CardDescription>Basic company information and locale settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={settings.companyName}
                onChange={(e) => update('companyName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={settings.timezone} onValueChange={(v) => update('timezone', v)}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (GMT+8)</SelectItem>
                  <SelectItem value="Asia/Singapore">Asia/Singapore (GMT+8)</SelectItem>
                  <SelectItem value="Asia/Bangkok">Asia/Bangkok (GMT+7)</SelectItem>
                  <SelectItem value="Asia/Jakarta">Asia/Jakarta (GMT+7)</SelectItem>
                  <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="date-format">Date Format</Label>
            <Select value={settings.dateFormat} onValueChange={(v) => update('dateFormat', v)}>
              <SelectTrigger id="date-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notifications
          </CardTitle>
          <CardDescription>Configure default notification behavior for the system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send email notifications for leave approvals, role changes, and system alerts.
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(v) => update('emailNotifications', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Security
          </CardTitle>
          <CardDescription>Session and access control settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                min={5}
                max={120}
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => update('sessionTimeoutMinutes', parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-muted-foreground">
                Users will be logged out after this period of inactivity.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, only admin users can access the system. All other users will see a maintenance page.
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(v) => update('maintenanceMode', v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
