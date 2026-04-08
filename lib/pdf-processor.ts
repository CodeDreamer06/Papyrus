import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PDFPage, ProcessingState, ProcessingStage, LLMConfig, Quiz, Question } from '@/types';
import { LLMClient } from './llm-client';

function getStandardFontDataUrl(): string {
  const fontsPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts');
  const fontsUrl = pathToFileURL(fontsPath).href;
  return fontsUrl.endsWith('/') ? fontsUrl : `${fontsUrl}/`;
}

function normalizePageText(text: string): string {
  const normalized = text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return normalized.trim();
}

function flushLine(lines: string[], parts: string[]): string[] {
  const line = parts.join('').replace(/[ \t]+/g, ' ').trim();

  if (line) {
    lines.push(line);
  }

  return [];
}

type PDFTextItem = {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
};

function extractTextFromItems(
  items: PDFTextItem[]
): string {
  const lines: string[] = [];
  let lineParts: string[] = [];
  let lastY: number | null = null;
  let lastX: number | null = null;

  for (const item of items) {
    if (typeof item.str !== 'string') {
      continue;
    }

    const rawText = item.str.replace(/\s+/g, ' ');
    const text = rawText.trim();
    const y: number = typeof item.transform?.[5] === 'number' ? item.transform[5] : (lastY ?? 0);
    const x: number = typeof item.transform?.[4] === 'number' ? item.transform[4] : (lastX ?? 0);

    if (lastY !== null && Math.abs(y - lastY) > 4) {
      lineParts = flushLine(lines, lineParts);
      lastX = null;
    }

    if (lineParts.length > 0 && text) {
      const gap = lastX === null ? 0 : x - lastX;
      const previous = lineParts[lineParts.length - 1] ?? '';

      if (gap > 3 && !previous.endsWith(' ') && !text.startsWith(' ')) {
        lineParts.push(' ');
      }
    }

    if (text) {
      lineParts.push(text);
    }

    lastY = y;
    lastX = x + (item.width ?? text.length);

    if (item.hasEOL) {
      lineParts = flushLine(lines, lineParts);
      lastX = null;
    }
  }

  flushLine(lines, lineParts);
  return normalizePageText(lines.join('\n'));
}

// Use PDF.js directly in Node mode to avoid worker/native binding issues from wrapper libraries.
export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ pages: string[]; numPages: number }> {
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableWorker: true,
    standardFontDataUrl: getStandardFontDataUrl(),
    useWorkerFetch: false,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  } as any);

  const document = await loadingTask.promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);

      try {
        const textContent = await page.getTextContent();
        const items: PDFTextItem[] = [];

        for (const item of textContent.items) {
          if ('str' in item) {
            items.push({
              str: item.str,
              hasEOL: item.hasEOL,
              transform: item.transform,
              width: item.width,
            });
          }
        }

        pages.push(extractTextFromItems(items));
      } finally {
        page.cleanup();
      }
    }

    return {
      pages,
      numPages: document.numPages,
    };
  } finally {
    await document.destroy();
  }
}

// Detect if page likely needs vision analysis
function detectVisionNeeds(pageText: string): boolean {
  const visualIndicators = [
    /figure\s+\d+/i,
    /table\s+\d+/i,
    /diagram/i,
    /chart/i,
    /graph/i,
    /\bimage\b/i,
    /\billustration\b/i,
  ];

  const compactText = pageText.replace(/\s+/g, '');
  const hasVeryLittleText = compactText.length < 40;
  const hasVisualIndicators = visualIndicators.some(pattern => pattern.test(pageText));

  return hasVisualIndicators || hasVeryLittleText;
}

export class PDFProcessor {
  private llmClient: LLMClient;
  private config: LLMConfig;
  private onProgress?: (state: ProcessingState) => void;

  constructor(config: LLMConfig, onProgress?: (state: ProcessingState) => void) {
    this.config = config;
    this.llmClient = new LLMClient(config);
    this.onProgress = onProgress;
  }

