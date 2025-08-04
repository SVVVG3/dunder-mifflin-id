import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

// Define the schema for The Office Character analysis
const officeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    primaryCharacter: {
      type: SchemaType.STRING,
      description: "The Office character that best represents the user based on their traits.",
      enum: ["Jim Halpert", "Pam Beesly", "Dwight Schrute", "Michael Scott", "Angela Martin", "Stanley Hudson", "Kelly Kapoor", "Oscar Martinez", "Darryl Philbin", "Kevin Malone"],
    },
    characterPercentages: {
      type: SchemaType.OBJECT,
      description: "An estimated percentage affinity for each Office character (0-100). Most people share traits with multiple characters - avoid giving too many 0% scores. These represent affinity and do not need to sum to 100.",
      properties: {
        "Jim Halpert": { type: SchemaType.NUMBER, description: "Percentage affinity for Jim Halpert (wit, pranks, laid-back attitude, charm, observational humor)." },
        "Pam Beesly": { type: SchemaType.NUMBER, description: "Percentage affinity for Pam Beesly (kindness, artistic nature, supportive, gentle humor, empathy)." },
        "Dwight Schrute": { type: SchemaType.NUMBER, description: "Percentage affinity for Dwight Schrute (intensity, dedication, competitive, unique interests, loyalty)." },
        "Michael Scott": { type: SchemaType.NUMBER, description: "Percentage affinity for Michael Scott (leadership attempts, humor, social awkwardness, caring nature, attention-seeking)." },
        "Angela Martin": { type: SchemaType.NUMBER, description: "Percentage affinity for Angela Martin (organization, high standards, judgmental tendencies, cat love, perfectionism)." },
        "Stanley Hudson": { type: SchemaType.NUMBER, description: "Percentage affinity for Stanley Hudson (no-nonsense attitude, crossword puzzles, work-life boundaries, dry humor)." },
        "Kelly Kapoor": { type: SchemaType.NUMBER, description: "Percentage affinity for Kelly Kapoor (social media obsession, pop culture enthusiasm, dramatic storytelling, relationship focus)." },
        "Oscar Martinez": { type: SchemaType.NUMBER, description: "Percentage affinity for Oscar Martinez (intellectualism, fact-checking, political awareness, sophisticated tastes, condescension)." },
        "Darryl Philbin": { type: SchemaType.NUMBER, description: "Percentage affinity for Darryl Philbin (street smarts, music interests, leadership potential, warehouse wisdom, ambition)." },
        "Kevin Malone": { type: SchemaType.NUMBER, description: "Percentage affinity for Kevin Malone (simple pleasures, food obsession, childlike wonder, gambling interests, unexpected insights)." },
      },
      required: ["Jim Halpert", "Pam Beesly", "Dwight Schrute", "Michael Scott", "Angela Martin", "Stanley Hudson", "Kelly Kapoor", "Oscar Martinez", "Darryl Philbin", "Kevin Malone"],
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
        description: "Brief explanations (1-2 sentences each) for why the user doesn\'t primarily align with the *other* nine characters, written directly to the user. Keys should be the character names.",
        properties: {
            "Jim Halpert": { type: SchemaType.STRING, description: "Why not primarily Jim Halpert? Focus on contrasting traits.", maxLength: 150 },
            "Pam Beesly": { type: SchemaType.STRING, description: "Why not primarily Pam Beesly? Focus on contrasting traits.", maxLength: 150 },
            "Dwight Schrute": { type: SchemaType.STRING, description: "Why not primarily Dwight Schrute? Focus on contrasting traits.", maxLength: 150 },
            "Michael Scott": { type: SchemaType.STRING, description: "Why not primarily Michael Scott? Focus on contrasting traits.", maxLength: 150 },
            "Angela Martin": { type: SchemaType.STRING, description: "Why not primarily Angela Martin? Focus on contrasting traits.", maxLength: 150 },
            "Stanley Hudson": { type: SchemaType.STRING, description: "Why not primarily Stanley Hudson? Focus on contrasting traits.", maxLength: 150 },
            "Kelly Kapoor": { type: SchemaType.STRING, description: "Why not primarily Kelly Kapoor? Focus on contrasting traits.", maxLength: 150 },
            "Oscar Martinez": { type: SchemaType.STRING, description: "Why not primarily Oscar Martinez? Focus on contrasting traits.", maxLength: 150 },
            "Darryl Philbin": { type: SchemaType.STRING, description: "Why not primarily Darryl Philbin? Focus on contrasting traits.", maxLength: 150 },
            "Kevin Malone": { type: SchemaType.STRING, description: "Why not primarily Kevin Malone? Focus on contrasting traits.", maxLength: 150 },
        },
    },
  },
  required: ["primaryCharacter", "characterPercentages", "summary", "evidence", "counterArguments"],
};

