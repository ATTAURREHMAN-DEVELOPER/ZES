import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';

const OwnerRoute = ({ children }: { children: JSX.Element }) => {
  const user = getCurrentUser();
  if (!user || user.role !== 'owner') return <Navigate to="/" replace />;
  return children;
};

export default OwnerRoute;


