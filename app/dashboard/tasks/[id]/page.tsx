'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { tasksApi, projectsApi, Task, Project } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Flag,
  User,
  FolderKanban,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Tag,
  X,
  XCircle
} from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel, getRelativeTime } from '@/lib/utils';
import TaskEditModal from '@/components/TaskEditModal';
import DocumentsList from '@/components/DocumentsList';
import { hasPermission, mapRole } from '@/lib/permissions';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const { user } = useAuth(false);

  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (taskId) {
      loadTaskData();
    }
  }, [taskId]);

  const loadTaskData = async () => {
    try {
      const taskRes = await tasksApi.getById(taskId);
      setTask(taskRes.data);

      // Load associated project
      if (taskRes.data.project_id) {
        try {
          const projectRes = await projectsApi.getById(taskRes.data.project_id);
          setProject(projectRes.data);
        } catch (err) {
          console.log('Project not found or error loading project');
        }
      }
    } catch (err) {
      toast.error('Erreur lors du chargement de la tâche');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!task || actionLoading) return;

    setActionLoading(true);
    try {
      await tasksApi.update(taskId, { status: 'COMPLETED' });
      toast.success('Tâche marquée comme terminée !');
      await loadTaskData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la mise à jour';
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task || actionLoading) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.')) {
      return;
    }

    setActionLoading(true);
    try {
      await tasksApi.delete(taskId);
      toast.success('Tâche supprimée avec succès !');
      router.push('/dashboard/tasks');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la suppression';
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!task || actionLoading) return;

    // Valider que la raison est fournie
    if (!rejectionReason || rejectionReason.trim() === '') {
      toast.error('Veuillez fournir une raison pour le refus');
      return;
    }

    setActionLoading(true);
    try {
      await tasksApi.reject(taskId, { rejectionReason });
      toast.success('Tâche refusée. Les responsables ont été notifiés.');
      setIsRejectModalOpen(false);
      setRejectionReason('');
      await loadTaskData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors du refus de la tâche';
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Vérifier si l'utilisateur peut supprimer la tâche (admin ou manager du projet)
  const canDelete = user && (
    user.role === 'ADMIN' ||
    (user.role === 'PROJECT_MANAGER' && project?.manager_id === user.id)
  );

  // Vérifier si l'utilisateur peut refuser la tâche (employé assigné uniquement)
  const canReject = user && task && (
    task.assigned_to_id === user.id &&
    task.status !== 'COMPLETED' &&
    task.status !== 'CANCELLED'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement de la tâche...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-600 mb-4">Tâche introuvable</p>
        <button
          onClick={() => router.push('/dashboard/tasks')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft size={20} />
          Retour aux tâches
        </button>
      </div>
    );
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'COMPLETED';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/tasks')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Retour aux tâches
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                {getStatusLabel(task.status)}
              </span>
              <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
                <Flag size={16} />
                {getPriorityLabel(task.priority)}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
            <p className="text-gray-600">{task.description || 'Aucune description'}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Modifier la tâche"
            >
              <Edit size={20} />
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Supprimer la tâche"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'édition */}
      {task && (
        <TaskEditModal
          task={task}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updatedTask) => {
            setTask(updatedTask);
            setIsEditModalOpen(false);
          }}
        />
      )}

      {/* Modal de refus */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Refuser la tâche</h2>
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionReason('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Vous êtes sur le point de refuser cette tâche. Les responsables seront notifiés par email.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Le statut de la tâche ne sera pas modifié. Elle pourra être réassignée à un autre employé.
                </p>
              </div>

              <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                Raison du refus <span className="text-red-600">*</span>
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Expliquez pourquoi vous refusez cette tâche... (obligatoire)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-400"
                rows={4}
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionReason('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Refus en cours...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Détails de la tâche</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Description complète</h3>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {task.description || 'Aucune description détaillée n\'a été fournie pour cette tâche.'}
                </p>
              </div>

              {task.completed_at && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Date de complétion</h3>
                  <div className="flex items-center gap-2 text-gray-900">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{formatDate(task.completed_at)}</span>
                    <span className="text-sm text-gray-500">({getRelativeTime(task.completed_at)})</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Date de création</h3>
                  <p className="text-gray-900">{formatDate(task.created_at)}</p>
                  <p className="text-xs text-gray-500 mt-1">{getRelativeTime(task.created_at)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Dernière mise à jour</h3>
                  <p className="text-gray-900">{formatDate(task.updated_at)}</p>
                  <p className="text-xs text-gray-500 mt-1">{getRelativeTime(task.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline (Placeholder) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Historique des modifications</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="w-px h-full bg-gray-200 mt-2"></div>
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-medium text-gray-900">Tâche créée</p>
                  <p className="text-sm text-gray-500">{getRelativeTime(task.created_at)}</p>
                </div>
              </div>

              {task.updated_at !== task.created_at && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <div className="w-px h-full bg-gray-200 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium text-gray-900">Dernière modification</p>
                    <p className="text-sm text-gray-500">{getRelativeTime(task.updated_at)}</p>
                  </div>
                </div>
              )}

              {task.completed_at && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Tâche complétée</p>
                    <p className="text-sm text-gray-500">{getRelativeTime(task.completed_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Documents Section */}
          {user && (
            <DocumentsList
              taskId={taskId}
              canUpload={hasPermission(mapRole(user.role), 'documents', 'create')}
              canDelete={hasPermission(mapRole(user.role), 'documents', 'delete')}
            />
          )}
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Quick Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Informations</h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Échéance</span>
                </div>
                {task.due_date ? (
                  <div>
                    <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatDate(task.due_date)}
                    </p>
                    <p className={`text-sm ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                      {getRelativeTime(task.due_date)}
                      {isOverdue && ' (En retard)'}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">Non définie</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Assigné à</span>
                </div>
                {task.assigned_to_name ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {task.assigned_to_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{task.assigned_to_name}</p>
                      <p className="text-xs text-gray-500">Membre de l'équipe</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Non assigné</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <FolderKanban className="w-4 h-4" />
                  <span className="text-sm font-medium">Projet</span>
                </div>
                {project ? (
                  <div>
                    <p className="font-medium text-gray-900">{project.title}</p>
                    <button
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                      className="text-sm text-blue-600 hover:underline mt-1"
                    >
                      Voir le projet →
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500">Projet #{task.project_id}</p>
                )}
              </div>

              {task.stage_id && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Tag className="w-4 h-4" />
                    <span className="text-sm font-medium">Étape</span>
                  </div>
                  <p className="font-medium text-gray-900">Stage #{task.stage_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Actions rapides</h2>

            <div className="space-y-3">
              {task.status !== 'COMPLETED' && (
                <button
                  onClick={handleMarkAsCompleted}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={18} />
                  {actionLoading ? 'En cours...' : 'Marquer comme terminée'}
                </button>
              )}

              {canReject && (
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={18} />
                  Refuser la tâche
                </button>
              )}

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Edit size={18} />
                Modifier la tâche
              </button>

              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={18} />
                  {actionLoading ? 'Suppression...' : 'Supprimer la tâche'}
                </button>
              )}
            </div>
          </div>

          {/* Status Progress */}
          {isOverdue && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-900 mb-1">Tâche en retard</h3>
                  <p className="text-sm text-red-700">
                    Cette tâche a dépassé sa date d'échéance. Veuillez la traiter en priorité ou ajuster la date limite.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
