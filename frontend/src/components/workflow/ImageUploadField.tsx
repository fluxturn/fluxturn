import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageFile {
  fileData: string; // base64 data URL
  fileName: string;
  mimeType: string;
  size: number; // in bytes
}

interface ImageUploadFieldProps {
  value: ImageFile[];
  onChange: (files: ImageFile[]) => void;
  maxFiles?: number;
  maxSizeInMB?: number;
  accept?: string;
  label?: string;
  error?: string;
  required?: boolean;
}

export function ImageUploadField({
  value,
  onChange,
  maxFiles = 4,
  maxSizeInMB = 5,
  accept = 'image/jpeg,image/png,image/gif,image/webp',
  label,
  error,
  required = false
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  // Ensure value is always an array
  const arrayValue: ImageFile[] = Array.isArray(value) ? value : [];

  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadError('');

    // Check if adding these files would exceed max files
    if (arrayValue.length + files.length > maxFiles) {
      setUploadError(`You can only upload up to ${maxFiles} images`);
      return;
    }

    const newFiles: ImageFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!accept.split(',').some(type => file.type.match(type.replace('*', '.*')))) {
        setUploadError(`Invalid file type: ${file.name}. Accepted types: ${accept}`);
        continue;
      }

      // Validate file size
      if (file.size > maxSizeInBytes) {
        setUploadError(`${file.name} exceeds ${maxSizeInMB}MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
        continue;
      }

      // Convert to base64
      try {
        const base64 = await fileToBase64(file);
        newFiles.push({
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
          size: file.size
        });
      } catch (error) {
        console.error('Error reading file:', error);
        setUploadError(`Failed to read ${file.name}`);
      }
    }

    if (newFiles.length > 0) {
      onChange([...arrayValue, ...newFiles]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...arrayValue];
    newFiles.splice(index, 1);
    onChange(newFiles);
    setUploadError('');
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label className="text-sm font-normal text-gray-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* Upload Area */}
      {arrayValue.length < maxFiles && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
            dragActive
              ? 'border-cyan-400 bg-cyan-400/10'
              : 'border-gray-700 hover:border-gray-600 bg-[#2a2a2a]',
            error && 'border-red-500'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <Upload className="w-8 h-8 text-gray-400" />
            <div>
              <p className="text-sm text-gray-300">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {accept.split(',').map(t => t.split('/')[1].toUpperCase()).join(', ')} up to {maxSizeInMB}MB
              </p>
              <p className="text-xs text-gray-500">
                ({arrayValue.length}/{maxFiles} images uploaded)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Grid */}
      {arrayValue.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {arrayValue.map((file, index) => {
            const isVideo = file.mimeType?.startsWith('video/');

            return (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden bg-[#2a2a2a] border border-gray-700"
              >
                {/* Media Preview */}
                <div className="aspect-square">
                  {isVideo ? (
                    <video
                      src={file.fileData}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={file.fileData}
                      alt={file.fileName}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Video indicator */}
                {isVideo && (
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    VIDEO
                  </div>
                )}

                {/* Overlay with info */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <p className="text-xs text-white text-center truncate w-full px-2">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-gray-300">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="h-7 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>

                {/* Remove button (always visible on mobile) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="md:hidden absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Error Messages */}
      {(error || uploadError) && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error || uploadError}
        </p>
      )}

      {/* Helper Text */}
      {!error && !uploadError && arrayValue.length > 0 && (
        <p className="text-xs text-gray-500">
          {maxFiles - arrayValue.length} more image{maxFiles - arrayValue.length !== 1 ? 's' : ''} can be uploaded
        </p>
      )}
    </div>
  );
}
