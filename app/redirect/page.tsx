'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Page intermédiaire pour gérer les redirections depuis les emails
 * Force la déconnexion avant de rediriger vers la page de destination
 * Utile en environnement local où les cookies sont partagés entre onglets
 */
export default function RedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Forcer la déconnexion
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Récupérer tous les paramètres de l'URL
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'to') {
        params.append(key, value);
      }
    });

    // Construire l'URL de redirection
    const to = searchParams.get('to') || '/login';
    const queryString = params.toString();
    const redirectUrl = queryString ? `${to}?${queryString}` : to;

    router.push(redirectUrl);
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-100">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Redirection en cours...</p>
        <p className="mt-2 text-sm text-gray-500">Veuillez vous connecter pour continuer</p>
      </div>
    </div>
  );
}
