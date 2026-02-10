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
    const { orderId, paymentMethodId } = await req.json();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, profiles!orders_buyer_id_fkey(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Get payment settings
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('*')
      .single();

    const platformFee = settings ? (order.total_price * (settings.platform_fee_percentage / 100)) : 0;
    const sellerAmount = order.total_price - platformFee;

    // Create escrow account
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_accounts')
      .insert({
        order_id: orderId,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        total_amount: order.total_price,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
        status: 'pending'
      })
      .select()
      .single();

    if (escrowError) throw escrowError;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total_price * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: false,
      metadata: {
        order_id: orderId,
        escrow_id: escrow.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
      },
      description: `GameGlory Market - Order #${orderId.slice(0, 8)}`,
      receipt_email: order.profiles.email,
    });

    // Store payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: order.buyer_id,
        amount: order.total_price,
        status: 'pending',
        payment_method_id: paymentMethodId,
        provider_payment_intent_id: paymentIntent.id,
        fee_amount: platformFee,
        net_amount: sellerAmount,
        metadata: {
          stripe_payment_intent_id: paymentIntent.id,
          escrow_id: escrow.id
        }
      });

    if (paymentError) throw paymentError;

    return new Response(JSON.stringify({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      escrow: {
        id: escrow.id,
        amount: escrow.total_amount,
        platformFee,
        sellerAmount,
      }
    }), { headers: corsHeaders });

  } catch (error) {
    console.error('Error in create-payment-intent:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Payment intent creation failed'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});