'use client';

import React, { useState, useEffect } from 'react';
import { Question, QuestionType } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react'; // Optional: for delete button

interface QuestionEditorProps {
  question: Question;
  index: number;
  onUpdate: (index: number, updatedQuestion: Question) => void;
  // Optional: onDelete: (index: number) => void;
}

const questionTypes: QuestionType[] = ['MCQ', 'Fill-in-the-blank', 'Numerical'];
const difficulties: ('Easy' | 'Medium' | 'Hard')[] = ['Easy', 'Medium', 'Hard'];

export function QuestionEditor({ question, index, onUpdate }: QuestionEditorProps) {
  const [editedQuestion, setEditedQuestion] = useState<Question>(question);

  // Update local state if the prop changes (e.g., navigating between questions)
  useEffect(() => {
    setEditedQuestion(question);
  }, [question]);

  const handleChange = (field: keyof Question, value: any) => {
    setEditedQuestion(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (optionIndex: number, value: string) => {
    const newOptions = [...(editedQuestion.options || [])];
    if (optionIndex >= 0 && optionIndex < newOptions.length) {
        newOptions[optionIndex] = value;
        handleChange('options', newOptions);
    }
  };

  const addOption = () => {
      const newOptions = [...(editedQuestion.options || []), ''];
      handleChange('options', newOptions);
  };

  const removeOption = (optionIndex: number) => {
      const newOptions = (editedQuestion.options || []).filter((_, i) => i !== optionIndex);
      // Ensure correct answer is still valid if it was one of the removed options
      if (editedQuestion.type === 'MCQ' && editedQuestion.answer === editedQuestion.options?.[optionIndex]) {
          handleChange('answer', ''); // Clear answer if it was removed
      }
      handleChange('options', newOptions);
  };

  const handleSave = () => {
    onUpdate(index, editedQuestion);
    // Optionally add visual feedback for save
  };

  // When type changes, adjust options/answer if necessary
  const handleTypeChange = (value: string) => {
      const newType = value as QuestionType;
      let updatedFields: Partial<Question> = { type: newType };
      if (newType !== 'MCQ') {
          updatedFields.options = undefined; // Remove options if not MCQ
      } else if (!editedQuestion.options || editedQuestion.options.length === 0) {
          updatedFields.options = ['', '']; // Add default options if switching to MCQ
      }
       setEditedQuestion(prev => ({ ...prev, ...updatedFields }));
  }

  return (
    <Card className="mb-4 border-l-4 border-primary/50">
      <CardHeader>
        <CardTitle>Edit Question {index + 1}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question Text */} 
        <div>
          <Label htmlFor={`qtext-${index}`}>Question Text</Label>
          <Textarea 
            id={`qtext-${index}`}
            value={editedQuestion.questionText}
            onChange={(e) => handleChange('questionText', e.target.value)}
            rows={3}
          />
        </div>

        {/* Type and Difficulty */} 
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
              <Label htmlFor={`qtype-${index}`}>Type</Label>
              <Select value={editedQuestion.type} onValueChange={handleTypeChange}>
                  <SelectTrigger id={`qtype-${index}`}> <SelectValue placeholder="Select type" /> </SelectTrigger>
                  <SelectContent>
                      {questionTypes.map(type => (
                          <SelectItem key={type} value={type}>{type.replace('-',' ')}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
           <div>
              <Label htmlFor={`qdiff-${index}`}>Difficulty</Label>
              <Select value={editedQuestion.difficulty ?? ''} onValueChange={(value) => handleChange('difficulty', value as Question['difficulty'])}>
                  <SelectTrigger id={`qdiff-${index}`}> <SelectValue placeholder="Select difficulty" /> </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="">Not Set</SelectItem> {/* Option to clear */} 
                      {difficulties.map(diff => (
                          <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
        </div>

        {/* Topic */} 
         <div>
            <Label htmlFor={`qtopic-${index}`}>Topic</Label>
            <Input 
                id={`qtopic-${index}`} 
                value={editedQuestion.topic || ''}
                onChange={(e) => handleChange('topic', e.target.value)}
            />
         </div>

        {/* Options (MCQ only) */} 
        {editedQuestion.type === 'MCQ' && (
          <div className="space-y-3">
            <Label>Options</Label>
            {(editedQuestion.options || []).map((option, optIndex) => (
              <div key={optIndex} className="flex items-center gap-2">
                <Input 
                  value={option}
                  onChange={(e) => handleOptionChange(optIndex, e.target.value)}
                  placeholder={`Option ${optIndex + 1}`}
                />
                <Button variant="ghost" size="icon" onClick={() => removeOption(optIndex)} disabled={(editedQuestion.options?.length || 0) <= 2}>
                   <Trash2 className="h-4 w-4 text-destructive"/>
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addOption}>Add Option</Button>
          </div>
        )}

        {/* Answer */} 
        <div>
            <Label htmlFor={`qans-${index}`}>Correct Answer</Label>
            {editedQuestion.type === 'MCQ' ? (
                 <Select value={editedQuestion.answer} onValueChange={(value) => handleChange('answer', value)}>
                    <SelectTrigger id={`qans-${index}`}> <SelectValue placeholder="Select correct option" /> </SelectTrigger>
                    <SelectContent>
                        {(editedQuestion.options || []).map((opt, i) => (
                             opt.trim() && <SelectItem key={i} value={opt}>{opt}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <Input 
                    id={`qans-${index}`} 
                    value={editedQuestion.answer}
                    onChange={(e) => handleChange('answer', e.target.value)}
                    placeholder={editedQuestion.type === 'Numerical' ? 'Enter numerical answer' : 'Enter exact answer text'}
                    type={editedQuestion.type === 'Numerical' ? 'number' : 'text'}
                />
            )}
        </div>

      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} className="w-full">Save Changes</Button> 
      </CardFooter>
    </Card>
  );
} 