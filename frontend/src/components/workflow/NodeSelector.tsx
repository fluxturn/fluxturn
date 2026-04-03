import { useReactFlow } from "@xyflow/react";
import { Plus, Zap, Cog, GitBranch } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getTriggerNodes,
  getActionNodes,
  getControlNodes,
  type NodeTypeDefinition,
  NodeType,
} from "@/config/workflow";

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NodeSelector({ open, onOpenChange }: NodeSelectorProps) {
  const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();
  const [activeTab, setActiveTab] = useState<"triggers" | "actions" | "control">("triggers");

  const triggerNodes = getTriggerNodes();
  const actionNodes = getActionNodes();
  const controlNodes = getControlNodes();

  const handleNodeSelect = useCallback(
    (selection: NodeTypeDefinition) => {
      // Check if trying to add a manual trigger when one already exists
      if (selection.type === NodeType.MANUAL_TRIGGER) {
        const nodes = getNodes();
        const hasManualTrigger = nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER);

        if (hasManualTrigger) {
          toast.error("Only one manual trigger is allowed per workflow");
          return;
        }
      }

      setNodes((nodes) => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const flowPosition = screenToFlowPosition({
          x: centerX + (Math.random() - 0.5) * 200,
          y: centerY + (Math.random() - 0.5) * 200,
        });

        const newNode = {
          id: `${selection.type}_${Date.now()}`,
          data: {},
          position: flowPosition,
          type: selection.type,
        };

        return [...nodes, newNode];
      });

      toast.success(`Added ${selection.label}`);
      onOpenChange(false);
    },
    [setNodes, getNodes, onOpenChange, screenToFlowPosition]
  );

  const renderNodeOption = (nodeType: NodeTypeDefinition) => {
    const Icon = nodeType.icon;

    return (
      <div
        key={nodeType.type}
        className="w-full cursor-pointer border-l-2 border-transparent hover:border-l-cyan-500 hover:bg-gray-800/50 transition-all rounded-r-lg"
        onClick={() => handleNodeSelect(nodeType)}
      >
        <div className="flex items-start gap-4 p-4">
          <div className={`p-2 bg-${nodeType.color}-500/20 rounded-lg`}>
            <Icon className={`size-5 text-${nodeType.color}-400`} />
          </div>
          <div className="flex-1">
            <span className="font-medium text-sm text-white block">{nodeType.label}</span>
            <span className="text-xs text-gray-400 block mt-1">{nodeType.description}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Node to Workflow</DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose a node type to add to your workflow
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="triggers" className="data-[state=active]:bg-cyan-500/20">
              <Zap className="size-4 mr-2" />
              Triggers
            </TabsTrigger>
            <TabsTrigger value="actions" className="data-[state=active]:bg-teal-500/20">
              <Cog className="size-4 mr-2" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="control" className="data-[state=active]:bg-purple-500/20">
              <GitBranch className="size-4 mr-2" />
              Control
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="triggers" className="mt-0">
              <div className="space-y-1">
                {triggerNodes.map(renderNodeOption)}
              </div>
            </TabsContent>

            <TabsContent value="actions" className="mt-0">
              <div className="space-y-1">
                {actionNodes.map(renderNodeOption)}
              </div>
            </TabsContent>

            <TabsContent value="control" className="mt-0">
              <div className="space-y-1">
                {controlNodes.map(renderNodeOption)}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function AddNodeButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-lg"
      >
        <Plus className="size-4 mr-2" />
        Add Node
      </Button>
      <NodeSelector open={open} onOpenChange={setOpen} />
    </>
  );
}
