import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { isAuthenticated } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // First, check local session
    if (isAuthenticated()) {
      setAllowed(true);
      return;
    }
    // Then, check Supabase session
    supabase.auth.getSession().then(({ data }) => {
      setAllowed(!!data.session);
    }).catch(() => setAllowed(false));
  }, []);

  if (allowed === null) return null;
  if (!allowed) return <Navigate to="/" replace />;
  return children;
};

export default ProtectedRoute;


