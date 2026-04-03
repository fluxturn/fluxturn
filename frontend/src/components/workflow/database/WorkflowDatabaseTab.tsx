import React, { useState, useEffect, useCallback } from 'react';
import { Database, ChevronDown, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WorkflowAPI } from '@/lib/fluxturn';
import { WorkflowTableList } from './WorkflowTableList';
import { WorkflowDataGrid } from './WorkflowDataGrid';
import { WorkflowRowModal } from './WorkflowRowModal';
import { ManualConnectionForm } from './ManualConnectionForm';
import type {
  DatabaseNodeInfo,
  TableInfo,
  ColumnInfo,
  TableRow,
  PaginationState,
  RowModalMode,
  ManualConnection
} from './types';

interface WorkflowDatabaseTabProps {
  databaseNodes: DatabaseNodeInfo[];
  panelHeight: number;
}

export function WorkflowDatabaseTab({ databaseNodes, panelHeight }: WorkflowDatabaseTabProps) {
  // Connection state
  const [selectedNode, setSelectedNode] = useState<DatabaseNodeInfo | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualConnection, setManualConnection] = useState<ManualConnection | null>(null);

  // Schema/Table state
  const [schema, setSchema] = useState('public');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tablesLoading, setTablesLoading] = useState(false);

  // Data state
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 50, total: 0 });
  const [dataLoading, setDataLoading] = useState(false);
  const [primaryKey, setPrimaryKey] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<RowModalMode>('view');
  const [modalRow, setModalRow] = useState<TableRow | null>(null);

  // Auto-select first node when available
  useEffect(() => {
    if (databaseNodes.length > 0 && !selectedNode) {
      setSelectedNode(databaseNodes[0]);
    }
  }, [databaseNodes, selectedNode]);

  // Load tables when node changes
  useEffect(() => {
    if (selectedNode && !showManualForm) {
      loadTables();
    }
  }, [selectedNode, schema, showManualForm]);

  // Load data when table changes
  useEffect(() => {
    if (selectedTable && selectedNode && !showManualForm) {
      loadColumns();
      loadData(1);
    }
  }, [selectedTable, selectedNode, showManualForm]);

  const loadTables = async () => {
    if (!selectedNode) return;

    setTablesLoading(true);
    try {
      const result = await WorkflowAPI.getConnectorTables(selectedNode.credentialId, schema);
      setTables(result || []);
      setSelectedTable(null);
      setColumns([]);
      setRows([]);
    } catch (error: any) {
      console.error('Error loading tables:', error);
      toast.error(error.message || 'Failed to load tables');
      setTables([]);
    } finally {
      setTablesLoading(false);
    }
  };

  const loadColumns = async () => {
    if (!selectedNode || !selectedTable) return;

    try {
      const result = await WorkflowAPI.getConnectorTableColumns(selectedNode.credentialId, selectedTable, schema);
      // console.log('[loadColumns] Raw result:', result);

      const cols: ColumnInfo[] = (result || []).map((col: any) => ({
        label: col.value || col.label,
        value: col.value || col.label,
        type: col.type,
        isPrimary: col.isPrimary || col.label?.includes('*'),
        isNullable: col.isNullable
      }));
      // console.log('[loadColumns] Parsed columns:', cols);

      setColumns(cols);

      // Find primary key
      const pk = cols.find(c => c.isPrimary);
      // console.log('[loadColumns] Found primary key:', pk);
      setPrimaryKey(pk?.value || null);
    } catch (error: any) {
      console.error('Error loading columns:', error);
      setColumns([]);
      setPrimaryKey(null);
    }
  };

  const loadData = async (page: number) => {
    if (!selectedNode || !selectedTable) return;

    setDataLoading(true);
    try {
      const result = await WorkflowAPI.executeConnectorDbAction(
        selectedNode.credentialId,
        'select_rows',
        {
          table: selectedTable,
          schema: schema,
          limit: pagination.pageSize,
          offset: (page - 1) * pagination.pageSize
        }
      );

      // console.log('[WorkflowDatabaseTab] Raw result:', result);

      // Handle nested data structure: result.data.data.rows or result.data.rows
      let rows: any[] = [];
      let rowCount = 0;

      if (result?.data?.data?.rows) {
        // Nested: result.data.data.rows (from ConnectorActionResultDto wrapping ConnectorResponse)
        rows = result.data.data.rows;
        rowCount = result.data.data.rowCount || rows.length;
      } else if (result?.data?.rows) {
        // Direct: result.data.rows
        rows = result.data.rows;
        rowCount = result.data.rowCount || rows.length;
      } else if (result?.rows) {
        // Fallback: result.rows
        rows = result.rows;
        rowCount = result.rowCount || rows.length;
      }

      // console.log('[WorkflowDatabaseTab] Parsed rows:', rows.length, 'rowCount:', rowCount);

      setRows(rows);
      setPagination(prev => ({
        ...prev,
        page,
        total: rowCount
      }));
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(error.message || 'Failed to load table data');
      setRows([]);
    } finally {
      setDataLoading(false);
    }
  };

  const handleInsertRow = async (data: TableRow) => {
    if (!selectedNode || !selectedTable) return;

    try {
      await WorkflowAPI.executeConnectorDbAction(
        selectedNode.credentialId,
        'insert_rows',
        {
          table: selectedTable,
          schema: schema,
          data: data  // Single row object - connector handles both single and array
        }
      );
      toast.success('Row inserted successfully');
      loadData(pagination.page);
    } catch (error: any) {
      toast.error(error.message || 'Failed to insert row');
      throw error;
    }
  };

  const handleUpdateRow = async (data: TableRow) => {
    // console.log('[handleUpdateRow] Called with:', { selectedNode, selectedTable, primaryKey, data, modalRow });

    if (!selectedNode || !selectedTable) {
      console.error('[handleUpdateRow] Missing selectedNode or selectedTable');
      toast.error('No table selected');
      return;
    }

    if (!primaryKey) {
      console.error('[handleUpdateRow] No primary key detected for table');
      toast.error('Cannot update: No primary key detected for this table');
      return;
    }

    try {
      // console.log('[handleUpdateRow] Calling update_rows API...');
      const result = await WorkflowAPI.executeConnectorDbAction(
        selectedNode.credentialId,
        'update_rows',
        {
          table: selectedTable,
          schema: schema,
          data: data,
          where: { [primaryKey]: modalRow?.[primaryKey] }
        }
      );
      // console.log('[handleUpdateRow] Result:', result);
      if (result?.success) {
        toast.success('Row updated successfully');
      } else {
        toast.error('Failed to update row');
      }
      loadData(pagination.page);
    } catch (error: any) {
      console.error('[handleUpdateRow] Error:', error);
      toast.error(error.message || 'Failed to update row');
      throw error;
    }
  };

  const handleDeleteRow = async () => {
    if (!selectedNode || !selectedTable || !primaryKey || !modalRow) return;

    try {
      await WorkflowAPI.executeConnectorDbAction(
        selectedNode.credentialId,
        'delete_rows',
        {
          table: selectedTable,
          schema: schema,
          where: { [primaryKey]: modalRow[primaryKey] }
        }
      );
      toast.success('Row deleted successfully');
      loadData(pagination.page);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete row');
      throw error;
    }
  };

  const openModal = (mode: RowModalMode, row: TableRow | null = null) => {
    setModalMode(mode);
    setModalRow(row);
    setModalOpen(true);
  };

  const handleManualConnect = (connection: ManualConnection) => {
    setManualConnection(connection);
    setShowManualForm(false);
    // For manual connections, we'd need to create a temporary database-browser connection
    // This would require backend support - for now we'll show a toast
    toast.info('Manual connection feature requires database-browser integration');
  };

  // If showing manual form
  if (showManualForm) {
    return (
      <div style={{ maxHeight: panelHeight - 50 }} className="overflow-auto">
        <ManualConnectionForm
          onConnect={handleManualConnect}
          onBack={() => setShowManualForm(false)}
        />
      </div>
    );
  }

  // If no database nodes
  if (databaseNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Database className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm mb-1">No database nodes executed</p>
        <p className="text-xs text-gray-600 mb-4">Execute a workflow with MySQL or PostgreSQL nodes</p>
        <button
          onClick={() => setShowManualForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/10 rounded hover:bg-white/20 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Manual Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ maxHeight: panelHeight - 50 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-white/10 bg-gray-900/30">
        {/* Node Selector */}
        {databaseNodes.length > 1 ? (
          <div className="relative">
            <select
              value={selectedNode?.nodeId || ''}
              onChange={(e) => {
                const node = databaseNodes.find(n => n.nodeId === e.target.value);
                setSelectedNode(node || null);
                setSelectedTable(null);
              }}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 cursor-pointer"
            >
              {databaseNodes.map(node => (
                <option key={node.nodeId} value={node.nodeId}>
                  {node.nodeName} ({node.connectorType})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-300">{selectedNode?.nodeName}</span>
            <span className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
              {selectedNode?.connectorType}
            </span>
          </div>
        )}

        {/* Schema Selector (for PostgreSQL) */}
        {selectedNode?.connectorType === 'postgresql' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Schema:</span>
            <select
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              <option value="public">public</option>
              <option value="information_schema">information_schema</option>
            </select>
          </div>
        )}

        <div className="flex-1" />

        {/* Manual Connection Button */}
        <button
          onClick={() => setShowManualForm(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Manual
        </button>
      </div>

      {/* Table List */}
      <WorkflowTableList
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={setSelectedTable}
        onRefresh={loadTables}
        loading={tablesLoading}
      />

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden">
        <WorkflowDataGrid
          columns={columns}
          rows={rows}
          pagination={pagination}
          onPageChange={(page) => loadData(page)}
          onViewRow={(row) => openModal('view', row)}
          onEditRow={(row) => openModal('edit', row)}
          onDeleteRow={(row) => {
            setModalRow(row);
            openModal('view', row);
          }}
          onInsertRow={() => openModal('insert')}
          onRefresh={() => loadData(pagination.page)}
          loading={dataLoading}
          primaryKey={primaryKey}
          maxHeight={panelHeight - 150}
        />
      </div>

      {/* Row Modal */}
      <WorkflowRowModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        columns={columns}
        row={modalRow}
        onSave={modalMode === 'insert' ? handleInsertRow : handleUpdateRow}
        onDelete={handleDeleteRow}
        primaryKey={primaryKey}
        tableName={selectedTable || ''}
      />
    </div>
  );
}
