'use client';

import { useState, useEffect } from 'react';
import { QuizData, Question } from '@/types/quiz';

// Define the structure of the message content for image input
interface VisionContent {
  type: 'image_url' | 'text';
  text?: string;
  image_url?: {
    url: string; // data:image/jpeg;base64,{base64_image}
    detail?: 'low' | 'high' | 'auto'; // User can choose
  };
}

const API_ENDPOINT = '/api/proxy'; // Use our internal proxy route

const SYSTEM_PROMPT = `
You are an expert AI assistant specialized in analyzing PDF question papers (which may contain text and diagrams/images).
Your task is to meticulously extract all questions from the provided PDF content (presented as a series of page images).
For each question, identify its type (MCQ, Fill-in-the-blank, Numerical), extract the question text, options (for MCQs), and the correct answer.
Also, infer the topic and difficulty level (Easy, Medium, Hard).
If a question refers to a diagram or image present on the same page or nearby, include a 'diagram' object containing the 'pageNumber' where the diagram is located (use the 1-based index of the image provided).
Format the output as a single JSON object conforming to the following TypeScript interface:

interface DiagramReference {
  pageNumber: number;
}
interface Question {
  questionText: string;
  type: 'MCQ' | 'Fill-in-the-blank' | 'Numerical';
  options?: string[];
  answer: string;
  topic?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  diagram?: DiagramReference;
}
interface QuizData {
  questions: Question[];
  title?: string;
  extractedFrom: string; // The original filename
}

Ensure the JSON is valid and complete. Do not include any introductory text, explanations, or markdown formatting like \`\`\`json ... \`\`\` outside the main JSON structure.
`;

