import React, { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, Terminal, Database, Download, FileIcon, Maximize2, Play, ChevronRight, ChevronDown as ChevronDownIcon, X, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowDatabaseTab, type DatabaseNodeInfo } from "./database";

export interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface BottomPanelProps {
  className?: string;
  logs?: LogEntry[];
  onClearLogs?: () => void;
  selectedNode?: { id: string; data?: Record<string, unknown>; [key: string]: unknown };
  onCloseNodeData?: () => void;
  databaseNodes?: DatabaseNodeInfo[];
  onPanelStateChange?: (isOpen: boolean, height: number) => void;
}

export function BottomPanel({ className, logs: externalLogs, onClearLogs, selectedNode, onCloseNodeData, databaseNodes = [], onPanelStateChange }: BottomPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"logs" | "data" | "database">("logs");
  const [panelHeight, setPanelHeight] = useState(240); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);
  const [activeDataTab, setActiveDataTab] = useState<"input" | "output">("output");
  const resizeRef = useRef<HTMLDivElement>(null);

  // Sync external logs with internal state
  useEffect(() => {
    if (externalLogs && externalLogs.length > 0) {
      setLogs(externalLogs);
      // Auto-open panel when new logs arrive
      setIsOpen(true);
      setActiveTab("logs");
    }
  }, [externalLogs]);

  // Auto-open and switch to data tab when node is selected
  useEffect(() => {
    if (selectedNode) {
      setIsOpen(true);
      setActiveTab("data");
    }
  }, [selectedNode]);

  // Auto-open database tab when database nodes are executed
  useEffect(() => {
    if (databaseNodes && databaseNodes.length > 0) {
      setIsOpen(true);
      setActiveTab("database");
    } else if (activeTab === "database") {
      // Switch away from database tab if no database nodes
      setActiveTab("logs");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseNodes]);

  // Notify parent about panel state changes
  useEffect(() => {
    onPanelStateChange?.(isOpen, panelHeight);
  }, [isOpen, panelHeight, onPanelStateChange]);

  const handleClearLogs = () => {
    setLogs([]);
    if (onClearLogs) {
      onClearLogs();
    }
  };

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const windowHeight = window.innerHeight;
      const newHeight = windowHeight - e.clientY;

      // Min height 150px, max height 80% of window
      const clampedHeight = Math.min(Math.max(newHeight, 150), windowHeight * 0.8);
      setPanelHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const renderValue = (value: unknown, path: string, depth: number = 0): React.ReactElement => {
    if (value === null) {
      return <span className="text-purple-400">null</span>;
    }

    if (value === undefined) {
      return <span className="text-gray-500">undefined</span>;
    }

    if (typeof value === "boolean") {
      return <span className="text-orange-400">{value.toString()}</span>;
    }

    if (typeof value === "number") {
      return <span className="text-cyan-400">{value}</span>;
    }

    if (typeof value === "string") {
      return <span className="text-green-400">"{value}"</span>;
    }

    if (Array.isArray(value)) {
      const isExpanded = expandedPaths.has(path);
      return (
        <div>
          <button
            onClick={() => toggleExpand(path)}
            className="inline-flex items-center gap-1 text-gray-400 hover:text-white"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="text-gray-500">Array({value.length})</span>
          </button>
          {isExpanded && (
            <div className="ml-4 border-l border-gray-700 pl-3 mt-1">
              {value.map((item, index) => (
                <div key={index} className="py-1">
                  <span className="text-gray-500">{index}:</span>{" "}
                  {renderValue(item, `${path}.${index}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const isExpanded = expandedPaths.has(path);
      const keys = Object.keys(obj);

      return (
        <div>
          <button
            onClick={() => toggleExpand(path)}
            className="inline-flex items-center gap-1 text-gray-400 hover:text-white"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="text-gray-500">Object({keys.length})</span>
          </button>
          {isExpanded && (
            <div className="ml-4 border-l border-gray-700 pl-3 mt-1">
              {keys.map((key) => (
                <div key={key} className="py-1 flex items-start gap-2">
                  <span className="text-blue-400 font-mono text-xs flex-shrink-0">{key}:</span>
                  <div className="flex-1 min-w-0">
                    {renderValue(obj[key], `${path}.${key}`, depth + 1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <span className="text-gray-300">{String(value)}</span>;
  };

  const handleDownloadFile = (fileData: { data: string; mimeType?: string }, fileName: string) => {
    try {
      const binaryString = atob(fileData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: fileData.mimeType || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  // Render data view (moved from NodeDataPanel)
  const renderDataView = (items: unknown[], label: string) => {
    if (!items || items.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No {label.toLowerCase()} data</p>
            <p className="text-xs mt-1">Execute the workflow to see data</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: `${panelHeight - 100}px` }}>
        {items.map((item, index) => {
          const data = item.json || item;
          const hasBinaryData = data.binary && data.binary.data;

          if (hasBinaryData) {
            const binaryData = data.binary.data;
            const mimeType = binaryData.mimeType || '';
            const isImage = mimeType.startsWith('image/');
            const isVideo = mimeType.startsWith('video/');
            const isAudio = mimeType.startsWith('audio/');
            const dataUrl = `data:${mimeType};base64,${binaryData.data}`;

            return (
              <div key={index} className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900/50">
                <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700 text-xs text-gray-400">
                  Item {index + 1} - {isImage ? 'Image' : isVideo ? 'Video' : isAudio ? 'Audio' : 'File'}
                </div>
                <div className="p-3 space-y-2">
                  {isImage && (
                    <div className="relative group">
                      <img
                        src={dataUrl}
                        alt={binaryData.fileName || 'Image preview'}
                        className="w-full h-auto max-h-48 object-contain bg-gray-900 rounded border border-gray-700"
                      />
                      <button
                        onClick={() => setFullSizeImage(dataUrl)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Maximize2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                  {isVideo && (
                    <video controls className="w-full h-auto max-h-48 bg-gray-900 rounded border border-gray-700">
                      <source src={dataUrl} type={mimeType} />
                    </video>
                  )}
                  {isAudio && (
                    <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded border border-purple-500/20">
                      <Play className="w-6 h-6 text-purple-400" />
                      <audio controls className="flex-1">
                        <source src={dataUrl} type={mimeType} />
                      </audio>
                    </div>
                  )}
                  {!isImage && !isVideo && !isAudio && (
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500/10 rounded">
                        <FileIcon className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="text-white truncate font-medium">{binaryData.fileName || 'download'}</p>
                        <p className="text-gray-400">{binaryData.mimeType}</p>
                        <p className="text-gray-500">{((binaryData.fileSize || 0) / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                  )}
                  {(isImage || isVideo || isAudio) && (
                    <div className="text-xs text-gray-400 flex items-center justify-between">
                      <span className="truncate">{binaryData.fileName || 'download'}</span>
                      <span>{((binaryData.fileSize || 0) / 1024).toFixed(2)} KB</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleDownloadFile(binaryData, binaryData.fileName)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-xs font-medium"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
            );
          }

          // Regular JSON data
          const keys = Object.keys(data);
          return (
            <div key={index} className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900/50">
              <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700 text-xs text-gray-400">
                Item {index + 1}
              </div>
              <div className="p-3 space-y-1.5 text-xs">
                {keys.map((key) => (
                  <div key={key} className="flex items-start gap-2">
                    <div className="flex items-center gap-1 min-w-[100px] flex-shrink-0">
                      <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                      <span className="text-gray-400 font-medium">{key}</span>
                    </div>
                    <div className="flex-1 min-w-0 font-mono">
                      {renderValue(data[key], `item${index}.${key}`, 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-0 left-16 right-0 h-10 glass border-t border-white/10 flex items-center justify-between px-4 text-gray-300 hover:text-white transition-colors z-20"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 shrink-0" />
          <span className="text-sm">{activeTab === 'logs' ? 'Logs' : 'Data'}</span>
        </div>
        <ChevronUp className="w-4 h-4 shrink-0" />
      </button>
    );
  }

  const inputData = selectedNode?.data?.inputData;
  const outputData = selectedNode?.data?.outputData || selectedNode?.data?.lastResult;
  const inputItems = Array.isArray(inputData) ? inputData : inputData ? [inputData] : [];
  // Handle outputData: if it's an array of arrays, use first element; if array, use directly; otherwise wrap in array
  const outputItems = Array.isArray(outputData)
    ? (Array.isArray(outputData[0]) ? outputData[0] : outputData)
    : outputData ? [outputData] : [];
  const inputCount = inputItems.length;
  const outputCount = Array.isArray(outputItems) ? outputItems.length : 0;

  return (
    <>
      <div
        className={cn("fixed bottom-0 left-16 right-0 glass border-t border-white/10 z-20 flex flex-col", className)}
        style={{ height: `${panelHeight}px` }}
      >
        {/* Resize Handle */}
        <div
          ref={resizeRef}
          className={cn(
            "h-1 cursor-ns-resize hover:bg-cyan-500/50 transition-colors",
            isResizing && "bg-cyan-500"
          )}
          onMouseDown={() => setIsResizing(true)}
        />

        {/* Header with Tabs */}
        <div className="flex items-center border-b border-white/10">
          <div className="flex items-center gap-1 px-2">
            <button
              onClick={() => setActiveTab("logs")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                activeTab === "logs"
                  ? "border-cyan-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              <Terminal className="w-4 h-4" />
              Logs
              {logs.length > 0 && (
                <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">{logs.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                activeTab === "data"
                  ? "border-cyan-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              <Database className="w-4 h-4" />
              Data
              {selectedNode && (
                <span className="text-xs text-gray-500 truncate max-w-[200px]">
                  {selectedNode.data?.label || selectedNode.id}
                </span>
              )}
            </button>
            {/* Only show Database tab when there are database nodes executed */}
            {databaseNodes.length > 0 && (
              <button
                onClick={() => setActiveTab("database")}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                  activeTab === "database"
                    ? "border-cyan-500 text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                )}
              >
                <Table className="w-4 h-4" />
                Database
                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                  {databaseNodes.length}
                </span>
              </button>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 px-4">
            {activeTab === "logs" && logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
            {activeTab === "data" && selectedNode && onCloseNodeData && (
              <button
                onClick={onCloseNodeData}
                className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Close
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "logs" && (
            <div className="h-full overflow-y-auto p-4 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Execute workflow to view execution logs</p>
                    <p className="text-xs mt-1">Click a node to view its input/output data</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => {
                    const isJSON = log.message.trim().startsWith('{') || log.message.trim().startsWith('[');
                    return (
                      <div key={index} className="flex items-start gap-3">
                        <span className="text-gray-500 flex-shrink-0">{log.time}</span>
                        {isJSON ? (
                          <pre className={cn("flex-1 overflow-x-auto whitespace-pre-wrap", log.type === "success" && "text-green-400", log.type === "error" && "text-red-400", log.type === "info" && "text-blue-300", log.type === "warning" && "text-yellow-400")}>
                            {log.message}
                          </pre>
                        ) : (
                          <span className={cn("flex-1", log.type === "success" && "text-green-400", log.type === "error" && "text-red-400", log.type === "info" && "text-cyan-400", log.type === "warning" && "text-yellow-400")}>
                            {log.message}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {activeTab === "data" && (
            <div className="h-full flex flex-col">
              {selectedNode ? (
                <>
                  {/* Input/Output Tabs */}
                  <div className="border-b border-white/10 flex px-4">
                    <button
                      onClick={() => setActiveDataTab("input")}
                      className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2",
                        activeDataTab === "input"
                          ? "border-cyan-500 text-white"
                          : "border-transparent text-gray-400 hover:text-white"
                      )}
                    >
                      Input
                      {inputCount > 0 && (
                        <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                          {inputCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveDataTab("output")}
                      className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2",
                        activeDataTab === "output"
                          ? "border-cyan-500 text-white"
                          : "border-transparent text-gray-400 hover:text-white"
                      )}
                    >
                      Output
                      {outputCount > 0 && (
                        <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                          {outputCount}
                        </span>
                      )}
                    </button>
                  </div>
                  {/* Data Content */}
                  <div className="flex-1 overflow-hidden">
                    {activeDataTab === "input" && renderDataView(inputItems, "Input")}
                    {activeDataTab === "output" && renderDataView(outputItems, "Output")}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Click on a node to view its data</p>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === "database" && (
            <WorkflowDatabaseTab
              databaseNodes={databaseNodes}
              panelHeight={panelHeight}
            />
          )}
        </div>
      </div>

      {/* Full-size Image Modal */}
      {fullSizeImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setFullSizeImage(null)}
        >
          <button
            onClick={() => setFullSizeImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={fullSizeImage}
            alt="Full size preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
