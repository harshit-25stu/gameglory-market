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

interface ContentData {
  content: string;
  contentType: 'post' | 'message' | 'listing' | 'comment' | 'review';
  userId: string;
  context?: {
    hubId?: string;
    parentContent?: string;
    userReputation?: number;
  };
}

const validateModerationRequest = (body: unknown): body is {
  contentId: string;
  contentData: ContentData;
} => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.contentId === 'string' && b.contentId.length > 0 &&
    typeof b.contentData === 'object' && b.contentData !== null &&
    typeof (b.contentData as ContentData).content === 'string' &&
    typeof (b.contentData as ContentData).userId === 'string'
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

    if (!validateModerationRequest(body)) {
      console.error('Invalid request body:', body);
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { contentId, contentData } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Moderating content: ${contentId} (${contentData.contentType})`);

    const systemPrompt = `You are a content moderation AI for a gaming marketplace. Analyze content for violations of community guidelines.

Check for:
1. Hate speech, discrimination, or harassment
2. Spam, scams, or phishing attempts
3. Inappropriate content (violence, explicit material)
4. Trade violations (fake items, payment scams)
5. Platform manipulation (fake reviews, shilling)
6. Personal information sharing
7. Copyright infringement

Be balanced - allow gaming discussions, trade negotiations, and community banter while protecting users.`;

    const contextInfo = contentData.context ?
      `\nContext:
- Hub: ${contentData.context.hubId || 'General'}
- User Reputation: ${contentData.context.userReputation || 'Unknown'}
${contentData.context.parentContent ? `- Parent Content: ${contentData.context.parentContent.substring(0, 200)}...` : ''}` : '';

    const userPrompt = `Moderate this ${contentData.contentType}:

Content: "${contentData.content}"${contextInfo}

Content Type: ${contentData.contentType}
User ID: ${contentData.userId}`;

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
              name: "moderate_content",
              description: "Analyze content for moderation violations",
              parameters: {
                type: "object",
                properties: {
                  approved: { type: "boolean" },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  flags: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["hate_speech", "spam", "scam", "inappropriate", "trade_violation", "manipulation", "personal_info", "copyright", "other"]
                    }
                  },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  reasoning: { type: "string" },
                  suggestedAction: {
                    type: "string",
                    enum: ["approve", "flag_review", "auto_remove", "warn_user", "ban_user"]
                  },
                  autoMod: { type: "boolean" },
                  categories: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["approved", "confidence", "flags", "severity", "reasoning", "suggestedAction", "autoMod"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "moderate_content" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to moderate content");
    }

    const data = await response.json();
    console.log("Content moderation completed successfully");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({
        success: true,
        contentId,
        ...result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error("No valid response from AI");
  } catch (error) {
    console.error("Error in ai-content-moderation:", error);
    return new Response(JSON.stringify({
      error: "An error occurred moderating content"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});