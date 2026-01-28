import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Shield, Database, Palette } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function Settings() {
  return (
    <div className="min-h-screen p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your SentinelX dashboard preferences
        </p>
      </motion.header>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Configure alert preferences
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Critical Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications for high-priority incidents
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Patrol Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when patrol status changes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Sound Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Play audio for incoming alerts
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-success/10">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Security</h3>
              <p className="text-sm text-muted-foreground">
                Manage authentication settings
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Two-Factor Auth</Label>
                <p className="text-xs text-muted-foreground">
                  Require 2FA for login
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Session Timeout</Label>
                <p className="text-xs text-muted-foreground">
                  Auto-logout after 30 minutes of inactivity
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </motion.div>

        {/* Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-warning/10">
              <Database className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Data & API</h3>
              <p className="text-sm text-muted-foreground">
                Configure data sources
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-foreground">API Endpoint</Label>
              <p className="text-sm font-mono text-muted-foreground mt-1 p-2 rounded bg-muted/30">
                http://localhost:8000
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Auto-Refresh Data</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically fetch new data every 30 seconds
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <Palette className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Appearance</h3>
              <p className="text-sm text-muted-foreground">
                Customize the interface
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Compact Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Use smaller UI elements
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Animations</Label>
                <p className="text-xs text-muted-foreground">
                  Enable smooth transitions
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button className="bg-primary hover:bg-primary/90">
            Save Changes
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
