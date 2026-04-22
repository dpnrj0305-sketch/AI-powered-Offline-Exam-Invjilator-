import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogIn, Info, MessageSquare, LayoutDashboard } from "lucide-react";

export const Navigation = () => {
  const navigate = useNavigate();

  return (
    <nav className="flex flex-wrap gap-2 justify-center sm:justify-start">
      <Button variant="outline" onClick={() => navigate("/auth")}>
        <LogIn className="h-4 w-4 mr-2" />
        Login
      </Button>
      <Button variant="outline" onClick={() => navigate("/dashboard")}>
        <LayoutDashboard className="h-4 w-4 mr-2" />
        Dashboard
      </Button>
      <Button variant="outline" onClick={() => navigate("/about")}>
        <Info className="h-4 w-4 mr-2" />
        About
      </Button>
      <Button variant="outline" onClick={() => navigate("/feedback")}>
        <MessageSquare className="h-4 w-4 mr-2" />
        Feedback
      </Button>
    </nav>
  );
};
