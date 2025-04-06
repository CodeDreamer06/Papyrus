import { NextRequest, NextResponse } from 'next/server';

const CablyAIEndpoint = 'https://meow.cablyai.com/v1/chat/completions';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    // If response is ok OR it's an error we shouldn't retry (like 4xx client errors), return it
    if (response.ok || (response.status >= 400 && response.status < 500)) {
      return response;
    }
    // Otherwise, it might be a temporary server issue (5xx)
    if (retries > 0) {
      console.warn(`Retryable error encountered (status ${response.status}). Retrying in ${RETRY_DELAY_MS}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return fetchWithRetry(url, options, retries - 1);
    } else {
      // No retries left, return the last error response
       console.error('Max retries reached. Returning last error response.');
      return response;
    }
  } catch (error: any) {
    // Handle network errors (like the SSL error)
    if (retries > 0) {
        // Check if it's the specific SSL error or a generic fetch failure likely related
        const isRetryableNetworkError = error.message?.includes('TLS/SSL') || error.name === 'FetchError' || error.message?.includes('fetch failed');
        if (isRetryableNetworkError) {
            console.warn(`Network error encountered (${error.message}). Retrying in ${RETRY_DELAY_MS}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            return fetchWithRetry(url, options, retries - 1);
        } else {
             console.error('Non-retryable network error:', error);
             throw error; // Re-throw non-retryable network errors
        }
    } else {
      console.error('Max retries reached after network error:', error);
      throw error; // Max retries exceeded, re-throw the last error
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_CABLY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured on server.' }, { status: 500 });
    }
    const body = await request.json();
    console.log(`Proxying request to Cably AI for model: ${body?.model}, Attempt: ${MAX_RETRIES - MAX_RETRIES + 1}`);

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    };

    // Use the fetchWithRetry function
    const response = await fetchWithRetry(CablyAIEndpoint, fetchOptions);

    // Check if the final response (after potential retries) was successful
    if (!response.ok) {
      let errorBodyJson = {};
      try {
          const errorBodyText = await response.text();
          console.error('Cably AI API Error (after retries):', response.status, errorBodyText);
          errorBodyJson = JSON.parse(errorBodyText || '{}');
      } catch(e) {
          console.error('Could not parse error body as JSON');
          errorBodyJson = { error: { message: `API request failed with status ${response.status}`, type: 'proxy_error' } };
      }
      return NextResponse.json(errorBodyJson, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in API proxy route (fetch level):', error);
    const errorMessage = error.message || 'Internal Server Error in proxy route.';
    return NextResponse.json({ error: { message: errorMessage, type: 'proxy_fetch_error' } }, { status: 500 });
  }
}

// Optional: Handle OPTIONS request for CORS preflight if needed,
// though typically not required when proxying from the same origin.
export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*', // Or restrict to your frontend origin
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
} 