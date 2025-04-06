'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuizStore } from '@/contexts/quizStore';
import { QuestionDisplay } from '@/components/quiz/question-display';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress'; // Added Progress bar
import { ArrowLeft, ArrowRight, CheckCircle, RotateCcw, TimerIcon } from 'lucide-react';
import { QuizResult } from '@/types/quiz'; // Assuming QuizResult is exported or move definition
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import confetti from 'canvas-confetti'; // Import confetti

// Helper to format seconds into MM:SS
const formatTime = (totalSeconds: number): string => {
    if (totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Results component (can be moved to its own file later)
function QuizResultsDisplay({ results, onRestart }: { results: QuizResult, onRestart: () => void }) {
  // Trigger confetti on mount
  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
      zIndex: 1000 // Ensure it appears above other elements
    });
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto mt-10">
        <CardHeader className="items-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <CardTitle className="text-2xl font-bold">Quiz Completed!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
            <p className="text-4xl font-semibold">
                {results.percentage}%
            </p>
            <p className="text-lg text-muted-foreground">
                You scored {results.score} out of {results.totalQuestions} questions correctly.
            </p>
            {/* Display time taken */} 
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                <TimerIcon className="h-4 w-4"/> 
                Finished in: {formatTime(results.timeTakenSeconds)}
            </p>
            {/* TODO: Add more details like time, breakdown */} 
            <Button onClick={onRestart} className="mt-6 w-full">
                <RotateCcw className="mr-2 h-4 w-4" /> Take Another Quiz
            </Button>
        </CardContent>
    </Card>
  );
}

export default function QuizPage() {
  const router = useRouter();
  // Get state and actions from Zustand store
  const { 
    quizData, 
    pdfFile, 
    userAnswers, 
    results, 
    startTime, // Get startTime
    clearQuiz, 
    setUserAnswer, 
    submitQuiz,
    startQuizTimer // Get startQuizTimer action
  } = useQuizStore();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0); // State for displaying elapsed time
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to hold timer interval

  // Start timer when component mounts and data is ready
  useEffect(() => {
    if (!results && quizData && pdfFile && !startTime) {
      startQuizTimer();
    }
    // Cleanup function for effect
    return () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
    };
  }, [quizData, pdfFile, results, startTime, startQuizTimer]); // Add dependencies

  // Effect to update elapsed time display
  useEffect(() => {
    if (startTime && !results) {
      // Clear existing interval before starting a new one
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      timerIntervalRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(seconds);
      }, 1000);
    } else {
      // Clear interval if quiz ended or startTime is null
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    // Cleanup interval on unmount or when dependencies change
    return () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
    };
  }, [startTime, results]); // Rerun when startTime changes or results appear

  useEffect(() => {
    if (!quizData || !pdfFile) {
      console.log('No quiz data found, redirecting home.');
      router.replace('/');
    }
  }, [quizData, pdfFile, router]);

  // Handle case where Zustand state isn't ready yet or data is missing
  if (!quizData || !pdfFile) {
    return <div>Loading Quiz...</div>;
  }

  const totalQuestions = quizData.questions.length;
  const currentQuestion = quizData.questions[currentQuestionIndex];

  const handleAnswerChange = (answer: string) => {
    // Call store action to update answer
    setUserAnswer(currentQuestionIndex, answer);
  };

  const goToNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); // Stop timer
    console.log("Submitting answers from store:", userAnswers);
    submitQuiz(); // Call store action to calculate results
    // No need to navigate here, component will re-render showing results
  };

  const handleExit = () => {
     if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
     clearQuiz();
     router.push('/');
  }

  const handleRestart = () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      clearQuiz();
      router.push('/'); // Go back to home to upload a new PDF
  }

  // Conditional Rendering: Show results or quiz
  if (results) {
     return <QuizResultsDisplay results={results} onRestart={handleRestart} />;
  }

  const progressValue = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl sm:text-2xl font-bold truncate mr-4">{quizData.title || 'Quiz'}</h1>
            <div className="flex items-center gap-4">
                {/* Timer Display */} 
                {startTime && (
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1 tabular-nums">
                        <TimerIcon className="h-4 w-4"/>
                        {formatTime(elapsedTime)}
                    </span>
                )}
                <Button variant="outline" size="sm" onClick={handleExit}>Exit Quiz</Button>
            </div>
        </div>
        
        {/* Progress Bar */} 
        <div className="mb-6">
            <Progress value={progressValue} className="w-full" />
            <p className="text-sm text-muted-foreground text-center mt-1">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
        </div>

        {/* Question Display Area - pass user answer from store */}
        <QuestionDisplay 
            question={currentQuestion} 
            questionNumber={currentQuestionIndex + 1}
            userAnswer={userAnswers[currentQuestionIndex] || ''}
            onAnswerChange={handleAnswerChange}
        />

        {/* Navigation Buttons */} 
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={goToPrevious} 
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          {currentQuestionIndex === totalQuestions - 1 ? (
            <Button onClick={handleSubmit} size="lg">Submit Quiz</Button>
          ) : (
            <Button onClick={goToNext}>
               Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </main>
  );
} 