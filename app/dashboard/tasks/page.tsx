'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tasksApi, Task } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Calendar, Flag, AlertCircle, LayoutList, LayoutGrid, Download, FileText, FileSpreadsheet, Trash2 } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel } from '@/lib/utils';
import TaskCreateModal from '@/components/TaskCreateModal';
import { exportTasksToPDF, exportTasksToExcel } from '@/lib/exportUtils';
import { useAuth } from '@/hooks/useAuth';
import { canDelete, mapRole } from '@/lib/permissions';

export default function TasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'board'>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    tasksApi
      .getAll()
      .then((res) => {
        setTasks(res.data);
        setLoading(false);
      })
      .catch((err) => {
        toast.error('Erreur lors du chargement des tâches');
        console.error(err);
        setLoading(false);
      });
  };

  const handleDelete = async (taskId: string) => {
    if (!user || !canDelete(mapRole(user.role), 'tasks')) {
      toast.error("Vous n'avez pas la permission de supprimer une tâche.");
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      return;
    }

    try {
      await tasksApi.delete(taskId);
      toast.success('Tâche supprimée avec succès');
      loadTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const statusFilters = [
    { value: 'all', label: 'Toutes' },
    { value: 'TODO', label: 'À faire' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'IN_REVIEW', label: 'En révision' },
    { value: 'COMPLETED', label: 'Terminées' },
  ];

  const tasksByStatus = {
    TODO: filteredTasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: filteredTasks.filter(t => t.status === 'IN_PROGRESS'),
    IN_REVIEW: filteredTasks.filter(t => t.status === 'IN_REVIEW'),
    COMPLETED: filteredTasks.filter(t => t.status === 'COMPLETED'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement des tâches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tâches</h1>
          <p className="text-gray-600 mt-2">Gérez et suivez toutes vos tâches</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm">
              <Download size={20} />
              Exporter
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => {
                  exportTasksToPDF(filteredTasks);
                  toast.success('Export PDF généré!');
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
              >
                <FileText size={16} />
                Exporter en PDF
              </button>
              <button
                onClick={() => {
                  exportTasksToExcel(filteredTasks);
                  toast.success('Export Excel généré!');
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
              >
                <FileSpreadsheet size={16} />
                Exporter en Excel
              </button>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vue liste"
            >
              <LayoutList size={20} />
            </button>
            <button
              onClick={() => setView('board')}
              className={`p-2 rounded ${view === 'board' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vue tableau"
            >
              <LayoutGrid size={20} />
            </button>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus size={20} />
            Nouvelle Tâche
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusFilters.map((statusFilter) => (
          <button
            key={statusFilter.value}
            onClick={() => setFilter(statusFilter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === statusFilter.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {statusFilter.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium mb-2">Aucune tâche trouvée</p>
          <p className="text-gray-500 text-sm mb-6">Commencez par créer votre première tâche</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            <Plus size={20} />
            
          </button>
        </div>
      ) : view === 'list' ? (
        /* List View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Titre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Priorité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Échéance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Projet
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTasks.map((task) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'COMPLETED';

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td
                        onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                        className="px-6 py-4 cursor-pointer"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{task.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>
                        </div>
                      </td>
                      <td
                        onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                        className="px-6 py-4 cursor-pointer"
                      >
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td
                        onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                        className="px-6 py-4 cursor-pointer"
                      >
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          <Flag size={12} />
                          {getPriorityLabel(task.priority)}
                        </span>
                      </td>
                      <td
                        onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                        className="px-6 py-4 cursor-pointer"
                      >
                        {task.due_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className={isOverdue ? 'text-red-500' : 'text-gray-400'} />
                            <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                              {formatDate(task.due_date)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td
                        onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                        className="px-6 py-4 text-sm text-gray-600 cursor-pointer"
                      >
                        Projet #{task.project_id}
                      </td>
                      <td className="px-6 py-4">
                        {user && canDelete(mapRole(user.role), 'tasks') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(task.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <div key={status} className="bg-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{getStatusLabel(status)}</h3>
                <span className="px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-600">
                  {statusTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                {statusTasks.map((task) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'COMPLETED';

                  return (
                    <div
                      key={task.id}
                      onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{task.description}</p>

                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {getPriorityLabel(task.priority)}
                        </span>
                        {task.due_date && (
                          <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {statusTasks.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-8">Aucune tâche</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadTasks();
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}
