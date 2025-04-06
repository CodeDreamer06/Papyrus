'use client';

import React, { useState } from 'react';
import { useQuizStore } from '@/contexts/quizStore';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Set workerSrc from pdfjs-dist build
// Note: This should match the configuration in next.config.ts
pdfjs.GlobalWorkerOptions.workerSrc = `/static/pdf.worker.min.mjs`;

interface DiagramDisplayProps {
  pageNumber: number;
}

export function DiagramDisplay({ pageNumber }: DiagramDisplayProps) {
  const pdfFile = useQuizStore((state) => state.pdfFile);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setError(null);
  }

  function onDocumentLoadError(error: Error): void {
    console.error('Error loading PDF for diagram:', error);
    setError(`Failed to load PDF: ${error.message}`);
  }

  function onPageLoadError(error: Error): void {
    console.error(`Error loading page ${pageNumber}:`, error);
    setError(`Failed to load page ${pageNumber}: ${error.message}`);
  }

  if (!pdfFile) {
    return <div className="text-destructive p-4 text-center">Error: PDF file not found for diagram.</div>;
  }

  return (
    <div className="my-4 border rounded-md overflow-hidden bg-muted/20">
      <p className="text-sm font-medium text-center p-2 bg-muted/50 border-b">Reference Diagram (Page {pageNumber})</p>
      {error && (
          <div className="p-4 text-destructive text-center">{error}</div>
      )}
      {!error && (
        <div className="relative group">
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /> Loading PDF...</div>}
            className="flex justify-center" // Center the Document component
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale}
              renderTextLayer={false} // Don't need text layer for diagram view
              renderAnnotationLayer={false} // Don't need annotation layer
              onLoadError={onPageLoadError}
              loading={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /> Loading Page...</div>}
              className="flex justify-center max-w-full overflow-auto" // Center Page and allow scroll if needed
            />
          </Document>
          {/* Zoom controls */} 
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.2))} disabled={scale <= 0.5}>
                 <ZoomOut className="h-4 w-4" />
             </Button>
             <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(3.0, s + 0.2))} disabled={scale >= 3.0}>
                 <ZoomIn className="h-4 w-4" />
             </Button>
          </div>
        </div>
      )}
    </div>
  );
} 