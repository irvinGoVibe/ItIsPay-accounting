"use client";

import { useSession } from "next-auth/react";
import { Settings, User, Bell, Link as LinkIcon, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>Your Google account information</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="text-sm font-medium">{session?.user?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm font-medium">{session?.user?.email ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Integrations
          </CardTitle>
          <CardDescription>Connected services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#4285F4"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium">Google Workspace</p>
                  <p className="text-xs text-gray-500">Gmail + Calendar</p>
                </div>
              </div>
              <Badge variant="success">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Anthropic Claude</p>
                  <p className="text-xs text-gray-500">AI briefings &amp; analysis</p>
                </div>
              </div>
              <Badge variant={process.env.NEXT_PUBLIC_HAS_ANTHROPIC ? "success" : "secondary"}>
                {process.env.NEXT_PUBLIC_HAS_ANTHROPIC ? "Configured" : "API Key Required"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Notification preferences (coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            Daily digest and pre-meeting notification settings will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
