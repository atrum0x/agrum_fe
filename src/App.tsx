import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./pages/Login";
import { Users } from "./pages/Users"; // Your new users page
import ProtectedRoute from "./components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "./layout/MainLayout";
import Landing from "./pages/Landing";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <MainLayout />,
        children: [
          {path: "landing",
            element: <Landing/>
          },
          {
            path: "users",
            element: <Users />, 
          },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  );
}