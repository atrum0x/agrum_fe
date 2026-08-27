import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  // Check simple hint. 
  // (True security is still enforced by the backend rejecting the cookie).
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child routes (like Dashboard)
  return <Outlet />;
}