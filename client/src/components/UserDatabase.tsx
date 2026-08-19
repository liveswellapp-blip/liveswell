import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, User, ArrowLeft, ChevronRight, UserPlus, Loader2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  totalUsers: number;
  newUsersThisMonth: number;
  activeUsers: number;
  topLocations: Array<{ name: string; favoriteCount: number }>;
}

interface CreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  grantPro: boolean;
}

const emptyForm = (): CreateUserForm => ({
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  grantPro: false,
});

interface UserDatabaseProps {
  onClose: () => void;
}

export default function UserDatabase({ onClose }: UserDatabaseProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState<CreateUserForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/admin/user-stats"],
    refetchInterval: 60000,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users", searchTerm],
    queryFn: async () => {
      const url = searchTerm
        ? `/api/admin/users?search=${encodeURIComponent(searchTerm)}`
        : "/api/admin/users";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    refetchInterval: 30000,
  });

  // ── Create user mutation ─────────────────────────────────────────────────
  const createUserMutation = useMutation({
    mutationFn: async (data: Omit<CreateUserForm, "confirmPassword">) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          phoneNumber: data.phoneNumber.trim(),
          password: data.password,
          firstName: data.firstName.trim() || null,
          lastName: data.lastName.trim() || null,
          grantPro: data.grantPro,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to create user");
      }
      return res.json() as Promise<User>;
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-stats"] });
      setShowCreateDialog(false);
      setForm(emptyForm());
      setFormError(null);
      // Navigate directly to the new user's detail page
      navigate(`/admin/users/${newUser.id}`);
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.email.trim()) {
      setFormError("Email address is required.");
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(form.phoneNumber.trim())) {
      setFormError("Enter a phone number in international format, for example +14155552671.");
      return;
    }
    if (form.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    const { confirmPassword, ...payload } = form;
    createUserMutation.mutate(payload);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setForm(emptyForm());
      setFormError(null);
    }
    setShowCreateDialog(open);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const getUserDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    }
    return user.email.split("@")[0];
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Database</h2>
          <p className="text-muted-foreground">Manage and view all user accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateDialog(true)} data-testid="btn-create-user">
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
          <Button onClick={onClose} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : userStats?.totalUsers ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : userStats?.newUsersThisMonth ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">New This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : userStats?.activeUsers ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                userStats?.topLocations?.[0]?.favoriteCount ?? 0
              )}
            </div>
            <p className="text-sm text-muted-foreground">Top Spot Favorites</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by email, first name, or last name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-user-search"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  data-testid={`user-row-${user.id}`}
                >
                  <div className="flex items-center space-x-4">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {getUserDisplayName(user)}
                        {user.isSuspended && (
                          <Badge variant="destructive" data-testid={`badge-suspended-${user.id}`}>
                            Suspended
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Joined: {formatDate(user.createdAt)}</p>
                      <p>Last active: {formatDate(user.updatedAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm ? "No users found matching your search" : "No users found"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Locations */}
      {userStats?.topLocations && userStats.topLocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Surf Spots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userStats.topLocations.map((location, index) => (
                <div key={location.name} className="flex items-center justify-between p-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{index + 1}</Badge>
                    <span className="font-medium">{location.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {location.favoriteCount} favorites
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Create User Dialog ─────────────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cu-first">First Name</Label>
                <Input
                  id="cu-first"
                  placeholder="Jane"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  disabled={createUserMutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cu-last">Last Name</Label>
                <Input
                  id="cu-last"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  disabled={createUserMutation.isPending}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="cu-email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cu-email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={createUserMutation.isPending}
                required
                autoComplete="off"
              />
            </div>

            {/* Phone number */}
            <div className="space-y-1.5">
              <Label htmlFor="cu-phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cu-phone"
                type="tel"
                placeholder="+14155552671"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                disabled={createUserMutation.isPending}
                required
                autoComplete="tel"
              />
              <p className="text-xs text-muted-foreground">
                Required by the sign-in provider. Use the user&apos;s number in international format.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="cu-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cu-password"
                type="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                disabled={createUserMutation.isPending}
                required
                autoComplete="new-password"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="cu-confirm">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cu-confirm"
                type="password"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                disabled={createUserMutation.isPending}
                required
                autoComplete="new-password"
              />
            </div>

            {/* Grant Pro */}
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="cu-pro"
                checked={form.grantPro}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, grantPro: checked === true }))
                }
                disabled={createUserMutation.isPending}
              />
              <Label htmlFor="cu-pro" className="cursor-pointer font-normal">
                Grant complimentary Pro access
              </Label>
            </div>

            {/* Welcome email notice */}
            <p className="text-xs text-muted-foreground pt-1">
              📧 A welcome email with sign-in instructions will be sent to the address above.
            </p>

            {/* Error */}
            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={createUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
