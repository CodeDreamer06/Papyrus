import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'; // Import persist middleware
import { QuizData, Question, QuizResult, QuestionType } from '@/types/quiz';

// Filter types are defined locally now
export interface FilterOptions {
  types: QuestionType[];
  difficulties: ('Easy' | 'Medium' | 'Hard')[];
  topics: string[];
}
export interface SelectedFilters {
  types: QuestionType[];
  difficulties: ('Easy' | 'Medium' | 'Hard')[];
  topics: string[];
}

// Interface for stored attempt history item
export interface AttemptHistoryItem {
  timestamp: number;
  quizTitle: string; // From QuizData.title or filename
  result: QuizResult;
  // Optional: could store userAnswers or even full quizData if needed for review
}

interface QuizState {
  rawQuizData: QuizData | null; // Store the unfiltered data from AI
  quizData: QuizData | null; // Store the filtered data for the quiz
  pdfFile: File | null;
  userAnswers: { [key: number]: string };
  results: QuizResult | null;
  availableFilters: FilterOptions | null; // Available options based on raw data
  selectedFilters: SelectedFilters | null; // User's filter selections
  startTime: number | null; // Timestamp when quiz started
  endTime: number | null;   // Timestamp when quiz ended
  attemptHistory: AttemptHistoryItem[]; // Store past results
  setRawQuiz: (data: QuizData, file: File) => void; // Renamed from setQuiz
  setSelectedFilters: (filters: SelectedFilters) => void; // Action to update selections
  applyFiltersAndSetQuiz: () => void; // Action to apply filters and update quizData
  startQuizTimer: () => void; // Action to record start time
  setUserAnswer: (questionIndex: number, answer: string) => void;
  submitQuiz: () => void;
  clearQuiz: () => void;
  updateQuestion: (index: number, updatedQuestion: Question) => void; // New action
  clearHistory: () => void; // Action to clear history
}

// Helper to extract unique filter options from questions
const getAvailableFilters = (questions: Question[]): FilterOptions => {
  const types = new Set<QuestionType>();
  const difficulties = new Set<'Easy' | 'Medium' | 'Hard'>();
  const topics = new Set<string>();

  questions.forEach(q => {
    types.add(q.type);
    if (q.difficulty) difficulties.add(q.difficulty);
    if (q.topic) topics.add(q.topic);
  });

  return {
    types: Array.from(types),
    difficulties: Array.from(difficulties),
    topics: Array.from(topics).sort(),
  };
};

// Helper function for filtering questions
const filterQuestions = (questions: Question[], filters: SelectedFilters): Question[] => {
  return questions.filter(q => 
    (filters.types.length === 0 || filters.types.includes(q.type)) &&
    (filters.difficulties.length === 0 || (q.difficulty && filters.difficulties.includes(q.difficulty))) &&
    (filters.topics.length === 0 || (q.topic && filters.topics.includes(q.topic)))
  );
};

// Helper function for basic answer comparison (case-insensitive, trims whitespace)
const compareAnswers = (userAnswer: string = '', correctAnswer: string = '') => {
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
};

