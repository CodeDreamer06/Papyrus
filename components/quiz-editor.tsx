"use client";

import { useEffect, useState } from "react";
import type { Quiz, Question, QuestionType, DifficultyLevel } from "@/types";
import { Trash2, Plus, ChevronDown, ChevronUp, Save } from "lucide-react";
import { MathText } from "@/components/math-text";
import {
  formatAnswerValue,
  normalizeQuestion,
  parseMatchingAnswer,
  parseOrderingAnswer,
} from "@/lib/quiz-answer-utils";

interface QuizEditorProps {
  quiz: Quiz;
  onSave: (quiz: Quiz) => void;
}

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "multi_select", label: "Multi Select" },
  { value: "true_false", label: "True/False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "fill_in_blank", label: "Fill in Blank" },
  { value: "matching", label: "Matching" },
  { value: "ordering", label: "Ordering" },
];

const difficultyLevels: { value: DifficultyLevel; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function QuizEditor({ quiz, onSave }: QuizEditorProps) {
  const [editedQuiz, setEditedQuiz] = useState<Quiz>({
    ...quiz,
    questions: quiz.questions.map(normalizeQuestion),
  });
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const updateQuizField = (field: keyof Quiz, value: string) => {
    setEditedQuiz((prev) => ({ ...prev, [field]: value }));
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setEditedQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q,
      ),
    }));
  };

  const deleteQuestion = (questionId: string) => {
    setEditedQuiz((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== questionId),
    }));
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type: "multiple_choice",
      text: "New question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: "Option A",
      topic: "General",
      difficulty: "medium",
      points: 1,
      latex: false,
    };
    setEditedQuiz((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
    setExpandedQuestion(newQuestion.id);
  };

  const handleSave = () => {
    onSave({
      ...editedQuiz,
      questions: editedQuiz.questions.map(normalizeQuestion),
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
        return;
      }

      if (isTyping) {
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        addQuestion();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editedQuiz]);

  const updateOption = (questionId: string, index: number, value: string) => {
    const question = editedQuiz.questions.find((q) => q.id === questionId);
    if (!question) return;

    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    updateQuestion(questionId, { options: newOptions });
  };

  const addOption = (questionId: string) => {
    const question = editedQuiz.questions.find((q) => q.id === questionId);
    if (!question) return;

    const newOptions = [
      ...(question.options || []),
      `Option ${String.fromCharCode(65 + (question.options?.length || 0))}`,
    ];
    updateQuestion(questionId, { options: newOptions });
  };

  const removeOption = (questionId: string, index: number) => {
    const question = editedQuiz.questions.find((q) => q.id === questionId);
    if (!question || !question.options || question.options.length <= 2) return;

    const newOptions = question.options.filter((_, i) => i !== index);
    updateQuestion(questionId, { options: newOptions });
  };

  const renderLatexPreview = (text: string) => {
    if (text.includes("$")) {
      return (
        <div className="mt-2 p-3 rounded-lg bg-border/30 text-sm">
          <span className="text-muted">Preview: </span>
          <span className="text-foreground">
            <MathText text={text} />
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Quiz Info */}
      <div className="app-frame p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Quiz Title
          </label>
          <input
            type="text"
            value={editedQuiz.title}
            onChange={(e) => updateQuizField("title", e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Description
          </label>
          <textarea
            value={editedQuiz.description}
            onChange={(e) => updateQuizField("description", e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors resize-none"
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Questions ({editedQuiz.questions.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={addQuestion}
              className="btn-secondary flex items-center gap-2"
              title="N"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex items-center gap-2"
              title="Ctrl/Cmd+S"
            >
              <Save className="w-4 h-4" />
              Save Quiz
            </button>
          </div>
        </div>

        {editedQuiz.questions.map((question, index) => (
          <div key={question.id} className="app-frame overflow-hidden">
            {/* Question Header */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-border/20 transition-colors"
              onClick={() =>
                setExpandedQuestion(
                  expandedQuestion === question.id ? null : question.id,
                )
              }
            >
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-sm font-medium text-accent">
                  {index + 1}
                </span>
                <div>
                  <div className="font-medium text-foreground line-clamp-1">
                    <MathText text={question.text} />
                  </div>
                  <p className="text-sm text-muted">
                    {
                      questionTypes.find((t) => t.value === question.type)
                        ?.label
                    }{" "}
                    • {question.topic} • {question.difficulty}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteQuestion(question.id);
                  }}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedQuestion === question.id ? (
                  <ChevronUp className="w-5 h-5 text-muted" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted" />
                )}
              </div>
            </div>

            {/* Expanded Question Editor */}
            {expandedQuestion === question.id && (
              <div className="p-4 pt-0 space-y-4 border-t border-border">
                {/* Question Text */}
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Question Text (supports LaTeX: $...$ or $$...$$)
                  </label>
                  <textarea
                    value={question.text}
                    onChange={(e) =>
                      updateQuestion(question.id, {
                        text: e.target.value,
                        latex: e.target.value.includes("$"),
                      })
                    }
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors resize-none"
                  />
                  {renderLatexPreview(question.text)}
                </div>

                {/* Type & Difficulty */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">
                      Type
                    </label>
                    <select
                      value={question.type}
                      onChange={(e) =>
                        updateQuestion(question.id, {
                          type: e.target.value as QuestionType,
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors"
                    >
                      {questionTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">
                      Topic
                    </label>
                    <input
                      type="text"
                      value={question.topic}
                      onChange={(e) =>
                        updateQuestion(question.id, { topic: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">
                      Difficulty
                    </label>
                    <select
                      value={question.difficulty}
                      onChange={(e) =>
                        updateQuestion(question.id, {
                          difficulty: e.target.value as DifficultyLevel,
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors"
                    >
                      {difficultyLevels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Options (for MCQ types) */}
                {(question.type === "multiple_choice" ||
                  question.type === "multi_select") && (
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">
                      Options
                    </label>
                    <div className="space-y-2">
                      {question.options?.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <span className="w-8 text-center text-muted font-medium">
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) =>
                              updateOption(
                                question.id,
                                optIndex,
                                e.target.value,
                              )
                            }
                            className="flex-1 px-4 py-2 rounded-lg bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors"
                          />
                          <button
                            onClick={() => removeOption(question.id, optIndex)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-500 transition-colors"
                            disabled={(question.options?.length || 0) <= 2}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addOption(question.id)}
                        className="btn-secondary text-sm py-2"
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Add Option
                      </button>
                    </div>
                  </div>
                )}

                {/* Correct Answer */}
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Correct Answer{" "}
                    {question.type === "multi_select" &&
                      "(comma-separated for multiple)"}
                  </label>
                  {question.type === "multi_select" ? (
                    <input
                      type="text"
                      value={
                        Array.isArray(question.correctAnswer)
                          ? question.correctAnswer.join(", ")
                          : formatAnswerValue(question.correctAnswer)
                      }
                      onChange={(e) =>
                        updateQuestion(question.id, {
                          correctAnswer: e.target.value
                            .split(",")
                            .map((s) => s.trim()),
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors"
                      placeholder="Option A, Option C, Option D"
                    />
                  ) : question.type === "true_false" ? (
                    <select
                      value={question.correctAnswer as string}
                      onChange={(e) =>
                        updateQuestion(question.id, {
                          correctAnswer: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors"
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : question.type === "multiple_choice" ? (
                    <select
                      value={question.correctAnswer as string}
                      onChange={(e) =>
                        updateQuestion(question.id, {
                          correctAnswer: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors"
                    >
                      {question.options?.map((opt, i) => (
                        <option key={i} value={opt}>
                          {String.fromCharCode(65 + i)}. {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formatAnswerValue(question.correctAnswer)}
                      onChange={(e) =>
                        updateQuestion(question.id, {
                          correctAnswer:
                            question.type === "matching"
                              ? parseMatchingAnswer(e.target.value)
                              : question.type === "ordering"
                                ? parseOrderingAnswer(e.target.value)
                                : e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors"
                    />
                  )}
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Explanation (Optional)
                  </label>
                  <textarea
                    value={question.explanation || ""}
                    onChange={(e) =>
                      updateQuestion(question.id, {
                        explanation: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors resize-none"
                    placeholder="Explain why this is the correct answer..."
                  />
                </div>

                {/* Points */}
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Points
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={question.points}
                    onChange={(e) =>
                      updateQuestion(question.id, {
                        points: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-24 px-4 py-3 rounded-xl bg-app-box border border-border text-foreground focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {editedQuiz.questions.length === 0 && (
        <div className="text-center py-12 app-frame">
          <p className="text-muted">
            No questions yet. Click "Add Question" to create your first
            question.
          </p>
        </div>
      )}
    </div>
  );
}
