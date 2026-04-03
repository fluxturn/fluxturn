import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formConfig: {
    formTitle?: string;
    formDescription?: string;
    formFields?: FormField[];
    submitButtonText?: string;
  };
  onSubmit: (formData: Record<string, any>) => void;
}

export function FormTestModal({
  open,
  onOpenChange,
  formConfig,
  onSubmit,
}: FormTestModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
    setFormData({});
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] ?? '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <select
              id={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              required={field.required}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Select...</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id={field.name}
              checked={value}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="w-4 h-4 text-cyan-600 border-gray-700 rounded bg-gray-800 focus:ring-cyan-500"
            />
            <Label htmlFor={field.name} className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
          </div>
        );

      case 'radio':
        return (
          <div key={field.name} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`${field.name}-${option}`}
                    name={field.name}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className="w-4 h-4 text-cyan-600 border-gray-700 bg-gray-800 focus:ring-cyan-500"
                  />
                  <label htmlFor={`${field.name}-${option}`} className="text-white text-sm">
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <FileText className="size-6 text-cyan-400" />
            </div>
            <div>
              <div>{formConfig.formTitle || 'Test Form'}</div>
              <div className="text-sm text-gray-400 font-normal">
                {formConfig.formDescription || 'Fill out the form to test the workflow'}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {formConfig.formFields && formConfig.formFields.length > 0 ? (
            formConfig.formFields.map(renderField)
          ) : (
            <div className="text-center text-gray-400 py-8">
              <p>No form fields configured.</p>
              <p className="text-sm mt-2">Please configure the form trigger first.</p>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
              disabled={!formConfig.formFields || formConfig.formFields.length === 0}
            >
              {formConfig.submitButtonText || 'Submit & Execute'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
