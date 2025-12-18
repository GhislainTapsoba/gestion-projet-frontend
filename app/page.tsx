'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Gérer les messages d'erreur ou de confirmation depuis les paramètres URL
    const error = searchParams.get('error');
    const confirmed = searchParams.get('confirmed');
    const message = searchParams.get('message');

    if (error) {
      // Afficher l'erreur
      const errorMessages: Record<string, string> = {
        'server_error': 'Une erreur serveur est survenue. Veuillez réessayer.',
        'invalid_token': 'Le lien de confirmation est invalide ou a expiré.',
        'unknown': 'Une erreur inconnue est survenue.'
      };
      toast.error(errorMessages[error] || error);
    }

    if (confirmed === 'true' && message) {
      toast.success(message);
    }

    // Vérifier si l'utilisateur est connecté
    const user = localStorage.getItem('user');

    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Redirection...</p>
      </div>
    </div>
  );
}
