'use client';

import { Question } from "@/types/quiz";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AnswerOptionsProps {
  question: Question;
  userAnswer: string;
  onAnswerChange: (answer: string) => void;
}

export function AnswerOptions({ question, userAnswer, onAnswerChange }: AnswerOptionsProps) {
  switch (question.type) {
    case 'MCQ':
      if (!question.options) return <div>Error: MCQ question has no options.</div>;
      return (
        <RadioGroup 
          value={userAnswer} 
          onValueChange={onAnswerChange}
          className="space-y-3 mt-4"
        >
          {question.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-3 border rounded-md p-3 hover:bg-muted/50 transition-colors has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:border-primary">
              <RadioGroupItem value={option} id={`q-${index}-${option.slice(0,5)}`} />
              <Label htmlFor={`q-${index}-${option.slice(0,5)}`} className="flex-1 cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    case 'Fill-in-the-blank':
      return (
        <div className="mt-4">
          <Label htmlFor="fill-in-answer" className="mb-2 block font-medium">Your Answer:</Label>
          <Input
            id="fill-in-answer"
            type="text"
            placeholder="Type your answer here..."
            value={userAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="w-full sm:w-2/3"
          />
        </div>
      );
    case 'Numerical':
      return (
        <div className="mt-4">
          <Label htmlFor="numerical-answer" className="mb-2 block font-medium">Your Answer:</Label>
          <Input
            id="numerical-answer"
            type="number" // Use number type for numerical input
            placeholder="Enter numerical answer..."
            value={userAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="w-full sm:w-1/2"
            // Optional: Add step, min, max if applicable
          />
        </div>
      );
    default:
      return <div className="text-destructive">Unknown question type</div>;
  }
} 