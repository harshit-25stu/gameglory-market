import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Stripe } from "https://esm.sh/stripe@14.17.0";

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

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

// Initialize Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PaymentIntent {
  amount: number;
  currency: string;
  buyerId: string;
  sellerId: string;
  orderId: string;
  itemType: string;
  itemId: string;
  description: string;
}

interface EscrowRelease {
  orderId: string;
  releaseType: 'full' | 'partial';
  amount?: number;
  reason: string;
}

const validatePaymentRequest = (body: unknown): body is PaymentIntent => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.amount === 'number' && b.amount > 0 &&
    typeof b.currency === 'string' &&
    typeof b.buyerId === 'string' &&
    typeof b.sellerId === 'string' &&
    typeof b.orderId === 'string' &&
    typeof b.itemType === 'string' &&
    typeof b.itemId === 'string' &&
    typeof b.description === 'string'
  );
};

const validateEscrowRequest = (body: unknown): body is EscrowRelease => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.orderId === 'string' &&
    ['full', 'partial'].includes(b.releaseType as string) &&
    typeof b.reason === 'string' &&
    (b.releaseType === 'partial' ? typeof b.amount === 'number' : true)
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
      case 'create_payment_intent': {
        const paymentData = payload as PaymentIntent;

        if (!validatePaymentRequest(paymentData)) {
          return new Response(JSON.stringify({ error: 'Invalid payment data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if buyer has sufficient balance for escrow
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', paymentData.buyerId)
          .single();

        if (!buyerProfile || buyerProfile.wallet_balance < paymentData.amount) {
          return new Response(JSON.stringify({ error: 'Insufficient wallet balance' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create Stripe PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(paymentData.amount * 100), // Convert to cents
          currency: paymentData.currency,
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            orderId: paymentData.orderId,
            buyerId: paymentData.buyerId,
            sellerId: paymentData.sellerId,
            itemType: paymentData.itemType,
            itemId: paymentData.itemId,
          },
          description: paymentData.description,
          application_fee_amount: Math.round(paymentData.amount * 0.05 * 100), // 5% platform fee
          transfer_data: {
            destination: paymentData.sellerId, // This would be connected account ID in production
          },
        });

        // Create escrow record
        await supabase.from('escrow_transactions').insert({
          order_id: paymentData.orderId,
          buyer_id: paymentData.buyerId,
          seller_id: paymentData.sellerId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: 'held',
          stripe_payment_intent_id: paymentIntent.id,
          platform_fee: paymentData.amount * 0.05,
        });

        return new Response(JSON.stringify({
          success: true,
          paymentIntent: {
            id: paymentIntent.id,
            client_secret: paymentIntent.client_secret,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          }
        }), { headers: corsHeaders });
      }

      case 'confirm_payment': {
        const { paymentIntentId, orderId } = payload;

        // Confirm payment with Stripe
        const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
          // Update escrow status
          await supabase
            .from('escrow_transactions')
            .update({
              status: 'confirmed',
              confirmed_at: new Date().toISOString()
            })
            .eq('stripe_payment_intent_id', paymentIntentId);

          // Update order status
          await supabase
            .from('orders')
            .update({
              status: 'paid',
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

          // Award XP for successful purchase
          await supabase.rpc('award_xp', {
            p_user_id: payload.buyerId,
            p_event_type: 'purchase_completed',
            p_xp_amount: 50,
            p_description: `Completed purchase for order ${orderId}`
          });

          // Send notification to seller
          await supabase.functions.invoke('realtime-notifications', {
            body: {
              action: 'send_template_notification',
              payload: {
                userId: payload.sellerId,
                templateName: 'order_placed',
                templateVars: {
                  item_title: payload.itemTitle,
                  price: payload.amount
                }
              }
            }
          });

          return new Response(JSON.stringify({
            success: true,
            status: 'confirmed'
          }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({
          error: 'Payment confirmation failed'
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      case 'release_escrow': {
        const escrowData = payload as EscrowRelease;

        if (!validateEscrowRequest(escrowData)) {
          return new Response(JSON.stringify({ error: 'Invalid escrow data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get escrow transaction
        const { data: escrow } = await supabase
          .from('escrow_transactions')
          .select('*')
          .eq('order_id', escrowData.orderId)
          .single();

        if (!escrow) {
          return new Response(JSON.stringify({ error: 'Escrow transaction not found' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        if (escrow.status !== 'confirmed') {
          return new Response(JSON.stringify({ error: 'Escrow not in confirmed state' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        const releaseAmount = escrowData.releaseType === 'full' ? escrow.amount : escrowData.amount;

        // Create transfer to seller
        const transfer = await stripe.transfers.create({
          amount: Math.round(releaseAmount * 100),
          currency: escrow.currency,
          destination: escrow.seller_id, // Connected account ID
          metadata: {
            order_id: escrowData.orderId,
            release_reason: escrowData.reason
          }
        });

        // Update escrow status
        await supabase
          .from('escrow_transactions')
          .update({
            status: escrowData.releaseType === 'full' ? 'released' : 'partially_released',
            released_amount: (escrow.released_amount || 0) + releaseAmount,
            released_at: new Date().toISOString()
          })
          .eq('id', escrow.id);

        // Update order status
        await supabase
          .from('orders')
          .update({
            status: escrowData.releaseType === 'full' ? 'completed' : 'shipped',
            updated_at: new Date().toISOString()
          })
          .eq('id', escrowData.orderId);

        return new Response(JSON.stringify({
          success: true,
          transfer: transfer.id,
          releasedAmount: releaseAmount
        }), { headers: corsHeaders });
      }

      case 'refund_payment': {
        const { orderId, amount, reason } = payload;

        // Get escrow transaction
        const { data: escrow } = await supabase
          .from('escrow_transactions')
          .select('*')
          .eq('order_id', orderId)
          .single();

        if (!escrow) {
          return new Response(JSON.stringify({ error: 'Escrow transaction not found' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        // Create refund
        const refund = await stripe.refunds.create({
          payment_intent: escrow.stripe_payment_intent_id,
          amount: amount ? Math.round(amount * 100) : undefined,
          reason: 'requested_by_customer',
          metadata: {
            order_id: orderId,
            refund_reason: reason
          }
        });

        // Update escrow status
        await supabase
          .from('escrow_transactions')
          .update({
            status: 'refunded',
            refunded_amount: (escrow.refunded_amount || 0) + (amount || escrow.amount),
            refunded_at: new Date().toISOString()
          })
          .eq('id', escrow.id);

        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        return new Response(JSON.stringify({
          success: true,
          refund: refund.id
        }), { headers: corsHeaders });
      }

      case 'get_wallet_balance': {
        const { userId } = payload;

        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .single();

        return new Response(JSON.stringify({
          success: true,
          balance: profile?.wallet_balance || 0
        }), { headers: corsHeaders });
      }

      case 'add_wallet_funds': {
        const { userId, amount, paymentMethodId } = payload;

        // Create payment intent for wallet top-up
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: 'usd',
          payment_method: paymentMethodId,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            user_id: userId,
            type: 'wallet_topup'
          }
        });

        if (paymentIntent.status === 'succeeded') {
          // Update wallet balance
          await supabase.rpc('update_wallet_balance', {
            p_user_id: userId,
            p_amount: amount,
            p_type: 'credit',
            p_description: `Wallet top-up of $${amount}`
          });

          return new Response(JSON.stringify({
            success: true,
            newBalance: await getWalletBalance(userId)
          }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({
          error: 'Payment failed'
        }), {
          status: 400,
          headers: corsHeaders
        });
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
    console.error('Error in payment-processor:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

async function getWalletBalance(userId: string): Promise<number> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .single();

  return profile?.wallet_balance || 0;
}