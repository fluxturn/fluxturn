import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FieldPicker } from '@/components/workflow/FieldPicker';
import { useParams } from 'react-router-dom';

interface ArrayStringFieldProps {
  value: string[];
  onChange: (values: string[]) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  maxItems?: number;
  nodes?: Array<{ id: string; data: Record<string, unknown> }>;
  currentNodeId?: string;
}

export function ArrayStringField({
  value,
  onChange,
  label: _label,
  placeholder = 'Enter value',
  error,
  maxItems,
  nodes: _nodes,
  currentNodeId
}: ArrayStringFieldProps) {
  const { workflowId } = useParams<{ workflowId: string }>();
  const [currentInput, setCurrentInput] = useState('');

  // Ensure value is always an array
  const arrayValue = Array.isArray(value) ? value : (value ? [value] : []);

  const addItem = (itemToAdd?: string) => {
    const item = itemToAdd || currentInput;
    if (item.trim()) {
      if (maxItems && arrayValue.length >= maxItems) {
        return;
      }
      onChange([...arrayValue, item.trim()]);
      setCurrentInput('');
    }
  };

  const removeItem = (index: number) => {
    const newValues = [...arrayValue];
    newValues.splice(index, 1);
    onChange(newValues);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  const handleFieldPickerChange = (newValue: string) => {
    // If the new value contains an expression (from field picker), add it directly
    if (newValue.includes('{{') && newValue.includes('}}')) {
      // Extract the expression that was just added
      const currentLen = currentInput.length;
      if (newValue.length > currentLen) {
        const addedExpression = newValue.substring(currentLen);
        if (addedExpression.includes('{{')) {
          // Add the expression directly to the array
          addItem(addedExpression.trim());
          return;
        }
      }
    }
    setCurrentInput(newValue);
  };

  return (
    <div className="space-y-2">
      {/* Existing Items */}
      {arrayValue.length > 0 && (
        <div className="space-y-1">
          {arrayValue.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-[#2a2a2a] border border-gray-700 rounded px-3 py-2"
            >
              <span className="flex-1 text-sm text-white truncate font-mono">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="shrink-0 text-gray-400 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Item */}
      {(!maxItems || arrayValue.length < maxItems) && (
        <div className="flex items-center gap-2">
          {currentNodeId ? (
            <FieldPicker
              nodeId={currentNodeId}
              workflowId={workflowId}
              value={currentInput}
              onChange={handleFieldPickerChange}
              placeholder={placeholder}
              mode="action"
            />
          ) : (
            <Input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className={cn(
                'flex-1 bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500',
                error && 'border-red-500'
              )}
            />
          )}
          <Button
            type="button"
            onClick={() => addItem()}
            size="sm"
            variant="outline"
            className="shrink-0 border-gray-700 hover:bg-gray-800"
            disabled={!currentInput.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Helper Text */}
      {maxItems && (
        <p className="text-xs text-gray-500">
          {arrayValue.length}/{maxItems} items
          {arrayValue.length >= maxItems && ' (maximum reached)'}
        </p>
      )}
    </div>
  );
}
