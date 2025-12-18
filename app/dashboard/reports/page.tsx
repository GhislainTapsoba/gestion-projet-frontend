'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Users, FolderKanban, CheckSquare, Clock, AlertTriangle, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { projectsApi, tasksApi, usersApi, Project, Task, User } from '@/lib/api';
import { exportAnalyticsToPDF, exportAnalyticsToExcel } from '@/lib/exportUtils';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectsRes, tasksRes, usersRes] = await Promise.all([
        projectsApi.getAll(),
        tasksApi.getAll(),
        usersApi.getAll(),
      ]);
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'IN_PROGRESS').length,
    completedProjects: projects.filter(p => p.status === 'COMPLETED').length,
    onHoldProjects: projects.filter(p => p.status === 'ON_HOLD').length,

    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
    inProgressTasks: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    overdueTasks: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED').length,

    completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100) : 0,
  };

  // Tasks by priority
  const tasksByPriority = {
    urgent: tasks.filter(t => t.priority === 'URGENT').length,
    high: tasks.filter(t => t.priority === 'HIGH').length,
    medium: tasks.filter(t => t.priority === 'MEDIUM').length,
    low: tasks.filter(t => t.priority === 'LOW').length,
  };

  // Tasks by status
  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    inReview: tasks.filter(t => t.status === 'IN_REVIEW').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    cancelled: tasks.filter(t => t.status === 'CANCELLED').length,
  };

  // Projects by status
  const projectsByStatus = {
    planning: projects.filter(p => p.status === 'PLANNING').length,
    inProgress: projects.filter(p => p.status === 'IN_PROGRESS').length,
    onHold: projects.filter(p => p.status === 'ON_HOLD').length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    cancelled: projects.filter(p => p.status === 'CANCELLED').length,
  };

  // Get unique assigned users
  const assignedUsers = new Set(tasks.map(t => t.assigned_to_id).filter(Boolean));
  const activeUsers = assignedUsers.size;

  // Average tasks per project
  const avgTasksPerProject = projects.length > 0
    ? Math.round((tasks.length / projects.length) * 10) / 10
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapports & Analytiques</h1>
          <p className="text-gray-600 mt-1">Vue d'ensemble des performances et statistiques</p>
        </div>

        <div className="flex gap-3">
          {/* Export Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={20} />
              Exporter
            </button>
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => {
                  exportAnalyticsToPDF(projects, tasks, metrics);
                  toast.success('Rapport PDF généré!');
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
              >
                <FileText size={16} />
                Exporter Rapport PDF
              </button>
              <button
                onClick={() => {
                  exportAnalyticsToExcel(projects, tasks, users, metrics);
                  toast.success('Rapport Excel généré!');
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
              >
                <FileSpreadsheet size={16} />
                Exporter Rapport Excel
              </button>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {range === 'week' && 'Semaine'}
                {range === 'month' && 'Mois'}
                {range === 'quarter' && 'Trimestre'}
                {range === 'year' && 'Année'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <FolderKanban className="w-8 h-8 opacity-80" />
            <div className="text-right">
              <p className="text-2xl font-bold">{metrics.totalProjects}</p>
              <p className="text-sm opacity-90">Projets Totaux</p>
            </div>
          </div>
          <div className="mt-4 text-sm opacity-90">
            {metrics.activeProjects} actifs • {metrics.completedProjects} terminés
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <CheckSquare className="w-8 h-8 opacity-80" />
            <div className="text-right">
              <p className="text-2xl font-bold">{metrics.totalTasks}</p>
              <p className="text-sm opacity-90">Tâches Totales</p>
            </div>
          </div>
          <div className="mt-4 text-sm opacity-90">
            {metrics.completedTasks} complétées • {metrics.inProgressTasks} en cours
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <div className="text-right">
              <p className="text-2xl font-bold">{metrics.completionRate}%</p>
              <p className="text-sm opacity-90">Taux de Complétion</p>
            </div>
          </div>
          <div className="mt-4 text-sm opacity-90">
            {metrics.completedTasks} sur {metrics.totalTasks} tâches
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 opacity-80" />
            <div className="text-right">
              <p className="text-2xl font-bold">{metrics.overdueTasks}</p>
              <p className="text-sm opacity-90">Tâches en Retard</p>
            </div>
          </div>
          <div className="mt-4 text-sm opacity-90">
            Nécessitent une attention immédiate
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks by Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Tâches par Statut
          </h2>
          <div className="space-y-3">
            {[
              { label: 'À faire', value: tasksByStatus.todo, color: 'bg-gray-500' },
              { label: 'En cours', value: tasksByStatus.inProgress, color: 'bg-blue-500' },
              { label: 'En révision', value: tasksByStatus.inReview, color: 'bg-yellow-500' },
              { label: 'Terminées', value: tasksByStatus.completed, color: 'bg-green-500' },
              { label: 'Annulées', value: tasksByStatus.cancelled, color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="font-semibold text-gray-900">{item.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${metrics.totalTasks > 0 ? (item.value / metrics.totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks by Priority */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Tâches par Priorité
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Urgente', value: tasksByPriority.urgent, color: 'bg-red-600' },
              { label: 'Haute', value: tasksByPriority.high, color: 'bg-orange-500' },
              { label: 'Moyenne', value: tasksByPriority.medium, color: 'bg-yellow-500' },
              { label: 'Basse', value: tasksByPriority.low, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="font-semibold text-gray-900">{item.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${metrics.totalTasks > 0 ? (item.value / metrics.totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects by Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-purple-600" />
            Projets par Statut
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Planification', value: projectsByStatus.planning, color: 'bg-gray-500' },
              { label: 'En cours', value: projectsByStatus.inProgress, color: 'bg-blue-500' },
              { label: 'En attente', value: projectsByStatus.onHold, color: 'bg-yellow-500' },
              { label: 'Terminés', value: projectsByStatus.completed, color: 'bg-green-500' },
              { label: 'Annulés', value: projectsByStatus.cancelled, color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="font-semibold text-gray-900">{item.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${metrics.totalProjects > 0 ? (item.value / metrics.totalProjects) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Statistiques Supplémentaires
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Utilisateurs Actifs</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{activeUsers}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Tâches / Projet</span>
              </div>
              <span className="text-lg font-bold text-purple-600">{avgTasksPerProject}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Projets Actifs</span>
              </div>
              <span className="text-lg font-bold text-green-600">{metrics.activeProjects}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">En Attente</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">{metrics.onHoldProjects}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Résumé des Performances</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{metrics.activeProjects}</div>
            <div className="text-sm text-gray-600">Projets en Cours</div>
            <div className="mt-2 text-xs text-gray-500">
              {metrics.totalProjects > 0
                ? `${Math.round((metrics.activeProjects / metrics.totalProjects) * 100)}% du total`
                : 'Aucun projet'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{metrics.completionRate}%</div>
            <div className="text-sm text-gray-600">Taux de Réussite</div>
            <div className="mt-2 text-xs text-gray-500">
              {metrics.completedTasks} tâches terminées
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">{metrics.overdueTasks}</div>
            <div className="text-sm text-gray-600">Tâches en Retard</div>
            <div className="mt-2 text-xs text-gray-500">
              {metrics.totalTasks > 0
                ? `${Math.round((metrics.overdueTasks / metrics.totalTasks) * 100)}% du total`
                : 'Aucune tâche'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
