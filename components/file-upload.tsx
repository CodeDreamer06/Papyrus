'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string[];
  maxSize?: number;
}

export function FileUpload({ 
  onFileSelect, 
  acceptedFileTypes = ['application/pdf'],
  maxSize = 50 * 1024 * 1024 // 50MB
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    multiple: false,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const clearFile = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (selectedFile) {
    return (
      <div className="app-frame p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <File className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={clearFile}
            className="p-2 rounded-full hover:bg-border transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`drop-zone cursor-pointer ${isDragActive ? 'drag-active' : ''} ${isDragReject ? 'border-red-500' : ''}`}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
          isDragActive ? 'bg-accent/20 scale-110' : 'bg-app-box'
        }`}>
          <Upload className={`w-8 h-8 transition-colors ${
            isDragActive ? 'text-accent' : 'text-muted'
          }`} />
        </div>
        
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">
            {isDragActive ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
          </p>
          <p className="text-sm text-muted">
            or <span className="text-accent cursor-pointer">click to browse</span>
          </p>
        </div>
        
        <p className="text-xs text-muted">
          Supported: PDF files up to {formatFileSize(maxSize)}
        </p>
        
        {isDragReject && (
          <p className="text-sm text-red-500">
            File type not supported or file too large
          </p>
        )}
      </div>
    </div>
  );
}
