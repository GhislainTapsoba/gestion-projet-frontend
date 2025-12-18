'use client';

import { useEffect, useState } from 'react';
import { activityLogsApi, ActivityLog } from '@/lib/api';
import toast from 'react-hot-toast';
import { Activity, User, FileText, Filter, Calendar, Download, FileSpreadsheet, Search, TrendingUp } from 'lucide-react';
import { formatDate, getRelativeTime } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import StatCard from '@/components/StatCard';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [filter, setFilter] = useState({
    entity_type: '',
    action: '',
  });

  useEffect(() => {
    loadLogs();
  }, [filter]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery]);

  const loadLogs = async () => {
    try {
      const params: any = {};
      if (filter.entity_type) params.entity_type = filter.entity_type;

      const { data } = await activityLogsApi.getAll(params);
      setLogs(data);
      setFilteredLogs(data);
    } catch (err) {
      toast.error('Erreur lors du chargement des logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Filter by action
    if (filter.action) {
      filtered = filtered.filter(log => log.action === filter.action);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Action', 'Type', 'Utilisateur', 'Détails'];
    const csvData = filteredLogs.map(log => [
      formatDate(log.created_at),
      getActionLabel(log.action),
      getEntityTypeLabel(log.entity_type),
      log.user?.name || 'N/A',
      log.details
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Export CSV généré!');
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'complete':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return 'Création';
      case 'update':
        return 'Mise à jour';
      case 'delete':
        return 'Suppression';
      case 'complete':
        return 'Complétion';
      default:
        return action;
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'project':
        return 'Projet';
      case 'task':
        return 'Tâche';
      case 'stage':
        return 'Étape';
      default:
        return type;
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'project':
        return '📁';
      case 'task':
        return '✓';
      case 'stage':
        return '📊';
      default:
        return '📄';
    }
  };

  const formatMetadata = (metadata: any) => {
    if (!metadata || Object.keys(metadata).length === 0) return null;

    const labelMap: Record<string, string> = {
      project_id: 'Projet ID',
      stage_name: 'Nom de l\'étape',
      task_id: 'Tâche ID',
      stage_id: 'Étape ID',
      user_id: 'Utilisateur ID',
      old_value: 'Ancienne valeur',
      new_value: 'Nouvelle valeur',
      field: 'Champ modifié',
      status: 'Statut',
      priority: 'Priorité',
      assigned_to: 'Assigné à',
      due_date: 'Date d\'échéance',
    };

    return Object.entries(metadata).map(([key, value]) => ({
      label: labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      value: typeof value === 'string' && value.length > 50
        ? `${value.substring(0, 47)}...`
        : String(value)
    }));
  };

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: logs.length,
    creates: logs.filter(l => l.action === 'create').length,
    updates: logs.filter(l => l.action === 'update').length,
    deletes: logs.filter(l => l.action === 'delete').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement des logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Activity className="text-blue-600" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Journal d'Activité</h1>
              <p className="text-gray-600 mt-1">Historique complet de toutes les actions</p>
            </div>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
          >
            <Download size={20} />
            Exporter CSV
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher dans les logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>

          {/* Entity Type Filter */}
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={filter.entity_type}
                onChange={(e) => setFilter({ ...filter, entity_type: e.target.value })}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 appearance-none"
              >
                <option value="">Tous les types</option>
                <option value="project">Projets</option>
                <option value="task">Tâches</option>
                <option value="stage">Étapes</option>
              </select>
            </div>
          </div>

          {/* Action Filter */}
          <div className="sm:w-48">
            <select
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            >
              <option value="">Toutes les actions</option>
              <option value="create">Création</option>
              <option value="update">Mise à jour</option>
              <option value="delete">Suppression</option>
              <option value="complete">Complétion</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total d'activités"
            value={stats.total}
            icon={Activity}
            color="blue"
          />
          <StatCard
            title="Créations"
            value={stats.creates}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title="Modifications"
            value={stats.updates}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="Suppressions"
            value={stats.deletes}
            icon={FileText}
            color="red"
          />
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {paginatedLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">Aucune activité</p>
              <p className="text-gray-500 text-sm">
                {searchQuery || filter.entity_type || filter.action
                  ? 'Aucune activité ne correspond à vos critères'
                  : 'Les activités apparaîtront ici'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {paginatedLogs.map((log) => (
                  <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                          {getEntityIcon(log.entity_type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                              {getActionLabel(log.action)}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              {getEntityTypeLabel(log.entity_type)}
                            </span>
                            {log.user && (
                              <span className="text-sm text-gray-600">
                                par <span className="font-medium">{log.user.name}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
                            <Calendar className="w-4 h-4" />
                            <span>{getRelativeTime(log.created_at)}</span>
                          </div>
                        </div>

                        <p className="text-gray-900 mb-2">{log.details}</p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>ID: #{log.entity_id}</span>
                          <span>{formatDate(log.created_at)}</span>
                        </div>

                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="mt-3">
                            <summary className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                              Voir les détails
                            </summary>
                            <div className="mt-2 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {formatMetadata(log.metadata)?.map((item, index) => (
                                  <div key={index} className="flex flex-col">
                                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                      {item.label}
                                    </span>
                                    <span className="text-sm text-gray-900 font-medium bg-white px-3 py-2 rounded-md border border-gray-200 truncate" title={item.value}>
                                      {item.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredLogs.length}
                onItemsPerPageChange={setItemsPerPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
