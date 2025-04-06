'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuizStore } from '@/contexts/quizStore';
import { QuestionEditor } from '@/components/quiz/question-editor';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function EditQuizPage() {
  const router = useRouter();
  const { rawQuizData, updateQuestion } = useQuizStore((state) => ({ 
      rawQuizData: state.rawQuizData, 
      updateQuestion: state.updateQuestion 
  }));

  // Redirect home if no data
  React.useEffect(() => {
    if (!rawQuizData) {
      router.replace('/');
    }
  }, [rawQuizData, router]);

  if (!rawQuizData) {
    return <div>Loading editor...</div>; // Or a proper loading state
  }

  const handleGoBack = () => {
    // Navigate back to home page where filters are shown
    router.push('/'); 
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Review & Edit Questions</h1>
          <Button variant="outline" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Filters
          </Button>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {rawQuizData.questions.map((question, index) => (
            <AccordionItem value={`item-${index}`} key={index} className="border rounded-md px-4 bg-card">
                 <AccordionTrigger className="text-left hover:no-underline">
                    Question {index + 1}: {question.questionText.substring(0, 80)}{question.questionText.length > 80 ? '...' : ''}
                 </AccordionTrigger>
                 <AccordionContent className="pt-4">
                    <QuestionEditor 
                        question={question}
                        index={index}
                        onUpdate={updateQuestion} 
                        // Optional: Add delete functionality later
                    />
                 </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

         <div className="mt-8 flex justify-center">
             <Button size="lg" onClick={handleGoBack}>Done Editing (Back to Filters)</Button>
         </div>
      </div>
    </main>
  );
} 