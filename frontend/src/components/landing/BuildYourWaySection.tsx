import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, GripVertical, Sparkles, MousePointer2, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useRef, useContext } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AuthContext } from "../../contexts/AuthContext";

// Available node types for the sidebar
const availableNodes = [
  { id: 'form', label: 'Form Trigger', icon: '/icons/connectors/form.png', type: 'trigger', color: 'from-blue-500 to-cyan-500', borderColor: 'border-blue-400' },
  { id: 'webhook', label: 'Webhook', icon: '/icons/connectors/webhook.png', type: 'trigger', color: 'from-orange-500 to-amber-500', borderColor: 'border-orange-400' },
  { id: 'gmail', label: 'Gmail', icon: '/icons/connectors/gmail.png', type: 'action', color: 'from-red-500 to-pink-500', borderColor: 'border-red-400' },
  { id: 'slack', label: 'Slack', icon: '/icons/connectors/slack.png', type: 'action', color: 'from-purple-500 to-violet-500', borderColor: 'border-purple-400' },
  { id: 'openai', label: 'OpenAI', icon: '/icons/connectors/openai.png', type: 'action', color: 'from-emerald-500 to-teal-500', borderColor: 'border-emerald-400' },
  { id: 'notion', label: 'Notion', icon: '/icons/connectors/notion.png', type: 'action', color: 'from-gray-700 to-gray-900', borderColor: 'border-gray-500' },
];

// Initial demo nodes
const initialNodes: Node[] = [
  {
    id: 'demo-1',
    type: 'demoNode',
    position: { x: 100, y: 150 },
    data: { label: 'Form Trigger', icon: '/icons/connectors/form.png', type: 'trigger', color: 'from-blue-500 to-cyan-500', borderColor: 'border-blue-400' },
  },
];

const initialEdges: Edge[] = [];

// Custom draggable node component
function DemoNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`
      bg-white rounded-xl border-2 ${data.borderColor} shadow-lg p-3 min-w-[120px]
      transition-all duration-200 cursor-grab active:cursor-grabbing
      ${selected ? 'ring-2 ring-cyan-500 ring-offset-2' : ''}
      hover:shadow-xl hover:-translate-y-0.5
    `}>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
      <div className="flex items-center gap-2">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${data.color} flex items-center justify-center shadow-md`}>
          <img src={data.icon} alt={data.label} className="w-6 h-6 object-contain" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />
        </div>
        <div>
          <div className={`text-[10px] font-bold uppercase tracking-wide ${data.type === 'trigger' ? 'text-blue-600' : 'text-gray-500'}`}>
            {data.type}
          </div>
          <div className="text-xs font-semibold text-gray-800">
            {data.label}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-white"
      />
    </div>
  );
}

const nodeTypes = {
  demoNode: DemoNode,
};

// Sidebar node item component
function SidebarNode({ node, onDragStart }: { node: typeof availableNodes[0]; onDragStart: (e: React.DragEvent, node: typeof availableNodes[0]) => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node)}
      className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 cursor-grab active:cursor-grabbing hover:border-cyan-300 hover:shadow-md transition-all group"
    >
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${node.color} flex items-center justify-center shadow-sm`}>
        <img src={node.icon} alt={node.label} className="w-5 h-5 object-contain" onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }} />
      </div>
      <span className="text-xs font-medium text-gray-700 flex-1">{node.label}</span>
      <GripVertical className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// Inner component that uses ReactFlow
function InteractiveCanvas() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#0891b2', strokeWidth: 2 }
    }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const nodeData = event.dataTransfer.getData('application/reactflow');
    if (!nodeData || !reactFlowInstance) return;

    const node = JSON.parse(nodeData);
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'demoNode',
      position,
      data: {
        label: node.label,
        icon: node.icon,
        type: node.type,
        color: node.color,
        borderColor: node.borderColor,
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [reactFlowInstance, setNodes]);

  const onDragStart = (event: React.DragEvent, node: typeof availableNodes[0]) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(node));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleStartBuilding = () => {
    if (authContext?.isAuthenticated) {
      navigate('/orgs');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="flex h-[500px] rounded-2xl overflow-hidden border border-gray-200 shadow-2xl bg-white">
      {/* Sidebar */}
      <div className="w-48 bg-gray-50 border-r border-gray-200 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-semibold text-gray-800">{t('buildYourWay.interactive.addNodes', 'Add Nodes')}</span>
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto">
          {availableNodes.map((node) => (
            <SidebarNode key={node.id} node={node} onDragStart={onDragStart} />
          ))}
        </div>
        <div className="pt-4 border-t border-gray-200 mt-4">
          <p className="text-[10px] text-gray-500 text-center">
            {t('buildYourWay.interactive.dragHint', 'Drag nodes to canvas')}
          </p>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.5 }}
          minZoom={0.5}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          className="bg-gradient-to-br from-slate-50 to-gray-100"
        >
          <Background
            color="#cbd5e1"
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
          />
          <Controls
            showInteractive={false}
            className="!bg-white !border-gray-200 !shadow-lg [&>button]:!bg-white [&>button]:!border-gray-200 [&>button]:!text-gray-600 [&>button:hover]:!bg-gray-50"
          />
        </ReactFlow>

        {/* Overlay hint */}
        {nodes.length <= 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 shadow-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <MousePointer2 className="w-5 h-5 text-cyan-600" />
                </motion.div>
                <span className="text-sm text-gray-600">
                  {t('buildYourWay.interactive.canvasHint', 'Drag nodes here & connect them')}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bottom CTA overlay */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <Button
            onClick={handleStartBuilding}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-2 text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {t('buildYourWay.interactive.startBuilding', 'Start Building Real Workflows')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BuildYourWaySection() {
  const { t } = useTranslation();

  return (
    <section className="relative py-12 md:py-16 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {t('buildYourWay.interactive.title', 'Experience the')}{' '}
            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
              {t('buildYourWay.interactive.titleHighlight', 'Visual Editor')}
            </span>
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            {t('buildYourWay.interactive.subtitle', 'Drag nodes, connect them, and see how easy it is to build workflows')}
          </p>
        </motion.div>

        {/* Interactive Canvas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          <ReactFlowProvider>
            <InteractiveCanvas />
          </ReactFlowProvider>
        </motion.div>

        {/* Features below */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="mt-12 grid md:grid-cols-3 gap-6"
        >
          <div className="text-center p-6 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
              <MousePointer2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('buildYourWay.interactive.feature1.title', 'Drag & Drop')}</h3>
            <p className="text-sm text-gray-600">{t('buildYourWay.interactive.feature1.desc', 'Simply drag nodes from the sidebar onto your canvas')}</p>
          </div>
          <div className="text-center p-6 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('buildYourWay.interactive.feature2.title', 'Visual Connections')}</h3>
            <p className="text-sm text-gray-600">{t('buildYourWay.interactive.feature2.desc', 'Connect nodes by dragging from one handle to another')}</p>
          </div>
          <div className="text-center p-6 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('buildYourWay.interactive.feature3.title', 'Instant Deploy')}</h3>
            <p className="text-sm text-gray-600">{t('buildYourWay.interactive.feature3.desc', 'Deploy your workflow with a single click')}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
