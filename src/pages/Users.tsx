import { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { usersService } from '../services/api/users.service';
import { authService } from '../services/api/auth.service';
import { UserForm } from '../components/features/users/UserForm';
import type { User, UserProfile, LoginHistory, ActivityLog } from '../types/user.types';
import type { AdminSignUpFormData } from '../utils/validators';
import { formatDate, formatDateTime } from '../utils/formatters';
import { requestCache } from '../utils/requestCache';
import { Search, Trophy, Award, Eye, Edit, Plus } from 'lucide-react';

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCreateUserLoading, setIsCreateUserLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'gamification' | 'history' | 'activity'>('profile');
  const [xpAmount, setXpAmount] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Debounce search to prevent too many requests
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadUsers();
    }, 300); // Wait 300ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const cacheKey = `users-${searchTerm || 'all'}`;
      const response = await requestCache.get(
        cacheKey,
        () => usersService.getUsers({ search: searchTerm, limit: 100 }),
        10000 // 10 second cache
      );
      setUsers(response.items || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      // Endpoint may not exist - show empty state
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserDetails = async (userId: number) => {
    try {
      const [profile, history, logs] = await Promise.all([
        usersService.getUserById(userId),
        usersService.getLoginHistory(userId, { limit: 20 }),
        usersService.getActivityLogs(userId, { limit: 20 }),
      ]);
      setSelectedUser(profile);
      setLoginHistory(history.items || []);
      setActivityLogs(logs.items || []);
    } catch (error) {
      console.error('Failed to load user details:', error);
    }
  };

  const handleViewUser = async (user: User) => {
    await loadUserDetails(user.id);
    setIsDetailModalOpen(true);
    setActiveTab('profile');
  };

  const handleAssignXP = async () => {
    if (!selectedUser || !xpAmount) return;
    try {
      await usersService.assignXP(selectedUser.id, Number(xpAmount));
      alert('XP assigned successfully');
      setXpAmount('');
      await loadUserDetails(selectedUser.id);
    } catch (error) {
      alert('Failed to assign XP');
      console.error(error);
    }
  };

  const handleAssignBadge = async () => {
    if (!selectedUser || !badgeId) return;
    try {
      await usersService.assignBadge(selectedUser.id, Number(badgeId));
      alert('Badge assigned successfully');
      setBadgeId('');
      await loadUserDetails(selectedUser.id);
    } catch (error) {
      alert('Failed to assign badge');
      console.error(error);
    }
  };

  const handleCreateUser = async (data: AdminSignUpFormData) => {
    try {
      setIsCreateUserLoading(true);
      await authService.adminSignUp(data);
      alert('User created successfully');
      setIsCreateUserModalOpen(false);
      // Clear cache and reload users
      requestCache.clear();
      await loadUsers();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create user';
      alert(errorMessage);
      console.error('Failed to create user:', error);
    } finally {
      setIsCreateUserLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage all users and their accounts</p>
        </div>
        <Button onClick={() => setIsCreateUserModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table isLoading={isLoading} emptyMessage="No users found">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      user.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleViewUser(user)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedUser(null);
        }}
        title={selectedUser ? `User: ${selectedUser.email}` : 'User Details'}
        size="xl"
      >
        {selectedUser && (
          <div>
            <div className="flex border-b border-gray-200 mb-4">
              {['profile', 'gamification', 'history', 'activity'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <p className="text-gray-900">{selectedUser.role}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <p className={selectedUser.isActive ? 'text-green-600' : 'text-red-600'}>
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gamification' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">XP</label>
                    <p className="text-2xl font-bold text-gray-900">{selectedUser.xp || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Badges</label>
                    <p className="text-2xl font-bold text-gray-900">{selectedUser.badges?.length || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Streaks</label>
                    <p className="text-2xl font-bold text-gray-900">{selectedUser.streaks?.length || 0}</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign XP</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="XP amount"
                        value={xpAmount}
                        onChange={(e) => setXpAmount(e.target.value)}
                      />
                      <Button onClick={handleAssignXP}>
                        <Trophy className="w-4 h-4 mr-2" />
                        Assign
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign Badge</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Badge ID"
                        value={badgeId}
                        onChange={(e) => setBadgeId(e.target.value)}
                      />
                      <Button onClick={handleAssignBadge}>
                        <Award className="w-4 h-4 mr-2" />
                        Assign
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <Table isLoading={false} emptyMessage="No login history">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>User Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDateTime(entry.loginAt)}</TableCell>
                        <TableCell>{entry.ipAddress}</TableCell>
                        <TableCell className="truncate max-w-xs">{entry.userAgent}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeTab === 'activity' && (
              <div>
                <Table isLoading={false} emptyMessage="No activity logs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell className="truncate max-w-xs">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isCreateUserModalOpen}
        onClose={() => {
          setIsCreateUserModalOpen(false);
        }}
        title="Create New User"
        size="md"
      >
        <UserForm
          onSubmit={handleCreateUser}
          onCancel={() => {
            setIsCreateUserModalOpen(false);
          }}
          isLoading={isCreateUserLoading}
        />
      </Modal>
    </div>
  );
}
