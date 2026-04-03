import { Home, Flame, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { extractRouteContext, servicePaths } from "@/lib/navigation-utils";

interface LeftSidebarProps {
  className?: string;
}

export function LeftSidebar({ className }: LeftSidebarProps) {
  const navigate = useNavigate();
  const params = useParams();
  const context = extractRouteContext(params);
  return (
    <div className={cn("w-16 glass border-r border-white/10 flex flex-col", className)}>
      {/* Top Navigation */}
      <div className="flex-1 py-4">
        <div className="flex flex-col items-center space-y-1">
          {/* Logo */}
          <button
            onClick={() => {
              if (context.projectId) {
                navigate(servicePaths.workflows(context));
              } else if (context.organizationId) {
                navigate(`/org/${context.organizationId}`);
              } else {
                navigate('/orgs');
              }
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors mb-4"
            title="Go to Dashboard"
          >
            <Flame className="w-6 h-6 text-cyan-400" />
          </button>

          {/* Home Button */}
          <button
            onClick={() => {
              if (context.projectId) {
                navigate(servicePaths.workflows(context));
              } else if (context.organizationId) {
                navigate(`/org/${context.organizationId}`);
              } else {
                navigate('/orgs');
              }
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
            title="Home"
          >
            <Home className="w-5 h-5" />
          </button>

          {/* Create New Workflow */}
          <button
            onClick={() => navigate(servicePaths.workflows(context))}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
            title="Create new workflow"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="py-4 border-t border-white/10">
        <div className="flex flex-col items-center space-y-1">
          {/* User Avatar */}
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 text-white text-sm font-medium">
            JD
          </button>
        </div>
      </div>
    </div>
  );
}
