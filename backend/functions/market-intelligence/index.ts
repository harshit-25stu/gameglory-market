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

// Initialize Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PriceAlert {
  userId: string;
  gameTitle: string;
  platform: string;
  targetPrice: number;
  condition?: string;
  alertType: 'below' | 'above' | 'change';
}

interface MarketAnalysis {
  gameTitle: string;
  platform: string;
  timeframe: '7d' | '30d' | '90d';
}

const validateAlertRequest = (body: unknown): body is PriceAlert => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.userId === 'string' &&
    typeof b.gameTitle === 'string' &&
    typeof b.platform === 'string' &&
    typeof b.targetPrice === 'number' &&
    ['below', 'above', 'change'].includes(b.alertType as string)
  );
};

const validateAnalysisRequest = (body: unknown): body is MarketAnalysis => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.gameTitle === 'string' &&
    typeof b.platform === 'string' &&
    ['7d', '30d', '90d'].includes(b.timeframe as string)
  );
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    switch (action) {
      case 'create_price_alert': {
        const alertData = payload as PriceAlert;

        if (!validateAlertRequest(alertData)) {
          return new Response(JSON.stringify({ error: 'Invalid alert data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create price alert
        const { data: alert, error } = await supabase
          .from('price_alerts')
          .insert({
            user_id: alertData.userId,
            game_title: alertData.gameTitle,
            platform: alertData.platform,
            target_price: alertData.targetPrice,
            condition: alertData.condition,
            alert_type: alertData.alertType,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          alert
        }), { headers: corsHeaders });
      }

      case 'get_price_history': {
        const { gameTitle, platform, timeframe = '30d' } = payload;

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();

        const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
        startDate.setDate(endDate.getDate() - days);

        // Get price history from completed orders
        const { data: priceHistory, error } = await supabase
          .from('orders')
          .select('total_price, created_at, item_type')
          .eq('status', 'completed')
          .ilike('item_type', `%${gameTitle}%`)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Process price data
        const processedData = processPriceHistory(priceHistory || []);

        return new Response(JSON.stringify({
          success: true,
          priceHistory: processedData,
          summary: {
            averagePrice: processedData.reduce((sum, item) => sum + item.price, 0) / processedData.length,
            minPrice: Math.min(...processedData.map(item => item.price)),
            maxPrice: Math.max(...processedData.map(item => item.price)),
            totalSales: processedData.length,
            trend: calculateTrend(processedData)
          }
        }), { headers: corsHeaders });
      }

      case 'analyze_market_trends': {
        const analysisData = payload as MarketAnalysis;

        if (!validateAnalysisRequest(analysisData)) {
          return new Response(JSON.stringify({ error: 'Invalid analysis data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          throw new Error("LOVABLE_API_KEY is not configured");
        }

        // Get market data
        const marketData = await getMarketData(analysisData);

        const systemPrompt = `You are a gaming market analyst. Analyze price trends, demand patterns, and market conditions for gaming items.

Consider:
1. Price volatility and trends
2. Seasonal demand patterns
3. Platform popularity
4. Condition impact on value
5. Market saturation and competition
6. External factors (game releases, events)

Provide insights on market conditions, price predictions, and trading recommendations.`;

        const userPrompt = `Analyze market trends for:
- Game: ${analysisData.gameTitle}
- Platform: ${analysisData.platform}
- Timeframe: ${analysisData.timeframe}

Market Data: ${JSON.stringify(marketData)}

Provide comprehensive market analysis with predictions and recommendations.`;

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
                  name: "analyze_market",
                  description: "Provide comprehensive market analysis",
                  parameters: {
                    type: "object",
                    properties: {
                      marketCondition: {
                        type: "string",
                        enum: ["bull", "bear", "sideways", "volatile"]
                      },
                      pricePrediction: {
                        type: "object",
                        properties: {
                          shortTerm: { type: "string" },
                          longTerm: { type: "string" },
                          confidence: { type: "number", minimum: 0, maximum: 1 }
                        }
                      },
                      demandLevel: {
                        type: "string",
                        enum: ["very_high", "high", "moderate", "low", "very_low"]
                      },
                      keyInsights: {
                        type: "array",
                        items: { type: "string" }
                      },
                      recommendations: {
                        type: "array",
                        items: { type: "string" }
                      },
                      riskFactors: {
                        type: "array",
                        items: { type: "string" }
                      }
                    },
                    required: ["marketCondition", "pricePrediction", "demandLevel", "keyInsights", "recommendations"]
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "analyze_market" } }
          }),
        });

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall?.function?.arguments) {
          const analysis = JSON.parse(toolCall.function.arguments);

          return new Response(JSON.stringify({
            success: true,
            analysis,
            marketData
          }), { headers: corsHeaders });
        }

        throw new Error("Failed to analyze market");
      }

      case 'check_price_alerts': {
        // This would be called by a scheduled function to check for price changes
        const { data: alerts, error } = await supabase
          .from('price_alerts')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        const triggeredAlerts = [];

        for (const alert of alerts) {
          const currentPrice = await getCurrentMarketPrice(alert.game_title, alert.platform);

          let triggered = false;

          switch (alert.alert_type) {
            case 'below':
              triggered = currentPrice <= alert.target_price;
              break;
            case 'above':
              triggered = currentPrice >= alert.target_price;
              break;
            case 'change':
              // Check for significant price change (10%+)
              const previousPrice = await getPreviousPrice(alert.game_title, alert.platform);
              const changePercent = Math.abs((currentPrice - previousPrice) / previousPrice);
              triggered = changePercent >= 0.1;
              break;
          }

          if (triggered) {
            // Send notification
            await supabase.functions.invoke('realtime-notifications', {
              body: {
                action: 'send_template_notification',
                payload: {
                  userId: alert.user_id,
                  templateName: 'price_alert',
                  templateVars: {
                    item_title: alert.game_title,
                    percentage: alert.alert_type === 'change' ? '10%' : `$${alert.target_price}`,
                    current_price: currentPrice
                  }
                }
              }
            });

            triggeredAlerts.push(alert);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          triggeredAlerts: triggeredAlerts.length
        }), { headers: corsHeaders });
      }

      default:
        return new Response(JSON.stringify({
          error: 'Invalid action'
        }), {
          status: 400,
          headers: corsHeaders
        });
    }

  } catch (error) {
    console.error('Error in market-intelligence:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

function processPriceHistory(orders: any[]) {
  // Group by date and calculate average prices
  const dailyPrices: { [key: string]: number[] } = {};

  orders.forEach(order => {
    const date = new Date(order.created_at).toISOString().split('T')[0];
    if (!dailyPrices[date]) dailyPrices[date] = [];
    dailyPrices[date].push(order.total_price);
  });

  return Object.entries(dailyPrices).map(([date, prices]) => ({
    date,
    price: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    volume: prices.length
  }));
}

function calculateTrend(priceData: any[]) {
  if (priceData.length < 2) return 'stable';

  const recent = priceData.slice(-7); // Last 7 days
  const earlier = priceData.slice(-14, -7); // Previous 7 days

  if (recent.length === 0 || earlier.length === 0) return 'stable';

  const recentAvg = recent.reduce((sum, item) => sum + item.price, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, item) => sum + item.price, 0) / earlier.length;

  const change = (recentAvg - earlierAvg) / earlierAvg;

  if (change > 0.05) return 'increasing';
  if (change < -0.05) return 'decreasing';
  return 'stable';
}

async function getMarketData(analysis: MarketAnalysis) {
  const endDate = new Date();
  const startDate = new Date();

  const days = analysis.timeframe === '7d' ? 7 : analysis.timeframe === '30d' ? 30 : 90;
  startDate.setDate(endDate.getDate() - days);

  // Get various market metrics
  const [
    priceHistory,
    activeListings,
    recentSales,
    platformStats
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('total_price, created_at')
      .eq('status', 'completed')
      .ilike('item_type', `%${analysis.gameTitle}%`)
      .gte('created_at', startDate.toISOString()),

    supabase
      .from('digital_items')
      .select('price')
      .eq('platform', analysis.platform)
      .ilike('title', `%${analysis.gameTitle}%`)
      .eq('is_available', true),

    supabase
      .from('orders')
      .select('total_price')
      .eq('status', 'completed')
      .ilike('item_type', `%${analysis.gameTitle}%`)
      .gte('created_at', startDate.toISOString()),

    supabase
      .from('digital_items')
      .select('platform')
      .ilike('title', `%${analysis.gameTitle}%`)
      .eq('is_available', true)
  ]);

  return {
    priceHistory: priceHistory.data || [],
    activeListings: activeListings.data || [],
    recentSales: recentSales.data || [],
    platformStats: platformStats.data || [],
    timeframe: analysis.timeframe
  };
}

async function getCurrentMarketPrice(gameTitle: string, platform: string): Promise<number> {
  const { data } = await supabase
    .from('digital_items')
    .select('price')
    .eq('platform', platform)
    .ilike('title', `%${gameTitle}%`)
    .eq('is_available', true)
    .order('price', { ascending: true })
    .limit(1);

  return data?.[0]?.price || 0;
}

async function getPreviousPrice(gameTitle: string, platform: string): Promise<number> {
  // This would need a price history table in a real implementation
  // For now, return a mock value
  return await getCurrentMarketPrice(gameTitle, platform) * 0.95; // Assume 5% decrease
}