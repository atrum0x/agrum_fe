import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./pages/Login";
import { Users } from "./pages/Users"; // Your new users page
import ProtectedRoute from "./components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "./layout/MainLayout";
import Landing from "./pages/Landing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // If a request fails, try one more time before throwing an error
      refetchOnWindowFocus: false, // Prevents refetching every time you click off the browser
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}