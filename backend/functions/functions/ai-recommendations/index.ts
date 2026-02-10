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

interface UserBehavior {
  viewed_items: string[];
  purchased_items: string[];
  favorited_games: string[];
  search_queries: string[];
  trade_history: string[];
}

const validateRecommendationRequest = (body: unknown): body is {
  userId: string;
  behavior: UserBehavior;
  limit?: number;
} => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.userId === 'string' && b.userId.length > 0 &&
    typeof b.behavior === 'object' && b.behavior !== null &&
    (!b.limit || (typeof b.limit === 'number' && b.limit > 0 && b.limit <= 50))
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

    if (!validateRecommendationRequest(body)) {
      console.error('Invalid request body:', body);
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, behavior, limit = 10 } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating recommendations for user: ${userId}`);

    const systemPrompt = `You are a gaming marketplace recommendation expert. Analyze user behavior to suggest personalized gaming items.

Based on user activity, recommend games, skins, and digital items they might be interested in.

Consider:
- Viewed items indicate interest in similar games/platforms
- Purchased items show confirmed preferences
- Favorited games suggest strong interests
- Search queries reveal active interests
- Trade history shows gaming preferences

Return recommendations with confidence scores and reasoning.`;

    const userPrompt = `User Behavior Analysis:
- Recently viewed: ${behavior.viewed_items.join(', ') || 'None'}
- Purchased items: ${behavior.purchased_items.join(', ') || 'None'}
- Favorite games: ${behavior.favorited_games.join(', ') || 'None'}
- Recent searches: ${behavior.search_queries.join(', ') || 'None'}
- Trade history: ${behavior.trade_history.join(', ') || 'None'}

Generate ${limit} personalized recommendations for gaming items.`;

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
              name: "generate_recommendations",
              description: "Generate personalized gaming item recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        itemType: { type: "string", enum: ["game_skin", "physical_game", "digital_item"] },
                        title: { type: "string" },
                        game: { type: "string" },
                        platform: { type: "string" },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                        reasoning: { type: "string" },
                        priceRange: {
                          type: "object",
                          properties: {
                            min: { type: "number" },
                            max: { type: "number" }
                          }
                        },
                        rarity: { type: "string", enum: ["common", "uncommon", "rare", "epic", "legendary"] }
                      },
                      required: ["itemType", "title", "game", "confidence", "reasoning"]
                    }
                  }
                },
                required: ["recommendations"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_recommendations" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI recommendations");
    }

    const data = await response.json();
    console.log("AI recommendations generated successfully");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error("No valid response from AI");
  } catch (error) {
    console.error("Error in ai-recommendations:", error);
    return new Response(JSON.stringify({
      error: "An error occurred generating recommendations"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});