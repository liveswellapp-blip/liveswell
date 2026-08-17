import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User, ArrowLeft, ChevronRight } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserDetails {
  user: User;
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

interface UserStats {
  totalUsers: number;
  newUsersThisMonth: number;
  activeUsers: number;
  topLocations: Array<{name: string; favoriteCount: number}>;
}

interface UserDatabaseProps {
  onClose: () => void;
}

export default function UserDatabase({ onClose }: UserDatabaseProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [, navigate] = useLocation();

  // Fetch user statistics
  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['/api/admin/user-stats'],
    refetchInterval: 60000,
  });

  // Fetch all users with search.
  // NOTE: must use a custom queryFn — the default joins the key with "/" which
  // turns ['/api/admin/users', ''] into "/api/admin/users/" and hits the wrong route.
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users', searchTerm],
    queryFn: async () => {
      const url = searchTerm
        ? `/api/admin/users?search=${encodeURIComponent(searchTerm)}`
        : '/api/admin/users';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  // Main User Database View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Database</h2>
          <p className="text-muted-foreground">Manage and view all user accounts</p>
        </div>
        <Button onClick={onClose} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : userStats?.totalUsers || 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : userStats?.newUsersThisMonth || 0}
            </div>
            <p className="text-sm text-muted-foreground">New This Month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : userStats?.activeUsers || 0}
            </div>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : userStats?.topLocations?.[0]?.favoriteCount || 0}
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
                      <p className="font-medium">{getUserDisplayName(user)}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Joined: {formatDate(user.createdAt)}</p>
                    <p>Last active: {formatDate(user.updatedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm ? 'No users found matching your search' : 'No users found'}
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
    </div>
  );
}