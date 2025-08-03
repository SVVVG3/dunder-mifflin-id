import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

// Define the schema for the Sopranos Character analysis
const sopranosSchema = {
  type: SchemaType.OBJECT,
  properties: {
    primaryCharacter: {
      type: SchemaType.STRING,
      description: "The Sopranos character that best represents the user based on their traits.",
      enum: ["Dr. Jennifer Melfi", "Silvio Dante", "Carmela Soprano", "Christopher Moltisanti", "Paulie Gualtieri", "Tony Soprano"],
    },
    characterPercentages: {
      type: SchemaType.OBJECT,
      description: "An estimated percentage affinity for each Sopranos character (0-100). These represent affinity and do not need to sum to 100.",
      properties: {
        "Dr. Jennifer Melfi": { type: SchemaType.NUMBER, description: "Percentage affinity for Dr. Melfi (analytical nature, professionalism, ethical principles, wisdom)." },
        "Silvio Dante": { type: SchemaType.NUMBER, description: "Percentage affinity for Silvio Dante (calm demeanor, business acumen, reliability, strategic thinking)." },
        "Carmela Soprano": { type: SchemaType.NUMBER, description: "Percentage affinity for Carmela Soprano (family devotion, moral conflict, materialism, strength)." },
        "Christopher Moltisanti": { type: SchemaType.NUMBER, description: "Percentage affinity for Christopher Moltisanti (ambition, creativity, impulsiveness, loyalty)." },
        "Paulie Gualtieri": { type: SchemaType.NUMBER, description: "Percentage affinity for Paulie Gualtieri (superstition, old-school values, humor, loyalty)." },
        "Tony Soprano": { type: SchemaType.NUMBER, description: "Percentage affinity for Tony Soprano (leadership, complexity, family loyalty, ruthlessness)." },
      },
      required: ["Dr. Jennifer Melfi", "Silvio Dante", "Carmela Soprano", "Christopher Moltisanti", "Paulie Gualtieri", "Tony Soprano"],
    },
    summary: {
        type: SchemaType.STRING,
        description: "A brief (2-3 sentence) summary explaining the primary character choice and key traits observed, written directly to the user ('You seem most like... because...').",
        maxLength: 300,
    },
    evidence: {
      type: SchemaType.ARRAY,
      description: "Exactly 3 pieces of evidence supporting the character analysis. Each piece should link a trait to specific examples.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          trait: {
            type: SchemaType.STRING,
            description: "The primary trait observed (e.g., 'Bravery', 'Ambition', 'Loyalty', 'Wit').",
            maxLength: 50,
          },
          quotes: {
            type: SchemaType.ARRAY,
            description: "1-2 short, direct quotes (max 10 words each) from the user's casts demonstrating this trait.",
            items: {
              type: SchemaType.STRING,
              description: "A short, direct quote (max 10 words).",
              maxLength: 60, // ~10 words
            },
            minItems: 1,
            maxItems: 2,
          },
          explanation: {
            type: SchemaType.STRING,
            description: "One sentence explaining how these quotes demonstrate the specified trait, written directly to the user ('Your casts like ... show...').",
            maxLength: 150,
          },
        },
        required: ["trait", "quotes", "explanation"],
      },
      minItems: 3,
      maxItems: 3,
    },
    counterArguments: {
        type: SchemaType.OBJECT,
        description: "Brief explanations (1-2 sentences each) for why the user doesn\'t primarily align with the *other* five characters, written directly to the user. Keys should be the character names.",
        properties: {
            "Dr. Jennifer Melfi": { type: SchemaType.STRING, description: "Why not primarily Dr. Jennifer Melfi? Focus on contrasting traits.", maxLength: 150 },
            "Silvio Dante": { type: SchemaType.STRING, description: "Why not primarily Silvio Dante? Focus on contrasting traits.", maxLength: 150 },
            "Carmela Soprano": { type: SchemaType.STRING, description: "Why not primarily Carmela Soprano? Focus on contrasting traits.", maxLength: 150 },
            "Christopher Moltisanti": { type: SchemaType.STRING, description: "Why not primarily Christopher Moltisanti? Focus on contrasting traits.", maxLength: 150 },
            "Paulie Gualtieri": { type: SchemaType.STRING, description: "Why not primarily Paulie Gualtieri? Focus on contrasting traits.", maxLength: 150 },
            "Tony Soprano": { type: SchemaType.STRING, description: "Why not primarily Tony Soprano? Focus on contrasting traits.", maxLength: 150 },
        },
    },
  },
  required: ["primaryCharacter", "characterPercentages", "summary", "evidence", "counterArguments"],
};

