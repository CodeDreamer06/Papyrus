"use client";

import { useEffect, useRef } from "react";
import type { Quiz, QuizSession } from "@/types";
import {
  Check,
  X,
  Trophy,
  Clock,
  Target,
  RotateCcw,
  Download,
} from "lucide-react";
import confetti from "canvas-confetti";
import { exportQuizAsJSON, exportQuizAsAnkiTSV } from "@/lib/storage";
import { MathText } from "@/components/math-text";
import {
  answersMatch,
  formatAnswerValue,
  normalizeQuestion,
} from "@/lib/quiz-answer-utils";

interface QuizResultsProps {
  quiz: Quiz;
  session: QuizSession;
  onRetry: () => void;
  onHome: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function QuizResults({
  quiz,
  session,
  onRetry,
  onHome,
}: QuizResultsProps) {
  const hasTriggeredConfetti = useRef(false);
  const normalizedQuestions = quiz.questions.map(normalizeQuestion);

  useEffect(() => {
    if (session.score && session.score >= 70 && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;

      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#cca133", "#ccad5c", "#8f7026"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#cca133", "#ccad5c", "#8f7026"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [session.score]);

  const correctCount = normalizedQuestions.filter((q) =>
    answersMatch(session.answers[q.id], q.correctAnswer, q.type),
  ).length;
  const totalPoints = normalizedQuestions.reduce(
    (sum, q) => sum + (q.points || 1),
    0,
  );
  const earnedPoints = normalizedQuestions.reduce((sum, q) => {
    return answersMatch(session.answers[q.id], q.correctAnswer, q.type)
      ? sum + (q.points || 1)
      : sum;
  }, 0);

  const handleExportJSON = () => {
    const blob = new Blob([exportQuizAsJSON(quiz)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quiz.title.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAnki = () => {
    const blob = new Blob([exportQuizAsAnkiTSV(quiz)], {
      type: "text/tab-separated-values",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quiz.title.replace(/\s+/g, "_")}_anki.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreMessage = () => {
    const score = session.score || 0;
    if (score >= 90) return { message: "Excellent!", color: "text-green-500" };
    if (score >= 70) return { message: "Great job!", color: "text-accent" };
    if (score >= 50)
      return { message: "Good effort!", color: "text-yellow-500" };
    return { message: "Keep practicing!", color: "text-orange-500" };
  };

  const scoreInfo = getScoreMessage();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Score Card */}
      <div className="app-frame p-8 text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
          <Trophy className="w-12 h-12 text-accent" />
        </div>

        <h2 className={`text-4xl font-bold mb-2 ${scoreInfo.color}`}>
          {session.score}%
        </h2>
        <p className="text-xl text-foreground mb-4">{scoreInfo.message}</p>

        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-6">
          <div className="p-4 rounded-xl bg-app-box">
            <Target className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold text-foreground">
              {correctCount}/{normalizedQuestions.length}
            </p>
            <p className="text-xs text-muted">Correct</p>
          </div>
          <div className="p-4 rounded-xl bg-app-box">
            <Check className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-foreground">
              {earnedPoints}/{totalPoints}
            </p>
            <p className="text-xs text-muted">Points</p>
          </div>
          <div className="p-4 rounded-xl bg-app-box">
            <Clock className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold text-foreground">
              {formatTime(session.elapsedTime)}
            </p>
            <p className="text-xs text-muted">Time</p>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <button
            type="button"
            onClick={onRetry}
            className="btn-primary flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Retake Quiz
          </button>
          <button type="button" onClick={onHome} className="btn-secondary">
            Back to Home
          </button>
        </div>
      </div>

      {/* Export Options */}
      <div className="app-frame p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Export Quiz
        </h3>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleExportJSON}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export as JSON
          </button>
          <button
            type="button"
            onClick={handleExportAnki}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export for Anki (TSV)
          </button>
        </div>
      </div>

      {/* Question Review */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Question Review
        </h3>

        {normalizedQuestions.map((question, index) => {
          const userAnswer = session.answers[question.id];
          const isCorrect = answersMatch(
            userAnswer,
            question.correctAnswer,
            question.type,
          );
          const isUnanswered = userAnswer === undefined;

          return (
            <div
              key={question.id}
              className={`app-frame p-6 border-l-4 ${
                isUnanswered
                  ? "border-l-gray-500"
                  : isCorrect
                    ? "border-l-green-500"
                    : "border-l-red-500"
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="w-8 h-8 rounded-lg bg-app-box flex items-center justify-center text-sm font-medium text-muted shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="text-foreground">
                      <MathText text={question.text} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted">
                        {question.topic}
                      </span>
                      <span className="text-xs text-muted">•</span>
                      <span className="text-xs text-muted">
                        {question.points || 1} pts
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* User Answer */}
                    <div
                      className={`p-4 rounded-xl ${
                        isUnanswered
                          ? "bg-gray-500/10"
                          : isCorrect
                            ? "bg-green-500/10"
                            : "bg-red-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {isUnanswered ? (
                          <span className="text-xs text-gray-500 uppercase tracking-wider">
                            Not Answered
                          </span>
                        ) : isCorrect ? (
                          <>
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-500 uppercase tracking-wider">
                              Your Answer
                            </span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-500 uppercase tracking-wider">
                              Your Answer
                            </span>
                          </>
                        )}
                      </div>
                      <p
                        className={`font-medium ${
                          isUnanswered
                            ? "text-gray-400"
                            : isCorrect
                              ? "text-green-400"
                              : "text-red-400"
                        }`}
                      >
                        <MathText
                          text={
                            isUnanswered ? "—" : formatAnswerValue(userAnswer)
                          }
                        />
                      </p>
                    </div>

                    {/* Correct Answer */}
                    {!isCorrect && (
                      <div className="p-4 rounded-xl bg-green-500/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-500 uppercase tracking-wider">
                            Correct Answer
                          </span>
                        </div>
                        <p className="font-medium text-green-400">
                          <MathText
                            text={formatAnswerValue(question.correctAnswer)}
                          />
                        </p>
                      </div>
                    )}
                  </div>

                  {question.explanation && (
                    <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                      <p className="text-sm text-muted">
                        <span className="text-accent font-medium">
                          Explanation:{" "}
                        </span>
                        <MathText text={question.explanation} />
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
