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

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    switch (action) {
      case 'get_market_trends': {
        const { gameTitle, platform, itemType, limit = 20 } = payload;

        let query = supabase
          .from('market_trends')
          .select('*')
          .order('last_updated', { ascending: false })
          .limit(limit);

        if (gameTitle) query = query.ilike('game_title', `%${gameTitle}%`);
        if (platform) query = query.eq('platform', platform);
        if (itemType) query = query.eq('item_type', itemType);

        const { data, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          trends: data
        }), { headers: corsHeaders });
      }

      case 'get_price_history': {
        const { itemId, itemType, days = 30 } = payload;

        const { data, error } = await supabase
          .from('price_history')
          .select('*')
          .eq('item_id', itemId)
          .eq('item_type', itemType)
          .gte('recorded_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
          .order('recorded_at', { ascending: true });

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          priceHistory: data
        }), { headers: corsHeaders });
      }

      case 'create_price_alert': {
        const { userId, gameTitle, platform, targetPrice, alertType } = payload;

        const { data, error } = await supabase
          .from('price_alerts')
          .insert({
            user_id: userId,
            game_title: gameTitle,
            platform,
            target_price: targetPrice,
            alert_type: alertType
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          alert: data
        }), { headers: corsHeaders });
      }

      case 'get_price_alerts': {
        const { userId } = payload;

        const { data, error } = await supabase
          .from('price_alerts')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          alerts: data
        }), { headers: corsHeaders });
      }

      case 'update_price_alert': {
        const { alertId, userId, updates } = payload;

        const { data, error } = await supabase
          .from('price_alerts')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', alertId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          alert: data
        }), { headers: corsHeaders });
      }

      case 'get_market_insights': {
        const { limit = 10, severity } = payload;

        let query = supabase
          .from('market_insights')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (severity) query = query.eq('severity', severity);

        const { data, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          insights: data
        }), { headers: corsHeaders });
      }

      case 'generate_market_report': {
        const { gameTitle, platform, days = 30 } = payload;

        // Get comprehensive market data
        const [
          trendsResult,
          historyResult,
          volumeResult,
          alertsResult
        ] = await Promise.all([
          // Current market trends
          supabase
            .from('market_trends')
            .select('*')
            .ilike('game_title', `%${gameTitle}%`)
            .eq('platform', platform)
            .single(),

          // Price history
          supabase
            .from('price_history')
            .select('*')
            .in('item_type', ['digital_item', 'physical_game'])
            .gte('recorded_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
            .order('recorded_at'),

          // Trading volume
          supabase
            .from('orders')
            .select('*', { count: 'exact' })
            .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()),

          // Active price alerts
          supabase
            .from('price_alerts')
            .select('*', { count: 'exact' })
            .ilike('game_title', `%${gameTitle}%`)
            .eq('is_active', true)
        ]);

        const report = {
          gameTitle,
          platform,
          period: `${days} days`,
          trends: trendsResult.data,
          priceHistory: historyResult.data || [],
          tradingVolume: volumeResult.count || 0,
          activeAlerts: alertsResult.count || 0,
          generatedAt: new Date().toISOString()
        };

        return new Response(JSON.stringify({
          success: true,
          report
        }), { headers: corsHeaders });
      }

      case 'update_market_data': {
        // Admin function to refresh market data
        const { error } = await supabase.rpc('update_market_trends');
        if (error) throw error;

        await supabase.rpc('check_price_alerts');

        return new Response(JSON.stringify({
          success: true,
          message: 'Market data updated successfully'
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
      error: error.message || 'Market intelligence operation failed'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});