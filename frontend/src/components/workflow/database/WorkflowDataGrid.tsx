import React from 'react';
import { Plus, RefreshCw, ChevronLeft, ChevronRight, Eye, Edit3, Trash2, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColumnInfo, TableRow, PaginationState } from './types';

interface WorkflowDataGridProps {
  columns: ColumnInfo[];
  rows: TableRow[];
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onViewRow: (row: TableRow) => void;
  onEditRow: (row: TableRow) => void;
  onDeleteRow: (row: TableRow) => void;
  onInsertRow: () => void;
  onRefresh: () => void;
  loading: boolean;
  primaryKey: string | null;
  maxHeight?: number;
}

export function WorkflowDataGrid({
  columns,
  rows,
  pagination,
  onPageChange,
  onViewRow,
  onEditRow,
  onDeleteRow,
  onInsertRow,
  onRefresh,
  loading,
  primaryKey,
  maxHeight = 300
}: WorkflowDataGridProps) {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  const formatCellValue = (value: TableRow[string]): string => {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    const str = String(value);
    return str.length > 100 ? str.substring(0, 100) + '...' : str;
  };

  const getCellClassName = (value: TableRow[string]): string => {
    if (value === null || value === undefined) {
      return 'text-gray-500 italic';
    }
    if (typeof value === 'number') {
      return 'text-cyan-400';
    }
    if (typeof value === 'boolean') {
      return 'text-orange-400';
    }
    return 'text-gray-300';
  };

  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm text-gray-400">Loading data...</span>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Database className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Select a table to view data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-gray-900/30">
        <div className="flex items-center gap-2">
          <button
            onClick={onInsertRow}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Insert Row
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white/5 text-gray-300 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
        <div className="text-xs text-gray-400">
          {total > 0 ? `Rows ${startRow}-${endRow} of ${total}` : 'No rows'}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto" style={{ maxHeight: maxHeight - 100, overflowX: 'auto' }}>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Database className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No data in this table</p>
            <button
              onClick={onInsertRow}
              className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Insert first row
            </button>
          </div>
        ) : (
          <table className="min-w-full text-xs table-auto">
            <thead className="sticky top-0 bg-gray-900/90 backdrop-blur-sm z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.value}
                    className={cn(
                      "px-3 py-2 text-left font-medium text-gray-400 border-b border-white/10 whitespace-nowrap",
                      col.isPrimary && "text-yellow-400"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {col.isPrimary && <span className="text-yellow-500">*</span>}
                      {col.label}
                      {col.type && (
                        <span className="text-[10px] text-gray-500 ml-1">({col.type})</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-medium text-gray-400 border-b border-white/10 w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={primaryKey ? String(row[primaryKey] ?? rowIndex) : rowIndex}
                  className="hover:bg-white/5 transition-colors border-b border-white/5"
                >
                  {columns.map((col) => (
                    <td
                      key={col.value}
                      className={cn(
                        "px-3 py-2 max-w-[200px] truncate font-mono",
                        getCellClassName(row[col.value])
                      )}
                      title={formatCellValue(row[col.value])}
                    >
                      {formatCellValue(row[col.value])}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onViewRow(row)}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEditRow(row)}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-cyan-400"
                        title="Edit row"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteRow(row)}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-red-400"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 bg-gray-900/30">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <span className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
