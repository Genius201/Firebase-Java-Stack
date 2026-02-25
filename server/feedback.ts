import { GoogleGenAI } from "@google/genai";
import type { Request, Response } from "express";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

export async function handleFeedback(req: Request, res: Response) {
  try {
    const { setTitle, bits, totalDuration, actualDuration, notes } = req.body;

    if (!bits || !Array.isArray(bits)) {
      return res.status(400).json({ error: "bits array is required" });
    }

    const bitsDescription = bits
      .map(
        (b: { title: string; duration: number; notes: string }, i: number) =>
          `${i + 1}. "${b.title}" (planned: ${b.duration}s) - Notes: ${b.notes || "none"}`
      )
      .join("\n");

    const prompt = `You are an experienced comedy coach and set consultant. A comedian just performed a set. Analyze their set structure and provide constructive, actionable feedback.

Set Title: "${setTitle || "Untitled Set"}"
Total Planned Duration: ${totalDuration || "unknown"} seconds
Actual Duration: ${actualDuration || "unknown"} seconds
${notes ? `Comedian's Post-Show Notes: ${notes}` : ""}

Set List (bits in order):
${bitsDescription}

Please provide feedback in the following format:

**Overall Assessment**
A brief 2-3 sentence overview of the set structure.

**Pacing Analysis**
- Comment on timing and flow between bits
- Note if the set felt rushed or dragged
${actualDuration && totalDuration ? `- The comedian ${actualDuration > totalDuration ? "went over" : "came in under"} their planned time by ${Math.abs(actualDuration - totalDuration)} seconds` : ""}

**Set Structure**
- Comment on the opening bit choice
- Comment on the closing bit choice
- Note the overall arc and energy flow

**Suggestions**
- 3-4 specific, actionable suggestions for improvement
- Consider bit ordering, callbacks, transitions

**Highlight**
Pick out the strongest element of their set structure and explain why it works.

Keep the tone encouraging but honest. Be specific, not generic.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { maxOutputTokens: 2048 },
    });

    const feedbackText = response.text || "Unable to generate feedback at this time.";

    res.json({ feedback: feedbackText });
  } catch (error) {
    console.error("Error generating feedback:", error);
    res.status(500).json({ error: "Failed to generate feedback" });
  }
}
