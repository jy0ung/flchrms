import { useCallback, useEffect, useRef, useState } from 'react';
import { Save, Building2, Bell, Shield, Palette, X, ImageIcon, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { AdminSettingsLoadingSkeleton } from '@/components/admin/AdminLoadingSkeletons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { ContextChip } from '@/components/system';
import { useBranding, useUpdateBranding, useUploadBrandingAsset, type BrandingUpdate } from '@/hooks/useBranding';
import {
  TENANT_SETTINGS_DEFAULTS,
  useTenantSettings,
  useUpdateTenantSettings,
  type TenantSettings,
} from '@/hooks/useTenantSettings';
import { SummaryRail, type SummaryRailItem } from '@/components/workspace/SummaryRail';
import { UtilityLayout } from '@/layouts/UtilityLayout';

type AppSettings = TenantSettings;

const defaultSettings: AppSettings = TENANT_SETTINGS_DEFAULTS;

const minimumGovernanceReasonLength = 5;

// ── Color presets ────────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { name: 'Blue', value: '221 83% 53%', hex: '#3b82f6' },
  { name: 'Indigo', value: '239 84% 67%', hex: '#6366f1' },
  { name: 'Purple', value: '271 91% 65%', hex: '#a855f7' },
  { name: 'Teal', value: '172 66% 50%', hex: '#14b8a6' },
  { name: 'Emerald', value: '160 84% 39%', hex: '#10b981' },
  { name: 'Orange', value: '25 95% 53%', hex: '#f97316' },
  { name: 'Rose', value: '347 77% 50%', hex: '#e11d48' },
  { name: 'Slate', value: '215 16% 47%', hex: '#64748b' },
] as const;

const SIDEBAR_PRESETS = [
  { name: 'Charcoal', value: '0 0% 3%', hex: '#080808' },
  { name: 'Navy', value: '222 47% 11%', hex: '#0f172a' },
  { name: 'Dark Slate', value: '215 28% 17%', hex: '#1e293b' },
  { name: 'Dark Green', value: '155 30% 10%', hex: '#14362a' },
  { name: 'Dark Purple', value: '263 30% 12%', hex: '#1e1236' },
] as const;

function ColorPicker({
  label,
  presets,
  currentValue,
  onChange,
}: {
  label: string;
  presets: readonly { name: string; value: string; hex: string }[];
  currentValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            title={preset.name}
            onClick={() => onChange(preset.value)}
            className={`h-8 w-8 rounded-full border-2 transition-all ${
              currentValue === preset.value
                ? 'border-foreground ring-2 ring-foreground/20 scale-110'
                : 'border-transparent hover:border-muted-foreground/30'
            }`}
            style={{ backgroundColor: preset.hex }}
          />
        ))}
      </div>
    </div>
  );
}

