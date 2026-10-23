import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import Login from "./pages/Login";
import { Users } from "./pages/Users"; // Your new users page
import ProtectedRoute from "./components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "./layout/MainLayout";
import Landing from "./pages/Landing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { PermissionSets } from "./pages/PermissionSets";
import { Estates } from "./pages/Estates";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, 
      refetchOnWindowFocus: false, 
    },
  },
});

function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/login", element: <Login /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/",
            element: <MainLayout />,
            children: [
              { index: true, element: <Navigate to="/landing" replace /> },
              { path: "landing", element: <Landing /> },
              { path: "users", element: <Users /> },
              { path: "permission-sets", element: <PermissionSets /> },
              { path: "sites", element: <Estates /> },
            ],
          },
        ],
      },
    ],
  },
]);


export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
          <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}