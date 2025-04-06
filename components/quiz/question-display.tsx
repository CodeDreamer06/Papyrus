'use client';

import { Question } from "@/types/quiz";
import { DiagramDisplay } from './diagram-display';
import { AnswerOptions } from './answer-options';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  userAnswer: string;
  onAnswerChange: (answer: string) => void;
}

export function QuestionDisplay({ 
  question, 
  questionNumber, 
  userAnswer,
  onAnswerChange
}: QuestionDisplayProps) {

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Question {questionNumber}</CardTitle>
        {/* Display tags/difficulty if available */} 
        <CardDescription className="flex gap-2 pt-1">
           {question.topic && <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{question.topic}</span>}
           {question.difficulty && <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{question.difficulty}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Display Diagram if present */} 
        {question.diagram && (
          <DiagramDisplay pageNumber={question.diagram.pageNumber} />
        )}

        {/* Question Text */} 
        <div className="prose dark:prose-invert max-w-none mb-4 text-lg">
           {/* We might need a markdown renderer here later if question text contains markdown/mathjax */} 
           {question.questionText}
        </div>
        
        {/* Answer Options */} 
        <AnswerOptions 
          question={question} 
          userAnswer={userAnswer} 
          onAnswerChange={onAnswerChange} 
        />
      </CardContent>
    </Card>
  );
} 