/**
 * Analyzes a user's bio and casts to determine their Office Character affinity.
 * @param {string | null} bio - The user's Farcaster bio.
 * @param {string[]} casts - An array of the user's recent cast texts.
 * @returns {Promise<object | null>} The analysis result matching officeSchema or null if an error occurs.
 */
export async function analyzeOfficeCharacter(bio, casts) {
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
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: officeSchema,
    },
  });

  const prompt = `Analyze this Farcaster user's bio and recent casts to determine which Office character they most resemble. 

**CRITICAL: AVOID CHARACTER BIAS**
- Do NOT default to Jim Halpert, Michael Scott, or any single character
- Each of the 10 characters is equally likely to be the best match
- Look for SPECIFIC traits that distinguish characters from each other
- If someone seems "generally funny," consider ALL humor types: Jim's sarcasm, Michael's inappropriate humor, Stanley's dry wit, Kelly's dramatic stories, etc.
- Be more selective - not everyone who makes jokes is Jim Halpert!

Assign a primary character and percentage affinities (0-100) for all ten characters based on these character traits:

*   **Jim Halpert:** Witty and sarcastic humor, pranks and playful mischief, laid-back and easygoing attitude, observational comedy, charming and likeable personality, good with relationships, sports fan, sales skills without being pushy, subtle leadership, making light of serious situations.
*   **Pam Beesly:** Kind and empathetic nature, artistic and creative interests, supportive of others, gentle sense of humor, conflict-avoidant but stands up when needed, organized and detail-oriented, motherly instincts, genuine and authentic, good listener, appreciates simple pleasures.
*   **Dwight Schrute:** Intense dedication and work ethic, competitive and ambitious, unique hobbies and interests (farming, martial arts, etc.), loyal to authority figures, eccentric personality, survival mindset, traditional values, takes things very seriously, knowledgeable about obscure topics, protective of those he cares about.
*   **Michael Scott:** Attempts at leadership and management, well-meaning but often misguided, seeks attention and approval, inappropriate humor, caring deeply about employees, social awkwardness, overconfidence masking insecurity, loves pop culture, wants to be liked by everyone, creative but impractical ideas.
*   **Angela Martin:** Highly organized and detail-oriented, judgmental and critical of others, high moral standards, perfectionist tendencies, loves cats, conservative values, likes control, passive-aggressive behavior, secretly caring underneath stern exterior, appreciates proper etiquette and manners.
*   **Stanley Hudson:** No-nonsense attitude toward work, dry and deadpan humor, strong work-life boundaries, enjoys simple pleasures (crosswords, sudoku), practical and realistic, doesn't engage in office drama, values stability, straightforward communication, enjoys retirement planning, focused on personal interests.
*   **Kelly Kapoor:** Social media and pop culture obsessed, dramatic storytelling and exaggeration, relationship-focused conversations, trendy and fashion-conscious, gossip enthusiast, emotional and reactive, seeks attention through drama, loves celebrity culture, impulsive decision-making, talks rapidly and enthusiastically.
*   **Oscar Martinez:** Intellectual and well-educated, fact-checking and correcting others, politically aware and opinionated, sophisticated cultural tastes, sometimes condescending, values accuracy and precision, enjoys debates and discussions, gay pride and identity awareness, analytical thinking, appreciation for fine arts.
*   **Darryl Philbin:** Street-smart and practical wisdom, music interests (especially hip-hop), natural leadership potential, warehouse experience and blue-collar background, ambitious for career advancement, good with technology, entrepreneurial spirit, mentoring others, realistic about workplace dynamics, bridge between office and warehouse cultures.
*   **Kevin Malone:** Simple pleasures and childlike wonder, food obsession (especially M&Ms and chili), gambling interests and fantasy sports, unexpected moments of insight, mathematical abilities mixed with general confusion, loyalty to friends, enjoys bands and music, straightforward communication style, finds joy in small things, sometimes surprising wisdom.

**Input Data:**
Bio: ${bio || 'No bio provided.'}
Recent Casts (max ${casts.length > 50 ? 50 : casts.length}):
${casts.slice(0, 50).join('\n---\n')} ${casts.length > 50 ? '\n[... additional casts truncated]' : ''}

**Analysis Instructions:**
1.  **NO DEFAULT BIAS:** Do NOT default to Jim Halpert, Michael Scott, or any character. Each character is equally likely. Look for DISTINCTIVE traits that set characters apart.
2.  **Character Differentiation:** Be specific about what makes each character unique:
    - Jim: SARCASTIC pranks, not just any humor
    - Pam: ARTISTIC and gentle, not just kind
    - Dwight: INTENSE and eccentric, not just dedicated
    - Michael: INAPPROPRIATE humor and attention-seeking, not just leadership
    - Angela: JUDGMENTAL perfectionism, not just organized
    - Stanley: DRY humor and work boundaries, not just no-nonsense
    - Kelly: POP CULTURE obsession and drama, not just social
    - Oscar: INTELLECTUAL condescension, not just smart
    - Darryl: STREET SMARTS and music, not just practical
    - Kevin: CHILDLIKE wonder and food obsession, not just simple
3.  **Percentages:** The PRIMARY character must have the HIGHEST percentage (70-95%). Other characters should reflect realistic personality overlap:
    - Strong secondary matches: 40-60%
    - Moderate similarities: 20-40% 
    - Minimal overlap: 5-20%
    - Only give 0% if there's truly NO shared traits (rare)
4.  **Primary Character:** Choose based on the STRONGEST distinguishing traits, and ensure this character has the highest percentage score to avoid user confusion.
5.  **Summary:** Address user directly with specific observed traits that align with the chosen character.
6.  **Evidence:** Provide EXACTLY 3 pieces of evidence with specific quotes and explanations.
7.  **Counter Arguments:** Explain why the user doesn't match the other 9 characters' distinctive traits.

**IMPORTANT FORMATTING & STYLE:**
*   Adhere STRICTLY to the JSON schema.
*   Write summary, explanations, and counter-arguments directly TO the user (use "You"/"Your").
*   Be concise and specific.
*   Base analysis only on provided text.
*   Focus on behavioral patterns, communication style, values, and personality traits that match the Office characters.

**CRITICAL CONSISTENCY CHECK:**
*   The primaryCharacter MUST have the highest percentage in characterPercentages (70-95%)
*   This prevents user confusion where their "mentor" has a lower score than someone else
*   If you choose Darryl as primary, he should have 80%+ while others have lower scores
*   The percentages should logically support your primary character choice

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

        // Check if we have 9 counter arguments now
        if (Object.keys(parsedResponse.counterArguments).length !== 9) {
             console.warn(`Expected 9 counter arguments after filtering, but got ${Object.keys(parsedResponse.counterArguments).length}. Primary: ${primary}`, parsedResponse.counterArguments);
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
                if (Object.keys(parsedFallback.counterArguments).length !== 9) {
                    console.warn(`Fallback: Expected 9 counter arguments after filtering, but got ${Object.keys(parsedFallback.counterArguments).length}. Primary: ${primaryFallback}`, parsedFallback.counterArguments);
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