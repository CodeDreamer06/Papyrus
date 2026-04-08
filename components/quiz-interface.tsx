"use client";

import { useState, useEffect } from "react";
import type { Quiz, QuizSession, Question } from "@/types";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Keyboard,
} from "lucide-react";
import { saveSession, getSession } from "@/lib/storage";
import { MathText } from "@/components/math-text";
import {
  answersMatch,
  formatAnswerValue,
  normalizeQuestion,
  parseMatchingAnswer,
  parseOrderingAnswer,
} from "@/lib/quiz-answer-utils";

interface QuizInterfaceProps {
  quiz: Quiz;
  onComplete: (session: QuizSession) => void;
  onExit: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function QuizInterface({
  quiz,
  onComplete,
  onExit,
}: QuizInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizSession["answers"]>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const normalizedQuestions = quiz.questions.map(normalizeQuestion);

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
      setElapsedTime((prev) => {
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

  const currentQuestion = normalizedQuestions[currentIndex];

  const setAnswer = (
    questionId: string,
    answer: QuizSession["answers"][string],
  ) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentIndex < normalizedQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = normalizedQuestions.length;

    if (answeredCount < totalQuestions && !isReviewing) {
      if (
        !confirm(
          `You've answered ${answeredCount} of ${totalQuestions} questions. Are you sure you want to submit?`,
        )
      ) {
        return;
      }
    }

    // Calculate score
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of normalizedQuestions) {
      const userAnswer = answers[question.id];
      const points = question.points || 1;
      totalPoints += points;

      if (userAnswer !== undefined) {
        const isCorrect = answersMatch(
          userAnswer,
          question.correctAnswer,
          question.type,
        );
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (isTyping) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "arrowleft") {
        event.preventDefault();
        handlePrev();
        return;
      }

      if (key === "arrowright") {
        event.preventDefault();
        if (currentIndex < normalizedQuestions.length - 1) {
          handleNext();
        } else {
          handleComplete();
        }
        return;
      }

      if (key === "escape") {
        event.preventDefault();
        onExit();
        return;
      }

      if (key >= "1" && key <= "9") {
        const nextIndex = Number(key) - 1;
        if (nextIndex < normalizedQuestions.length) {
          event.preventDefault();
          setCurrentIndex(nextIndex);
        }
        return;
      }

      if (currentQuestion.type === "multiple_choice") {
        const optionIndex = ["a", "b", "c", "d"].indexOf(key);
        if (optionIndex >= 0 && currentQuestion.options?.[optionIndex]) {
          event.preventDefault();
          setAnswer(currentQuestion.id, currentQuestion.options[optionIndex]);
        }
        return;
      }

      if (
        currentQuestion.type === "true_false" &&
        (key === "t" || key === "f")
      ) {
        event.preventDefault();
        setAnswer(currentQuestion.id, key === "t" ? "true" : "false");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentQuestion, normalizedQuestions.length, onExit]);

  const renderQuestionInput = (question: Question) => {
    const userAnswer = answers[question.id];

    switch (question.type) {
      case "multiple_choice":
        return (
          <div className="space-y-3">
            {question.options?.map((option, i) => {
              const isSelected = userAnswer === option;
              return (
                <button
                  key={i}
                  onClick={() => setAnswer(question.id, option)}
                  className={`quiz-option w-full text-left ${isSelected ? "selected" : ""}`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                      isSelected
                        ? "bg-accent text-white"
                        : "bg-border/50 text-muted"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">
                    <MathText text={option} />
                  </span>
                  {isSelected && <Check className="w-5 h-5 text-accent" />}
                </button>
              );
            })}
          </div>
        );

      case "multi_select":
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
                      ? selectedOptions.filter((o) => o !== option)
                      : [...selectedOptions, option];
                    setAnswer(question.id, newSelection);
                  }}
                  className={`quiz-option w-full text-left ${isSelected ? "selected" : ""}`}
                >
                  <span
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      isSelected ? "border-accent bg-accent" : "border-border"
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </span>
                  <span className="flex-1">
                    <MathText text={option} />
                  </span>
                </button>
              );
            })}
          </div>
        );

      case "true_false":
        return (
          <div className="grid grid-cols-2 gap-4">
            {["true", "false"].map((value) => {
              const isSelected = userAnswer === value;
              return (
                <button
                  key={value}
                  onClick={() => setAnswer(question.id, value)}
                  className={`quiz-option py-6 text-center justify-center ${isSelected ? "selected" : ""}`}
                >
                  <span className="text-lg font-medium capitalize">
                    {value}
                  </span>
                </button>
              );
            })}
          </div>
        );

      case "fill_in_blank":
        return (
          <input
            type="text"
            value={(userAnswer as string) || ""}
            onChange={(e) => setAnswer(question.id, e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-6 py-4 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors text-lg"
          />
        );

      case "short_answer":
        return (
          <textarea
            value={(userAnswer as string) || ""}
            onChange={(e) => setAnswer(question.id, e.target.value)}
            placeholder="Write your answer here..."
            rows={6}
            className="w-full px-6 py-4 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors resize-none text-lg"
          />
        );

      case "matching":
      case "ordering":
        // Simplified: treat as text input for now
        return (
          <input
            type="text"
            value={formatAnswerValue(userAnswer)}
            onChange={(e) =>
              setAnswer(
                question.id,
                question.type === "matching"
                  ? parseMatchingAnswer(e.target.value)
                  : parseOrderingAnswer(e.target.value),
              )
            }
            placeholder={`Enter answer${question.type === "matching" ? " (format: A-1, B-2)" : " (format: First, Second, Third)"}...`}
            className="w-full px-6 py-4 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors text-lg"
          />
        );

      default:
        return (
          <input
            type="text"
            value={(userAnswer as string) || ""}
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
          <p className="text-muted">
            Question {currentIndex + 1} of {normalizedQuestions.length}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="timer-display flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {formatTime(elapsedTime)}
          </div>
          <button
            onClick={onExit}
            className="btn-secondary text-sm"
            title="Esc"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar mb-8">
        <div
          className="progress-fill"
          style={{
            width: `${((currentIndex + 1) / normalizedQuestions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question */}
      <div className="app-frame p-8 mb-8">
        <div className="flex items-start gap-4 mb-6">
          <span className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-lg font-semibold text-accent shrink-0">
            {currentIndex + 1}
          </span>
          <div className="flex-1">
            <div className="text-xl text-foreground leading-relaxed">
              <MathText text={currentQuestion.text} />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-muted">
                {currentQuestion.topic}
              </span>
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
            <Keyboard className="w-4 h-4 text-accent" />
            <span className="text-muted">
              Shortcuts: A-D answer, T/F true-false, ←/→ navigate, 1-9 jump, Esc
              exit
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          title="Left Arrow"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          {normalizedQuestions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-3 h-3 rounded-full transition-all ${
                i === currentIndex
                  ? "bg-accent w-8"
                  : answers[normalizedQuestions[i].id]
                    ? "bg-accent/50"
                    : "bg-border"
              }`}
              title={`Question ${i + 1}`}
            />
          ))}
        </div>

        {currentIndex < normalizedQuestions.length - 1 ? (
          <button
            onClick={handleNext}
            className="btn-primary flex items-center gap-2"
            title="Right Arrow"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            className="btn-primary flex items-center gap-2"
            title="Right Arrow"
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
          {normalizedQuestions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                i === currentIndex
                  ? "bg-accent text-white"
                  : answers[q.id]
                    ? "bg-accent/20 text-accent"
                    : "bg-border/30 text-muted hover:bg-border/50"
              }`}
              title={i < 9 ? String(i + 1) : `Question ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
