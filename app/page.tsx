'use client'; // Needs to be a client component for state

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Added router
import { PdfUpload } from '@/components/pdf-upload'; // Import the new component
import { useLLMClient } from '@/hooks/useLLMClient'; // Import the hook
import { useQuizStore } from '@/contexts/quizStore'; // Added store import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Edit, Download } from 'lucide-react'; // Loading spinner icon, Edit icon, and Download icon
import { QuizFilters } from '@/components/quiz/quiz-filters'; // Import filter component
import { Separator } from '@/components/ui/separator'; // For visual separation
import { Question } from '@/types/quiz'; // Import Question type
import { SelectedFilters } from '@/contexts/quizStore'; // Import SelectedFilters from store
import { AnalyticsDisplay } from '@/components/analytics-display'; // Import analytics component
import { downloadFile } from '@/lib/utils'; // Import download utility

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageDetail, setImageDetail] = useState<'low' | 'high'>('low');
  const { processPdf, isLoading, loadingMessage, error, result: llmResult, isPdfLibReady } = useLLMClient();
  const {
    rawQuizData,
    pdfFile,
    availableFilters,
    selectedFilters,
    clearQuiz,
    setRawQuiz, // Use setRawQuiz
    setSelectedFilters,
    applyFiltersAndSetQuiz
  } = useQuizStore();
  const router = useRouter();

  const handleFileSelect = (file: File) => {
    console.log("File selected in parent:", file);
    setUploadedFile(file);
    clearQuiz(); // Clear any previous quiz state
  };

  const handleProcessClick = () => {
    if (uploadedFile) {
      processPdf(uploadedFile, imageDetail);
    }
  };

  // Effect to store raw quiz data when LLM result is ready
  useEffect(() => {
    if (llmResult && uploadedFile) {
      console.log("LLM processing finished, setting raw quiz data...");
      setRawQuiz(llmResult, uploadedFile);
    }
  }, [llmResult, uploadedFile, setRawQuiz]);

  const handleStartQuiz = () => {
    applyFiltersAndSetQuiz(); // Apply the selected filters
    router.push('/quiz'); // Navigate to the quiz page
  }

  const handleGoToEdit = () => {
    router.push('/edit'); // Navigate to edit page
  }

  // Handler for JSON download
  const handleDownloadJson = () => {
    if (!rawQuizData || !selectedFilters) return;
    const dataToDownload = filterQuestions(rawQuizData.questions, selectedFilters);
    const jsonData = JSON.stringify({ questions: dataToDownload }, null, 2);
    const filename = `${rawQuizData.title || rawQuizData.extractedFrom || 'quiz'}.json`;
    downloadFile(filename, jsonData, 'application/json');
  };

  // Handler for Anki/CSV download (simple Tab Separated format)
  const handleDownloadAnki = () => {
    if (!rawQuizData || !selectedFilters) return;
    const questionsToDownload = filterQuestions(rawQuizData.questions, selectedFilters);
    
    // Format: Front (Question + Options) <Tab> Back (Answer) <Tab> Tags (Type, Difficulty, Topic)
    const tsvContent = questionsToDownload.map(q => {
        let front = q.questionText;
        if (q.type === 'MCQ' && q.options) {
            front += `\n\nOptions:\n${q.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}`;
        }
        // Escape potential tabs and newlines within fields if necessary
        const clean = (text: string) => text?.replace(/\t/g, ' ').replace(/\n/g, '<br>') || '';

        const tags = [q.type, q.difficulty, q.topic].filter(Boolean).join(' ');
        
        return `${clean(front)}\t${clean(q.answer)}\t${clean(tags)}`;
    }).join('\n');

    const filename = `${rawQuizData.title || rawQuizData.extractedFrom || 'quiz'}_anki.tsv`;
    downloadFile(filename, tsvContent, 'text/tab-separated-values');
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 sm:p-12 md:p-24">
      <Card className="w-full max-w-2xl mb-12">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold tracking-tight">Papyrus AI</CardTitle>
          <p className="text-center text-muted-foreground pt-2">Turn any PDF question paper into an interactive quiz!</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {/* Show upload component only if not loading and no file selected yet */} 
          {!isLoading && !uploadedFile && !rawQuizData && (
              <PdfUpload onFileSelect={handleFileSelect} />
          )}
          
          {/* Show file info and processing options if a file is selected and not loading */} 
          {uploadedFile && !isLoading && !rawQuizData && !error && (
             <div className="text-center flex flex-col items-center gap-4 w-full">
                 <p className="font-semibold text-lg">File Ready: <span className="font-normal">{uploadedFile.name}</span></p>

                 <Label className="font-medium">Image Quality for AI:</Label>
                 <RadioGroup defaultValue="low" value={imageDetail} onValueChange={(value: 'low' | 'high') => setImageDetail(value)} className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="r-low" />
                      <Label htmlFor="r-low">Low (Faster, Cheaper)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="r-high" />
                      <Label htmlFor="r-high">High (More Accurate)</Label>
                    </div>
                  </RadioGroup>
                  
                 <Button 
                   onClick={handleProcessClick} 
                   className="mt-4 w-full max-w-xs" 
                   disabled={!isPdfLibReady || isLoading} // Disable if lib not ready or already loading
                 >
                   {!isPdfLibReady ? (
                       <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading PDF Lib...</>
                   ) : (
                       'Extract Questions'
                   )}
                 </Button>
                 <Button variant="outline" size="sm" onClick={() => { setUploadedFile(null); clearQuiz(); }} className="mt-2" disabled={isLoading}>
                    Upload Different File
                 </Button>
             </div>
          )}

          {/* Show Loading State */} 
          {isLoading && (
            <div className="flex flex-col items-center gap-4 p-8">
               <Loader2 className="h-12 w-12 animate-spin text-primary" />
               <p className="text-lg font-medium text-muted-foreground">Processing...</p>
               {loadingMessage && <p className="text-sm text-muted-foreground">{loadingMessage}</p>}
            </div>
          )}

          {/* Show Error State */} 
          {error && !isLoading && (
            <div className="text-center flex flex-col items-center gap-4 p-6 bg-destructive/10 border border-destructive rounded-md w-full">
              <p className="font-semibold text-destructive">Error processing PDF:</p>
              <p className="text-sm text-destructive/90">{error}</p>
              <Button variant="destructive" size="sm" onClick={() => { setUploadedFile(null); clearQuiz(); }} className="mt-2">
                Try Again
              </Button>
            </div>
          )}

          {/* State 5: Filters Ready */} 
          {rawQuizData && availableFilters && selectedFilters && !isLoading && !error && (
             <div className="w-full flex flex-col items-center gap-6">
                <p className="text-lg font-semibold text-green-600">Extracted {rawQuizData.questions.length} questions!</p>
                
                <Button variant="secondary" onClick={handleGoToEdit} className="w-full max-w-xs">
                    <Edit className="mr-2 h-4 w-4" /> Review / Edit Questions
                 </Button>

                <QuizFilters 
                   availableFilters={availableFilters}
                   selectedFilters={selectedFilters}
                   onFilterChange={setSelectedFilters}
                />
                <Separator className="my-2"/>
                
                {/* Export Buttons */} 
                <div className='flex flex-col sm:flex-row gap-2 w-full justify-center max-w-xs'>
                    <Button variant="outline" onClick={handleDownloadJson} className='flex-1'>
                        <Download className="mr-2 h-4 w-4" /> Download JSON
                    </Button>
                    <Button variant="outline" onClick={handleDownloadAnki} className='flex-1'>
                        <Download className="mr-2 h-4 w-4" /> Export for Anki
                    </Button>
                </div>

                <Button onClick={handleStartQuiz} size="lg" className="w-full max-w-xs mt-4">
                    Start Quiz ({filterQuestions(rawQuizData.questions, selectedFilters).length} selected)
                </Button>
                 <Button variant="outline" size="sm" onClick={() => { setUploadedFile(null); clearQuiz(); }} className="mt-2">
                    Upload Different File
                 </Button>
             </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-center pt-4">
           <p className="text-xs text-muted-foreground">Powered by Papyrus AI</p>
        </CardFooter>
      </Card>

      {/* Analytics Display Section */} 
      <div className="w-full max-w-4xl">
          <AnalyticsDisplay />
        </div>
      </main>
  );
}

// Helper function needed for button label (can be moved)
const filterQuestions = (questions: Question[] | undefined | null, filters: SelectedFilters | null): Question[] => {
    if (!filters || !questions) return questions || [];
    return questions.filter(q => 
      (filters.types.length === 0 || filters.types.includes(q.type)) &&
      (filters.difficulties.length === 0 || (q.difficulty && filters.difficulties.includes(q.difficulty))) &&
      (filters.topics.length === 0 || (q.topic && filters.topics.includes(q.topic)))
    );
  };
