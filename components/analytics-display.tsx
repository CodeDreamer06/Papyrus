'use client';

import React from 'react';
import { useQuizStore, AttemptHistoryItem } from '@/contexts/quizStore';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

// Helper to format timestamp
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString(); 
};

export function AnalyticsDisplay() {
  const attemptHistory = useQuizStore((state) => state.attemptHistory);
  const clearHistory = useQuizStore((state) => state.clearHistory);

  const handleClearHistory = () => {
      if(confirm('Are you sure you want to clear all quiz history? This cannot be undone.')) {
          clearHistory();
      }
  }

  return (
    <div className="w-full mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Quiz History</h2>
        {attemptHistory.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearHistory}>
                <Trash2 className="mr-2 h-4 w-4"/> Clear History
            </Button>
        )}
      </div>
      {attemptHistory.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No quiz attempts recorded yet.</p>
      ) : (
        <Table>
          <TableCaption>Your past quiz attempts.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Date</TableHead>
              <TableHead>Quiz Title</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Percentage</TableHead>
              <TableHead className="text-right">Time Taken</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attemptHistory.map((attempt) => (
              <TableRow key={attempt.timestamp}>
                <TableCell className="font-medium">{formatTimestamp(attempt.timestamp)}</TableCell>
                <TableCell>{attempt.quizTitle}</TableCell>
                <TableCell className="text-right">{attempt.result.score}/{attempt.result.totalQuestions}</TableCell>
                <TableCell className="text-right">{attempt.result.percentage}%</TableCell>
                <TableCell className="text-right">{formatTime(attempt.result.timeTakenSeconds)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// Re-add formatTime helper if not globally available
const formatTime = (totalSeconds: number): string => {
    if (totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}; 