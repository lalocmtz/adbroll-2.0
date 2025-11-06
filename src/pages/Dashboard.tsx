import { Card } from "@/components/ui/card";
import { Video } from "lucide-react";
import { DashboardStudio } from "@/components/dashboard/studio/DashboardStudio";

const Dashboard = () => {
  return (
    <div className="space-y-8">
      {/* Unified Studio Workspace */}
      <DashboardStudio />
    </div>
  );
};

export default Dashboard;
