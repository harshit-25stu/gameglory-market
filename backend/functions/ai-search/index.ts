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

interface SearchQuery {
  query: string;
  userId?: string;
  filters?: {
    category?: string[];
    platform?: string[];
    priceRange?: { min: number; max: number };
    condition?: string[];
    location?: string;
  };
  limit?: number;
  offset?: number;
}

const validateSearchRequest = (body: unknown): body is SearchQuery => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.query === 'string' && b.query.length > 0 && b.query.length <= 500
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

    if (!validateSearchRequest(body)) {
      console.error('Invalid search request:', body);
      return new Response(JSON.stringify({ error: 'Invalid search parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, userId, filters, limit = 20, offset = 0 } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing AI search for: "${query}"`);

    const systemPrompt = `You are an expert gaming marketplace search assistant. Analyze natural language queries and convert them into structured search parameters.

Consider gaming terminology, item types, conditions, platforms, and user intent. Extract:
1. Item types (games, skins, digital items, physical items)
2. Game titles and franchises
3. Platforms (PS5, Xbox, Switch, PC)
4. Conditions (mint, excellent, good, fair, poor)
5. Price ranges and budget constraints
6. Specific features or requirements
7. Categories and genres

Return structured search parameters that can be used to query the marketplace database.`;

    const userPrompt = `Convert this natural language search into structured parameters:

Query: "${query}"

${filters ? `Additional filters: ${JSON.stringify(filters)}` : ''}

Extract search intent, keywords, filters, and sorting preferences.`;

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
              name: "parse_search_query",
              description: "Parse natural language search into structured parameters",
              parameters: {
                type: "object",
                properties: {
                  searchTerms: {
                    type: "array",
                    items: { type: "string" },
                    description: "Keywords and game titles to search for"
                  },
                  itemTypes: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["digital_item", "game_skin", "physical_game"]
                    },
                    description: "Types of items to include"
                  },
                  platforms: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["ps5", "ps4", "xbox_series", "xbox_one", "switch", "pc", "other"]
                    },
                    description: "Gaming platforms to filter by"
                  },
                  conditions: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["mint", "excellent", "good", "fair", "poor"]
                    },
                    description: "Item conditions to filter by"
                  },
                  priceRange: {
                    type: "object",
                    properties: {
                      min: { type: "number" },
                      max: { type: "number" }
                    },
                    description: "Price range in USD"
                  },
                  categories: {
                    type: "array",
                    items: { type: "string" },
                    description: "Game categories/genres"
                  },
                  sortBy: {
                    type: "string",
                    enum: ["relevance", "price_asc", "price_desc", "newest", "rating"],
                    description: "How to sort results"
                  },
                  intent: {
                    type: "string",
                    enum: ["buy", "sell", "trade", "browse", "compare"],
                    description: "User's primary intent"
                  },
                  confidence: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Confidence in the parsing"
                  }
                },
                required: ["searchTerms", "intent", "confidence"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_search_query" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to parse search query");
    }

    const data = await response.json();
    console.log("Search query parsed successfully");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const searchParams = JSON.parse(toolCall.function.arguments);

      // Here you would execute the actual search against your database
      // For now, return the parsed parameters
      return new Response(JSON.stringify({
        success: true,
        query: query,
        parsedParams: searchParams,
        results: [], // Would be populated with actual search results
        totalCount: 0,
        facets: {
          platforms: [],
          conditions: [],
          priceRanges: [],
          categories: []
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error("No valid response from AI");
  } catch (error) {
    console.error("Error in ai-search:", error);
    return new Response(JSON.stringify({
      error: error.message || "An error occurred processing your search"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});