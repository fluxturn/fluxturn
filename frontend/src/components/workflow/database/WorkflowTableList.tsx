import React from 'react';
import { RefreshCw, Table } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableInfo } from './types';

interface WorkflowTableListProps {
  tables: TableInfo[];
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function WorkflowTableList({
  tables,
  selectedTable,
  onSelectTable,
  onRefresh,
  loading
}: WorkflowTableListProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <Table className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">Loading tables...</span>
        <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <Table className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">No tables found</span>
        <button
          onClick={onRefresh}
          className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
          title="Refresh tables"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Table className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-400">Tables:</span>
      </div>

      <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
        <div className="flex items-center gap-1.5 pb-1">
          {tables.map((table) => (
            <button
              key={table.value}
              onClick={() => onSelectTable(table.value)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-all",
                selectedTable === table.value
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
            >
              {table.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-500">{tables.length} tables</span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
          title="Refresh tables"
        >
          <RefreshCw className={cn("w-4 h-4 text-gray-400", loading && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
