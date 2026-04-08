import type { LLMConfig, PDFPage, BatchResult, Question } from '@/types';

// Round-robin key rotation
class KeyRotator {
  private keys: string[];
  private currentIndex: number = 0;

  constructor(keys: string[]) {
    this.keys = keys.filter(k => k && k.trim());
    if (this.keys.length === 0) {
      throw new Error('No valid API keys provided');
    }
  }

  getNextKey(): string {
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  }

  getAllKeys(): string[] {
    return this.keys;
  }
}

// Retry logic with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// OpenAI API response types
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class LLMClient {
  private keyRotator: KeyRotator;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.keyRotator = new KeyRotator(config.apiKeys);
  }

  private async makeRequest(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator. Generate quiz questions based on provided content. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} - ${error}`);
    }

    const data = await response.json() as OpenAIResponse;
    return data.choices[0]?.message?.content || '';
  }

  async generateQuestions(
    pages: PDFPage[],
    existingTopics: string[] = []
  ): Promise<BatchResult> {
    const apiKey = this.keyRotator.getNextKey();
    
    const pagesText = pages.map(p => 
      `--- Page ${p.pageNumber} ---\n${p.text}`
    ).join('\n\n');

    const prompt = `Analyze the following pages from a PDF and generate educational quiz questions.

Content:
${pagesText}

${existingTopics.length > 0 ? `Existing topics to avoid duplicating: ${existingTopics.join(', ')}` : ''}

Generate a diverse set of questions covering different question types and difficulty levels.
Include questions that test understanding, application, and analysis of the content.

Requirements:
1. Include at least one question per major concept
2. Use LaTeX formatting ($...$ or $$...$$) for any mathematical expressions
3. Ensure questions are clear and unambiguous
4. Provide detailed explanations for correct answers
5. Assign appropriate difficulty levels (easy/medium/hard) based on cognitive complexity
6. Assign points based on difficulty (easy=1, medium=2, hard=3)

Available question types:
- multiple_choice: 4 options with 1 correct answer
- true_false: Simple true/false statement
- short_answer: Brief text answer (1-2 sentences)
- fill_in_blank: Sentence with ____ for missing word/phrase
- matching: Pairs of items to match (provide in options as "A: item1, B: item2, etc.")
- ordering: Sequence to arrange correctly
- multi_select: Multiple correct answers (provide array in correctAnswer)

Return ONLY a JSON object in this exact format:
{
  "questions": [
    {
      "id": "unique-id",
      "type": "multiple_choice",
      "text": "Question text with $LaTeX$ if needed",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "option1",
      "explanation": "Why this is correct",
      "topic": "Topic name",
      "difficulty": "easy|medium|hard",
      "points": 1,
      "latex": false
    }
  ],
  "topics": ["Topic1", "Topic2"]
}`;

    return withRetry(async () => {
      const content = await this.makeRequest(apiKey, prompt);
      const result = JSON.parse(content) as BatchResult;
      
      // Validate and fix questions
      const timestamp = Date.now();
      const questions = (result.questions || []).map((q, i) => ({
        ...q,
        id: q.id || `q-${timestamp}-${pages[0]?.pageNumber || 0}-${i}`,
        points: q.points || (q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 2 : 3),
      }));

      return {
        questions,
        topics: result.topics || [],
      };
    }, this.config.maxRetries);
  }

  async detectVisionNeeds(page: PDFPage): Promise<boolean> {
    // Simple heuristic: if page has images or very little extractable text
    if (page.hasImages && page.text.length < 500) {
      return true;
    }
    
    // Check for patterns that suggest diagrams, charts, or complex layouts
    const visualIndicators = [
      /figure\s+\d+/i,
      /table\s+\d+/i,
      /diagram/i,
      /chart/i,
      /graph/i,
      /image/i,
      /\[image\]/i,
      /\[figure\]/i,
    ];
    
    const hasVisualIndicators = visualIndicators.some(pattern => 
      pattern.test(page.text)
    );
    
    return hasVisualIndicators || page.needsVision;
  }

  static fromEnv(): LLMClient {
    const apiKeys = process.env.LLM_API_KEYS?.split(',').map(k => k.trim()) || [];
    const baseUrl = process.env.LLM_API_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.LLM_MODEL || 'gpt-4o-mini';
    const maxRetries = parseInt(process.env.LLM_MAX_RETRIES || '3', 10);
    const timeout = parseInt(process.env.LLM_TIMEOUT || '60000', 10);
    const batchSize = parseInt(process.env.PDF_BATCH_SIZE || '5', 10);

    if (apiKeys.length === 0) {
      throw new Error('LLM_API_KEYS environment variable is required');
    }

    return new LLMClient({
      apiKeys,
      baseUrl,
      model,
      maxRetries,
      timeout,
      batchSize,
    });
  }
}
