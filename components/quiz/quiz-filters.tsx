'use client';

import React from 'react';
import { FilterOptions, SelectedFilters } from '@/contexts/quizStore'; // Import types
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuizFiltersProps {
  availableFilters: FilterOptions;
  selectedFilters: SelectedFilters;
  onFilterChange: (newFilters: SelectedFilters) => void;
}

// Helper to handle checkbox group changes
function handleCheckboxChange<T>(currentSelection: T[], item: T, isChecked: boolean): T[] {
  if (isChecked) {
    return [...currentSelection, item];
  } else {
    return currentSelection.filter(i => i !== item);
  }
}

export function QuizFilters({ 
  availableFilters,
  selectedFilters,
  onFilterChange
}: QuizFiltersProps) {

  const handleTypeChange = (type: FilterOptions['types'][0], checked: boolean) => {
    const newTypes = handleCheckboxChange(selectedFilters.types, type, checked);
    onFilterChange({ ...selectedFilters, types: newTypes });
  };

  const handleDifficultyChange = (difficulty: FilterOptions['difficulties'][0], checked: boolean) => {
    const newDifficulties = handleCheckboxChange(selectedFilters.difficulties, difficulty, checked);
    onFilterChange({ ...selectedFilters, difficulties: newDifficulties });
  };
  
  const handleTopicChange = (topic: FilterOptions['topics'][0], checked: boolean) => {
    const newTopics = handleCheckboxChange(selectedFilters.topics, topic, checked);
    onFilterChange({ ...selectedFilters, topics: newTopics });
  };

  return (
    <Card className="w-full">
        <CardHeader>
            <CardTitle>Filter Questions</CardTitle>
        </CardHeader>
        <CardContent>
            <Accordion type="multiple" defaultValue={['types', 'difficulty', 'topics'].filter(key => availableFilters[key as keyof FilterOptions]?.length > 0)} className="w-full">
                {/* Question Types */} 
                {availableFilters.types.length > 0 && (
                    <AccordionItem value="types">
                        <AccordionTrigger>Question Type ({selectedFilters.types.length}/{availableFilters.types.length})</AccordionTrigger>
                        <AccordionContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                        {availableFilters.types.map(type => (
                            <div key={type} className="flex items-center space-x-2">
                            <Checkbox 
                                id={`type-${type}`}
                                checked={selectedFilters.types.includes(type)}
                                onCheckedChange={(checked) => handleTypeChange(type, !!checked)}
                            />
                            <Label htmlFor={`type-${type}`} className="capitalize cursor-pointer">{type.replace('-',' ')}</Label>
                            </div>
                        ))}
                        </AccordionContent>
                    </AccordionItem>
                )}

                {/* Difficulty Levels */} 
                {availableFilters.difficulties.length > 0 && (
                     <AccordionItem value="difficulty">
                        <AccordionTrigger>Difficulty ({selectedFilters.difficulties.length}/{availableFilters.difficulties.length})</AccordionTrigger>
                        <AccordionContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                        {availableFilters.difficulties.map(difficulty => (
                            <div key={difficulty} className="flex items-center space-x-2">
                            <Checkbox
                                id={`difficulty-${difficulty}`}
                                checked={selectedFilters.difficulties.includes(difficulty)}
                                onCheckedChange={(checked) => handleDifficultyChange(difficulty, !!checked)}
                            />
                            <Label htmlFor={`difficulty-${difficulty}`} className="cursor-pointer">{difficulty}</Label>
                            </div>
                        ))}
                        </AccordionContent>
                    </AccordionItem>
                )}

                 {/* Topics */} 
                 {availableFilters.topics.length > 0 && (
                    <AccordionItem value="topics">
                        <AccordionTrigger>Topics ({selectedFilters.topics.length}/{availableFilters.topics.length})</AccordionTrigger>
                        <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 max-h-60 overflow-y-auto">
                        {availableFilters.topics.map(topic => (
                            <div key={topic} className="flex items-center space-x-2">
                            <Checkbox
                                id={`topic-${topic}`}
                                checked={selectedFilters.topics.includes(topic)}
                                onCheckedChange={(checked) => handleTopicChange(topic, !!checked)}
                            />
                            <Label htmlFor={`topic-${topic}`} className="cursor-pointer text-sm">{topic}</Label>
                            </div>
                        ))}
                        </AccordionContent>
                    </AccordionItem>
                 )}
            </Accordion>
        </CardContent>
    </Card>
  );
} 