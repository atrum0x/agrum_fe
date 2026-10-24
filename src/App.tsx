import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import Login from "./pages/Login";
import { Users } from "./pages/Users"; // Your new users page
import ProtectedRoute from "./components/ProtectedRoute";
import RequirePermission from "./components/RequirePermission";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "./layout/MainLayout";
import Landing from "./pages/Landing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { PermissionSets } from "./pages/PermissionSets";
import { Estates } from "./pages/Estates";
import { Attendance } from "./pages/Attendance";
import { WeightHistory } from "./pages/WeightHistory";
import { WeightApprovals } from "./pages/WeightApprovals";
import { DailyWeightSummary } from "./pages/DailyWeightSummary";


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
              {
                // Menu pages need their permission (nav-data)
                element: <RequirePermission />,
                children: [
                  { path: "users", element: <Users /> },
                  { path: "permission-sets", element: <PermissionSets /> },
                  { path: "sites", element: <Estates /> },
                  { path: "attendance", element: <Attendance /> },
                  { path: "weight-history", element: <WeightHistory /> },
                  { path: "weight-approvals", element: <WeightApprovals /> },
                  { path: "daily-weight-summary", element: <DailyWeightSummary /> },
                  { path: "my-weighings", element: <WeightHistory key="mine" mine /> },
                  { path: "my-daily-summary", element: <DailyWeightSummary key="mine" mine /> },
                ],
              },
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