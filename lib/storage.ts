import type { Quiz, QuizSession } from "@/types";
import { formatAnswerValue, normalizeQuestion } from "@/lib/quiz-answer-utils";

const QUIZZES_KEY = "papyrus-quizzes";
const SESSIONS_KEY = "papyrus-sessions";

export function saveQuiz(quiz: Quiz): void {
  const quizzes = getQuizzes();
  const normalizedQuiz: Quiz = {
    ...quiz,
    questions: quiz.questions.map(normalizeQuestion),
  };
  const existingIndex = quizzes.findIndex((q) => q.id === normalizedQuiz.id);

  if (existingIndex >= 0) {
    quizzes[existingIndex] = normalizedQuiz;
  } else {
    quizzes.push(normalizedQuiz);
  }

  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
}

export function getQuizzes(): Quiz[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(QUIZZES_KEY);
  const quizzes = stored ? (JSON.parse(stored) as Quiz[]) : [];
  return quizzes.map((quiz) => ({
    ...quiz,
    questions: quiz.questions.map(normalizeQuestion),
  }));
}

export function getQuiz(id: string): Quiz | null {
  const quizzes = getQuizzes();
  return quizzes.find((q) => q.id === id) || null;
}

export function deleteQuiz(id: string): void {
  const quizzes = getQuizzes().filter((q) => q.id !== id);
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));

  // Also delete any sessions
  deleteSession(id);
}

export function saveSession(session: QuizSession): void {
  const sessions = getSessions();
  const existingIndex = sessions.findIndex((s) => s.quizId === session.quizId);

  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }

  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function getSessions(): QuizSession[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(SESSIONS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function getSession(quizId: string): QuizSession | null {
  const sessions = getSessions();
  return sessions.find((s) => s.quizId === quizId) || null;
}

export function deleteSession(quizId: string): void {
  const sessions = getSessions().filter((s) => s.quizId !== quizId);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function exportQuizAsJSON(quiz: Quiz): string {
  return JSON.stringify(quiz, null, 2);
}

export function exportQuizAsAnkiTSV(quiz: Quiz): string {
  const rows: string[] = [];

  for (const question of quiz.questions) {
    let front = question.text;
    let back = "";

    switch (question.type) {
      case "multiple_choice":
      case "multi_select":
        front +=
          "\n\n" +
          (question.options
            ?.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`)
            .join("\n") || "");
        back = formatAnswerValue(question.correctAnswer);
        break;
      case "true_false":
        back = question.correctAnswer === "true" ? "True" : "False";
        break;
      case "fill_in_blank":
        back = formatAnswerValue(question.correctAnswer);
        break;
      case "matching":
        back = formatAnswerValue(question.correctAnswer);
        break;
      case "ordering":
        back = formatAnswerValue(question.correctAnswer);
        break;
      default:
        back = formatAnswerValue(question.correctAnswer);
    }

    if (question.explanation) {
      back += `\n\nExplanation: ${question.explanation}`;
    }

    // Escape tabs and newlines for TSV
    const escapedFront = front.replace(/\t/g, " ").replace(/\n/g, "<br>");
    const escapedBack = back.replace(/\t/g, " ").replace(/\n/g, "<br>");

    rows.push(`${escapedFront}\t${escapedBack}\t${question.topic}`);
  }

  return `# Front\tBack\tTags\n${rows.join("\n")}`;
}
