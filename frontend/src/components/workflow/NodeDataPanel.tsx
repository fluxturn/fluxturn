import React, { useState } from "react";
import { X, ChevronRight, ChevronDown, Download, FileIcon, Maximize2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeDataInfo {
  id: string;
  type?: string;
  data?: {
    label?: string;
    inputData?: unknown;
    outputData?: unknown;
    lastResult?: unknown;
    executionTime?: number;
    error?: string;
    [key: string]: unknown;
  };
}

interface NodeDataPanelProps {
  node: NodeDataInfo;
  onClose: () => void;
}

export function NodeDataPanel({ node, onClose }: NodeDataPanelProps) {
  const [activeTab, setActiveTab] = useState<"input" | "output">("output");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);

  if (!node) return null;

  const inputData = node.data?.inputData;
  const outputData = node.data?.outputData || node.data?.lastResult;

  // Calculate item counts
  const inputCount = Array.isArray(inputData) ? inputData.length : inputData ? 1 : 0;
  const outputCount = outputData?.[0] ? outputData[0].length : outputData ? 1 : 0;

  // Extract data for display
  const inputItems = Array.isArray(inputData) ? inputData : inputData ? [inputData] : [];
  const outputItems = outputData?.[0] || (outputData ? [outputData] : []);

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
              <ChevronDown className="w-3 h-3" />
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
              <ChevronDown className="w-3 h-3" />
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
      // Decode base64 data
      const binaryString = atob(fileData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and download
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

  const renderDataView = (items: unknown[], label: string) => {
    if (!items || items.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <p>No {label.toLowerCase()} data</p>
            <p className="text-xs mt-1">Execute the workflow to see data</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        {items.map((item, index) => {
          const data = item.json || item;

          // Check if this is binary/file data
          const hasBinaryData = data.binary && data.binary.data;

          if (hasBinaryData) {
            const binaryData = data.binary.data;
            const mimeType = binaryData.mimeType || '';
            const isImage = mimeType.startsWith('image/');
            const isVideo = mimeType.startsWith('video/');
            const isAudio = mimeType.startsWith('audio/');

            // Create data URL for preview
            const dataUrl = `data:${mimeType};base64,${binaryData.data}`;

            return (
              <div key={index} className="border border-gray-700 rounded-lg overflow-hidden">
                {/* Item Header */}
                <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-400">
                    Item {index + 1} - {isImage ? 'Image' : isVideo ? 'Video' : isAudio ? 'Audio' : 'File'}
                  </span>
                </div>

                {/* File Data */}
                <div className="p-4 space-y-3 bg-black/20">
                  {/* Preview Section */}
                  {isImage && (
                    <div className="space-y-2">
                      <div className="relative group">
                        <img
                          src={dataUrl}
                          alt={binaryData.fileName || 'Image preview'}
                          className="w-full h-auto max-h-64 object-contain bg-gray-900 rounded-lg border border-gray-700"
                        />
                        <button
                          onClick={() => setFullSizeImage(dataUrl)}
                          className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="View full size"
                        >
                          <Maximize2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  )}

                  {isVideo && (
                    <div className="space-y-2">
                      <video
                        controls
                        className="w-full h-auto max-h-64 bg-gray-900 rounded-lg border border-gray-700"
                      >
                        <source src={dataUrl} type={mimeType} />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}

                  {isAudio && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <Play className="w-8 h-8 text-purple-400" />
                        <div className="flex-1">
                          <audio controls className="w-full">
                            <source src={dataUrl} type={mimeType} />
                            Your browser does not support the audio tag.
                          </audio>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File Info */}
                  {!isImage && !isVideo && !isAudio && (
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <FileIcon className="w-8 h-8 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {binaryData.fileName || 'download'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {binaryData.mimeType || 'Unknown type'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Size: {((binaryData.fileSize || 0) / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  )}

                  {(isImage || isVideo || isAudio) && (
                    <div className="text-xs text-gray-400 flex items-center justify-between px-1">
                      <span className="truncate">{binaryData.fileName || 'download'}</span>
                      <span>{((binaryData.fileSize || 0) / 1024).toFixed(2)} KB</span>
                    </div>
                  )}

                  {/* Download Button */}
                  <button
                    onClick={() => handleDownloadFile(binaryData, binaryData.fileName)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download {isImage ? 'Image' : isVideo ? 'Video' : isAudio ? 'Audio' : 'File'}
                  </button>
                </div>
              </div>
            );
          }

          // Regular JSON data
          const keys = Object.keys(data);

          return (
            <div key={index} className="border border-gray-700 rounded-lg overflow-hidden">
              {/* Item Header */}
              <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700">
                <span className="text-sm text-gray-400">
                  Item {index + 1}
                </span>
              </div>

              {/* Item Data */}
              <div className="p-3 space-y-2 bg-black/20">
                {keys.map((key) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="flex items-center gap-1 min-w-[120px] flex-shrink-0">
                      <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                      <span className="text-xs font-medium text-gray-400">{key}</span>
                    </div>
                    <div className="flex-1 min-w-0 font-mono text-xs">
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

  return (
    <div className="fixed right-0 top-14 bottom-0 w-[400px] glass border-l border-white/10 flex flex-col z-50 animate-in slide-in-from-right">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4">
        <div>
          <h3 className="text-white font-medium truncate">
            {node.data?.label || node.id}
          </h3>
          <p className="text-xs text-gray-400">{node.type}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 flex">
        <button
          onClick={() => setActiveTab("input")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2",
            activeTab === "input"
              ? "border-cyan-500 text-white bg-white/5"
              : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          Input
          {inputCount > 0 && (
            <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
              {inputCount} {inputCount === 1 ? "item" : "items"}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("output")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2",
            activeTab === "output"
              ? "border-cyan-500 text-white bg-white/5"
              : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          Output
          {outputCount > 0 && (
            <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
              {outputCount} {outputCount === 1 ? "item" : "items"}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "input" && renderDataView(inputItems, "Input")}
        {activeTab === "output" && renderDataView(outputItems, "Output")}
      </div>

      {/* Footer with execution info */}
      {node.data?.executionTime !== undefined && (
        <div className="border-t border-white/10 px-4 py-2 text-xs text-gray-400">
          Execution time: <span className="text-white">{node.data.executionTime}ms</span>
        </div>
      )}

      {/* Error display */}
      {node.data?.error && (
        <div className="border-t border-red-500/30 bg-red-950/30 px-4 py-3">
          <p className="text-red-400 text-xs font-medium mb-1">Error</p>
          <p className="text-red-300 text-xs">{node.data.error}</p>
        </div>
      )}

      {/* Full-size Image Modal */}
      {fullSizeImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setFullSizeImage(null)}
        >
          <button
            onClick={() => setFullSizeImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
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
    </div>
  );
}
