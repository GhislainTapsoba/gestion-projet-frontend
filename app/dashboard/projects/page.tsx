'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsApi, Project } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Calendar, Clock, Users, AlertCircle, Download, FileText, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import ProjectCreateModal from '@/components/ProjectCreateModal';
import ProjectEditModal from '@/components/ProjectEditModal';
import { exportProjectsToPDF, exportProjectsToExcel } from '@/lib/exportUtils';
import { useAuth } from '@/hooks/useAuth';
import { canDelete, mapRole } from '@/lib/permissions';

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    projectsApi
      .getAll()
      .then((res) => {
        setProjects(res.data);
        setLoading(false);
      })
      .catch((err) => {
        toast.error('Erreur lors du chargement des projets');
        console.error(err);
        setLoading(false);
      });
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    if (!user || !canDelete(mapRole(user.role), 'projects')) {
      toast.error("Vous n'avez pas la permission de supprimer un projet.");
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ? Toutes les étapes et tâches associées seront également supprimées.')) {
      return;
    }

    try {
      await projectsApi.delete(projectId);
      toast.success('Projet supprimé avec succès');
      loadProjects();
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const filteredProjects = projects.filter((project) => {
    if (filter === 'all') return true;
    return project.status === filter;
  });

  const statusFilters = [
    { value: 'all', label: 'Tous' },
    { value: 'PLANNING', label: 'Planification' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'COMPLETED', label: 'Terminé' },
    { value: 'ON_HOLD', label: 'En attente' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement des projets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projets</h1>
          <p className="text-gray-600 mt-2">Gérez et suivez tous vos projets</p>
        </div>
        <div className="flex gap-3">
          {/* Export Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm">
              <Download size={20} />
              Exporter
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => {
                  exportProjectsToPDF(filteredProjects);
                  toast.success('Export PDF généré!');
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
              >
                <FileText size={16} />
                Exporter en PDF
              </button>
              <button
                onClick={() => {
                  exportProjectsToExcel(filteredProjects);
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus size={20} />
            Nouveau Projet
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

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium mb-2">Aucun projet trouvé</p>
          <p className="text-gray-500 text-sm mb-6">Commencez par créer votre premier projet</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={20} />
            Créer un projet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group relative"
            >
              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(project);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Éditer"
                >
                  <Pencil size={18} />
                </button>
                {user && canDelete(mapRole(user.role), 'projects') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(project.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* Header */}
              <div
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                className="cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4 pr-20">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {project.title}
                    </h3>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                className="cursor-pointer"
              >
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                  {project.description || 'Aucune description'}
                </p>

                {/* Meta Info */}
                <div className="space-y-2 pt-4 border-t border-gray-100">
                {project.start_date && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar size={14} />
                    <span>Début: {formatDate(project.start_date)}</span>
                  </div>
                )}
                {project.due_date && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock size={14} />
                    <span className={new Date(project.due_date) < new Date() && project.status !== 'COMPLETED' ? 'text-red-600 font-medium' : ''}>
                      Échéance: {formatDate(project.due_date)}
                    </span>
                  </div>
                )}
                {project.manager_id && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Users size={14} />
                    <span>Manager ID: {project.manager_id}</span>
                  </div>
                )}
                </div>

                {/* Progress Bar */}
              {project.status === 'IN_PROGRESS' && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span>Progression</span>
                    <span className="font-medium">En cours</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
              )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ProjectCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadProjects();
          setIsCreateModalOpen(false);
        }}
      />

      {selectedProject && (
        <ProjectEditModal
          project={selectedProject}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedProject(null);
          }}
          onSuccess={() => {
            loadProjects();
          }}
        />
      )}
    </div>
  );
}
