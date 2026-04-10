import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface SaveAsTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (templateData: {
    name: string;
    description: string;
    category: string;
  }) => Promise<void>;
  defaultName?: string;
  aiPrompt?: string | null;
}

const templateCategories = [
  { value: 'social_media', label: 'Social Media' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'business', label: 'Business' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'content', label: 'Content' },
  { value: 'education', label: 'Education' },
  { value: 'health', label: 'Health' },
  { value: 'customer_support', label: 'Customer Support' },
  { value: 'lead_generation', label: 'Lead Generation' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

export function SaveAsTemplateModal({
  open,
  onOpenChange,
  onSave,
  defaultName = '',
  aiPrompt = null,
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSave = async () => {
    // Validate fields
    const newErrors: { [key: string]: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Template name is required';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Template description is required';
    }
    
    if (!category) {
      newErrors.category = 'Please select a category';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        category,
      });
      
      // Reset form
      setName('');
      setDescription('');
      setCategory('other');
      setErrors({});
      onOpenChange(false);
    } catch {
      // Error handling is done in the parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName(defaultName);
      setDescription('');
      setCategory('other');
      setErrors({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Save as Template</DialogTitle>
          <DialogDescription className="text-gray-400">
            Save your workflow as a reusable template. This will allow you and other
            users to quickly create new workflows based on this configuration.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-white">
              Template Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors({ ...errors, name: '' });
              }}
              placeholder="e.g., Daily Social Media Automation"
              className={`bg-gray-800 border-gray-700 text-white ${
                errors.name ? 'border-red-500' : ''
              }`}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description" className="text-white">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors({ ...errors, description: '' });
              }}
              placeholder="Describe what this template does and when to use it..."
              className={`bg-gray-800 border-gray-700 text-white min-h-[100px] ${
                errors.description ? 'border-red-500' : ''
              }`}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category" className="text-white">
              Category
            </Label>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setErrors({ ...errors, category: '' });
              }}
              disabled={isLoading}
            >
              <SelectTrigger
                className={`bg-gray-800 border-gray-700 text-white ${
                  errors.category ? 'border-red-500' : ''
                }`}
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {templateCategories.map((cat) => (
                  <SelectItem
                    key={cat.value}
                    value={cat.value}
                    className="text-white hover:bg-gray-700"
                  >
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category}</p>
            )}
          </div>

          {aiPrompt && (
            <div className="grid gap-2">
              <Label htmlFor="ai-prompt" className="text-white">
                AI Prompt (Generated From)
              </Label>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                readOnly
                className="bg-gray-800 border-gray-700 text-gray-300 min-h-[80px] resize-none cursor-default"
                disabled
              />
              <p className="text-xs text-gray-500">
                This template was generated from the AI prompt shown above
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-300 hover:text-white hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}