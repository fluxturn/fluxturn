import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { ConditionsBuilder, type ConditionsConfig } from './ConditionsBuilder';

export interface Rule {
  conditions: ConditionsConfig;
  outputKey?: string;
  renameOutput?: boolean;
}

export interface RulesConfig {
  values: Rule[];
}

interface RulesBuilderProps {
  value: RulesConfig;
  onChange: (value: RulesConfig) => void;
  description?: string;
  nodeId?: string; // Node ID for field picker
}

export const RulesBuilder: React.FC<RulesBuilderProps> = ({
  value,
  onChange,
  description,
  nodeId,
}) => {
  const [expandedRules, setExpandedRules] = React.useState<Set<number>>(new Set([0]));

  const addRule = () => {
    const newRule: Rule = {
      conditions: {
        combinator: 'and',
        conditions: [
          {
            leftValue: '',
            operator: { type: 'string', operation: 'equals' },
            rightValue: '',
          },
        ],
      },
      outputKey: value.values.length.toString(),
      renameOutput: false,
    };
    onChange({
      values: [...value.values, newRule],
    });
    // Expand the newly added rule
    setExpandedRules(new Set([...expandedRules, value.values.length]));
  };

  const removeRule = (index: number) => {
    onChange({
      values: value.values.filter((_, i) => i !== index),
    });
    // Remove from expanded set
    const newExpanded = new Set(expandedRules);
    newExpanded.delete(index);
    setExpandedRules(newExpanded);
  };

  const updateRule = (index: number, updates: Partial<Rule>) => {
    onChange({
      values: value.values.map((rule, i) =>
        i === index ? { ...rule, ...updates } : rule
      ),
    });
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRules(newExpanded);
  };

  return (
    <div className="space-y-3">
      {description && (
        <p className="text-xs text-gray-400">{description}</p>
      )}

      <div className="space-y-3">
        {value.values.map((rule, index) => {
          const isExpanded = expandedRules.has(index);
          const outputName = rule.renameOutput && rule.outputKey ? rule.outputKey : `Output ${index}`;

          return (
            <Card key={index} className="bg-gray-800/50 border-gray-700 overflow-hidden">
              {/* Rule header */}
              <div className="flex items-center gap-2 p-3 bg-gray-800/80 border-b border-gray-700">
                <div className="cursor-move text-gray-500 hover:text-gray-400">
                  <GripVertical className="w-4 h-4" />
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleExpanded(index)}
                  className="p-0 h-auto hover:bg-transparent text-white"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>

                <div className="flex-1">
                  <span className="text-sm font-medium text-white">
                    Rule {index + 1}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    → {outputName}
                  </span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeRule(index)}
                  className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                  disabled={value.values.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Rule content (collapsible) */}
              {isExpanded && (
                <div className="p-3 space-y-3">
                  {/* Conditions */}
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Conditions
                    </label>
                    <ConditionsBuilder
                      value={rule.conditions}
                      onChange={(conditions) =>
                        updateRule(index, { conditions })
                      }
                      nodeId={nodeId}
                    />
                  </div>

                  {/* Output configuration */}
                  <div className="pt-3 border-t border-gray-700 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`rename-${index}`}
                        checked={rule.renameOutput || false}
                        onChange={(e) =>
                          updateRule(index, { renameOutput: e.target.checked })
                        }
                        className="rounded border-gray-600 bg-gray-900 text-purple-500 focus:ring-purple-500"
                      />
                      <label
                        htmlFor={`rename-${index}`}
                        className="text-sm text-white cursor-pointer"
                      >
                        Rename Output
                      </label>
                    </div>

                    {rule.renameOutput && (
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">
                          Output Name
                        </label>
                        <Input
                          value={rule.outputKey || ''}
                          onChange={(e) =>
                            updateRule(index, { outputKey: e.target.value })
                          }
                          placeholder={`Output ${index}`}
                          className="bg-gray-900 border-gray-600 text-white text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add rule button */}
      <Button
        type="button"
        onClick={addRule}
        variant="outline"
        size="sm"
        className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Routing Rule
      </Button>

      {/* Info text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>
          • Data matching a rule will be routed to that rule's output
        </p>
        <p>
          • Rules are evaluated in order from top to bottom
        </p>
        <p>
          • The first matching rule will be used (unless "all matching outputs" is enabled)
        </p>
      </div>
    </div>
  );
};
