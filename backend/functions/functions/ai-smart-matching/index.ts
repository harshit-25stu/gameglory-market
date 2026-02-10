import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://rxhtoxgezhqloooogbqd.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.endsWith('.lovable.app')
  );
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

interface TradeMatchData {
  seekerId: string;
  seekerItems: {
    id: string;
    title: string;
    game: string;
    platform: string;
    condition: string;
    estimatedValue: number;
  }[];
  targetItems: {
    id: string;
    title: string;
    game: string;
    platform: string;
    condition: string;
    estimatedValue: number;
    sellerId: string;
  }[];
  preferences?: {
    gamePriority: string[];
    platformPriority: string[];
    conditionTolerance: 'strict' | 'flexible' | 'any';
    valueTolerance: number; // percentage
  };
}

const validateMatchingRequest = (body: unknown): body is {
  matchId: string;
  matchData: TradeMatchData;
} => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.matchId === 'string' && b.matchId.length > 0 &&
    typeof b.matchData === 'object' && b.matchData !== null &&
    typeof (b.matchData as TradeMatchData).seekerId === 'string'
  );
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (!validateMatchingRequest(body)) {
      console.error('Invalid request body:', body);
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { matchId, matchData } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Finding smart trade matches for user: ${matchData.seekerId}`);

    const systemPrompt = `You are a trade matching expert for a gaming marketplace. Find optimal trade combinations between users' items.

Consider:
1. Fair value exchange (within acceptable ranges)
2. Game/platform compatibility
3. Condition compatibility
4. User preferences and priorities
5. Multiple item combinations for better matches

Find the best trade matches that create mutual value for both parties.`;

    const seekerItemsText = matchData.seekerItems.map(item =>
      `- ${item.title} (${item.game}, ${item.platform}, ${item.condition}) - $${item.estimatedValue}`
    ).join('\n');

    const targetItemsText = matchData.targetItems.map(item =>
      `- ${item.title} (${item.game}, ${item.platform}, ${item.condition}) - $${item.estimatedValue}`
    ).join('\n');

    const preferencesText = matchData.preferences ?
      `\nPreferences:
- Game Priority: ${matchData.preferences.gamePriority.join(', ')}
- Platform Priority: ${matchData.preferences.platformPriority.join(', ')}
- Condition Tolerance: ${matchData.preferences.conditionTolerance}
- Value Tolerance: ±${matchData.preferences.valueTolerance}%` : '';

    const userPrompt = `Find optimal trade matches:

User's Items for Trade:
${seekerItemsText}

Available Items to Trade For:
${targetItemsText}${preferencesText}

Find the best trade combinations that are fair and mutually beneficial.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "find_trade_matches",
              description: "Find optimal trade combinations between items",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        seekerItems: {
                          type: "array",
                          items: { type: "string" } // item IDs
                        },
                        targetItems: {
                          type: "array",
                          items: { type: "string" } // item IDs
                        },
                        targetUserId: { type: "string" },
                        fairness: { type: "number", minimum: 0, maximum: 1 },
                        valueDifference: { type: "number" },
                        compatibility: { type: "number", minimum: 0, maximum: 1 },
                        reasoning: { type: "string" },
                        recommendation: { type: "string", enum: ["excellent", "good", "fair", "poor"] }
                      },
                      required: ["seekerItems", "targetItems", "targetUserId", "fairness", "compatibility", "reasoning", "recommendation"]
                    }
                  },
                  overallInsights: {
                    type: "object",
                    properties: {
                      bestMatchIndex: { type: "number" },
                      marketValue: { type: "string" },
                      suggestions: { type: "array", items: { type: "string" } }
                    }
                  }
                },
                required: ["matches"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "find_trade_matches" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to find trade matches");
    }

    const data = await response.json();
    console.log("Smart matching completed successfully");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({
        success: true,
        matchId,
        ...result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error("No valid response from AI");
  } catch (error) {
    console.error("Error in ai-smart-matching:", error);
    return new Response(JSON.stringify({
      error: "An error occurred finding trade matches"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});