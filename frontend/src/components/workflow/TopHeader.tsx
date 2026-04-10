import { Download, Upload, Copy, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/useRoles";

interface TopHeaderProps {
  workflowName?: string;
  onWorkflowNameChange?: (name: string) => void;
  activeTab?: "editor" | "executions" | "templates";
  onTabChange?: (tab: "editor" | "executions" | "templates") => void;
  onSave?: () => void;
  onExecute?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSaveAsTemplate?: () => void;
  onCreateNew?: () => void;
  onBack?: () => void;
  isActive?: boolean;
  hasUnsavedChanges?: boolean;
  isWorkflowActive?: boolean;
  onToggleActive?: (active: boolean) => void;
}

export function TopHeader({
  workflowName = "My workflow",
  onWorkflowNameChange,
  activeTab = "editor",
  onTabChange,
  onSave,
  onExecute,
  onExport,
  onImport,
  onDuplicate,
  onDelete,
  onSaveAsTemplate,
  onCreateNew: _onCreateNew,
  onBack: _onBack,
  isActive = false,
  hasUnsavedChanges = false,
  isWorkflowActive = false,
  onToggleActive,
}: TopHeaderProps) {
  const { isAdmin } = useRoles();
  return (
    <div className="h-14 glass border-b border-white/10 flex items-center justify-between px-4">
      {/* Left: Workflow Info */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={workflowName}
          onChange={(e) => onWorkflowNameChange?.(e.target.value)}
          className="bg-transparent border-none text-white text-base font-medium outline-none focus:outline-none px-2 py-1 rounded hover:bg-white/10 focus:bg-white/10"
          placeholder="Workflow name"
        />
      </div>

      {/* Center: Tabs */}
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
        <button
          onClick={() => onTabChange?.("editor")}
          className={cn(
            "px-4 py-1.5 text-sm rounded transition-colors",
            activeTab === "editor"
              ? "bg-white/10 text-white"
              : "text-gray-300 hover:text-white hover:bg-white/5"
          )}
        >
          Editor
        </button>
        <button
          onClick={() => onTabChange?.("executions")}
          className={cn(
            "px-4 py-1.5 text-sm rounded transition-colors",
            activeTab === "executions"
              ? "bg-white/10 text-white"
              : "text-gray-300 hover:text-white hover:bg-white/5"
          )}
        >
          Executions
        </button>
        <button
          onClick={() => onTabChange?.("templates")}
          className={cn(
            "px-4 py-1.5 text-sm rounded transition-colors",
            activeTab === "templates"
              ? "bg-white/10 text-white"
              : "text-gray-300 hover:text-white hover:bg-white/5"
          )}
        >
          Workflows
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Workflow Activation Toggle */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <span className="text-sm text-gray-300">
            {isWorkflowActive ? 'Active' : 'Inactive'}
          </span>
          <Switch
            checked={isWorkflowActive}
            onCheckedChange={onToggleActive}
            className={cn(
              "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-emerald-500"
            )}
          />
        </div>

        <Button
          onClick={onExecute}
          size="sm"
          disabled={isActive}
          className={cn(
            "text-white transition-all",
            isActive
              ? "bg-gray-600 cursor-not-allowed opacity-50"
              : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          )}
        >
          {isActive ? 'Executing...' : 'Execute'}
        </Button>

        <Button
          onClick={onSave}
          size="sm"
          disabled={!hasUnsavedChanges}
          className={cn(
            "text-white transition-all",
            hasUnsavedChanges
              ? "bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
              : "bg-gray-600 cursor-not-allowed opacity-50"
          )}
        >
          Save
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-white/10 rounded text-gray-300 hover:text-white">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800 text-white">
            <DropdownMenuItem 
              onClick={onExport}
              className="flex items-center gap-2 hover:bg-gray-800 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download as JSON</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onImport}
              className="flex items-center gap-2 hover:bg-gray-800 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import from JSON</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-800" />
            <DropdownMenuItem 
              onClick={onDuplicate}
              className="flex items-center gap-2 hover:bg-gray-800 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Duplicate</span>
            </DropdownMenuItem>
            {isAdmin() && onSaveAsTemplate && (
              <>
                <DropdownMenuSeparator className="bg-gray-800" />
                <DropdownMenuItem 
                  onClick={onSaveAsTemplate}
                  className="flex items-center gap-2 hover:bg-gray-800 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Save as Template</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className="bg-gray-800" />
            <DropdownMenuItem 
              onClick={onDelete}
              className="flex items-center gap-2 hover:bg-gray-800 cursor-pointer text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
