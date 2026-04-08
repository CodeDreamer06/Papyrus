import { NextRequest, NextResponse } from 'next/server';
import { PDFProcessor } from '@/lib/pdf-processor';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = (formData.get('title') as string) || 'Untitled Quiz';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get LLM config from environment variables (server-side only)
    const apiKeys = process.env.LLM_API_KEYS?.split(',').map(k => k.trim()).filter(Boolean) || [];
    
    if (apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'LLM_API_KEYS environment variable is not set' },
        { status: 500 }
      );
    }

    const config = {
      apiKeys,
      baseUrl: process.env.LLM_API_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '3', 10),
      timeout: parseInt(process.env.LLM_TIMEOUT || '60000', 10),
      batchSize: parseInt(process.env.PDF_BATCH_SIZE || '5', 10),
    };

    // Process PDF without progress callback (we'll handle progress differently if needed)
    const processor = new PDFProcessor(config);
    const quiz = await processor.processPDF(file, title);

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Error processing PDF:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
