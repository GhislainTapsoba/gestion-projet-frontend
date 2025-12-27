'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { projectsApi, tasksApi, Project, Task } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel } from '@/lib/utils';
import StagesManager from '@/components/StagesManager';
import TaskCreateModal from '@/components/TaskCreateModal';
import ProjectEditModal from '@/components/ProjectEditModal';
import TaskEditModal from '@/components/TaskEditModal';
import DocumentsList from '@/components/DocumentsList';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, mapRole } from '@/lib/permissions';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user } = useAuth(false);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'stages' | 'tasks' | 'documents'>('overview');
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        projectsApi.getById(projectId),
        tasksApi.getAll()
      ]);

      setProject(projectRes.data);
      // Filter tasks for this project
      setTasks(tasksRes.data.filter((task: Task) => task.project_id === projectId));
    } catch (err) {
      toast.error('Erreur lors du chargement du projet');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le projet "${project.title}" ?\n\nCette action supprimera également toutes les étapes et tâches associées.`)) {
      return;
    }

    try {
      await projectsApi.delete(projectId);
      toast.success('Projet supprimé avec succès');
      router.push('/dashboard/projects');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression du projet');
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsEditTaskModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la tâche "${taskTitle}" ?`)) {
      return;
    }

    try {
      await tasksApi.delete(taskId);
      toast.success('Tâche supprimée avec succès');
      loadProjectData();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression de la tâche');
    }
  };

  const handleTaskSaved = (updatedTask: Task) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    setIsEditTaskModalOpen(false);
    setSelectedTask(null);
    toast.success('Tâche mise à jour avec succès');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-600 mb-4">Projet introuvable</p>
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft size={20} />
          Retour aux projets
        </button>
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const tasksByStatus = {
    TODO: tasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
    IN_REVIEW: tasks.filter(t => t.status === 'IN_REVIEW'),
    COMPLETED: tasks.filter(t => t.status === 'COMPLETED')
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Retour aux projets
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>
            <p className="text-gray-600">{project.description || 'Aucune description'}</p>
            <div className="flex items-center gap-4 mt-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                {getStatusLabel(project.status)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Modifier le projet"
            >
              <Edit size={20} />
            </button>
            <button
              onClick={handleDeleteProject}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer le projet"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Date de début</p>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {project.start_date ? formatDate(project.start_date) : 'Non définie'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="text-sm text-gray-600">Échéance</p>
          </div>
          <p className={`text-lg font-bold ${
            project.due_date && new Date(project.due_date) < new Date() && project.status !== 'COMPLETED'
              ? 'text-red-600'
              : 'text-gray-900'
          }`}>
            {project.due_date ? formatDate(project.due_date) : 'Non définie'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Tâches</p>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {completedTasks} / {totalTasks}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-600">Manager</p>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {project.manager_name || 'Non assigné'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {totalTasks > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Progression du projet</h3>
            <span className="text-2xl font-bold text-blue-600">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab('stages')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'stages'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Étapes
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'tasks'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Tâches ({totalTasks})
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'documents'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Documents
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Informations du projet</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Description</h3>
              <p className="text-gray-900">{project.description || 'Aucune description disponible'}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Date de création</h3>
                <p className="text-gray-900">{formatDate(project.created_at)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Dernière mise à jour</h3>
                <p className="text-gray-900">{formatDate(project.updated_at)}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-4">Répartition des tâches</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">À faire</p>
                  <p className="text-2xl font-bold text-gray-900">{tasksByStatus.TODO.length}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 mb-1">En cours</p>
                  <p className="text-2xl font-bold text-blue-600">{tasksByStatus.IN_PROGRESS.length}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 mb-1">En révision</p>
                  <p className="text-2xl font-bold text-purple-600">{tasksByStatus.IN_REVIEW.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 mb-1">Terminées</p>
                  <p className="text-2xl font-bold text-green-600">{tasksByStatus.COMPLETED.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stages' && (
        <StagesManager
          projectId={projectId}
          onStageComplete={() => loadProjectData()}
        />
      )}

      {activeTab === 'tasks' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Liste des tâches</h2>
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={20} />
              Nouvelle tâche
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">Aucune tâche</p>
              <p className="text-gray-500 text-sm">Créez votre première tâche pour ce projet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Titre</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Priorité</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Échéance</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tasks.map((task) => {
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'COMPLETED';

                      return (
                        <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{task.title}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {task.due_date ? (
                              <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                {formatDate(task.due_date)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditTask(task)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id, task.title)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && user && (
        <DocumentsList
          projectId={projectId}
          canUpload={hasPermission(mapRole(user.role), 'documents', 'create')}
          canDelete={hasPermission(mapRole(user.role), 'documents', 'delete')}
        />
      )}

      {/* Create Task Modal */}
      <TaskCreateModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSuccess={() => {
          loadProjectData();
          setIsCreateTaskModalOpen(false);
        }}
        defaultProjectId={projectId}
      />

      {/* Edit Project Modal */}
      {project && (
        <ProjectEditModal
          project={project}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            loadProjectData();
            setIsEditModalOpen(false);
          }}
        />
      )}

      {/* Edit Task Modal */}
      {selectedTask && (
        <TaskEditModal
          task={selectedTask}
          isOpen={isEditTaskModalOpen}
          onClose={() => {
            setIsEditTaskModalOpen(false);
            setSelectedTask(null);
          }}
          onSave={handleTaskSaved}
        />
      )}
    </div>
  );
}
