import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Shield,
  User,
  Search,
  MoreVertical,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Mail,
  Trash2,
  UserCog,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { GlassCard, StatCard } from '../../components/ui/GlassCard';
import { cn } from '../../lib/utils';
import { adminService, AdminUser, GetUsersParams, AdminStats } from '../../services/admin.service';
import { AuthContext } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AdminUserList: React.FC = () => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const currentUser = authContext?.user;

  // State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'created_at' | 'last_login_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Modals
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    type: 'role' | 'status' | 'delete';
    userId: string;
    userName: string;
    currentValue?: string | boolean;
    newValue?: string | boolean;
  } | null>(null);

  // Check if current user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      toast.error('You do not have permission to access this page');
      navigate('/orgs');
    }
  }, [currentUser, navigate]);

  // Fetch data
  const fetchData = async () => {
    console.log('[AdminUserList] Starting fetchData...');
    try {
      setLoading(true);
      setError(null);

      const params: GetUsersParams = {
        search: searchQuery || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy,
        sortOrder,
        page,
        limit,
      };

      console.log('[AdminUserList] Fetching users with params:', params);

      // Fetch users and stats separately so one failing doesn't block the other
      try {
        const usersResponse = await adminService.getUsers(params);
        console.log('[AdminUserList] Users response:', usersResponse);
        setUsers(usersResponse.users || []);
        setTotalPages(usersResponse.pagination?.totalPages || 1);
        setTotal(usersResponse.pagination?.total || 0);
      } catch (usersErr: unknown) {
        console.error('[AdminUserList] Failed to fetch users:', usersErr);
        setError(usersErr instanceof Error ? usersErr.message : 'Failed to load users');
        toast.error('Failed to load users');
      }

      try {
        const statsResponse = await adminService.getStats();
        console.log('[AdminUserList] Stats response:', statsResponse);
        setStats(statsResponse);
      } catch (statsErr: unknown) {
        console.error('[AdminUserList] Failed to fetch stats:', statsErr);
        // Don't block the page for stats failure
      }
    } finally {
      console.log('[AdminUserList] fetchData complete');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, roleFilter, statusFilter, sortBy, sortOrder, page]);

  // Debounce search
  const [searchDebounce, setSearchDebounce] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchDebounce);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDebounce]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showActionMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-action-menu]')) {
          setShowActionMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionMenu]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const user = users.find((u) => u.id === userId);

    setShowConfirmModal({
      type: 'role',
      userId,
      userName: user?.fullName || user?.email || 'Unknown',
      currentValue: currentRole,
      newValue: newRole,
    });
    setShowActionMenu(null);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const user = users.find((u) => u.id === userId);

    setShowConfirmModal({
      type: 'status',
      userId,
      userName: user?.fullName || user?.email || 'Unknown',
      currentValue: currentStatus,
      newValue: !currentStatus,
    });
    setShowActionMenu(null);
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);

    setShowConfirmModal({
      type: 'delete',
      userId,
      userName: user?.fullName || user?.email || 'Unknown',
    });
    setShowActionMenu(null);
  };

  const confirmAction = async () => {
    if (!showConfirmModal) return;

    try {
      const { type, userId, newValue } = showConfirmModal;

      if (type === 'role') {
        await adminService.updateUserRole(userId, newValue);
        toast.success(`User role updated to ${newValue}`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newValue } : u))
        );
      } else if (type === 'status') {
        await adminService.updateUserStatus(userId, newValue);
        toast.success(newValue ? 'User activated' : 'User deactivated');
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: newValue } : u))
        );
      } else if (type === 'delete') {
        await adminService.deleteUser(userId);
        toast.success('User deleted successfully');
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setTotal((prev) => prev - 1);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setShowConfirmModal(null);
    }
  };

  const clearFilters = () => {
    setSearchDebounce('');
    setRoleFilter('all');
    setStatusFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery || roleFilter !== 'all' || statusFilter !== 'all';

  const getUserInitials = (user: AdminUser) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const getUserDisplayName = (user: AdminUser) => {
    return user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      className="max-w-7xl mx-auto px-6 py-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage platform users, roles, and permissions
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="from-cyan-400 to-blue-500"
        />
        <StatCard
          title="Active Users"
          value={stats?.activeUsers ?? 0}
          icon={<Activity className="w-5 h-5" />}
          color="from-green-400 to-teal-500"
        />
        <StatCard
          title="Administrators"
          value={stats?.adminUsers ?? 0}
          icon={<Shield className="w-5 h-5" />}
          color="from-purple-400 to-pink-500"
        />
        <StatCard
          title="Organizations"
          value={stats?.totalOrganizations ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="from-orange-400 to-red-500"
        />
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchDebounce}
                onChange={(e) => setSearchDebounce(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as typeof roleFilter);
                setPage(1);
              }}
              className="px-4 py-3 bg-slate-800 text-white border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 cursor-pointer"
            >
              <option value="all" className="bg-slate-800">All Roles</option>
              <option value="admin" className="bg-slate-800">Admin</option>
              <option value="user" className="bg-slate-800">User</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(1);
              }}
              className="px-4 py-3 bg-slate-800 text-white border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 cursor-pointer"
            >
              <option value="all" className="bg-slate-800">All Status</option>
              <option value="active" className="bg-slate-800">Active</option>
              <option value="inactive" className="bg-slate-800">Inactive</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as typeof sortBy);
                setPage(1);
              }}
              className="px-4 py-3 bg-slate-800 text-white border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 cursor-pointer"
            >
              <option value="created_at" className="bg-slate-800">Joined Date</option>
              <option value="name" className="bg-slate-800">Name</option>
              <option value="email" className="bg-slate-800">Email</option>
              <option value="last_login_at" className="bg-slate-800">Last Login</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
            >
              {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all flex items-center space-x-2"
              >
                <XCircle className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={fetchData}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Users Table */}
      <motion.div variants={itemVariants}>
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Users</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <GlassCard hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-white/10">
                    <th className="pb-4 text-sm font-medium text-muted-foreground">User</th>
                    <th className="pb-4 text-sm font-medium text-muted-foreground">Role</th>
                    <th className="pb-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="pb-4 text-sm font-medium text-muted-foreground">Joined</th>
                    <th className="pb-4 text-sm font-medium text-muted-foreground">Last Login</th>
                    <th className="pb-4 text-sm font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-all"
                    >
                      {/* User Info */}
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                            <span className="text-sm font-semibold text-white">
                              {getUserInitials(user)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {getUserDisplayName(user)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                            user.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          )}
                        >
                          {user.role === 'admin' ? (
                            <Shield className="w-3 h-3 mr-1" />
                          ) : (
                            <User className="w-3 h-3 mr-1" />
                          )}
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                            user.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          )}
                        >
                          {user.isActive ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4">
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                      </td>

                      {/* Last Login */}
                      <td className="py-4">
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(user.lastLoginAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 text-right">
                        <div className="relative inline-block" data-action-menu>
                          <button
                            onClick={(e) => {
                              if (showActionMenu === user.id) {
                                setShowActionMenu(null);
                                setMenuPosition(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuPosition({
                                  top: rect.top,
                                  left: rect.right - 192, // 192px = w-48
                                });
                                setShowActionMenu(user.id);
                              }
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-all"
                            disabled={user.id === currentUser?.id}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {users.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} -{' '}
                  {Math.min(page * limit, total)} of {total} users
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        )}
      </motion.div>

      {/* Fixed Action Menu - rendered outside table to avoid overflow clipping */}
      {showActionMenu && menuPosition && (
        <div
          className="fixed w-48 bg-slate-900 border border-white/20 rounded-lg shadow-2xl z-[100] py-1"
          style={{
            top: Math.min(menuPosition.top, window.innerHeight - 180),
            left: menuPosition.left,
          }}
          data-action-menu
        >
          {(() => {
            const user = users.find((u) => u.id === showActionMenu);
            if (!user) return null;
            return (
              <>
                <button
                  onClick={() => handleChangeRole(user.id, user.role)}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-all"
                >
                  <UserCog className="w-4 h-4" />
                  <span>
                    Make {user.role === 'admin' ? 'User' : 'Admin'}
                  </span>
                </button>
                <button
                  onClick={() => handleToggleStatus(user.id, user.isActive)}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-all"
                >
                  {user.isActive ? (
                    <>
                      <PowerOff className="w-4 h-4" />
                      <span>Deactivate</span>
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      <span>Activate</span>
                    </>
                  )}
                </button>
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete User</span>
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowConfirmModal(null)}
        >
          <motion.div
            className="bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">
              {showConfirmModal.type === 'delete'
                ? 'Delete User'
                : showConfirmModal.type === 'role'
                ? 'Change Role'
                : 'Change Status'}
            </h3>

            <p className="text-muted-foreground mb-6">
              {showConfirmModal.type === 'delete' ? (
                <>
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-white">
                    {showConfirmModal.userName}
                  </span>
                  ? This action cannot be undone.
                </>
              ) : showConfirmModal.type === 'role' ? (
                <>
                  Change role for{' '}
                  <span className="font-semibold text-white">
                    {showConfirmModal.userName}
                  </span>{' '}
                  from{' '}
                  <span className="font-semibold text-purple-400">
                    {showConfirmModal.currentValue}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-cyan-400">
                    {showConfirmModal.newValue}
                  </span>
                  ?
                </>
              ) : (
                <>
                  {showConfirmModal.newValue ? 'Activate' : 'Deactivate'} user{' '}
                  <span className="font-semibold text-white">
                    {showConfirmModal.userName}
                  </span>
                  ?
                </>
              )}
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={cn(
                  'px-6 py-2 rounded-lg font-medium transition-all',
                  showConfirmModal.type === 'delete'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white'
                )}
              >
                {showConfirmModal.type === 'delete'
                  ? 'Delete'
                  : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

    </motion.div>
  );
};

export default AdminUserList;
