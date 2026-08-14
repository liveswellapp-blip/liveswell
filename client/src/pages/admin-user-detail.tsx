import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import AdminNav from "@/components/AdminNav";
import { Input } from "@/components/ui/input";
import {
  User, Mail, Calendar, Heart, MapPin, Settings,
  ArrowLeft, Clock, FileText, Trash2, CreditCard,
  ShieldCheck, Activity, FlaskConical,
} from "lucide-react";

interface AdminStatus { authenticated: boolean }

interface UserDetails {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    isPro: boolean;
    isTestAccount: boolean;
    createdAt: string;
    updatedAt: string;
  };
  favorites: Array<{
    id: number;
    name: string;
    city: string;
    state: string;
    country: string;
  }>;
  profile: {
    units: string;
    notifications: boolean;
    language: string;
    theme: string;
  } | null;
  stats: {
    favoritesCount: number;
    joinDate: string;
    lastActivity: string;
  };
}

type Tab = 'overview' | 'favorites' | 'preferences' | 'audit' | 'danger';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',     label: 'Overview',     icon: <Activity className="h-4 w-4" />    },
  { id: 'favorites',    label: 'Favorites',    icon: <Heart className="h-4 w-4" />       },
  { id: 'preferences',  label: 'Preferences',  icon: <Settings className="h-4 w-4" />    },
  { id: 'audit',        label: 'Audit Log',    icon: <FileText className="h-4 w-4" />    },
  { id: 'danger',       label: 'Danger Zone',  icon: <Trash2 className="h-4 w-4" />      },
];

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { toast } = useToast();

  // Check admin auth via session cookie
  const { data: adminStatus, isLoading: authLoading } = useQuery<AdminStatus>({
    queryKey: ['/api/admin/status'],
    retry: false,
    staleTime: 0,
  });

  // Fetch user details
  const { data: userDetails, isLoading: detailsLoading, refetch: refetchUser } = useQuery<UserDetails>({
    queryKey: [`/api/admin/users/${userId}`],
    enabled: !!userId && adminStatus?.authenticated === true,
  });

  // Grant / revoke test account access
  const testAccessMutation = useMutation({
    mutationFn: async (revoke: boolean) => {
      const res = await fetch('/api/admin/grant-test-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: userDetails!.user.email, revoke }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Request failed');
      }
      return res.json();
    },
    onSuccess: (_, revoke) => {
      toast({
        title: revoke ? 'Test access revoked' : 'Test access granted',
        description: revoke
          ? 'User is back on the free plan.'
          : 'User now has Pro access and phone verification bypassed.',
      });
      refetchUser();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getDisplayName = () => {
    if (!userDetails) return '';
    const { firstName, lastName, email } = userDetails.user;
    if (firstName || lastName) return `${firstName || ''} ${lastName || ''}`.trim();
    return email.split('@')[0];
  };

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Checking access…</div>
      </div>
    );
  }

  if (!adminStatus?.authenticated) {
    navigate('/admin');
    return null;
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  const isLoading = detailsLoading || !userDetails;

  // ── Tab content ───────────────────────────────────────────────────────────
  const renderTab = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      );
    }

    const user = userDetails!.user;

    switch (activeTab) {
      // ── Overview ──────────────────────────────────────────────────────────
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{userDetails!.stats.favoritesCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Saved Spots</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{userDetails!.profile?.units ?? '—'}</div>
                  <div className="text-xs text-muted-foreground mt-1">Units</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold capitalize">{userDetails!.profile?.theme ?? '—'}</div>
                  <div className="text-xs text-muted-foreground mt-1">Theme</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    {userDetails!.profile?.notifications ? (
                      <span className="text-green-600">On</span>
                    ) : (
                      <span className="text-muted-foreground">Off</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Notifications</div>
                </CardContent>
              </Card>
            </div>

            {/* Account info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Account Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground font-medium">User ID</dt>
                    <dd className="font-mono text-xs mt-0.5 break-all">{user.id}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium">Email</dt>
                    <dd className="mt-0.5">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium">Joined</dt>
                    <dd className="mt-0.5">{formatDateTime(user.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium">Last Active</dt>
                    <dd className="mt-0.5">{formatDateTime(user.updatedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium">Language</dt>
                    <dd className="mt-0.5">{userDetails!.profile?.language ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium">Plan</dt>
                    <dd className="mt-0.5 flex items-center gap-2">
                      {user.isPro ? (
                        <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
                          ★ Pro{user.isTestAccount ? ' (test)' : ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Free</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Test account access */}
            <Card className={user.isTestAccount ? 'border-amber-500/40 bg-amber-500/5' : ''}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" /> Test Account Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div className="text-sm text-muted-foreground max-w-sm">
                    {user.isTestAccount ? (
                      <p>
                        This account has <span className="text-amber-500 font-medium">test access</span>: Pro features are unlocked and phone verification is bypassed. Use this for App Store / Play Store review.
                      </p>
                    ) : (
                      <p>
                        Grant this account Pro access with phone verification bypassed — intended for App Store and Play Store review teams who can't receive SMS verification codes.
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={user.isTestAccount ? 'outline' : 'default'}
                    disabled={testAccessMutation.isPending}
                    onClick={() => testAccessMutation.mutate(user.isTestAccount)}
                    className="shrink-0"
                  >
                    {testAccessMutation.isPending
                      ? 'Saving…'
                      : user.isTestAccount
                        ? 'Revoke test access'
                        : 'Grant test access'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      // ── Favorites ─────────────────────────────────────────────────────────
      case 'favorites':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                Saved Surf Spots ({userDetails!.favorites.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userDetails!.favorites.length > 0 ? (
                <div className="divide-y">
                  {userDetails!.favorites.map((spot) => (
                    <div key={spot.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="font-medium">{spot.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {spot.city}, {spot.state || spot.country}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-4">No favorite spots saved yet.</p>
              )}
            </CardContent>
          </Card>
        );

      // ── Preferences ───────────────────────────────────────────────────────
      case 'preferences':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" /> App Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userDetails!.profile ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  {[
                    { label: 'Units',         value: userDetails!.profile.units       },
                    { label: 'Language',       value: userDetails!.profile.language    },
                    { label: 'Theme',          value: userDetails!.profile.theme       },
                    { label: 'Notifications',  value: userDetails!.profile.notifications ? 'Enabled' : 'Disabled' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between border rounded-lg px-4 py-3">
                      <span className="text-muted-foreground font-medium">{label}</span>
                      <Badge variant="secondary" className="capitalize">{value}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-4">No preferences recorded for this user.</p>
              )}
            </CardContent>
          </Card>
        );

      // ── Audit Log (placeholder) ───────────────────────────────────────────
      case 'audit':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <FileText className="h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-muted-foreground">Audit log coming soon</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Future: login history, setting changes, alert modifications, and other account events will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      // ── Danger Zone (placeholder) ─────────────────────────────────────────
      case 'danger':
        return (
          <div className="space-y-4">
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <Trash2 className="h-4 w-4" /> Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Delete user */}
                <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div>
                    <p className="font-medium text-sm">Delete account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permanently remove this user and all their data. Cannot be undone.
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" disabled>
                    Delete user
                    <Badge variant="outline" className="ml-2 text-xs border-white/30 text-white">Soon</Badge>
                  </Button>
                </div>

                {/* Suspend */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Suspend account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Block access without deleting data. User can be re-enabled.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Suspend
                    <Badge variant="secondary" className="ml-2 text-xs">Soon</Badge>
                  </Button>
                </div>

                {/* Billing */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Manage billing</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        View subscription, override plan, or issue refunds.
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Billing
                    <Badge variant="secondary" className="ml-2 text-xs">Soon</Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav
        activeSection="user-detail"
        onLogout={() => navigate('/admin')}
      />

      <div className="md:pl-60 pb-24 md:pb-6">
        <div className="container mx-auto max-w-4xl px-4 py-6">

          {/* Back + breadcrumb */}
          <button
            onClick={() => navigate('/admin?view=users')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>

          {/* User header */}
          <div className="flex items-center gap-4 mb-8">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </>
            ) : (
              <>
                {userDetails!.user.profileImageUrl ? (
                  <img
                    src={userDetails!.user.profileImageUrl}
                    alt="Avatar"
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{getDisplayName()}</h1>
                  <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5" />
                    {userDetails!.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Calendar className="h-3 w-3" />
                    Joined {formatDate(userDetails!.user.createdAt)}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 border-b mb-6 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
