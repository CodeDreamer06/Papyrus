'use client';

import { useEffect, useState } from 'react';
import { FileUpload } from '@/components/file-upload';
import { ProcessingIndicator } from '@/components/processing-indicator';
import { QuizEditor } from '@/components/quiz-editor';
import { QuizInterface } from '@/components/quiz-interface';
import { QuizResults } from '@/components/quiz-results';
import { saveQuiz, getQuizzes, deleteQuiz, getSession } from '@/lib/storage';
import type { Quiz, ProcessingState, QuizSession } from '@/types';
import { Sun, Moon, FileText, Edit, Play, Trash2, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

type ViewMode = 'home' | 'processing' | 'editor' | 'quiz' | 'results';

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<ViewMode>('home');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentSession, setCurrentSession] = useState<QuizSession | null>(null);
  const [savedQuizzes, setSavedQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved quizzes on mount.
  useEffect(() => {
    setSavedQuizzes(getQuizzes());
  }, []);

  const refreshQuizzes = () => {
    setSavedQuizzes(getQuizzes());
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleProcessPDF = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setView('processing');
    setProcessingState({
      totalPages: 0,
      currentPage: 0,
      stages: [
        { name: 'text_extraction', status: 'processing', progress: 0, message: 'Uploading and extracting text from PDF' },
        { name: 'vision_detection', status: 'pending', progress: 0, message: 'Analyzing page complexity' },
        { name: 'question_generation', status: 'pending', progress: 0, message: 'Generating questions with AI' },
        { name: 'validation', status: 'pending', progress: 0, message: 'Validating and organizing quiz' },
      ],
      isComplete: false,
    });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', selectedFile.name.replace(/\.pdf$/i, ''));

      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process PDF');
      }

      const data = await response.json();
      const quiz = data.quiz as Quiz;

      setCurrentQuiz(quiz);
      saveQuiz(quiz);
      refreshQuizzes();
      setView('editor');
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('Error processing PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setView('home');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuiz = (quiz: Quiz) => {
    saveQuiz(quiz);
    setCurrentQuiz(quiz);
    refreshQuizzes();
    alert('Quiz saved successfully!');
  };

  const handleStartQuiz = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    const savedSession = getSession(quiz.id);
    if (savedSession && !savedSession.isComplete && savedSession.currentQuestionIndex > 0) {
      if (confirm('You have a saved session. Continue from where you left off?')) {
        setCurrentSession(savedSession);
      } else {
        setCurrentSession(null);
      }
    } else {
      setCurrentSession(null);
    }
    setView('quiz');
  };

  const handleQuizComplete = (session: QuizSession) => {
    setCurrentSession(session);
    setView('results');
  };

  const handleDeleteQuiz = (quizId: string) => {
    if (confirm('Are you sure you want to delete this quiz?')) {
      deleteQuiz(quizId);
      refreshQuizzes();
    }
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setView('editor');
  };

  const handleRetryQuiz = () => {
    if (currentQuiz) {
      setCurrentSession(null);
      setView('quiz');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Papyrus AI</h1>
              <p className="text-xs text-muted">Interactive Quiz Generator</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-border/50 transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-muted" />
              ) : (
                <Moon className="w-5 h-5 text-muted" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        {view === 'home' && (
          <div className="space-y-12">
            {/* Hero Section */}
            <section className="text-center space-y-6 py-12">
              <h2 className="text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
                Transform PDFs into <span className="text-accent">Interactive Quizzes</span>
              </h2>
              <p className="text-xl text-muted max-w-2xl mx-auto">
                Upload your study materials and let AI generate intelligent questions. 
                Practice, learn, and master any subject with personalized quizzes.
              </p>
              
              {/* Upload Section */}
              <div className="max-w-2xl mx-auto pt-8">
                <FileUpload onFileSelect={handleFileSelect} />
                
                {selectedFile && (
                  <div className="mt-6 flex justify-center gap-4">
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="btn-secondary"
                    >
                      Change File
                    </button>
                    <button
                      onClick={handleProcessPDF}
                      disabled={isLoading}
                      className="btn-primary"
                    >
                      {isLoading ? 'Processing...' : 'Generate Quiz'}
                    </button>
                  </div>
                )}
              </div>

              <p className="handwritten mt-4">try me!</p>
            </section>

            {/* Saved Quizzes */}
            {savedQuizzes.length > 0 && (
              <section>
                <h3 className="text-2xl font-semibold text-foreground mb-6">Your Quizzes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="voice-card group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditQuiz(quiz)}
                            className="p-2 rounded-lg hover:bg-border/50 text-muted"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuiz(quiz.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-semibold text-foreground mb-2 line-clamp-1">
                        {quiz.title}
                      </h4>
                      <p className="text-sm text-muted mb-4 line-clamp-2">
                        {quiz.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted mb-4">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {quiz.questions.length} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(quiz.createdAt)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {quiz.topics.slice(0, 3).map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-1 rounded-full text-xs bg-border/30 text-muted"
                          >
                            {topic}
                          </span>
                        ))}
                        {quiz.topics.length > 3 && (
                          <span className="px-2 py-1 rounded-full text-xs bg-border/30 text-muted">
                            +{quiz.topics.length - 3}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleStartQuiz(quiz)}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start Quiz
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {view === 'processing' && processingState && (
          <div className="max-w-2xl mx-auto py-12">
            <ProcessingIndicator state={processingState} />
          </div>
        )}

        {view === 'editor' && currentQuiz && (
          <div className="max-w-4xl mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setView('home')}
                className="btn-secondary"
              >
                ← Back to Home
              </button>
            </div>
            <QuizEditor quiz={currentQuiz} onSave={handleSaveQuiz} />
          </div>
        )}

        {view === 'quiz' && currentQuiz && (
          <div className="py-8">
            <QuizInterface
              quiz={currentQuiz}
              onComplete={handleQuizComplete}
              onExit={() => {
                if (confirm('Your progress will be saved. Exit anyway?')) {
                  setView('home');
                }
              }}
            />
          </div>
        )}

        {view === 'results' && currentQuiz && currentSession && (
          <div className="py-8">
            <QuizResults
              quiz={currentQuiz}
              session={currentSession}
              onRetry={handleRetryQuiz}
              onHome={() => setView('home')}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-muted">
            Papyrus AI - Transform your study materials into interactive quizzes
          </p>
        </div>
      </footer>
    </div>
  );
}
