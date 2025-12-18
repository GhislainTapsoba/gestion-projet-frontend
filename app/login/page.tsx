'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const confirmed = searchParams.get('confirmed');
    const message = searchParams.get('message');
    const error = searchParams.get('error');
    const logout = searchParams.get('logout');

    // Si logout=true, forcer la déconnexion (important en local où les cookies sont partagés)
    if (logout === 'true') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    if (confirmed === 'true') {
      // Si un message personnalisé est fourni, l'utiliser
      if (message) {
        toast.success(message);
      } else {
        // Sinon, utiliser le message par défaut
        toast.success('✅ Confirmation réussie ! La tâche a bien été démarrée.');
      }
    }
    if (error) {
      // Messages d'erreur conviviaux
      const errorMessages: Record<string, string> = {
        'invalid_token': 'Le lien de confirmation est invalide ou manquant.',
        'Token invalide ou expiré': 'Le lien de confirmation a expiré. Veuillez demander un nouveau lien.',
        'Ce token a déjà été utilisé': 'Ce lien de confirmation a déjà été utilisé.',
        'Ce token a expiré': 'Le lien de confirmation a expiré. Veuillez demander un nouveau lien.',
        'server_error': 'Une erreur serveur est survenue. Veuillez réessayer plus tard.',
        'unknown': 'Une erreur inconnue est survenue.'
      };

      toast.error(errorMessages[error] || `Erreur : ${error}`);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Connexion en cours...');

    try {
      const { data } = await axios.post(
        `${API_URL}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      if (data?.token && data?.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        toast.success('Connexion réussie ! Redirection...', { id: toastId });

        // Vérifier s'il y a une URL de redirection après login
        const redirectTo = searchParams.get('redirect');
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.push('/dashboard');
        }
      } else {
        // Au cas où la réponse ne serait pas celle attendue
        throw new Error('Réponse inattendue du serveur.');
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Email ou mot de passe incorrect';
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600">
            <LogIn className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Connexion à votre compte
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Entrez vos identifiants pour continuer
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@email.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-10 py-3 text-gray-900
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>

          {/* Password with Eye */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 bg-white px-10 pr-12 py-3 text-gray-900
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white
            transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading && (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Se connecter
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Plateforme de gestion. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
