'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsApi, tasksApi, Project, Task } from '@/lib/api';
import toast from 'react-hot-toast';
import { TrendingUp, Clock, CheckCircle2, FolderKanban } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      projectsApi.getAll(),
      tasksApi.getAll()
    ])
      .then(([projectsRes, tasksRes]) => {
        setProjects(projectsRes.data);
        setTasks(tasksRes.data);
        setLoading(false);
      })
      .catch((err) => {
        toast.error('Erreur lors du chargement du dashboard');
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS').length;
  const totalProjects = projects.length;

  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const recentProjects = projects.slice(0, 5);
  const recentTasks = tasks.slice(0, 5);

  const stats = [
    {
      label: 'Projets Actifs',
      value: activeProjects,
      total: totalProjects,
      icon: FolderKanban,
      color: 'blue',
    },
    {
      label: 'Tâches En Cours',
      value: inProgressTasks,
      total: totalTasks,
      icon: Clock,
      color: 'orange',
    },
    {
      label: 'Tâches Terminées',
      value: completedTasks,
      total: totalTasks,
      icon: CheckCircle2,
      color: 'green',
    },
    {
      label: 'Taux de Complétion',
      value: `${completionRate}%`,
      total: null,
      icon: TrendingUp,
      color: 'purple',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600' },
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Vue d'ensemble de vos projets et tâches</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = colorClasses[stat.color];

          return (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-bold ${colors.text}`}>{stat.value}</p>
                  {stat.total !== null && (
                    <span className="text-sm text-gray-500">/ {stat.total}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Projets Récents</h2>
            <button
              onClick={() => router.push('/dashboard/projects')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Voir tout →
            </button>
          </div>
          <div className="space-y-4">
            {recentProjects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun projet pour le moment</p>
            ) : (
              recentProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  className="border-b border-gray-100 pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 p-2 rounded -m-2 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{project.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{project.description || 'Aucune description'}</p>
                    </div>
                    <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>Créé le {formatDate(project.created_at)}</span>
                    {project.due_date && (
                      <span>Échéance: {formatDate(project.due_date)}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Tâches Récentes</h2>
            <button
              onClick={() => router.push('/dashboard/tasks')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Voir tout →
            </button>
          </div>
          <div className="space-y-4">
            {recentTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune tâche pour le moment</p>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                  className="border-b border-gray-100 pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 p-2 rounded -m-2 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 flex-1">{task.title}</h3>
                    <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1 mb-2">{task.description || 'Aucune description'}</p>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                    {task.due_date && (
                      <span className="text-xs text-gray-500">
                        Échéance: {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
