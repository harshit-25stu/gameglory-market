import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameTitle, platform, condition, includesBox, includesManual, description } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating price estimate for: ${gameTitle} (${platform}, ${condition})`);

    const systemPrompt = `You are a video game pricing expert. Analyze trade-in game details and provide fair market value estimates.

Consider these factors:
- Game title popularity and demand
- Platform (PS5, Xbox, Switch games typically hold value better)
- Condition (mint = 90-100%, excellent = 75-90%, good = 50-75%, fair = 30-50%, poor = 10-30% of market value)
- Complete in box (CIB) vs loose adds 20-40% value
- Manual included adds 5-10% value
- Current market trends

Provide a JSON response with:
- estimatedPrice: number (in USD)
- priceRange: { low: number, high: number }
- reasoning: string (2-3 sentences explaining the valuation)
- marketDemand: "high" | "medium" | "low"
- similarListings: array of 2-3 example price points`;

    const userPrompt = `Estimate trade-in value for:
- Game: ${gameTitle}
- Platform: ${platform}
- Condition: ${condition}
- Includes Box: ${includesBox ? 'Yes' : 'No'}
- Includes Manual: ${includesManual ? 'Yes' : 'No'}
${description ? `- Additional Notes: ${description}` : ''}`;

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
              name: "provide_price_estimate",
              description: "Return the trade-in price estimate with reasoning",
              parameters: {
                type: "object",
                properties: {
                  estimatedPrice: { type: "number", description: "Estimated trade-in value in USD" },
                  priceRange: {
                    type: "object",
                    properties: {
                      low: { type: "number" },
                      high: { type: "number" }
                    },
                    required: ["low", "high"]
                  },
                  reasoning: { type: "string", description: "2-3 sentence explanation of valuation" },
                  marketDemand: { type: "string", enum: ["high", "medium", "low"] },
                  similarListings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        source: { type: "string" },
                        price: { type: "number" }
                      }
                    }
                  }
                },
                required: ["estimatedPrice", "priceRange", "reasoning", "marketDemand"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_price_estimate" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI pricing");
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const priceData = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ success: true, ...priceData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to content parsing
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify({ success: true, ...parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ 
          success: true, 
          estimatedPrice: 25,
          priceRange: { low: 15, high: 35 },
          reasoning: content,
          marketDemand: "medium"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("No valid response from AI");
  } catch (error) {
    console.error("Error in ai-trade-pricing:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