function LogoUpload({
  label,
  description,
  currentUrl,
  onUpload,
  onRemove,
  isUploading,
}: {
  label: string;
  description: string;
  currentUrl: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      {currentUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30">
          <img
            src={currentUrl}
            alt={label}
            className="h-12 w-12 rounded-md object-contain bg-white p-1 border border-border"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{currentUrl.split('/').pop()}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-destructive">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center justify-center gap-2 w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  usePageTitle('Admin · Settings');
  const { role } = useAuth();
  const { capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);
  const { data: tenantSettings } = useTenantSettings();
  const updateTenantSettings = useUpdateTenantSettings();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [dirty, setDirty] = useState(false);
  const [settingsReason, setSettingsReason] = useState('');

  // ── Branding state ───────────────────────────────────────────────────────
  const { data: branding } = useBranding();
  const updateBranding = useUpdateBranding();
  const uploadAsset = useUploadBrandingAsset();
  const [brandingDraft, setBrandingDraft] = useState<BrandingUpdate | null>(null);
  const [brandingDirty, setBrandingDirty] = useState(false);
  const [brandingReason, setBrandingReason] = useState('');

  // Initialize draft from fetched branding
  const effectiveBranding = {
    company_name: brandingDraft?.company_name ?? branding?.company_name ?? 'FL Group',
    company_tagline: brandingDraft?.company_tagline ?? branding?.company_tagline ?? 'HR Management System',
    primary_color: brandingDraft?.primary_color ?? branding?.primary_color ?? '221 83% 53%',
    accent_color: brandingDraft?.accent_color ?? branding?.accent_color ?? '142 71% 45%',
    sidebar_color: brandingDraft?.sidebar_color ?? branding?.sidebar_color ?? '0 0% 3%',
    logo_url: brandingDraft?.logo_url !== undefined ? brandingDraft.logo_url : branding?.logo_url ?? null,
    favicon_url: brandingDraft?.favicon_url !== undefined ? brandingDraft.favicon_url : branding?.favicon_url ?? null,
  };

  const updateBrandingDraft = useCallback(<K extends keyof BrandingUpdate>(key: K, value: BrandingUpdate[K]) => {
    setBrandingDraft((prev) => ({ ...prev, [key]: value }));
    setBrandingDirty(true);
  }, []);

  const handleUploadLogo = useCallback(async (file: File) => {
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `logo/company-logo.${ext}`;
      const url = await uploadAsset.mutateAsync({ file, path });
      updateBrandingDraft('logo_url', url);
    } catch {
      // Error toast is handled by the mutation's onError
    }
  }, [uploadAsset, updateBrandingDraft]);

  const handleUploadFavicon = useCallback(async (file: File) => {
    try {
      const ext = file.name.split('.').pop() || 'ico';
      const path = `favicon/company-favicon.${ext}`;
      const url = await uploadAsset.mutateAsync({ file, path });
      updateBrandingDraft('favicon_url', url);
    } catch {
      // Error toast is handled by the mutation's onError
    }
  }, [uploadAsset, updateBrandingDraft]);

  const handleSaveBranding = () => {
    if (!brandingDraft) return;
    updateBranding.mutate({ updates: brandingDraft, reason: brandingReason.trim() }, {
      onSuccess: () => {
        setBrandingDraft(null);
        setBrandingDirty(false);
        setBrandingReason('');
      },
    });
  };

  useEffect(() => {
    if (!dirty && tenantSettings) {
      setSettings((current) => (
        current.id === tenantSettings.id
        && current.timezone === tenantSettings.timezone
        && current.dateFormat === tenantSettings.dateFormat
        && current.emailNotificationsEnabled === tenantSettings.emailNotificationsEnabled
        && current.sessionTimeoutMinutes === tenantSettings.sessionTimeoutMinutes
        && current.maintenanceMode === tenantSettings.maintenanceMode
      ) ? current : tenantSettings);
    }
  }, [tenantSettings, dirty]);

  // ── Tenant settings ──────────────────────────────────────────────────────
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    updateTenantSettings.mutate(
      {
        updates: {
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,
          emailNotificationsEnabled: settings.emailNotificationsEnabled,
          sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
          maintenanceMode: settings.maintenanceMode,
        },
        reason: settingsReason.trim(),
      },
      {
        onSuccess: () => {
          setDirty(false);
          setSettingsReason('');
        },
      },
    );
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setDirty(true);
    setSettingsReason('');
  };

  const brandingAssetCount = Number(Boolean(effectiveBranding.logo_url)) + Number(Boolean(effectiveBranding.favicon_url));
  const hasValidBrandingReason = brandingReason.trim().length >= minimumGovernanceReasonLength;
  const hasValidSettingsReason = settingsReason.trim().length >= minimumGovernanceReasonLength;
  const summaryItems: SummaryRailItem[] = [
    {
      id: 'branding-assets',
      label: 'Branding assets',
      value: brandingAssetCount,
      helper: brandingAssetCount > 0 ? 'Logo and favicon currently configured.' : 'No uploaded branding assets yet.',
    },
    {
      id: 'email-defaults',
      label: 'Email defaults',
      value: settings.emailNotificationsEnabled ? 'Enabled' : 'Paused',
      helper: 'Tenant-wide notification default for governed workflows.',
    },
    {
      id: 'session-timeout',
      label: 'Session timeout',
      value: `${settings.sessionTimeoutMinutes} min`,
      helper: 'Applied to authenticated sessions across the web app.',
    },
    {
      id: 'maintenance-mode',
      label: 'Maintenance mode',
      value: settings.maintenanceMode ? 'On' : 'Off',
      helper: 'Restricts the app to admin-only access while active.',
    },
  ];

  if (capabilitiesLoading) {
    return (
      <UtilityLayout
        eyebrow="Governance"
        title="System Settings"
        description="Manage tenant branding and platform defaults from one governance surface."
        metaSlot={(
          <>
            <ContextChip tone="info">Scope: tenant-wide</ContextChip>
            <ContextChip>Mode: governance controls</ContextChip>
          </>
        )}
      >
        <AdminSettingsLoadingSkeleton
          title="Loading system settings"
          description="Checking settings capabilities and preparing the latest tenant configuration."
        />
      </UtilityLayout>
    );
  }

  if (!capabilities.canManageAdminSettings) {
    return (
      <AdminAccessDenied
        title="Admin settings are disabled"
        description="Your account does not have the capability to manage admin settings."
      />
    );
  }

  return (
    <UtilityLayout
      eyebrow="Governance"
      title="System Settings"
      description="Manage tenant branding and platform defaults from one governance surface."
      metaSlot={(
        <>
          <ContextChip tone="info">Scope: tenant-wide</ContextChip>
          <ContextChip>Mode: editable governance</ContextChip>
        </>
      )}
      actionsSlot={(
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={handleReset}>Reset Tenant Defaults</Button>
          <Button onClick={handleSave} disabled={!dirty || !hasValidSettingsReason || updateTenantSettings.isPending}>
            {updateTenantSettings.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Tenant Settings
          </Button>
        </div>
      )}
      leadSlot={(
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current workspace
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Tenant identity and platform defaults
            </h2>
            <p className="text-sm text-muted-foreground">
              Update company branding and the tenant-wide defaults that govern locale guidance, notification defaults, session policy, and maintenance access.
            </p>
          </section>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Change impact
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Tenant-wide changes apply here
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Branding updates affect the live tenant identity. Session timeout and maintenance mode are enforced across the application, while locale and notification defaults provide the governed baseline for the tenant.
            </p>
          </div>
        </div>
      )}
      summarySlot={<SummaryRail items={summaryItems} variant="subtle" compactBreakpoint="xl" />}
      supportingSlot={(
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Governance notes
          </p>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-sm font-medium text-foreground">Save deliberately</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Branding and tenant settings are audited governance actions. Record a concise reason before saving so future reviewers understand why the tenant-wide default changed.
            </p>
          </div>
        </section>
      )}
      supportingSurface="none"
    >
      <section className="space-y-6">

      {/* ── Branding Section ─────────────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                Company Branding
              </CardTitle>
              <CardDescription>Customize your company identity, logo, and theme colors.</CardDescription>
            </div>
            {brandingDirty && (
              <Button
                size="sm"
                onClick={handleSaveBranding}
                disabled={updateBranding.isPending || !hasValidBrandingReason}
              >
                {updateBranding.isPending ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Save className="mr-2 h-3 w-3" />
                )}
                Save Branding
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
            <Label htmlFor="branding-governance-reason">Governance reason</Label>
            <Textarea
              id="branding-governance-reason"
              value={brandingReason}
              onChange={(e) => setBrandingReason(e.target.value)}
              placeholder="Explain why this branding change is needed..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Required for the audit trail. Minimum {minimumGovernanceReasonLength} characters before branding changes can be saved.
            </p>
          </div>

          {/* Company Identity */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="branding-company-name">Company Name</Label>
              <Input
                id="branding-company-name"
                value={effectiveBranding.company_name}
                onChange={(e) => updateBrandingDraft('company_name', e.target.value)}
                placeholder="FL Group"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branding-tagline">Tagline / Subtitle</Label>
              <Input
                id="branding-tagline"
                value={effectiveBranding.company_tagline ?? ''}
                onChange={(e) => updateBrandingDraft('company_tagline', e.target.value || null)}
                placeholder="HR Management System"
              />
            </div>
          </div>

          <Separator />

          {/* Logos */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <LogoUpload
              label="Company Logo"
              description="Shown in the sidebar and login page. PNG, JPG, SVG, or WebP."
              currentUrl={effectiveBranding.logo_url}
              onUpload={handleUploadLogo}
              onRemove={() => updateBrandingDraft('logo_url', null)}
              isUploading={uploadAsset.isPending}
            />
            <LogoUpload
              label="Favicon"
              description="Browser tab icon. 32×32px PNG or ICO recommended."
              currentUrl={effectiveBranding.favicon_url}
              onUpload={handleUploadFavicon}
              onRemove={() => updateBrandingDraft('favicon_url', null)}
              isUploading={uploadAsset.isPending}
            />
          </div>

          <Separator />

          {/* Theme Colors */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Theme Colors</h4>
              <p className="text-xs text-muted-foreground">
                Changes apply instantly across the entire application.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <ColorPicker
                label="Primary Color"
                presets={COLOR_PRESETS}
                currentValue={effectiveBranding.primary_color}
                onChange={(v) => updateBrandingDraft('primary_color', v)}
              />
              <ColorPicker
                label="Accent Color"
                presets={COLOR_PRESETS}
                currentValue={effectiveBranding.accent_color}
                onChange={(v) => updateBrandingDraft('accent_color', v)}
              />
              <ColorPicker
                label="Sidebar Color"
                presets={SIDEBAR_PRESETS}
                currentValue={effectiveBranding.sidebar_color}
                onChange={(v) => updateBrandingDraft('sidebar_color', v)}
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/30 px-4 py-2 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground">Live Preview</p>
            </div>
            <div className="flex h-32">
              {/* Mini sidebar preview */}
              <div
                className="w-14 flex flex-col items-center pt-3 gap-2"
                style={{ backgroundColor: `hsl(${effectiveBranding.sidebar_color})` }}
              >
                {effectiveBranding.logo_url ? (
                  <img
                    src={effectiveBranding.logo_url}
                    alt="Logo"
                    className="h-6 w-6 rounded object-cover"
                  />
                ) : (
                  <div
                    className="h-6 w-6 rounded flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: `hsl(${effectiveBranding.primary_color})` }}
                  >
                    {effectiveBranding.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="h-1.5 w-6 rounded-full bg-white/10" />
                <div className="h-1.5 w-6 rounded-full bg-white/10" />
                <div
                  className="h-1.5 w-6 rounded-full"
                  style={{ backgroundColor: `hsl(${effectiveBranding.primary_color} / 0.6)` }}
                />
                <div className="h-1.5 w-6 rounded-full bg-white/10" />
              </div>
              {/* Mini content preview */}
              <div className="flex-1 bg-background p-3">
                <div className="space-y-2">
                  <div className="h-2 w-24 rounded bg-foreground/80" />
                  <div className="h-1.5 w-16 rounded bg-muted-foreground/30" />
                  <div className="flex gap-2 mt-3">
                    <div
                      className="h-6 w-16 rounded text-[9px] font-medium text-white flex items-center justify-center"
                      style={{ backgroundColor: `hsl(${effectiveBranding.primary_color})` }}
                    >
                      Button
                    </div>
                    <div
                      className="h-6 w-14 rounded text-[9px] font-medium text-white flex items-center justify-center"
                      style={{ backgroundColor: `hsl(${effectiveBranding.accent_color})` }}
                    >
                      Accent
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── General Settings ─────────────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            General
          </CardTitle>
          <CardDescription>Tenant-wide locale and display defaults that administrators govern centrally.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
            <Label htmlFor="tenant-settings-governance-reason">Governance reason for tenant defaults</Label>
            <Textarea
              id="tenant-settings-governance-reason"
              value={settingsReason}
              onChange={(e) => setSettingsReason(e.target.value)}
              placeholder="Explain why these tenant-wide settings need to change..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Required for the audit trail. Minimum {minimumGovernanceReasonLength} characters before tenant settings can be saved.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
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
          <CardDescription>Governed notification defaults that define the tenant baseline for email-enabled workflows.</CardDescription>
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
              checked={settings.emailNotificationsEnabled}
              onCheckedChange={(v) => update('emailNotificationsEnabled', v)}
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
          <CardDescription>Tenant-wide session and maintenance controls enforced across the live application.</CardDescription>
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
      </section>
    </UtilityLayout>
  );
}