/**
 * Analyzes a user's bio and casts to determine their Sopranos Character affinity.
 * @param {string | null} bio - The user's Farcaster bio.
 * @param {string[]} casts - An array of the user's recent cast texts.
 * @returns {Promise<object | null>} The analysis result matching sopranosSchema or null if an error occurs.
 */
export async function analyzeSopranosCharacter(bio, casts) {
  if (!GEMINI_API_KEY) {
    console.error("Cannot analyze: GEMINI_API_KEY is not set.");
    return null;
  }
  if (!casts || casts.length === 0) {
    console.warn("No casts provided for analysis.");
    // Proceeding with bio only if available
    if (!bio) return null;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: sopranosSchema,
    },
  });

  const prompt = `Analyze this Farcaster user's bio and recent casts to determine which Sopranos character they most resemble. **IMPORTANT: Consider ALL characters equally - do not default to Tony Soprano. Each character is equally likely.** Assign a primary character and percentage affinities (0-100) for all six characters based on these character traits:

*   **Dr. Jennifer Melfi:** Analytical and intellectual nature, professional ethics and boundaries, wisdom and insight, calm under pressure, principled decision-making, therapeutic mindset, academic perspective, moral clarity, helping others through analysis.
*   **Silvio Dante:** Calm and level-headed demeanor, excellent business acumen, reliability and steadiness, strategic thinking, diplomatic approach, loyalty without drama, practical wisdom, behind-the-scenes influence, measured responses.
*   **Carmela Soprano:** Strong family devotion, moral conflict about lifestyle, materialism and status consciousness, inner strength and resilience, religious faith, loyalty despite personal cost, sophisticated taste, protective of children, complex moral reasoning.
*   **Christopher Moltisanti:** Ambition and desire for respect, creative/artistic aspirations, impulsiveness and emotional volatility, loyalty to mentors, addiction struggles, violence mixed with sensitivity, dreams of bigger things, insecurity, artistic expression.
*   **Paulie Gualtieri:** Superstitious nature, old-school values and traditions, humor and storytelling, fierce loyalty to the family, paranoia, simple pleasures, directness, survivor instinct, colorful anecdotes, traditional mindset.
*   **Tony Soprano:** Mob boss leadership with therapy sessions, panic attacks and anxiety, ruthless business decisions mixed with emotional vulnerability, compartmentalization of violence and family life, therapy discussions, anger management issues, complex relationship with power and violence.

**Input Data:**
Bio: ${bio || 'No bio provided.'}
Recent Casts (max ${casts.length > 50 ? 50 : casts.length}):
${casts.slice(0, 50).join('\n---\n')} ${casts.length > 50 ? '\n[... additional casts truncated]' : ''}

**Analysis Instructions:**
1.  **NO DEFAULT BIAS:** Do NOT default to Tony Soprano. Each character is equally likely. Consider the user's specific traits carefully.
2.  **Percentages:** Estimate affinity for EACH character (0-100%). Do NOT need to sum to 100. Be realistic - most people will have low percentages for characters that don't match.
3.  **Primary Character:** Determine the single BEST fit from the six Sopranos characters based on SPECIFIC traits, not general ones.
4.  **Summary (Analyst Voice - Direct):** Write a 2-4 sentence summary addressing the user directly with "You" and "Your". Start with observation (e.g., "Looking at your posts...", "Based on your communication style..."), specifically mention 1-2 key traits *you observed* in *their* casts/bio that strongly align with the chosen character, and *then* make the character assignment (e.g., "Your [specific trait] and [specific behavior] most closely align with [Primary Character]"). Be insightful and specific.
5.  **Evidence:** Provide EXACTLY 3 pieces of evidence (trait, 1-2 short quotes max 10 words, 1 sentence explanation TO the user).
6.  **Counter Arguments:** For the FIVE characters that are *NOT* the primary character, provide a brief (1-2 sentence) explanation TO THE USER about why they don't fit *primarily* into that character archetype, focusing on contrasting traits.

**IMPORTANT FORMATTING & STYLE:**
*   Adhere STRICTLY to the JSON schema.
*   Write summary, explanations, and counter-arguments directly TO the user (use "You"/"Your").
*   Be concise and specific.
*   Base analysis only on provided text.
*   Focus on behavioral patterns, communication style, values, and personality traits that match the Sopranos characters.

Please provide the analysis in the specified JSON format.`;

  console.log("Sending request to Gemini...");

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    console.log("Received Gemini response text.");

    // Attempt to parse the JSON response
    try {
        const parsedResponse = JSON.parse(responseText);
        console.log("Successfully parsed Gemini response.");

        // Basic validation including new field
        if (!parsedResponse.primaryCharacter || !parsedResponse.characterPercentages || !parsedResponse.evidence || parsedResponse.evidence.length !== 3 || !parsedResponse.counterArguments) {
            console.error("Parsed Gemini response is missing required fields or has incorrect evidence/counterArgument count.", parsedResponse);
            throw new Error("Invalid structure in Gemini response.");
        }

        // Filter counterArguments to remove the entry for the primary character
        const primary = parsedResponse.primaryCharacter;
        const filteredCounters = {};
        for (const character in parsedResponse.counterArguments) {
            if (character !== primary && parsedResponse.counterArguments[character]) {
                filteredCounters[character] = parsedResponse.counterArguments[character];
            }
        }
        parsedResponse.counterArguments = filteredCounters;

        // Check if we have 5 counter arguments now
        if (Object.keys(parsedResponse.counterArguments).length !== 5) {
             console.warn(`Expected 5 counter arguments after filtering, but got ${Object.keys(parsedResponse.counterArguments).length}. Primary: ${primary}`, parsedResponse.counterArguments);
             // Proceeding anyway, but this might indicate a prompt/model issue
        }

        return parsedResponse;
    } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw Gemini response text:', responseText);
        // Attempt to extract JSON from markdown ```json ... ``` block if present
        const match = responseText.match(/```json\n(.*\n?)```/s);
        if (match && match[1]) {
            console.log("Attempting to parse extracted JSON from markdown.");
            try {
                const parsedFallback = JSON.parse(match[1]);
                 console.log("Successfully parsed extracted Gemini JSON.");
                 // Re-validate
                 if (!parsedFallback.primaryCharacter || !parsedFallback.characterPercentages || !parsedFallback.evidence || parsedFallback.evidence.length !== 3 || !parsedFallback.counterArguments) {
                    console.error("Parsed fallback Gemini response is missing required fields or has incorrect evidence/counterArgument count.", parsedFallback);
                    throw new Error("Invalid structure in fallback Gemini response.");
                 }
                 // Filter counterArguments here too
                const primaryFallback = parsedFallback.primaryCharacter;
                const filteredCountersFallback = {};
                for (const character in parsedFallback.counterArguments) {
                    if (character !== primaryFallback && parsedFallback.counterArguments[character]) {
                        filteredCountersFallback[character] = parsedFallback.counterArguments[character];
                    }
                }
                parsedFallback.counterArguments = filteredCountersFallback;
                if (Object.keys(parsedFallback.counterArguments).length !== 5) {
                    console.warn(`Fallback: Expected 5 counter arguments after filtering, but got ${Object.keys(parsedFallback.counterArguments).length}. Primary: ${primaryFallback}`, parsedFallback.counterArguments);
                }
                return parsedFallback;
            } catch (fallbackParseError) {
                console.error('Fallback JSON parse error:', fallbackParseError);
                throw new Error("Failed to parse Gemini response as JSON, even after extraction.");
            }
        } else {
             throw new Error("Failed to parse Gemini response as JSON.");
        }
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
} 