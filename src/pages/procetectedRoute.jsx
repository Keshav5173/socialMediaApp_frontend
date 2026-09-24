// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken, getRefreshToken } from '../services/auth.services';

function ProtectedRoute() {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  // No tokens at all — not logged in, send to login
  if (!accessToken || !refreshToken) {
    return <Navigate to="/login" replace />;
  }

  
  return <Outlet />;
}

export default ProtectedRoute;