import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface PublicRouteProps {
  children: JSX.Element;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // If already logged in locally, block public route
    const user = getCurrentUser();
    if (user) {
      setAllowed(false);
      return;
    }
    // Check Supabase session
    supabase.auth.getSession().then(({ data }) => {
      setAllowed(!data.session);
    }).catch(() => setAllowed(true));
  }, []);

  if (allowed === null) return null;
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return children;
};

export default PublicRoute;


