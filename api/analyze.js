const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Optimized Model Pool for 2026
 * Using the latest Gemini 2.x and 3.x models for maximum speed and availability.
 */
const MODELS = [
    'gemini-2.0-flash',        // Fast & Modern
    'gemini-2.5-flash',        // High performance
    'gemini-2.0-flash-lite',   // Ultra-fast fallback
    'gemini-3-flash-preview',  // Next-gen experimental
    'gemini-2.0-flash-exp',    // Experimental stable
    'gemini-1.5-flash'         // Classic reliable fallback
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, lang } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    const prompt = `You are an expert security researcher and developer. Analyze this ${lang} code for vulnerabilities, bugs, and performance issues.

**IMPORTANT:** You MUST strictly follow this response format.

1. Start with "## Issues Found" followed by a list of issues.
2. Follow with "## Fixed Code" and then provide the COMPLETE corrected code wrapped in a single markdown code block.
3. End with "## Explanation" followed by the reasoning.

**Code to Analyze:**
\`\`\`${lang}
${code}
\`\`\`

**Requirements:**
- The "Fixed Code" block must contain the FULL PROGRAM, not just snippets.
- Use professional markdown.`;

    let lastErrorDetails = null;
    let fallbackCount = 0;

    for (const model of MODELS) {
        try {
            // Using v1beta for widest model support including 2.5 and 3.0 previews
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: 4096,
                        temperature: 0.7
                    },
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                lastErrorDetails = data.error?.message || JSON.stringify(data);

                // If the specific model is not found or busy, try next
                if (response.status === 404 || response.status === 429 || response.status === 503 || response.status === 500) {
                    fallbackCount++;
                    continue;
                }

                // Final error (like auth)
                return res.status(response.status).json({
                    error: `AI Service Error (${model})`,
                    details: lastErrorDetails
                });
            }

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                lastErrorDetails = data.promptFeedback?.blockReason ? `Blocked by Safety: ${data.promptFeedback.blockReason}` : "Empty response";
                fallbackCount++;
                continue;
            }

            const aiText = data.candidates[0].content.parts[0].text;
            return res.status(200).json({
                result: aiText,
                model: model,
                fallbacks: fallbackCount
            });

        } catch (error) {
            lastErrorDetails = error.message;
            fallbackCount++;
        }
    }

    return res.status(500).json({
        error: 'All Gemini models in the pool were busy or unavailable.',
        details: lastErrorDetails
    });
}