  private createInitialState(totalPages: number): ProcessingState {
    const stages: ProcessingStage[] = [
      { name: 'text_extraction', status: 'pending', progress: 0, message: 'Extracting text from PDF' },
      { name: 'vision_detection', status: 'pending', progress: 0, message: 'Analyzing page complexity' },
      { name: 'question_generation', status: 'pending', progress: 0, message: 'Generating questions with AI' },
      { name: 'validation', status: 'pending', progress: 0, message: 'Validating and organizing quiz' },
    ];

    return {
      totalPages,
      currentPage: 0,
      stages,
      isComplete: false,
    };
  }

  private updateState(state: ProcessingState, updates: Partial<ProcessingState>): ProcessingState {
    const newState = { ...state, ...updates };
    this.onProgress?.(newState);
    return newState;
  }

  private updateStage(
    state: ProcessingState,
    stageName: string,
    updates: Partial<ProcessingStage>
  ): ProcessingState {
    const newStages = state.stages.map(s =>
      s.name === stageName ? { ...s, ...updates } : s
    );
    return this.updateState(state, { stages: newStages });
  }

  async processPDF(
    file: File,
    title: string = 'Untitled Quiz'
  ): Promise<Quiz> {
    const arrayBuffer = await file.arrayBuffer();

    let state = this.createInitialState(0);
    state = this.updateStage(state, 'text_extraction', { status: 'processing', progress: 50 });

    const { pages: textPages, numPages } = await extractTextFromPDF(arrayBuffer);
    state = this.updateState(state, { totalPages: numPages });

    const pages: PDFPage[] = [];
    for (let i = 0; i < numPages; i++) {
      pages.push({
        pageNumber: i + 1,
        text: textPages[i] || '',
        hasImages: false,
        needsVision: false,
      });
    }

    state = this.updateStage(state, 'text_extraction', { status: 'completed', progress: 100 });
    state = this.updateState(state, { currentPage: pages.length > 0 ? 1 : 0 });

    state = this.updateStage(state, 'vision_detection', { status: 'processing', progress: 0 });

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      page.needsVision = detectVisionNeeds(page.text);

      const progress = Math.round(((i + 1) / Math.max(pages.length, 1)) * 100);
      state = this.updateStage(state, 'vision_detection', { progress });
    }

    state = this.updateStage(state, 'vision_detection', { status: 'completed', progress: 100 });

    state = this.updateStage(state, 'question_generation', { status: 'processing', progress: 0 });

    const allQuestions: Question[] = [];
    const allTopics: string[] = [];
    const batchSize = Math.max(this.config.batchSize, 1);
    const pagesNeedingVision = pages.filter(page => page.needsVision).length;

    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      const batchResult = await this.llmClient.generateQuestions(batch, allTopics);

      allQuestions.push(...batchResult.questions);

      for (const topic of batchResult.topics) {
        if (!allTopics.includes(topic)) {
          allTopics.push(topic);
        }
      }

      const progress = Math.round((Math.min(i + batch.length, pages.length) / Math.max(pages.length, 1)) * 100);
      state = this.updateStage(state, 'question_generation', {
        progress,
        message: `Generating questions (batch ${Math.floor(i / batchSize) + 1})`,
      });
      state = this.updateState(state, { currentPage: batch[batch.length - 1]?.pageNumber || 0 });
    }

    if (pagesNeedingVision > 0) {
      state = this.updateStage(state, 'question_generation', {
        message: `Generated from extracted text; ${pagesNeedingVision} page(s) may contain diagrams or complex layouts`,
      });
    }

    state = this.updateStage(state, 'question_generation', { status: 'completed', progress: 100 });

    state = this.updateStage(state, 'validation', { status: 'processing', progress: 50 });

    const uniqueQuestions = this.deduplicateQuestions(allQuestions);
    const totalPoints = uniqueQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

    state = this.updateStage(state, 'validation', { status: 'completed', progress: 100 });
    state = this.updateState(state, { isComplete: true });

    return {
      id: `quiz-${Date.now()}`,
      title,
      description: `Quiz generated from ${file.name}`,
      sourcePdf: file.name,
      questions: uniqueQuestions,
      createdAt: Date.now(),
      totalPoints,
      topics: allTopics,
    };
  }

  private deduplicateQuestions(questions: Question[]): Question[] {
    const seen = new Set<string>();
    const unique: Question[] = [];

    for (const question of questions) {
      const key = question.text.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(question);
      }
    }

    return unique;
  }
}
