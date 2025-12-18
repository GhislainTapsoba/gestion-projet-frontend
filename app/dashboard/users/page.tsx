'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Shield, UserCog, Download, FileText, FileSpreadsheet, ChevronUp, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { usersApi, User } from '@/lib/api';
import toast from 'react-hot-toast';
import { exportUsersToPDF, exportUsersToExcel } from '@/lib/exportUtils';
import UserCreateModal from '@/components/UserCreateModal';
import UserEditModal from '@/components/UserEditModal';
import StatCard from '@/components/StatCard';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/hooks/useAuth';
import { canManageUsers, mapRole } from '@/lib/permissions';

type SortField = 'name' | 'email' | 'role' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, roleFilter, sortField, sortDirection]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await usersApi.getAll();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => {
        const roleUpper = user.role.toUpperCase();
        if (roleFilter === 'admin') return roleUpper === 'ADMIN';
        if (roleFilter === 'manager') return roleUpper === 'PROJECT_MANAGER';
        if (roleFilter === 'user') return roleUpper === 'EMPLOYEE';
        return user.role === roleFilter;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser || !canManageUsers(mapRole(currentUser.role))) {
      toast.error("Vous n'avez pas la permission de supprimer un utilisateur.");
      return;
    }
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      await usersApi.delete(id);
      toast.success('Utilisateur supprimé avec succès');
      fetchUsers();
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error("Erreur lors de la suppression de l'utilisateur");
    }
  };

  const handleBulkDelete = async () => {
    if (!currentUser || !canManageUsers(mapRole(currentUser.role))) {
      toast.error("Vous n'avez pas la permission de supprimer des utilisateurs.");
      return;
    }
    if (selectedUsers.size === 0) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedUsers.size} utilisateur(s) ?`)) {
      return;
    }

    try {
      await Promise.all(Array.from(selectedUsers).map(id => usersApi.delete(id)));
      toast.success(`${selectedUsers.size} utilisateur(s) supprimé(s)`);
      fetchUsers();
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Error deleting users:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const getRoleBadgeClass = (role: string) => {
    const roleUpper = role.toUpperCase();
    if (roleUpper === 'ADMIN') {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    } else if (roleUpper === 'PROJECT_MANAGER' || role.toLowerCase() === 'manager') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (roleUpper === 'EMPLOYEE' || role.toLowerCase() === 'user') {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRoleIcon = (role: string) => {
    const roleUpper = role.toUpperCase();
    if (roleUpper === 'ADMIN') {
      return <Shield className="w-4 h-4" />;
    } else if (roleUpper === 'PROJECT_MANAGER' || role.toLowerCase() === 'manager') {
      return <UserCog className="w-4 h-4" />;
    }
    return <Users className="w-4 h-4" />;
  };

  const getRoleLabel = (role: string) => {
    const roleUpper = role.toUpperCase();
    if (roleUpper === 'ADMIN') {
      return 'Administrateur';
    } else if (roleUpper === 'PROJECT_MANAGER' || role.toLowerCase() === 'manager') {
      return 'Chef de Projet';
    } else if (roleUpper === 'EMPLOYEE' || role.toLowerCase() === 'user') {
      return 'Employé';
    }
    return role;
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role.toUpperCase() === 'ADMIN').length,
    managers: users.filter(u => u.role.toUpperCase() === 'PROJECT_MANAGER' || u.role.toLowerCase() === 'manager').length,
    users: users.filter(u => u.role.toUpperCase() === 'EMPLOYEE' || u.role.toLowerCase() === 'user').length,
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="text-blue-600" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
              <p className="text-gray-600 mt-1">Créer et gérer les utilisateurs du système</p>
            </div>
          </div>
          <div className="flex gap-3">
            {/* Export Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-5 h-5" />
                Exporter
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => {
                    exportUsersToPDF(filteredUsers);
                    toast.success('Export PDF généré!');
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                >
                  <FileText size={16} />
                  Exporter en PDF
                </button>
                <button
                  onClick={() => {
                    exportUsersToExcel(filteredUsers);
                    toast.success('Export Excel généré!');
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                >
                  <FileSpreadsheet size={16} />
                  Exporter en Excel
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nouvel Utilisateur
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Administrateurs</option>
            <option value="manager">Chefs de Projet</option>
            <option value="user">Employés</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Total" value={stats.total} icon={Users} color="gray" />
          <StatCard title="Administrateurs" value={stats.admins} icon={Shield} color="purple" />
          <StatCard title="Chefs de Projet" value={stats.managers} icon={UserCog} color="blue" />
          <StatCard title="Employés" value={stats.users} icon={Users} color="gray" />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && currentUser && canManageUsers(mapRole(currentUser.role)) && (
        <div className="px-8 pb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-blue-900 font-medium">
              {selectedUsers.size} utilisateur(s) sélectionné(s)
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 size={16} />
              Supprimer la sélection
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0 ? (
                      <CheckSquare size={20} />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Utilisateur
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('email')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Email
                    <SortIcon field="email" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('role')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Rôle
                    <SortIcon field="role" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Date de création
                    <SortIcon field="created_at" />
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Aucun utilisateur trouvé</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleSelectUser(user.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {selectedUsers.has(user.id) ? (
                          <CheckSquare size={20} className="text-blue-600" />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-900 mr-4 inline-flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Modifier
                      </button>
                      {currentUser && canManageUsers(mapRole(currentUser.role)) && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {filteredUsers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredUsers.length}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <UserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchUsers();
        }}
      />

      {selectedUser && (
        <UserEditModal
          user={selectedUser}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
