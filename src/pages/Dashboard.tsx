import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    // TODO: Call your actual logoutWeb endpoint here
    localStorage.removeItem("isAuthenticated");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Agrum Dashboard</h1>
          <Button variant="destructive" onClick={handleLogout}>
            Logout
          </Button>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p>Welcome to the secure admin panel.</p>
        </div>
      </div>
    </div>
  );
}