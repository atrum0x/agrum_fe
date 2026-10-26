import { useAuth } from "@/context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  // Check simple hint. 
  // (True security is still enforced by the backend rejecting the cookie).
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child routes (like Dashboard)
  return <Outlet />;
}