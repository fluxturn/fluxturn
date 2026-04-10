import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { FieldPicker } from './FieldPicker';
import { useParams } from 'react-router-dom';

export interface Condition {
  leftValue: string;
  operator: {
    type: 'string' | 'number' | 'boolean' | 'date' | 'array';
    operation: string;
  };
  rightValue: string;
}

export interface ConditionsConfig {
  combinator: 'and' | 'or';
  conditions: Condition[];
}

interface ConditionsBuilderProps {
  value: ConditionsConfig;
  onChange: (value: ConditionsConfig) => void;
  description?: string;
  nodeId?: string; // Current node ID for field picker
}

const OPERATOR_OPTIONS: Record<string, { label: string; value: string; types: string[] }[]> = {
  string: [
    { label: 'equals', value: 'equals', types: ['string'] },
    { label: 'not equals', value: 'notEquals', types: ['string'] },
    { label: 'contains', value: 'contains', types: ['string'] },
    { label: 'does not contain', value: 'notContains', types: ['string'] },
    { label: 'starts with', value: 'startsWith', types: ['string'] },
    { label: 'ends with', value: 'endsWith', types: ['string'] },
    { label: 'greater than', value: 'gt', types: ['string'] },
    { label: 'greater than or equal', value: 'gte', types: ['string'] },
    { label: 'less than', value: 'lt', types: ['string'] },
    { label: 'less than or equal', value: 'lte', types: ['string'] },
    { label: 'is empty', value: 'isEmpty', types: ['string'] },
    { label: 'is not empty', value: 'isNotEmpty', types: ['string'] },
    { label: 'regex match', value: 'regex', types: ['string'] },
  ],
  number: [
    { label: 'equals', value: 'equals', types: ['number'] },
    { label: 'not equals', value: 'notEquals', types: ['number'] },
    { label: 'greater than', value: 'gt', types: ['number'] },
    { label: 'greater than or equal', value: 'gte', types: ['number'] },
    { label: 'less than', value: 'lt', types: ['number'] },
    { label: 'less than or equal', value: 'lte', types: ['number'] },
    { label: 'is empty', value: 'isEmpty', types: ['number'] },
    { label: 'is not empty', value: 'isNotEmpty', types: ['number'] },
  ],
  boolean: [
    { label: 'is true', value: 'true', types: ['boolean'] },
    { label: 'is false', value: 'false', types: ['boolean'] },
    { label: 'equals', value: 'equals', types: ['boolean'] },
  ],
  date: [
    { label: 'equals', value: 'equals', types: ['date'] },
    { label: 'not equals', value: 'notEquals', types: ['date'] },
    { label: 'after', value: 'after', types: ['date'] },
    { label: 'before', value: 'before', types: ['date'] },
  ],
  array: [
    { label: 'contains', value: 'contains', types: ['array'] },
    { label: 'does not contain', value: 'notContains', types: ['array'] },
    { label: 'is empty', value: 'isEmpty', types: ['array'] },
    { label: 'is not empty', value: 'isNotEmpty', types: ['array'] },
    { label: 'length equals', value: 'lengthEquals', types: ['array'] },
  ],
};

const TYPE_OPTIONS = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Date', value: 'date' },
  { label: 'Array', value: 'array' },
];

