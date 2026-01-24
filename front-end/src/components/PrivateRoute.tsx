import { Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export const PrivateRoute = () => {
  const { isAuthenticated } = useAuth();

  // If not authenticated, redirect to login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export const AdminRoute = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setIsAdmin(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        const user = await getCurrentUser();
        setIsAdmin(user.role === "admin");
      } catch (err) {
        console.error("Error checking admin status:", err);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [isAuthenticated]);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};