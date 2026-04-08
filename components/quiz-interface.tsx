'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Quiz, QuizSession, Question } from '@/types';
import { Check, ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { saveSession, getSession } from '@/lib/storage';

interface QuizInterfaceProps {
  quiz: Quiz;
  onComplete: (session: QuizSession) => void;
  onExit: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function QuizInterface({ quiz, onComplete, onExit }: QuizInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);

  // Load saved session
  useEffect(() => {
    const saved = getSession(quiz.id);
    if (saved && !saved.isComplete) {
      setCurrentIndex(saved.currentQuestionIndex);
      setAnswers(saved.answers);
      setElapsedTime(saved.elapsedTime);
    }
  }, [quiz.id]);

  // Timer
  useEffect(() => {
    if (isReviewing) return;
    
    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;
        // Auto-save every 10 seconds
        if (newTime % 10 === 0) {
          saveSession({
            quizId: quiz.id,
            currentQuestionIndex: currentIndex,
            answers,
            startTime: Date.now(),
            elapsedTime: newTime,
            isComplete: false,
          });
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, answers, quiz.id, isReviewing]);

  const currentQuestion = quiz.questions[currentIndex];

  const setAnswer = (questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = quiz.questions.length;
    
    if (answeredCount < totalQuestions && !isReviewing) {
      if (!confirm(`You've answered ${answeredCount} of ${totalQuestions} questions. Are you sure you want to submit?`)) {
        return;
      }
    }

    // Calculate score
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of quiz.questions) {
      const userAnswer = answers[question.id];
      const points = question.points || 1;
      totalPoints += points;

      if (userAnswer !== undefined) {
        const isCorrect = checkAnswer(userAnswer, question.correctAnswer);
        if (isCorrect) {
          correctCount++;
          earnedPoints += points;
        }
      }
    }

    const score = Math.round((earnedPoints / totalPoints) * 100);

    const session: QuizSession = {
      quizId: quiz.id,
      currentQuestionIndex: currentIndex,
      answers,
      startTime: Date.now(),
      elapsedTime,
      isComplete: true,
      score,
    };

    saveSession(session);
    onComplete(session);
  };

  const checkAnswer = (userAnswer: string | string[], correctAnswer: string | string[]): boolean => {
    if (Array.isArray(correctAnswer)) {
      if (!Array.isArray(userAnswer)) return false;
      const sortedUser = [...userAnswer].sort();
      const sortedCorrect = [...correctAnswer].sort();
      return JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
    }
    return String(userAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
  };

  const renderQuestionInput = (question: Question) => {
    const userAnswer = answers[question.id];

    switch (question.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option, i) => {
              const isSelected = userAnswer === option;
              return (
                <button
                  key={i}
                  onClick={() => setAnswer(question.id, option)}
                  className={`quiz-option w-full text-left ${isSelected ? 'selected' : ''}`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                    isSelected ? 'bg-accent text-white' : 'bg-border/50 text-muted'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {isSelected && <Check className="w-5 h-5 text-accent" />}
                </button>
              );
            })}
          </div>
        );

      case 'multi_select':
        const selectedOptions = Array.isArray(userAnswer) ? userAnswer : [];
        return (
          <div className="space-y-3">
            {question.options?.map((option, i) => {
              const isSelected = selectedOptions.includes(option);
              return (
                <button
                  key={i}
                  onClick={() => {
                    const newSelection = isSelected
                      ? selectedOptions.filter(o => o !== option)
                      : [...selectedOptions, option];
                    setAnswer(question.id, newSelection);
                  }}
                  className={`quiz-option w-full text-left ${isSelected ? 'selected' : ''}`}
                >
                  <span className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                    isSelected ? 'border-accent bg-accent' : 'border-border'
                  }`}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>
        );

      case 'true_false':
        return (
          <div className="grid grid-cols-2 gap-4">
            {['true', 'false'].map((value) => {
              const isSelected = userAnswer === value;
              return (
                <button
                  key={value}
                  onClick={() => setAnswer(question.id, value)}
                  className={`quiz-option py-6 text-center justify-center ${isSelected ? 'selected' : ''}`}
                >
                  <span className="text-lg font-medium capitalize">{value}</span>
                </button>
              );
            })}
          </div>
        );

      case 'fill_in_blank':
        return (
          <input
            type="text"
            value={(userAnswer as string) || ''}
            onChange={(e) => setAnswer(question.id, e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-6 py-4 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors text-lg"
          />
        );

      case 'short_answer':
        return (
          <textarea
            value={(userAnswer as string) || ''}
            onChange={(e) => setAnswer(question.id, e.target.value)}
            placeholder="Write your answer here..."
            rows={6}
            className="w-full px-6 py-4 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors resize-none text-lg"
          />
        );

      case 'matching':
      case 'ordering':
        // Simplified: treat as text input for now
        return (
          <input
            type="text"
            value={Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer as string) || ''}
            onChange={(e) => setAnswer(question.id, e.target.value)}
            placeholder={`Enter answer${question.type === 'matching' ? ' (format: A-1, B-2)' : ' (format: First, Second, Third)'}...`}
            className="w-full px-6 py-4 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors text-lg"
          />
        );

      default:
        return (
          <input
            type="text"
            value={(userAnswer as string) || ''}
            onChange={(e) => setAnswer(question.id, e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-6 py-4 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors text-lg"
          />
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{quiz.title}</h2>
          <p className="text-muted">Question {currentIndex + 1} of {quiz.questions.length}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="timer-display flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {formatTime(elapsedTime)}
          </div>
          <button
            onClick={onExit}
            className="btn-secondary text-sm"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar mb-8">
        <div 
          className="progress-fill"
          style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="app-frame p-8 mb-8">
        <div className="flex items-start gap-4 mb-6">
          <span className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-lg font-semibold text-accent shrink-0">
            {currentIndex + 1}
          </span>
          <div className="flex-1">
            <p className="text-xl text-foreground leading-relaxed">{currentQuestion.text}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-muted">{currentQuestion.topic}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-border/50 text-muted capitalize">
                {currentQuestion.difficulty}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent">
                {currentQuestion.points || 1} pts
              </span>
            </div>
          </div>
        </div>

        {renderQuestionInput(currentQuestion)}

        {currentQuestion.latex && (
          <div className="mt-4 p-3 rounded-lg bg-border/30 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent" />
            <span className="text-muted">This question contains LaTeX formatting</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          {quiz.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-3 h-3 rounded-full transition-all ${
                i === currentIndex 
                  ? 'bg-accent w-8' 
                  : answers[quiz.questions[i].id] 
                    ? 'bg-accent/50' 
                    : 'bg-border'
              }`}
            />
          ))}
        </div>

        {currentIndex < quiz.questions.length - 1 ? (
          <button
            onClick={handleNext}
            className="btn-primary flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            className="btn-primary flex items-center gap-2"
          >
            Submit Quiz
            <Check className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Question Navigator */}
      <div className="mt-8 app-frame p-4">
        <p className="text-sm text-muted mb-3">Jump to question:</p>
        <div className="flex flex-wrap gap-2">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                i === currentIndex
                  ? 'bg-accent text-white'
                  : answers[q.id]
                    ? 'bg-accent/20 text-accent'
                    : 'bg-border/30 text-muted hover:bg-border/50'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
