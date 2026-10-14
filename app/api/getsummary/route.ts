
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function POST(request: NextRequest) {
  try {
    if (!ai) {
      return NextResponse.json(
        { error: "Gemini API key is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const transcript = body.transcript;

    if (
      typeof transcript !== "string" ||
      !transcript.trim()
    ) {
      return NextResponse.json(
        { error: "Please provide a valid transcript." },
        { status: 400 }
      );
    }

    if (transcript.length > 100000) {
      return NextResponse.json(
        {
          error:
            "Transcript is too long. Please provide a shorter transcript.",
        },
        { status: 413 }
      );
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
You are an expert translator and video summarizer.

The transcript below may be in any language.

TASK 1: ENGLISH TRANSLATION
- Translate the complete transcript into natural, fluent English.
- Preserve the original meaning, names, numbers, and technical terms.
- Keep timestamps and speaker labels when present.
- Do not omit important information or add facts.
- Do not summarize the transcript in this section.

TASK 2: AI SUMMARY
Using the English translation, provide:
- A short overview of the video.
- The most important key points.
- The main conclusion.
- Important terms or concepts, if relevant.

The summary must be clear, accurate, and easy to understand.
Do not invent information that is not supported by the transcript.

Return ONLY valid JSON in this exact structure:
{
  "translatedTranscript": "The complete English translation",
  "summary": {
    "overview": "A short overview",
    "keyPoints": ["Key point 1", "Key point 2"],
    "conclusion": "The main conclusion",
    "importantTerms": ["Term 1"]
  }
}

TRANSCRIPT:
${transcript}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            translatedTranscript: {
              type: "STRING",
            },
            summary: {
              type: "OBJECT",
              properties: {
                overview: { type: "STRING" },
                keyPoints: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
                conclusion: { type: "STRING" },
                importantTerms: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
              },
              required: [
                "overview",
                "keyPoints",
                "conclusion",
                "importantTerms",
              ],
            },
          },
          required: ["translatedTranscript", "summary"],
        },
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    const result = JSON.parse(text);

    if (
      typeof result.translatedTranscript !== "string" ||
      !result.translatedTranscript.trim() ||
      !result.summary ||
      typeof result.summary.overview !== "string" ||
      !Array.isArray(result.summary.keyPoints) ||
      typeof result.summary.conclusion !== "string" ||
      !Array.isArray(result.summary.importantTerms)
    ) {
      throw new Error("Gemini returned an invalid response format.");
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI transcript processing error:", error);

    return NextResponse.json(
      { error: "Failed to translate and summarize the transcript." },
      { status: 500 }
    );
  }
}
