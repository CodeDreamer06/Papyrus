'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';

interface PdfUploadProps {
  onFileSelect: (file: File) => void;
}

export function PdfUpload({ onFileSelect }: PdfUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      setError(null);
      setSelectedFile(null);

      if (fileRejections.length > 0) {
        setError('Please upload only PDF files.');
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileSelect(file); // Notify parent
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Upload Question Paper</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
            ${error ? 'border-destructive' : ''}`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`w-12 h-12 mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          {isDragActive ? (
            <p className="text-primary font-semibold">Drop the PDF here ...</p>
          ) : (
            <p className="text-center text-muted-foreground">
              Drag 'n' drop a PDF file here, or click to select file
            </p>
          )}
          {selectedFile && !error && (
             <p className="mt-4 text-sm font-medium text-green-600">Selected: {selectedFile.name}</p>
          )}
          {error && (
             <p className="mt-4 text-sm font-medium text-destructive">{error}</p>
          )}
        </div>
        <Button onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()} className="mt-4 w-full">
          Select File
        </Button>
      </CardContent>
    </Card>
  );
} 