// Wrap the store creation with persist middleware
export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      rawQuizData: null,
      quizData: null,
      pdfFile: null,
      userAnswers: {},
      results: null,
      availableFilters: null,
      selectedFilters: null,
      startTime: null,
      endTime: null,
      attemptHistory: [], // Initialize history

      // Called when AI processing is done
      setRawQuiz: (data, file) => {
        const availableFilters = getAvailableFilters(data.questions);
        // Initialize selected filters to include everything by default
        const initialFilters: SelectedFilters = {
          types: [...availableFilters.types],
          difficulties: [...availableFilters.difficulties],
          topics: [...availableFilters.topics],
        };
        set({
          rawQuizData: data,
          pdfFile: file,
          availableFilters,
          selectedFilters: initialFilters,
          quizData: data, // Initially, show all questions
          userAnswers: {}, 
          results: null, 
          startTime: null, // Reset timer state
          endTime: null
        });
      },

      // Called when user changes filter selections
      setSelectedFilters: (filters) => {
        set({ selectedFilters: filters });
        // Optionally, could apply filters immediately here, or wait for explicit action
        // get().applyFiltersAndSetQuiz(); // Example: Apply immediately
      },
      
      // Called before starting the quiz (e.g., after user confirms filters)
      applyFiltersAndSetQuiz: () => {
        const { rawQuizData, selectedFilters } = get();
        if (!rawQuizData || !selectedFilters) return;

        const filteredQuestions = filterQuestions(rawQuizData.questions, selectedFilters);
        // When applying filters, also update available filters based on the *original* raw data
        const availableFilters = getAvailableFilters(rawQuizData.questions);
        set({ 
            quizData: { ...rawQuizData, questions: filteredQuestions },
            availableFilters, // Ensure available filters are based on raw data
            userAnswers: {}, 
            results: null,
            startTime: null,
            endTime: null
        });
        // Timer should be started when the quiz page mounts or user clicks start
      },

      // Action to start the timer
      startQuizTimer: () => {
        // Only start if not already started and quiz data is present
        if (!get().startTime && get().quizData) {
            set({ startTime: Date.now(), endTime: null });
            console.log("Quiz timer started");
        }
      },

      setUserAnswer: (questionIndex, answer) => {
        // Ensure timer starts when the first answer is given if not already started
        if (!get().startTime) {
            get().startQuizTimer(); 
        }
        set((state) => ({
            userAnswers: { ...state.userAnswers, [questionIndex]: answer },
        }));
      },
      
      submitQuiz: () => {
        const { quizData, userAnswers, startTime, rawQuizData } = get();
        if (!quizData || !rawQuizData) return;

        const endTime = Date.now();
        const timeTakenSeconds = startTime ? Math.round((endTime - startTime) / 1000) : 0;
        let score = 0;
        const totalQuestions = quizData.questions.length;
        quizData.questions.forEach((question, index) => {
          if (compareAnswers(userAnswers[index], question.answer)) {
            score++;
          }
        });
        const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
        const currentResult: QuizResult = { score, totalQuestions, percentage, timeTakenSeconds };

        // Create history item
        const historyItem: AttemptHistoryItem = {
          timestamp: endTime,
          quizTitle: rawQuizData.title || rawQuizData.extractedFrom,
          result: currentResult,
        };

        // Add to history and store results
        set((state) => ({ 
          results: currentResult, 
          endTime, 
          attemptHistory: [historyItem, ...state.attemptHistory] // Prepend to history
        }));
        console.log("Quiz results calculated and stored:", currentResult);
        console.log("Attempt added to history.");
      },

      // New action to update a question in rawQuizData
      updateQuestion: (index, updatedQuestion) => {
        set((state) => {
          if (!state.rawQuizData) return {}; // Should not happen
          const updatedQuestions = [...state.rawQuizData.questions];
          if (index >= 0 && index < updatedQuestions.length) {
            updatedQuestions[index] = updatedQuestion;
            // Re-calculate available filters after update
            const availableFilters = getAvailableFilters(updatedQuestions);
            // Reset selected filters to include everything from new available filters
            const selectedFilters: SelectedFilters = {
                types: [...availableFilters.types],
                difficulties: [...availableFilters.difficulties],
                topics: [...availableFilters.topics],
            };
            return {
              rawQuizData: { ...state.rawQuizData, questions: updatedQuestions },
              availableFilters,
              selectedFilters,
              // Also update quizData immediately to reflect changes before re-filtering
              quizData: { ...state.rawQuizData, questions: updatedQuestions }
            };
          }
          return {}; // No change if index is out of bounds
        });
      },

      clearHistory: () => set({ attemptHistory: [] }), // Clear history action

      // Update clearQuiz to NOT clear history by default
      clearQuiz: () => set({ 
        rawQuizData: null, 
        quizData: null, 
        pdfFile: null, 
        userAnswers: {}, 
        results: null, 
        availableFilters: null, 
        selectedFilters: null,
        startTime: null,
        endTime: null
        // attemptHistory is intentionally not cleared here
      }),
    }),
    {
      name: 'quiz-app-storage', // name of the item in localStorage
      storage: createJSONStorage(() => localStorage), // use localStorage
      partialize: (state) => ({ attemptHistory: state.attemptHistory }), // Only persist attemptHistory
    }
  )
); 