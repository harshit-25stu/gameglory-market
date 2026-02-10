import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SearchFilters {
  category?: string;
  platform?: string;
  priceRange?: { min: number; max: number };
  condition?: string;
  rarity?: string;
  location?: string;
}

interface SearchResult {
  id: string;
  type: 'digital_item' | 'physical_game' | 'game_skin';
  title: string;
  description?: string;
  price: number;
  platform?: string;
  condition?: string;
  rarity?: string;
  image_url?: string;
  seller_username: string;
  relevance_score: number;
  match_reasons: string[];
}

const validateSearchRequest = (body: unknown): body is {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  userId?: string;
} => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.query === 'string' && b.query.length > 0 &&
    (!b.filters || typeof b.filters === 'object') &&
    (!b.limit || (typeof b.limit === 'number' && b.limit > 0 && b.limit <= 100)) &&
    (!b.userId || typeof b.userId === 'string')
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
      console.error('Invalid request body:', body);
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, filters = {}, limit = 20, userId } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Performing AI search for: "${query}"`);

    // First, try to understand the query with AI
    const systemPrompt = `You are a gaming marketplace search expert. Analyze user search queries to extract:
1. Game titles, franchises, or series
2. Item types (skins, games, accounts, etc.)
3. Platforms (PS5, Xbox, PC, etc.)
4. Conditions (new, used, mint, etc.)
5. Price ranges or budget indicators
6. Specific features or requirements

Return structured search parameters and keywords for database querying.`;

    const userPrompt = `Analyze this search query and extract search parameters: "${query}"

