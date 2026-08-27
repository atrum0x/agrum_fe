import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />, // Auto-redirect root to dashboard
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    // Every route inside this block requires the user to be logged in
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      // You can add more secure routes here later:
      // { path: "/users", element: <UsersPage /> }
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}