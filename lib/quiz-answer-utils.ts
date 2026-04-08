import type { AnswerValue, MatchingAnswer, Question } from "@/types";

export function isMatchingAnswer(value: unknown): value is MatchingAnswer {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function sortEntries(value: MatchingAnswer): [string, string][] {
  return Object.entries(value)
    .map(
      ([key, entry]) =>
        [normalizeText(key), normalizeText(String(entry))] as [string, string],
    )
    .sort(([left], [right]) => left.localeCompare(right));
}

export function parseMatchingAnswer(text: string): MatchingAnswer {
  return text
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce<MatchingAnswer>((acc, pair) => {
      const [left, ...rest] = pair.split(/[:=-]/);
      const key = left?.trim();
      const value = rest.join("-").trim();

      if (key && value) {
        acc[key] = value;
      }

      return acc;
    }, {});
}

export function parseOrderingAnswer(text: string): string[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeAnswerValue(
  value: AnswerValue | undefined,
  questionType?: Question["type"],
): AnswerValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (isMatchingAnswer(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [String(key).trim(), String(entry).trim()])
        .filter(([key, entry]) => key && entry),
    );
  }

  const text = String(value).trim();

  if (questionType === "matching") {
    return parseMatchingAnswer(text);
  }

  if (questionType === "ordering") {
    return parseOrderingAnswer(text);
  }

  return text;
}

export function formatAnswerValue(value: AnswerValue | undefined): string {
  if (value === undefined) {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (isMatchingAnswer(value)) {
    const pairs = Object.entries(value).map(
      ([key, entry]) => `${key} -> ${entry}`,
    );
    return pairs.length > 0 ? pairs.join(", ") : "—";
  }

  return String(value);
}

export function answersMatch(
  userAnswer: AnswerValue | undefined,
  correctAnswer: AnswerValue,
  questionType?: Question["type"],
): boolean {
  const normalizedUser = normalizeAnswerValue(userAnswer, questionType);
  const normalizedCorrect = normalizeAnswerValue(correctAnswer, questionType);

  if (normalizedUser === undefined) {
    return false;
  }

  if (Array.isArray(normalizedCorrect)) {
    if (!Array.isArray(normalizedUser)) {
      return false;
    }

    const userValues = [...normalizedUser].map(normalizeText).sort();
    const correctValues = [...normalizedCorrect].map(normalizeText).sort();
    return JSON.stringify(userValues) === JSON.stringify(correctValues);
  }

  if (isMatchingAnswer(normalizedCorrect)) {
    if (!isMatchingAnswer(normalizedUser)) {
      return false;
    }

    return (
      JSON.stringify(sortEntries(normalizedUser)) ===
      JSON.stringify(sortEntries(normalizedCorrect))
    );
  }

  if (Array.isArray(normalizedUser) || isMatchingAnswer(normalizedUser)) {
    return false;
  }

  return (
    normalizeText(normalizedUser) === normalizeText(String(normalizedCorrect))
  );
}

export function normalizeQuestion(question: Question): Question {
  const normalizedText = question.text.trim();

  return {
    ...question,
    text: normalizedText,
    explanation: question.explanation?.trim() || undefined,
    options: question.options?.map((option) => option.trim()),
    correctAnswer:
      normalizeAnswerValue(question.correctAnswer, question.type) ?? "",
    latex:
      question.latex ??
      /(?:\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\(|\\\[)/.test(normalizedText),
  };
}