Consider context:
- Gaming terminology and abbreviations
- Price indicators (cheap, expensive, under $, etc.)
- Condition words (new, used, mint, sealed, etc.)
- Platform preferences (console names, PC, mobile)
- Item type preferences (skins, games, accounts, etc.)`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              description: "Parse search query into structured parameters",
              parameters: {
                type: "object",
                properties: {
                  keywords: { type: "array", items: { type: "string" } },
                  gameTitles: { type: "array", items: { type: "string" } },
                  platforms: { type: "array", items: { type: "string" } },
                  itemTypes: { type: "array", items: { type: "string" } },
                  conditions: { type: "array", items: { type: "string" } },
                  priceRange: {
                    type: "object",
                    properties: {
                      min: { type: "number" },
                      max: { type: "number" }
                    }
                  },
                  rarities: { type: "array", items: { type: "string" } },
                  searchStrategy: {
                    type: "string",
                    enum: ["exact_match", "fuzzy_match", "semantic_search", "broad_search"]
                  },
                  confidence: { type: "number", minimum: 0, maximum: 1 }
                },
                required: ["keywords", "searchStrategy", "confidence"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_search_query" } }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("Failed to analyze search query");
    }

    const aiData = await aiResponse.json();
    const searchParams = JSON.parse(aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || '{}');

    // Perform database search based on AI analysis
    const results = await performAISearch(searchParams, filters, limit, userId);

    return new Response(JSON.stringify({
      success: true,
      query,
      searchParams,
      results,
      totalResults: results.length
    }), { headers: corsHeaders });

  } catch (error) {
    console.error('Error in ai-search:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Search failed'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

async function performAISearch(
  searchParams: any,
  filters: SearchFilters,
  limit: number,
  userId?: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  // Search digital items
  if (!filters.category || filters.category === 'digital' || filters.category === 'all') {
    const digitalQuery = supabase
      .from('digital_items')
      .select(`
        id,
        title,
        description,
        price,
        platform,
        item_type,
        game_title,
        is_available,
        seller_id,
        profiles:seller_id(username)
      `)
      .eq('is_available', true)
      .limit(limit);

    // Apply AI-derived filters
    if (searchParams.keywords?.length > 0) {
      digitalQuery.or(searchParams.keywords.map((kw: string) =>
        `title.ilike.%${kw}%,description.ilike.%${kw}%,game_title.ilike.%${kw}%`
      ).join(','));
    }

    if (searchParams.platforms?.length > 0) {
      digitalQuery.in('platform', searchParams.platforms);
    }

    if (searchParams.priceRange) {
      if (searchParams.priceRange.min !== undefined) {
        digitalQuery.gte('price', searchParams.priceRange.min);
      }
      if (searchParams.priceRange.max !== undefined) {
        digitalQuery.lte('price', searchParams.priceRange.max);
      }
    }

    const { data: digitalItems } = await digitalQuery;

    digitalItems?.forEach(item => {
      const relevanceScore = calculateRelevanceScore(item, searchParams);
      if (relevanceScore > 0) {
        results.push({
          id: item.id,
          type: 'digital_item',
          title: item.title,
          description: item.description,
          price: item.price,
          platform: item.platform,
          image_url: null, // Would need to add image_url to schema
          seller_username: item.profiles?.username || 'Unknown',
          relevance_score: relevanceScore,
          match_reasons: generateMatchReasons(item, searchParams)
        });
      }
    });
  }

  // Search physical games
  if (!filters.category || filters.category === 'physical' || filters.category === 'all') {
    const physicalQuery = supabase
      .from('physical_games')
      .select(`
        id,
        title,
        description,
        price,
        platform,
        condition,
        is_available,
        seller_id,
        profiles:seller_id(username)
      `)
      .eq('is_available', true)
      .limit(limit);

    // Apply filters similar to digital items
    if (searchParams.keywords?.length > 0) {
      physicalQuery.or(searchParams.keywords.map((kw: string) =>
        `title.ilike.%${kw}%,description.ilike.%${kw}%`
      ).join(','));
    }

    if (searchParams.platforms?.length > 0) {
      physicalQuery.in('platform', searchParams.platforms);
    }

    if (searchParams.conditions?.length > 0) {
      physicalQuery.in('condition', searchParams.conditions);
    }

    if (searchParams.priceRange) {
      if (searchParams.priceRange.min !== undefined) {
        physicalQuery.gte('price', searchParams.priceRange.min);
      }
      if (searchParams.priceRange.max !== undefined) {
        physicalQuery.lte('price', searchParams.priceRange.max);
      }
    }

    const { data: physicalGames } = await physicalQuery;

    physicalGames?.forEach(game => {
      const relevanceScore = calculateRelevanceScore(game, searchParams);
      if (relevanceScore > 0) {
        results.push({
          id: game.id,
          type: 'physical_game',
          title: game.title,
          description: game.description,
          price: game.price,
          platform: game.platform,
          condition: game.condition,
          seller_username: game.profiles?.username || 'Unknown',
          relevance_score: relevanceScore,
          match_reasons: generateMatchReasons(game, searchParams)
        });
      }
    });
  }

  // Sort by relevance score and limit results
  return results
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);
}

function calculateRelevanceScore(item: any, searchParams: any): number {
  let score = 0;

  // Keyword matches
  const searchableText = `${item.title} ${item.description || ''} ${item.game_title || ''}`.toLowerCase();
  searchParams.keywords?.forEach((keyword: string) => {
    if (searchableText.includes(keyword.toLowerCase())) {
      score += 10;
    }
  });

  // Platform match
  if (searchParams.platforms?.includes(item.platform)) {
    score += 15;
  }

  // Condition match
  if (searchParams.conditions?.includes(item.condition)) {
    score += 10;
  }

  // Price range match
  if (searchParams.priceRange) {
    const price = item.price;
    if (price >= (searchParams.priceRange.min || 0) &&
        price <= (searchParams.priceRange.max || Infinity)) {
      score += 5;
    }
  }

  // Title exact match gets bonus
  searchParams.keywords?.forEach((keyword: string) => {
    if (item.title.toLowerCase().includes(keyword.toLowerCase())) {
      score += 5;
    }
  });

  return score;
}

function generateMatchReasons(item: any, searchParams: any): string[] {
  const reasons: string[] = [];

  // Check for keyword matches
  searchParams.keywords?.forEach((keyword: string) => {
    const searchableText = `${item.title} ${item.description || ''}`.toLowerCase();
    if (searchableText.includes(keyword.toLowerCase())) {
      reasons.push(`Matches "${keyword}"`);
    }
  });

  // Platform match
  if (searchParams.platforms?.includes(item.platform)) {
    reasons.push(`Available on ${item.platform}`);
  }

  // Condition match
  if (searchParams.conditions?.includes(item.condition)) {
    reasons.push(`Condition: ${item.condition}`);
  }

  // Price match
  if (searchParams.priceRange) {
    reasons.push(`Price in your range`);
  }

  return reasons.length > 0 ? reasons : ['General match'];
}