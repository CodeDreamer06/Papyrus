export type QuestionType = 'MCQ' | 'Fill-in-the-blank' | 'Numerical';

export interface DiagramReference {
  pageNumber: number;
  boundingBox?: [number, number, number, number]; // Optional: [x1, y1, x2, y2]
}

export interface Question {
  questionText: string;
  type: QuestionType;
  options?: string[]; // Only for MCQ
  answer: string; // Correct answer
  topic?: string; // AI-guessed topic
  difficulty?: 'Easy' | 'Medium' | 'Hard'; // AI-guessed difficulty
  tags?: string[]; // Any other relevant tags
  diagram?: DiagramReference; // Reference to a diagram if present
}

export interface QuizData {
  questions: Question[];
  title?: string; // Optional: AI might guess a title for the paper
  extractedFrom: string; // Original PDF filename
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTakenSeconds: number;
  // TODO: Add more detailed results later (e.g., time taken, answers review)
} 