export const ConditionsBuilder: React.FC<ConditionsBuilderProps> = ({
  value,
  onChange,
  description,
  nodeId,
}) => {
  const { workflowId } = useParams<{ workflowId: string }>();

  const addCondition = () => {
    const newCondition: Condition = {
      leftValue: '',
      operator: { type: 'string', operation: 'equals' },
      rightValue: '',
    };
    onChange({
      ...value,
      conditions: [...value.conditions, newCondition],
    });
  };

  const removeCondition = (index: number) => {
    onChange({
      ...value,
      conditions: value.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    onChange({
      ...value,
      conditions: value.conditions.map((cond, i) =>
        i === index ? { ...cond, ...updates } : cond
      ),
    });
  };

  const toggleCombinator = () => {
    onChange({
      ...value,
      combinator: value.combinator === 'and' ? 'or' : 'and',
    });
  };

  const needsRightValue = (operation: string) => {
    return !['isEmpty', 'isNotEmpty', 'true', 'false'].includes(operation);
  };

  return (
    <div className="space-y-3">
      {description && (
        <p className="text-xs text-gray-400">{description}</p>
      )}

      <div className="space-y-2">
        {value.conditions.map((condition, index) => (
          <Card key={index} className="bg-gray-800/50 border-gray-700 p-3">
            <div className="space-y-2">
              {/* Combinator button (show before each condition except first) */}
              {index > 0 && (
                <div className="flex justify-center -mt-1 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={toggleCombinator}
                    className="h-6 px-3 text-xs bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    {value.combinator.toUpperCase()}
                  </Button>
                </div>
              )}

              <div className="flex items-start gap-2">
                {/* Drag handle */}
                <div className="pt-2 cursor-move text-gray-500 hover:text-gray-400">
                  <GripVertical className="w-4 h-4" />
                </div>

                <div className="flex-1 space-y-2">
                  {/* Left value */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Field</label>
                    {nodeId ? (
                      <FieldPicker
                        nodeId={nodeId}
                        workflowId={workflowId}
                        value={condition.leftValue}
                        onChange={(newValue) =>
                          updateCondition(index, { leftValue: newValue })
                        }
                        placeholder="Select or type field path"
                        mode="action"
                      />
                    ) : (
                      <Input
                        value={condition.leftValue}
                        onChange={(e) =>
                          updateCondition(index, { leftValue: e.target.value })
                        }
                        placeholder="e.g., {{$json.status}} or data.user.age"
                        className="bg-gray-900 border-gray-600 text-white text-sm font-mono"
                      />
                    )}
                  </div>

                  {/* Operator type and operation */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Type</label>
                      <Select
                        value={condition.operator.type}
                        onValueChange={(type: string) =>
                          updateCondition(index, {
                            operator: {
                              type: type as Condition['operator']['type'],
                              operation: OPERATOR_OPTIONS[type][0].value,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-600 text-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {TYPE_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-white hover:bg-gray-700"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Operator</label>
                      <Select
                        value={condition.operator.operation}
                        onValueChange={(operation) =>
                          updateCondition(index, {
                            operator: { ...condition.operator, operation },
                          })
                        }
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-600 text-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {OPERATOR_OPTIONS[condition.operator.type].map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-white hover:bg-gray-700"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Right value (only if needed) */}
                  {needsRightValue(condition.operator.operation) && (
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Value</label>
                      {nodeId ? (
                        <FieldPicker
                          nodeId={nodeId}
                          workflowId={workflowId}
                          value={condition.rightValue}
                          onChange={(newValue) =>
                            updateCondition(index, { rightValue: newValue })
                          }
                          placeholder="Type value or select field"
                          mode="action"
                        />
                      ) : (
                        <Input
                          value={condition.rightValue}
                          onChange={(e) =>
                            updateCondition(index, { rightValue: e.target.value })
                          }
                          placeholder="e.g., 'active' or 18 or {{$json.threshold}}"
                          className="bg-gray-900 border-gray-600 text-white text-sm font-mono"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeCondition(index)}
                  className="text-gray-400 hover:text-red-400 hover:bg-red-400/10 mt-6"
                  disabled={value.conditions.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add condition button */}
      <Button
        type="button"
        onClick={addCondition}
        variant="outline"
        size="sm"
        className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Condition
      </Button>

      {/* Info text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>
          • Use <code className="px-1 py-0.5 bg-gray-800 rounded">{'{{$json.field}}'}</code> to reference input data
        </p>
        <p>
          • Conditions are combined with <strong>{value.combinator.toUpperCase()}</strong> logic
        </p>
        <p>
          • Click the {value.combinator.toUpperCase()} button to switch between AND/OR
        </p>
      </div>
    </div>
  );
};
