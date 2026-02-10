import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://rxhtoxgezhqloooogbqdqd.lovable.app',
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

interface TransactionData {
  buyerId: string;
  sellerId: string;
  itemType: string;
  price: number;
  paymentMethod: string;
  buyerHistory: {
    totalTransactions: number;
    successfulTransactions: number;
    averageRating: number;
    accountAge: number; // days
    flaggedTransactions: number;
  };
  sellerHistory: {
    totalListings: number;
    successfulSales: number;
    averageRating: number;
    accountAge: number;
    flaggedListings: number;
  };
  transactionContext: {
    itemListedDate: string;
    priceChanges: number;
    similarItemsAveragePrice: number;
    buyerSellerDistance?: number; // if applicable
  };
}

const validateFraudRequest = (body: unknown): body is {
  transactionId: string;
  transactionData: TransactionData;
} => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.transactionId === 'string' && b.transactionId.length > 0 &&
    typeof b.transactionData === 'object' && b.transactionData !== null
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

    if (!validateFraudRequest(body)) {
      console.error('Invalid request body:', body);
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transactionId, transactionData } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Analyzing fraud risk for transaction: ${transactionId}`);

    const systemPrompt = `You are an expert fraud detection system for a gaming marketplace. Analyze transaction patterns and user behavior to identify potential fraudulent activities.

Consider these fraud indicators:
1. New accounts with high-value transactions
2. Unusual price deviations from market average
3. Frequent account changes or suspicious patterns
4. Poor seller/buyer history with high-value items
5. Rapid price changes on listings
6. Geographic inconsistencies
7. Payment method risks

Return a fraud risk assessment with confidence score and specific concerns.`;

    const userPrompt = `Analyze this transaction for fraud risk:

Transaction Details:
- Item Type: ${transactionData.itemType}
- Price: $${transactionData.price}
- Payment Method: ${transactionData.paymentMethod}

Buyer Profile:
- Account Age: ${transactionData.buyerHistory.accountAge} days
- Total Transactions: ${transactionData.buyerHistory.totalTransactions}
- Success Rate: ${((transactionData.buyerHistory.successfulTransactions / Math.max(transactionData.buyerHistory.totalTransactions, 1)) * 100).toFixed(1)}%
- Average Rating: ${transactionData.buyerHistory.averageRating}/5
- Previously Flagged: ${transactionData.buyerHistory.flaggedTransactions}

Seller Profile:
- Account Age: ${transactionData.sellerHistory.accountAge} days
- Total Listings: ${transactionData.sellerHistory.totalListings}
- Successful Sales: ${transactionData.sellerHistory.successfulSales}
- Average Rating: ${transactionData.sellerHistory.averageRating}/5
- Previously Flagged: ${transactionData.sellerHistory.flaggedListings}

Context:
- Item Listed: ${transactionData.transactionContext.itemListedDate}
- Price Changes: ${transactionData.transactionContext.priceChanges}
- Market Average: $${transactionData.transactionContext.similarItemsAveragePrice}
- Price Deviation: ${(((transactionData.price - transactionData.transactionContext.similarItemsAveragePrice) / transactionData.transactionContext.similarItemsAveragePrice) * 100).toFixed(1)}%
${transactionData.transactionContext.buyerSellerDistance ? `- Distance: ${transactionData.transactionContext.buyerSellerDistance}km` : ''}`;

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
              name: "assess_fraud_risk",
              description: "Assess the fraud risk of a transaction",
              parameters: {
                type: "object",
                properties: {
                  riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  riskScore: { type: "number", minimum: 0, maximum: 100 },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  concerns: {
                    type: "array",
                    items: { type: "string" }
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" }
                  },
                  requiresReview: { type: "boolean" },
                  reasoning: { type: "string" }
                },
                required: ["riskLevel", "riskScore", "confidence", "concerns", "recommendations", "requiresReview", "reasoning"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "assess_fraud_risk" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to analyze fraud risk");
    }

    const data = await response.json();
    console.log("Fraud analysis completed successfully");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({
        success: true,
        transactionId,
        ...result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error("No valid response from AI");
  } catch (error) {
    console.error("Error in ai-fraud-detection:", error);
    return new Response(JSON.stringify({
      error: "An error occurred analyzing fraud risk"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});