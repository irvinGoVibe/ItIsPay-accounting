import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateAIResponse(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock ? textBlock.text : "";
    } catch (error) {
      lastError = error;
      // Wait before retry with exponential backoff
      if (attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt))
        );
      }
    }
  }

  throw lastError;
}

export async function generateStructuredAIResponse<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  const response = await generateAIResponse(
    systemPrompt +
      "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no extra text.",
    userPrompt
  );

  // Extract JSON from response (handle potential markdown wrapping)
  let jsonStr = response.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonStr);
}
