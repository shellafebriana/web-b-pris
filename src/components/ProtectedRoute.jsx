"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';

/**
 * ProtectedRoute - Wrapper untuk melindungi pages yang butuh autentikasi
 * 
 * Usage:
 * export default function DashboardPage() {
 *   return <ProtectedRoute>
 *     <YourComponent />
 *   </ProtectedRoute>
 * }
 */
export function ProtectedRoute({ children, requiredRole = null }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    // Jika masih loading, jangan redirect
    if (isLoading) return;

    // Jika tidak authenticated, redirect ke login
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Jika ada required role, check apakah user punya role tersebut
    if (requiredRole && user?.role !== requiredRole) {
      router.push('/dashboard'); // Redirect ke dashboard
      return;
    }
  }, [isAuthenticated, isLoading, user, requiredRole, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Jika tidak authenticated, jangan render children
  if (!isAuthenticated) {
    return null;
  }

  // Jika ada required role dan tidak match, jangan render
  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  // Render children jika authenticated
  return children;
}

/**
 * AdminOnly - Wrapper khusus untuk admin-only pages
 */
export function AdminOnly({ children }) {
  return <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>;
}

/**
 * OperatorOnly - Wrapper khusus untuk operator-only pages
 */
export function OperatorOnly({ children }) {
  return <ProtectedRoute requiredRole="operator">{children}</ProtectedRoute>;
}