// Helper to convert file to ArrayBuffer
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export function useLLMClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizData | null>(null);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null); // State to hold the loaded library

  // Dynamically load pdfjs-dist on mount
  useEffect(() => {
    import('pdfjs-dist').then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = `/static/pdf.worker.min.mjs`;
      setPdfjsLib(pdfjs);
    }).catch(err => {
      console.error("Failed to load pdfjs-dist:", err);
      setError("Failed to load PDF processing library.");
    });
  }, []);

  const processPdf = async (pdfFile: File, imageDetail: 'low' | 'high' = 'low') => {
    if (!pdfjsLib) {
      setError('PDF library not loaded yet. Please wait and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setLoadingMessage('Initializing PDF processing...');

    const BATCH_SIZE = 2; // Process 2 pages per API call
    let combinedQuestions: Question[] = [];

    try {
      console.log(`Starting PDF processing for ${pdfFile.name} with ${imageDetail} detail...`);
      setLoadingMessage('Loading PDF document...');
      const pdfData = await readFileAsArrayBuffer(pdfFile);
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      console.log(`PDF loaded with ${numPages} pages.`);

      for (let pageIndex = 0; pageIndex < numPages; pageIndex += BATCH_SIZE) {
        const startPage = pageIndex + 1;
        const endPage = Math.min(pageIndex + BATCH_SIZE, numPages);
        const batchPageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

        setLoadingMessage(`Processing pages ${startPage}-${endPage} of ${numPages}...`);
        console.log(`Processing batch: Pages ${startPage}-${endPage}`);

        const batchImageMessages: VisionContent[] = [];

        // 1. Convert pages in the current batch to images
        setLoadingMessage(`Converting pages ${startPage}-${endPage} to images...`);
        for (let i = startPage; i <= endPage; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (!context) {
            throw new Error('Could not get canvas context');
          }

          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const base64Image = canvas.toDataURL('image/jpeg', 0.7);
          batchImageMessages.push({
            type: 'image_url',
            image_url: { url: base64Image, detail: imageDetail }
          });
          page.cleanup();
          canvas.width = 0; canvas.height = 0; // Help GC
        }
        console.log(`Batch ${startPage}-${endPage}: Images generated.`);

        // 2. Prepare API request for the current batch
        setLoadingMessage(`Sending pages ${startPage}-${endPage} for analysis...`);
        const userPromptText = `Process the following pages (${startPage}-${endPage}) from the PDF named '${pdfFile.name}'. Extract the questions ONLY from these pages and structure them as requested in the system prompt.`;
        const messages: Array<{ role: 'system' | 'user'; content: string | VisionContent[] }> = [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPromptText } as VisionContent,
              ...batchImageMessages
            ]
          }
        ];

        const requestBody = {
          model: 'gpt-4o',
          messages: messages,
          max_tokens: 4096, // Keep max_tokens, but the input is smaller now
          temperature: 0.1,
        };

        // 3. Send request to proxy
        let batchResult: QuizData | null = null;
        try {
          console.log(`Making API request to proxy for pages ${startPage}-${endPage}`);
          const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            let errorData = { message: `Proxy request failed for batch ${startPage}-${endPage}: ${response.status} ${response.statusText}` };
            try {
              const errorBody = await response.json();
              console.error(`Proxy/API Error Response (Batch ${startPage}-${endPage}):`, errorBody);
              errorData = errorBody.error || errorBody;
            } catch (parseErr) {
              const textError = await response.text();
              console.error(`Could not parse error response from proxy (Batch ${startPage}-${endPage}). Raw:`, textError);
              errorData.message += `. Raw response: ${textError.substring(0, 100)}...`;
            }
            throw new Error(errorData.message || `Proxy request failed: ${response.status}`);
          }

          const data = await response.json();
          console.log(`AI Raw Response (Batch ${startPage}-${endPage}):`, data.choices[0]?.message?.content.substring(0, 200) + "..."); // Log start of response

          // Basic validation of the batch response structure
          if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
            console.error('Invalid API response structure received from proxy:', data);
            throw new Error(`Invalid response structure received from AI for batch ${startPage}-${endPage}.`);
          }

          const aiContent = data.choices[0].message.content.trim();

          // 4. Parse and accumulate results for the batch
          setLoadingMessage(`Parsing response for pages ${startPage}-${endPage}...`);
          const jsonMatch = aiContent.match(/```(?:json)?\n?(\{[\s\S]*?\})\n?```/);
          const jsonString = jsonMatch ? jsonMatch[1] : aiContent;

          try {
              batchResult = JSON.parse(jsonString) as QuizData;
              if (!batchResult || !Array.isArray(batchResult.questions)) {
                  console.warn(`Parsed JSON for batch ${startPage}-${endPage} is missing 'questions' array or is invalid:`, batchResult);
                  // Don't throw an error, just skip this batch's questions if format is wrong
                  batchResult = { questions: [], extractedFrom: pdfFile.name };
              }
          } catch (parseError: any) {
              console.error(`Failed to parse AI JSON response for batch ${startPage}-${endPage}:`, parseError);
              console.error(`Original AI content causing parse error (Batch ${startPage}-${endPage}):`, aiContent);
              // Decide how to handle parse errors: continue or fail?
              // For now, let's throw to indicate a failure in processing.
              throw new Error(`Failed to parse AI response for batch ${startPage}-${endPage}. Details: ${parseError.message}`);
          }

          if (batchResult && batchResult.questions.length > 0) {
              // Add page context to diagram references if needed (adjusting for 1-based index)
              batchResult.questions.forEach(q => {
                  if (q.diagram && !batchPageNumbers.includes(q.diagram.pageNumber)) {
                      console.warn(`Question mentions diagram on page ${q.diagram.pageNumber}, which is outside the current batch (${startPage}-${endPage}). Adjusting or verifying needed.`)
                      // Potentially adjust pageNumber based on context or remove diagram ref if unreliable across batches.
                      // For now, we keep it as returned by the AI for this batch.
                  }
              });
              combinedQuestions.push(...batchResult.questions);
              console.log(`Batch ${startPage}-${endPage}: Added ${batchResult.questions.length} questions.`);
          } else {
              console.log(`Batch ${startPage}-${endPage}: No questions found or parsed.`);
          }

        } catch (batchError: any) {
          console.error(`Error processing batch ${startPage}-${endPage}:`, batchError);
          // Stop processing further batches on error
          throw new Error(`Failed processing batch ${startPage}-${endPage}: ${batchError.message}`);
        }
      } // End of batch loop

      // 5. Finalize results if all batches succeeded
      if (combinedQuestions.length > 0) {
          const finalResult: QuizData = {
              questions: combinedQuestions,
              title: `Quiz from ${pdfFile.name}`, // Generate a simple title
              extractedFrom: pdfFile.name
          };
          console.log("Successfully combined results from all batches:", finalResult);
          setResult(finalResult);
          setLoadingMessage("Quiz generated successfully!");
      } else {
          console.log("No questions were extracted from any batch.");
          setError("No questions could be extracted from the PDF after processing all pages.");
      }

    } catch (err: any) {
      // Catch errors from PDF loading or errors thrown by batch processing
      console.error('Overall PDF processing error:', err);
      setError(err.message || 'An unknown error occurred during PDF processing.');
    } finally {
      setIsLoading(false);
      // Keep the last success/error message or clear it
      if (error) setLoadingMessage(null); 
      else if (!result && combinedQuestions.length === 0) setLoadingMessage(null); // Clear if no questions found
      // else keep the success message
    }
  };

  return { processPdf, isLoading, loadingMessage, error, result, isPdfLibReady: !!pdfjsLib };
} 