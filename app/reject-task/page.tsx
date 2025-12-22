'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tasksApi, Task } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { XCircle, ArrowLeft, AlertCircle } from 'lucide-react';

export default function RejectTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  const { user } = useAuth(false);

  const [task, setTask] = useState<Task | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (taskId) {
      loadTask();
    } else {
      setLoading(false);
    }
  }, [taskId]);

  const loadTask = async () => {
    if (!taskId) return;

    try {
      const response = await tasksApi.getById(taskId);
      setTask(response.data);
    } catch (err) {
      toast.error('Erreur lors du chargement de la tâche');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskId) {
      toast.error('ID de tâche manquant');
      return;
    }

    if (!rejectionReason || rejectionReason.trim() === '') {
      toast.error('Veuillez fournir une raison pour le refus');
      return;
    }

    setSubmitting(true);
    try {
      await tasksApi.reject(taskId, { rejectionReason });
      toast.success('Tâche refusée avec succès. Les responsables ont été notifiés.');

      // Rediriger vers la liste des tâches après 2 secondes
      setTimeout(() => {
        router.push('/dashboard/tasks');
      }, 2000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors du refus de la tâche';
      toast.error(errorMsg);
      console.error(err);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!taskId || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Tâche introuvable</h1>
            <p className="text-gray-600 mb-6">La tâche demandée n'existe pas ou vous n'y avez pas accès.</p>
            <button
              onClick={() => router.push('/dashboard/tasks')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <ArrowLeft size={20} />
              Retour aux tâches
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vérifier que l'utilisateur peut refuser cette tâche
  if (user && task.assigned_to_id !== user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
            <p className="text-gray-600 mb-6">Vous ne pouvez refuser que les tâches qui vous sont assignées.</p>
            <button
              onClick={() => router.push('/dashboard/tasks')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <ArrowLeft size={20} />
              Retour aux tâches
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Refuser la tâche</h1>
              <p className="text-gray-600">Veuillez indiquer la raison de votre refus</p>
            </div>
          </div>

          {/* Informations sur la tâche */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Tâche à refuser</h2>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-600">Titre:</span>
                <p className="text-gray-900 font-medium">{task.title}</p>
              </div>
              {task.description && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Description:</span>
                  <p className="text-gray-900">{task.description}</p>
                </div>
              )}
              {task.due_date && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Échéance:</span>
                  <p className="text-gray-900">{new Date(task.due_date).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Avertissement */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-yellow-900 mb-1">Important</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Les responsables du projet seront notifiés par email</li>
                  <li>• Le statut de la tâche ne sera pas modifié</li>
                  <li>• La tâche pourra être réassignée à un autre employé</li>
                  <li>• Votre raison doit être claire et professionnelle</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleReject}>
            <div className="mb-6">
              <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-900 mb-2">
                Raison du refus <span className="text-red-600">*</span>
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Expliquez de manière détaillée pourquoi vous ne pouvez pas réaliser cette tâche..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-400"
                rows={6}
                required
                disabled={submitting}
              />
              <p className="text-sm text-gray-500 mt-2">
                Minimum 10 caractères. Soyez précis et professionnel.
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/tasks/${taskId}`)}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting || !rejectionReason || rejectionReason.trim().length < 10}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle size={20} />
                {submitting ? 'Refus en cours...' : 'Confirmer le refus'}
              </button>
            </div>
          </form>
        </div>

        {/* Lien de retour */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/dashboard/tasks')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Retour à la liste des tâches
          </button>
        </div>
      </div>
    </div>
  );
}
