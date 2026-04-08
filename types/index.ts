export type QuestionType = 
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'fill_in_blank'
  | 'matching'
  | 'ordering'
  | 'multi_select';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  topic: string;
  difficulty: DifficultyLevel;
  points: number;
  latex?: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  sourcePdf: string;
  questions: Question[];
  createdAt: number;
  totalPoints: number;
  topics: string[];
}

export interface QuizSession {
  quizId: string;
  currentQuestionIndex: number;
  answers: Record<string, string | string[]>;
  startTime: number;
  elapsedTime: number;
  isComplete: boolean;
  score?: number;
}

export interface ProcessingStage {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
}

export interface ProcessingState {
  totalPages: number;
  currentPage: number;
  stages: ProcessingStage[];
  isComplete: boolean;
  error?: string;
}

export interface LLMConfig {
  apiKeys: string[];
  baseUrl: string;
  model: string;
  maxRetries: number;
  timeout: number;
  batchSize: number;
}

export interface PDFPage {
  pageNumber: number;
  text: string;
  hasImages: boolean;
  needsVision: boolean;
  imageData?: string[];
}

export interface BatchResult {
  questions: Question[];
  topics: string[];
}
