import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import AdminNav from "@/components/AdminNav";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User, Mail, Calendar, Heart, MapPin, Settings,
  ArrowLeft, Clock, FileText, Trash2, CreditCard,
  ShieldCheck, Activity, FlaskConical, Pencil, Ban,
  Bell, Star, Phone,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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
    isSuspended: boolean;
    whopMembershipId: string | null;
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const queryClient = useQueryClient();

  // Refresh both the user details and the audit timeline after admin mutations.
  const refreshUser = () => {
    refetchUser();
    queryClient.invalidateQueries({ queryKey: ['/api/admin/users', userId, 'audit'] });
  };

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
      refreshUser();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Delete user (cascade + Clerk)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Failed to delete user');
      }
    },
    onSuccess: () => {
      toast({ title: 'User deleted', description: 'The account and all its data have been permanently removed.' });
      navigate('/admin?view=users');
    },
    onError: (err: Error) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    },
  });

  // Suspend / unsuspend
  const suspendMutation = useMutation({
    mutationFn: async (suspend: boolean) => {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ suspend }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Request failed');
      }
      return res.json();
    },
    onSuccess: (_, suspend) => {
      toast({
        title: suspend ? 'Account suspended' : 'Account unsuspended',
        description: suspend
          ? 'All API access is now blocked for this user.'
          : 'Access has been restored.',
      });
      refreshUser();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Grant / revoke complimentary Pro
  const planOverrideMutation = useMutation({
    mutationFn: async (grantPro: boolean) => {
      const res = await fetch(`/api/admin/users/${userId}/plan-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ grantPro }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Request failed');
      }
      return res.json();
    },
    onSuccess: (_, grantPro) => {
      toast({
        title: grantPro ? 'Pro plan granted' : 'Comp revoked',
        description: grantPro
          ? 'User now has complimentary Pro access.'
          : 'User is back on the free plan.',
      });
      refreshUser();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Edit profile (name + email)
  const profileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Request failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Profile updated', description: 'Name and email saved to the database and Clerk.' });
      setEditingProfile(false);
      refreshUser();
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });

  const startEditingProfile = () => {
    if (!userDetails) return;
    setEditFirstName(userDetails.user.firstName ?? '');
    setEditLastName(userDetails.user.lastName ?? '');
    setEditEmail(userDetails.user.email ?? '');
    setEditingProfile(true);
  };

  const getPlanLabel = (u: UserDetails['user']) => {
    if (u.whopMembershipId) return { label: 'Pro via Whop', className: 'text-amber-500 font-semibold' };
    if (u.isPro && u.isTestAccount) return { label: 'Pro (test)', className: 'text-amber-500 font-semibold' };
    if (u.isPro) return { label: 'Pro (comped)', className: 'text-amber-500 font-semibold' };
    return { label: 'Free', className: 'text-muted-foreground' };
  };

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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Account Details
                  </CardTitle>
                  {!editingProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startEditingProfile}
                      data-testid="button-edit-profile"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingProfile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground font-medium">First name</label>
                        <Input
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          className="mt-1"
                          data-testid="input-edit-first-name"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground font-medium">Last name</label>
                        <Input
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          className="mt-1"
                          data-testid="input-edit-last-name"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm text-muted-foreground font-medium">Email</label>
                        <Input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="mt-1"
                          data-testid="input-edit-email"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Changes sync to the user's Clerk sign-in account. The new email must not already be in use.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => profileMutation.mutate()}
                        disabled={profileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {profileMutation.isPending ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingProfile(false)}
                        disabled={profileMutation.isPending}
                        data-testid="button-cancel-profile"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
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
                    <dt className="text-muted-foreground font-medium">Name</dt>
                    <dd className="mt-0.5">{[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}</dd>
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
                      <span className={`inline-flex items-center gap-1 ${getPlanLabel(user).className}`} data-testid="text-plan-status">
                        {user.isPro && '★ '}{getPlanLabel(user).label}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium">Status</dt>
                    <dd className="mt-0.5">
                      {user.isSuspended ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : (
                        <span className="text-green-600">Active</span>
                      )}
                    </dd>
                  </div>
                </dl>
                )}
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

      // ── Audit Log ─────────────────────────────────────────────────────────
      case 'audit':
        return <AuditLogTab userId={userId!} />;

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
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => setDeleteDialogOpen(true)}
                    data-testid="button-delete-user"
                  >
                    {deleteMutation.isPending ? 'Deleting…' : 'Delete user'}
                  </Button>
                </div>

                {/* Suspend */}
                <div className={`flex items-center justify-between rounded-lg border p-4 ${user.isSuspended ? 'border-red-500/40 bg-red-500/5' : ''}`}>
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      <Ban className="h-3.5 w-3.5 text-muted-foreground" />
                      {user.isSuspended ? 'Account suspended' : 'Suspend account'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {user.isSuspended
                        ? 'All API access is blocked for this user. Unsuspend to restore access immediately.'
                        : 'Block access without deleting data. User can be re-enabled at any time.'}
                    </p>
                  </div>
                  <Button
                    variant={user.isSuspended ? 'default' : 'outline'}
                    size="sm"
                    disabled={suspendMutation.isPending}
                    onClick={() => suspendMutation.mutate(!user.isSuspended)}
                    data-testid="button-toggle-suspend"
                  >
                    {suspendMutation.isPending
                      ? 'Saving…'
                      : user.isSuspended ? 'Unsuspend' : 'Suspend'}
                  </Button>
                </div>

                {/* Plan override (comp) */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">
                        Plan override — current: <span className="font-semibold">{getPlanLabel(user).label}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {user.whopMembershipId
                          ? 'This user pays through Whop. A comp cannot be revoked here — it would cancel a paying plan.'
                          : user.isPro
                            ? 'Revoke the complimentary Pro plan to return this user to Free.'
                            : 'Grant a complimentary Pro plan without going through Whop. Does not enable test-account bypasses.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={user.isPro ? 'outline' : 'default'}
                    size="sm"
                    disabled={planOverrideMutation.isPending || (!!user.whopMembershipId && user.isPro)}
                    onClick={() => planOverrideMutation.mutate(!user.isPro)}
                    data-testid="button-plan-override"
                  >
                    {planOverrideMutation.isPending
                      ? 'Saving…'
                      : user.isPro ? 'Revoke comp' : 'Grant Pro'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Delete confirmation dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {getDisplayName()}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all their alerts, favorites, and data,
                    and remove their sign-in account so they cannot log back in.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteMutation.mutate()}
                    data-testid="button-confirm-delete"
                  >
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    {getDisplayName()}
                    {userDetails!.user.isSuspended && (
                      <Badge variant="destructive" data-testid="badge-suspended">Suspended</Badge>
                    )}
                  </h1>
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

// ── Audit Log tab ───────────────────────────────────────────────────────────

interface AuditEvent {
  type: string;
  timestamp: string;
  description: string;
  meta?: Record<string, unknown>;
}

interface AuditResponse {
  events: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

const AUDIT_ICONS: Record<string, React.ReactNode> = {
  account_created: <User className="h-4 w-4 text-blue-600" />,
  alert_created:   <Bell className="h-4 w-4 text-emerald-600" />,
  alert_updated:   <Bell className="h-4 w-4 text-amber-600" />,
  alert_fired:     <Bell className="h-4 w-4 text-red-500" />,
  spot_favorited:  <MapPin className="h-4 w-4 text-pink-500" />,
  pro_granted:     <Star className="h-4 w-4 text-yellow-500" />,
  pro_revoked:     <Star className="h-4 w-4 text-muted-foreground" />,
  phone_verified:  <Phone className="h-4 w-4 text-indigo-500" />,
};

function AuditLogTab({ userId }: { userId: string }) {
  const pageSize = 20;

  // True sequential pagination: each "Load more" fetches the next page and
  // appends it. Keyed as ['/api/admin/users', userId, 'audit'] so admin
  // mutations can invalidate the whole audit history by prefix.
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<AuditResponse>({
    queryKey: ['/api/admin/users', userId, 'audit'],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/admin/users/${userId}/audit?page=${pageParam}&pageSize=${pageSize}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
  });

  const events = data?.pages.flatMap((p) => p.events) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const hasMore = hasNextPage ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> Audit Log
          {data && (
            <Badge variant="secondary" className="ml-1">{total} events</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4 py-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive py-4">Failed to load audit log.</p>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No activity recorded yet</p>
          </div>
        ) : (
          <>
            <ol className="relative space-y-0" data-testid="audit-timeline">
              {events.map((event, i) => (
                <li
                  key={`${event.type}-${event.timestamp}-${i}`}
                  className="relative flex items-start gap-3 pb-6 last:pb-0"
                  data-testid={`audit-event-${i}`}
                >
                  {/* vertical connector */}
                  {i < events.length - 1 && (
                    <span className="absolute left-4 top-8 bottom-0 w-px bg-border" aria-hidden />
                  )}
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                    {AUDIT_ICONS[event.type] ?? <FileText className="h-4 w-4 text-muted-foreground" />}
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="text-sm font-medium leading-snug">{event.description}</p>
                    <p
                      className="text-xs text-muted-foreground mt-0.5"
                      title={format(new Date(event.timestamp), 'PPpp')}
                    >
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {hasMore && (
              <div className="pt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  data-testid="button-load-more-audit"
                >
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
