import { Navigate, Outlet } from "react-router-dom";

export const PrivateRoute = () => {
  // Verifica se o token existe no localStorage
  const isAuthenticated = !!localStorage.getItem("auth_token");

  // Se tiver token, renderiza a página (Outlet). Se não, joga pro Login.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};