import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Trash2, Edit3, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColumnInfo, TableRow, RowModalMode } from './types';

interface WorkflowRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: RowModalMode;
  columns: ColumnInfo[];
  row: TableRow | null;
  onSave: (data: TableRow) => Promise<void>;
  onDelete: () => Promise<void>;
  primaryKey: string | null;
  tableName: string;
}

export function WorkflowRowModal({
  isOpen,
  onClose,
  mode,
  columns,
  row,
  onSave,
  onDelete,
  primaryKey,
  tableName
}: WorkflowRowModalProps) {
  const [formData, setFormData] = useState<TableRow>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(mode === 'edit' || mode === 'insert');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'insert') {
        // Initialize with empty values for insert
        const initialData: TableRow = {};
        columns.forEach(col => {
          if (!col.isPrimary) {
            initialData[col.value] = col.defaultValue ?? '';
          }
        });
        setFormData(initialData);
        setEditMode(true);
      } else if (row) {
        setFormData({ ...row });
        setEditMode(mode === 'edit');
      }
      setShowDeleteConfirm(false);
    }
  }, [isOpen, mode, row, columns]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving row:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting row:', error);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCopy = async (key: string, value: any) => {
    try {
      const textValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
      await navigator.clipboard.writeText(textValue);
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const renderFieldInput = (col: ColumnInfo) => {
    const value = formData[col.value];
    const type = col.type?.toLowerCase() || 'text';
    const isDisabled = col.isPrimary && mode !== 'insert';

    // Determine input type based on column type
    if (type.includes('bool')) {
      return (
        <select
          value={value === true ? 'true' : value === false ? 'false' : ''}
          onChange={(e) => {
            const v = e.target.value;
            handleChange(col.value, v === 'true' ? true : v === 'false' ? false : null);
          }}
          disabled={!editMode || isDisabled}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 text-sm"
        >
          <option value="">NULL</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (type.includes('int') || type.includes('numeric') || type.includes('decimal') || type.includes('float') || type.includes('double')) {
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => handleChange(col.value, e.target.value === '' ? null : Number(e.target.value))}
          disabled={!editMode || isDisabled}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 text-sm font-mono"
        />
      );
    }

    if (type.includes('json') || type.includes('jsonb')) {
      const jsonValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : (value ?? '');
      return (
        <textarea
          value={jsonValue}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleChange(col.value, parsed);
            } catch {
              handleChange(col.value, e.target.value);
            }
          }}
          disabled={!editMode || isDisabled}
          rows={4}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 text-sm font-mono resize-y"
        />
      );
    }

    if (type.includes('text') || type.includes('varchar') && (String(value ?? '').length > 100)) {
      return (
        <textarea
          value={value ?? ''}
          onChange={(e) => handleChange(col.value, e.target.value || null)}
          disabled={!editMode || isDisabled}
          rows={3}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 text-sm resize-y"
        />
      );
    }

    if (type.includes('date') && !type.includes('time')) {
      return (
        <input
          type="date"
          value={value ? String(value).split('T')[0] : ''}
          onChange={(e) => handleChange(col.value, e.target.value || null)}
          disabled={!editMode || isDisabled}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 text-sm"
        />
      );
    }

    if (type.includes('timestamp') || type.includes('datetime')) {
      return (
        <input
          type="datetime-local"
          value={value ? String(value).replace(' ', 'T').slice(0, 16) : ''}
          onChange={(e) => handleChange(col.value, e.target.value || null)}
          disabled={!editMode || isDisabled}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 text-sm"
        />
      );
    }

    // Default text input
    return (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => handleChange(col.value, e.target.value || null)}
        disabled={!editMode || isDisabled}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 text-sm"
      />
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-white">
              {mode === 'insert' ? 'Insert New Row' : mode === 'edit' ? 'Edit Row' : 'View Row'}
            </h3>
            <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded">
              {tableName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'view' && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  editMode ? "bg-cyan-500/20 text-cyan-400" : "hover:bg-white/10 text-gray-400"
                )}
                title={editMode ? "Cancel editing" : "Edit row"}
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <div className="space-y-4">
            {columns.map((col) => (
              <div key={col.value} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    {col.isPrimary && <span className="text-yellow-500">*</span>}
                    {col.label}
                    {col.type && (
                      <span className="text-xs text-gray-500">({col.type})</span>
                    )}
                    {col.isNullable === false && !col.isPrimary && (
                      <span className="text-red-400 text-xs">required</span>
                    )}
                  </label>
                  {!editMode && (
                    <button
                      onClick={() => handleCopy(col.value, formData[col.value])}
                      className="p-1 hover:bg-white/10 rounded transition-colors text-gray-500 hover:text-white"
                      title="Copy value"
                    >
                      {copiedField === col.value ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
                {renderFieldInput(col)}
              </div>
            ))}
          </div>
        </div>

        {/* Footer - always visible */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 flex-shrink-0 bg-gray-900">
          <div>
            {mode !== 'insert' && primaryKey && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-400">Delete this row?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-gray-300 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            {editMode && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium disabled:opacity-50 transition-opacity"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : (mode === 'insert' ? 'Insert' : 'Save Changes')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
,
    document.body
  );
}
