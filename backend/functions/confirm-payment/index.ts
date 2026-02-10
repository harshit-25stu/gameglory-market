import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

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

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentIntentId } = await req.json();

    // Confirm the payment intent
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('provider_payment_intent_id', paymentIntentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment record not found');
    }

    // Update payment status
    const paymentStatus = paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed';

    await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        provider_charge_id: paymentIntent.latest_charge as string,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (paymentIntent.status === 'succeeded') {
      // Update escrow status to held
      await supabase
        .from('escrow_accounts')
        .update({
          status: 'held',
          payment_id: payment.id,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', payment.order_id);

      // Update order status
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.order_id);

      // Send notifications
      await supabase.functions.invoke('realtime-notifications', {
        body: {
          action: 'send_template_notification',
          payload: {
            userId: payment.user_id, // buyer
            templateName: 'order_placed',
            templateVars: {
              item_title: 'Gaming Item', // Would need to get from order
              price: payment.amount
            }
          }
        }
      });

      // Send to seller
      const { data: order } = await supabase
        .from('orders')
        .select('seller_id')
        .eq('id', payment.order_id)
        .single();

      if (order) {
        await supabase.functions.invoke('realtime-notifications', {
          body: {
            action: 'send_template_notification',
            payload: {
              userId: order.seller_id,
              templateName: 'order_placed',
              templateVars: {
                item_title: 'Gaming Item',
                price: payment.amount
              }
            }
          }
        });
      }

      // Award XP for purchase
      await supabase.rpc('award_xp', {
        p_user_id: payment.user_id,
        p_event_type: 'purchase_completed',
        p_xp_amount: 25,
        p_description: 'Successfully completed a purchase'
      });

      return new Response(JSON.stringify({
        success: true,
        status: 'succeeded',
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
        }
      }), { headers: corsHeaders });

    } else {
      // Payment failed - update escrow and order status
      await supabase
        .from('escrow_accounts')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('order_id', payment.order_id);

      await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.order_id);

      return new Response(JSON.stringify({
        success: false,
        status: 'failed',
        error: 'Payment failed'
      }), { headers: corsHeaders });
    }

  } catch (error) {
    console.error('Error in confirm-payment:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Payment confirmation failed'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});