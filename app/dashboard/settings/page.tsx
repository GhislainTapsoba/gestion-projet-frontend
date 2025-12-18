'use client';

import { useState, useEffect } from 'react';
import { Settings, User, Bell, Lock, Globe, Save, Check, Palette, Database, Keyboard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { settingsApi, UserSettings, notificationPreferencesApi, NotificationPreferences, profileApi } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuth(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'preferences' | 'appearance'>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || 'Utilisateur',
    email: user?.email || 'user@tdr.com',
    role: user?.role || 'Employé',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_task_assigned: true,
    email_task_updated: true,
    email_task_due: true,
    email_stage_completed: false,
    email_project_created: true,
    push_notifications: true,
    daily_summary: false,
  });

  const [securityData, setSecurityData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [preferences, setPreferences] = useState({
    language: 'fr',
    timezone: 'Europe/Paris',
    date_format: 'DD/MM/YYYY',
    items_per_page: '20',
  });

  const [appearance, setAppearance] = useState({
    theme: 'light',
    font_size: 'medium',
    compact_mode: false,
  });

  const [backendSettings, setBackendSettings] = useState<UserSettings | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || 'Utilisateur',
        email: user.email,
        role: user.role,
      });
      // Charger les settings depuis le backend
      loadSettings();
      loadNotificationPreferences();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data } = await settingsApi.get();
      setBackendSettings(data);

      // Mettre à jour les états locaux avec TOUS les champs
      setPreferences({
        language: data.language,
        timezone: data.timezone,
        date_format: data.date_format,
        items_per_page: data.items_per_page.toString(),
      });

      setAppearance({
        theme: data.theme,
        font_size: data.font_size,
        compact_mode: data.compact_mode,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const { data } = await notificationPreferencesApi.get();
      setNotificationPreferences(data);

      // Mettre à jour les états locaux avec TOUTES les préférences
      setNotificationSettings({
        email_task_assigned: data.email_task_assigned,
        email_task_updated: data.email_task_updated,
        email_task_due: data.email_task_due,
        email_stage_completed: data.email_stage_completed,
        email_project_created: data.email_project_created,
        push_notifications: data.push_notifications,
        daily_summary: data.daily_summary,
      });
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      toast.error('Erreur lors du chargement des préférences de notifications');
    }
  };

  const handleSave = async (section: string) => {
    setSaving(true);
    setSaved(false);

    try {
      if (section === 'Profil') {
        // Mettre à jour le profil utilisateur (nom, email)
        await profileApi.update({
          name: profileData.name,
          email: profileData.email,
        });

        // Recharger le profil pour mettre à jour le user dans le contexte
        const { data } = await profileApi.get();
        localStorage.setItem('user', JSON.stringify(data));
      } else if (section === 'Notifications') {
        // Mettre à jour les préférences de notifications
        await notificationPreferencesApi.update({
          email_task_assigned: notificationSettings.email_task_assigned,
          email_task_updated: notificationSettings.email_task_updated,
          email_task_due: notificationSettings.email_task_due,
          email_stage_completed: notificationSettings.email_stage_completed,
          email_project_created: notificationSettings.email_project_created,
          push_notifications: notificationSettings.push_notifications,
          daily_summary: notificationSettings.daily_summary,
        });
      } else if (section === 'Préférences') {
        // Mettre à jour les préférences générales
        await settingsApi.update({
          language: preferences.language,
          timezone: preferences.timezone,
          date_format: preferences.date_format,
          items_per_page: parseInt(preferences.items_per_page),
        });
      } else if (section === 'Apparence') {
        // Mettre à jour l'apparence
        await settingsApi.update({
          theme: appearance.theme,
          font_size: appearance.font_size,
          compact_mode: appearance.compact_mode,
        });
      }

      setSaving(false);
      setSaved(true);
      toast.success(`${section} mis à jour avec succès`);

      setTimeout(() => setSaved(false), 2000);
    } catch (error: any) {
      setSaving(false);
      console.error('Error saving settings:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de l\'enregistrement';
      toast.error(errorMessage);
    }
  };

  const handleSaveSecurity = async () => {
    if (securityData.new_password !== securityData.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (securityData.new_password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (!securityData.current_password) {
      toast.error('Le mot de passe actuel est requis');
      return;
    }

    setSaving(true);

    try {
      if (!user?.id) {
        toast.error('Utilisateur non connecté');
        return;
      }

      await profileApi.changePassword(user.id, {
        current_password: securityData.current_password,
        new_password: securityData.new_password,
      });

      setSaving(false);
      toast.success('Mot de passe mis à jour avec succès');
      setSecurityData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      setSaving(false);
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors du changement de mot de passe';
      toast.error(errorMessage);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profil', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Sécurité', icon: Lock },
    { id: 'preferences' as const, label: 'Préférences', icon: Globe },
    { id: 'appearance' as const, label: 'Apparence', icon: Palette },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Settings className="text-blue-600" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-gray-600 mt-1">Gérez vos paramètres et préférences</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Informations du profil</h2>
                {saved && (
                  <span className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <Check size={16} />
                    Enregistré
                  </span>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rôle
                  </label>
                  <input
                    type="text"
                    value={profileData.role}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-sm text-gray-500 mt-1">Le rôle est géré par l'administrateur</p>
                </div>

                <button
                  onClick={() => handleSave('Profil')}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Enregistrer les modifications
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900">Préférences de notifications</h2>
                {saved && (
                  <span className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <Check size={16} />
                    Enregistré
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-6">Choisissez les notifications que vous souhaitez recevoir</p>

              <div className="space-y-4">
                {[
                  { key: 'email_task_assigned', label: 'Nouvelle tâche assignée', description: 'Recevez un email quand une tâche vous est assignée' },
                  { key: 'email_task_updated', label: 'Tâche mise à jour', description: 'Recevez un email quand une tâche que vous suivez est modifiée' },
                  { key: 'email_task_due', label: 'Échéance proche', description: 'Recevez un rappel avant la date d\'échéance d\'une tâche' },
                  { key: 'email_stage_completed', label: 'Étape complétée', description: 'Recevez un email quand une étape d\'un projet est validée' },
                  { key: 'email_project_created', label: 'Nouveau projet', description: 'Recevez un email quand un nouveau projet est créé' },
                  { key: 'push_notifications', label: 'Notifications push', description: 'Recevez des notifications dans le navigateur' },
                  { key: 'daily_summary', label: 'Résumé quotidien', description: 'Recevez un résumé quotidien de vos tâches par email' },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notificationSettings[setting.key as keyof typeof notificationSettings]}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        [setting.key]: e.target.checked
                      })}
                      className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <label className="font-medium text-gray-900 block cursor-pointer">
                        {setting.label}
                      </label>
                      <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSave('Notifications')}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mt-6 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Enregistrer les préférences
                  </>
                )}
              </button>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Sécurité du compte</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    value={securityData.current_password}
                    onChange={(e) => setSecurityData({ ...securityData, current_password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={securityData.new_password}
                    onChange={(e) => setSecurityData({ ...securityData, new_password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    placeholder="••••••••"
                  />
                  <p className="text-sm text-gray-500 mt-1">Minimum 8 caractères</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={securityData.confirm_password}
                    onChange={(e) => setSecurityData({ ...securityData, confirm_password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  onClick={handleSaveSecurity}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      Changer le mot de passe
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Préférences générales</h2>
                {saved && (
                  <span className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <Check size={16} />
                    Enregistré
                  </span>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Langue
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuseau horaire
                  </label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                    <option value="America/New_York">America/New_York (GMT-5)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format de date
                  </label>
                  <select
                    value={preferences.date_format}
                    onChange={(e) => setPreferences({ ...preferences, date_format: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Éléments par page
                  </label>
                  <select
                    value={preferences.items_per_page}
                    onChange={(e) => setPreferences({ ...preferences, items_per_page: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <button
                  onClick={() => handleSave('Préférences')}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Enregistrer les préférences
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Apparence</h2>
                {saved && (
                  <span className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <Check size={16} />
                    Enregistré
                  </span>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thème
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {['light', 'dark', 'auto'].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setAppearance({ ...appearance, theme })}
                        className={`p-4 border-2 rounded-lg transition-all ${appearance.theme === theme
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="text-center">
                          <div className={`w-12 h-12 mx-auto mb-2 rounded-lg ${theme === 'light' ? 'bg-white border-2 border-gray-300' :
                              theme === 'dark' ? 'bg-gray-900' :
                                'bg-gradient-to-br from-white to-gray-900'
                            }`}></div>
                          <span className="text-sm font-medium capitalize">{theme === 'auto' ? 'Automatique' : theme === 'light' ? 'Clair' : 'Sombre'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taille de police
                  </label>
                  <select
                    value={appearance.font_size}
                    onChange={(e) => setAppearance({ ...appearance, font_size: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="small">Petite</option>
                    <option value="medium">Moyenne</option>
                    <option value="large">Grande</option>
                  </select>
                </div>

                <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={appearance.compact_mode}
                    onChange={(e) => setAppearance({ ...appearance, compact_mode: e.target.checked })}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label className="font-medium text-gray-900 block cursor-pointer">
                      Mode compact
                    </label>
                    <p className="text-sm text-gray-600 mt-1">Réduire l'espacement pour afficher plus de contenu</p>
                  </div>
                </div>

                <button
                  onClick={() => handleSave('Apparence')}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Enregistrer les préférences
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
