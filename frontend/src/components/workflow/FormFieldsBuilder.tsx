import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: string[]; // For select, checkbox, radio
}

interface FormFieldsBuilderProps {
  value: FormField[];
  onChange: (fields: FormField[]) => void;
}

const FIELD_TYPES = [
  { label: 'Text', value: 'text' },
  { label: 'Email', value: 'email' },
  { label: 'Number', value: 'number' },
  { label: 'Textarea', value: 'textarea' },
  { label: 'Select', value: 'select' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Radio', value: 'radio' },
];

export function FormFieldsBuilder({ value, onChange }: FormFieldsBuilderProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addField = () => {
    const newField: FormField = {
      name: `field_${value.length + 1}`,
      label: `Field ${value.length + 1}`,
      type: 'text',
      required: false,
      placeholder: '',
    };
    onChange([...value, newField]);
    setEditingIndex(value.length);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...value];
    newFields[index] = { ...newFields[index], ...updates };
    onChange(newFields);
  };

  const removeField = (index: number) => {
    const newFields = value.filter((_, i) => i !== index);
    onChange(newFields);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const needsOptions = (type: string) => {
    return ['select', 'checkbox', 'radio'].includes(type);
  };

  return (
    <div className="space-y-3">
      {/* Field List */}
      {value.map((field, index) => (
        <div
          key={index}
          className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
        >
          {/* Field Header */}
          <div className="px-4 py-3 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3 flex-1">
              <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{field.label}</p>
                <p className="text-xs text-gray-400">
                  {field.type} • {field.required ? 'Required' : 'Optional'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingIndex(editingIndex === index ? null : index);
                }}
                className="px-3 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
              >
                {editingIndex === index ? 'Close' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeField(index);
                }}
                className="p-2 hover:bg-red-500/20 rounded text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Field Editor */}
          {editingIndex === index && (
            <div className="px-4 py-4 space-y-3 border-t border-white/10">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Field Name</label>
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateField(index, { name: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-white text-sm"
                    placeholder="field_name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Label</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-white text-sm"
                    placeholder="Field Label"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Field Type</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-white text-sm"
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => updateField(index, { placeholder: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-white text-sm"
                    placeholder="Enter placeholder..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`required-${index}`}
                  checked={field.required || false}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor={`required-${index}`} className="text-sm text-gray-300">
                  Required field
                </label>
              </div>

              {/* Options for select/checkbox/radio */}
              {needsOptions(field.type) && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Options (one per line)</label>
                  <textarea
                    value={field.options?.join('\n') || ''}
                    onChange={(e) => updateField(index, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-white text-sm"
                    rows={4}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add Field Button */}
      <Button
        type="button"
        onClick={addField}
        variant="outline"
        className="w-full border-dashed border-white/20 text-gray-300 hover:text-white hover:border-cyan-500/50"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Field
      </Button>
    </div>
  );
}
