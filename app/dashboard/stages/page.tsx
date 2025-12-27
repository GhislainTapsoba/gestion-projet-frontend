'use client';

import { useState, useEffect } from 'react';
import { stagesApi, projectsApi, tasksApi, Stage, Project, Task } from '@/lib/api';
import { Layers, Plus, Search, Filter, Clock, CheckCircle2, AlertCircle, Loader, CheckSquare, Pencil, Trash2, TrendingUp, Target, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import StageCreateModal from '@/components/StageCreateModal';
import StageEditModal from '@/components/StageEditModal';
import StatCard from '@/components/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { canDelete, mapRole, hasPermission } from '@/lib/permissions';

export default function StagesPage() {
  const { user } = useAuth();
  const [stages, setStages] = useState<Stage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

  useEffect(() => {
    loadProjects();
    loadStages();
    loadTasks();
  }, []);

  useEffect(() => {
    loadStages();
    loadTasks();
  }, [selectedProject, statusFilter]);

  const loadProjects = async () => {
    try {
      const { data } = await projectsApi.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Erreur lors du chargement des projets');
    }
  };

  const loadStages = async () => {
    try {
      setLoading(true);
      const params = selectedProject ? { project_id: selectedProject } : undefined;
      const { data } = await stagesApi.getAll(params);
      setStages(data);
    } catch (error) {
      console.error('Error loading stages:', error);
      toast.error('Erreur lors du chargement des étapes');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const params = selectedProject ? { project_id: selectedProject } : undefined;
      const { data } = await tasksApi.getAll(params);
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const getTasksForStage = (stageId: string) => {
    return tasks.filter(task => String(task.stage_id) === String(stageId));
  };

  const getTaskStatusBadge = (status: string) => {
    const badges = {
      TODO: { label: 'À faire', className: 'bg-gray-100 text-gray-700' },
      IN_PROGRESS: { label: 'En cours', className: 'bg-blue-100 text-blue-700' },
      IN_REVIEW: { label: 'En révision', className: 'bg-purple-100 text-purple-700' },
      COMPLETED: { label: 'Terminée', className: 'bg-green-100 text-green-700' },
      CANCELLED: { label: 'Annulée', className: 'bg-red-100 text-red-700' },
    };
    const badge = badges[status as keyof typeof badges] || badges.TODO;
    return badge;
  };

  const handleEdit = (stage: Stage) => {
    setSelectedStage(stage);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (stageId: number) => {
    if (!user || !canDelete(mapRole(user.role), 'stages')) {
      toast.error("Vous n'avez pas la permission de supprimer une étape.");
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette étape ? Les tâches associées ne seront pas supprimées.')) {
      return;
    }

    try {
      await stagesApi.delete(stageId.toString());
      toast.success('Étape supprimée avec succès');
      loadStages();
      loadTasks();
    } catch (error: any) {
      console.error('Error deleting stage:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { label: 'En attente', className: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
      IN_PROGRESS: { label: 'En cours', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Loader },
      COMPLETED: { label: 'Terminée', className: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
      BLOCKED: { label: 'Bloquée', className: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
    };
    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  const getStageProgress = (stage: Stage) => {
    const stageTasks = getTasksForStage(stage.id);
    if (stageTasks.length === 0) return 0;
    const completedTasks = stageTasks.filter(t => t.status === 'COMPLETED').length;
    return Math.round((completedTasks / stageTasks.length) * 100);
  };

  const filteredStages = stages.filter(stage => {
    const matchesSearch = stage.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stage.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || stage.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: stages.length,
    pending: stages.filter(s => s.status === 'PENDING').length,
    inProgress: stages.filter(s => s.status === 'IN_PROGRESS').length,
    completed: stages.filter(s => s.status === 'COMPLETED').length,
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Layers className="text-purple-600" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Étapes</h1>
              <p className="text-gray-600 mt-1">Gérez les étapes de vos projets</p>
            </div>
          </div>
          {user && hasPermission(mapRole(user.role), 'stages', 'create') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
            >
              <Plus size={20} />
              Nouvelle Étape
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher une étape..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>

          {/* Project Filter */}
          <div className="sm:w-56">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 appearance-none"
              >
                <option value="">Tous les projets</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
            >
              <option value="">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="COMPLETED">Terminée</option>
              <option value="BLOCKED">Bloquée</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total d'étapes"
            value={stats.total}
            icon={Layers}
            color="purple"
          />
          <StatCard
            title="En attente"
            value={stats.pending}
            icon={Clock}
            color="gray"
          />
          <StatCard
            title="En cours"
            value={stats.inProgress}
            icon={TrendingUp}
            color="blue"
          />
          <StatCard
            title="Terminées"
            value={stats.completed}
            icon={CheckCircle2}
            color="green"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Chargement des étapes...</p>
            </div>
          </div>
        ) : filteredStages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Layers size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune étape trouvée</h3>
            <p className="text-gray-600">
              {searchQuery || selectedProject || statusFilter
                ? 'Aucune étape ne correspond à vos critères de recherche.'
                : 'Les étapes de projet apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Group by project */}
            {projects
              .filter(project => !selectedProject || project.id === selectedProject)
              .map(project => {
                const projectStages = filteredStages.filter(
                  stage => String(stage.project_id) === String(project.id)
                );

                if (projectStages.length === 0) return null;

                return (
                  <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Project Header */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{project.title}</h2>
                          <p className="text-sm text-gray-600 mt-1">
                            {projectStages.length} étape{projectStages.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="text-purple-600" size={20} />
                          <span className="text-sm font-medium text-gray-700">
                            {projectStages.filter(s => s.status === 'COMPLETED').length}/{projectStages.length} complétées
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stages List */}
                    <div className="divide-y divide-gray-200">
                      {projectStages
                        .sort((a, b) => a.order - b.order)
                        .map((stage, index) => {
                          const progress = getStageProgress(stage);
                          const stageTasks = getTasksForStage(stage.id);

                          return (
                            <div key={stage.id} className="p-6 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start gap-4">
                                {/* Order Number */}
                                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <span className="text-purple-700 font-bold">{index + 1}</span>
                                </div>

                                {/* Stage Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <h3 className="text-lg font-semibold text-gray-900">{stage.name}</h3>
                                      {getStatusBadge(stage.status)}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleEdit(stage)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Éditer"
                                      >
                                        <Pencil size={18} />
                                      </button>
                                      {user && canDelete(mapRole(user.role), 'stages') && (
                                        <button
                                          onClick={() => handleDelete(stage.id)}
                                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                          title="Supprimer"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {stage.description && (
                                    <p className="text-gray-600 mb-3">{stage.description}</p>
                                  )}

                                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                    {stage.duration && (
                                      <div className="flex items-center gap-1">
                                        <Clock size={16} />
                                        <span>{stage.duration} jours</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <ListChecks size={16} />
                                      <span>{stageTasks.length} tâche{stageTasks.length > 1 ? 's' : ''}</span>
                                    </div>
                                  </div>

                                  {/* Progress Bar */}
                                  {stageTasks.length > 0 && (
                                    <div className="mb-3">
                                      <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-gray-600 font-medium">Progression</span>
                                        <span className="text-purple-600 font-bold">{progress}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                          style={{ width: `${progress}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Tasks in this stage */}
                                  {stageTasks.length > 0 && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                      <div className="flex items-center gap-2 mb-3">
                                        <CheckSquare size={16} className="text-purple-600" />
                                        <span className="text-sm font-semibold text-gray-900">
                                          Tâches ({stageTasks.length})
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        {stageTasks.slice(0, 3).map(task => {
                                          const statusBadge = getTaskStatusBadge(task.status);
                                          return (
                                            <div key={task.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                                                {task.assigned_to && (
                                                  <p className="text-xs text-gray-500">
                                                    Assigné à: {task.assigned_to.name}
                                                  </p>
                                                )}
                                              </div>
                                              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}>
                                                {statusBadge.label}
                                              </span>
                                            </div>
                                          );
                                        })}
                                        {stageTasks.length > 3 && (
                                          <p className="text-xs text-gray-500 text-center pt-1">
                                            +{stageTasks.length - 3} autre{stageTasks.length - 3 > 1 ? 's' : ''} tâche{stageTasks.length - 3 > 1 ? 's' : ''}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Modals */}
      <StageCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadStages();
          loadTasks();
        }}
        defaultProjectId={selectedProject}
      />

      {selectedStage && (
        <StageEditModal
          stage={selectedStage}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedStage(null);
          }}
          onSuccess={() => {
            loadStages();
            loadTasks();
          }}
        />
      )}
    </div>
  );
}
