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
    const { action, payload } = await req.json();

    switch (action) {
      case 'create_payout_request': {
        const { userId, amount, paymentMethodId, notes } = payload;

        // Get user balance and payment settings
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .single();

        const { data: settings } = await supabase
          .from('payment_settings')
          .select('*')
          .single();

        if (!profile || profile.wallet_balance < amount) {
          throw new Error('Insufficient balance');
        }

        if (settings && amount < settings.minimum_payout) {
          throw new Error(`Minimum payout amount is $${settings.minimum_payout}`);
        }

        // Verify payment method belongs to user
        const { data: paymentMethod } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('id', paymentMethodId)
          .eq('user_id', userId)
          .single();

        if (!paymentMethod) {
          throw new Error('Invalid payment method');
        }

        const payoutFee = 0.25; // Fixed fee for now
        const netAmount = amount - payoutFee;

        // Create payout request
        const { data: payoutRequest, error } = await supabase
          .from('payout_requests')
          .insert({
            user_id: userId,
            amount,
            payment_method_id: paymentMethodId,
            fee_amount: payoutFee,
            net_amount: netAmount,
            notes,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          payoutRequest
        }), { headers: corsHeaders });
      }

      case 'process_payout': {
        const { payoutRequestId, adminUserId } = payload;

        // Get payout request
        const { data: payoutRequest, error: requestError } = await supabase
          .from('payout_requests')
          .select(`
            *,
            payment_methods(*),
            profiles(*)
          `)
          .eq('id', payoutRequestId)
          .single();

        if (requestError || !payoutRequest) {
          throw new Error('Payout request not found');
        }

        if (payoutRequest.status !== 'pending') {
          throw new Error('Payout request already processed');
        }

        try {
          // Create Stripe transfer
          const transfer = await stripe.transfers.create({
            amount: Math.round(payoutRequest.net_amount * 100),
            currency: 'usd',
            destination: payoutRequest.payment_methods.provider_payment_method_id,
            metadata: {
              payout_request_id: payoutRequestId,
              user_id: payoutRequest.user_id,
            },
            description: `GameGlory Market payout for ${payoutRequest.profiles.username}`,
          });

          // Update payout request
          await supabase
            .from('payout_requests')
            .update({
              status: 'completed',
              provider_payout_id: transfer.id,
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', payoutRequestId);

          // Deduct from wallet
          await supabase
            .from('profiles')
            .update({
              wallet_balance: supabase.raw('wallet_balance - ?', [payoutRequest.amount]),
              updated_at: new Date().toISOString()
            })
            .eq('id', payoutRequest.user_id);

          // Create wallet transaction
          await supabase
            .from('wallet_transactions')
            .insert({
              user_id: payoutRequest.user_id,
              amount: -payoutRequest.amount,
              type: 'debit',
              description: `Payout processed - $${payoutRequest.net_amount} received`,
              reference_id: payoutRequestId
            });

          // Send notification
          await supabase.functions.invoke('realtime-notifications', {
            body: {
              action: 'send_notification',
              payload: {
                userId: payoutRequest.user_id,
                type: 'payout',
                title: 'Payout Processed!',
                message: `Your payout of $${payoutRequest.net_amount} has been processed successfully.`,
                priority: 'normal'
              }
            }
          });

          return new Response(JSON.stringify({
            success: true,
            message: 'Payout processed successfully'
          }), { headers: corsHeaders });

        } catch (stripeError) {
          // Update payout request as failed
          await supabase
            .from('payout_requests')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', payoutRequestId);

          throw new Error(`Stripe error: ${stripeError.message}`);
        }
      }

      case 'get_payout_history': {
        const { userId, limit = 20 } = payload;

        const { data: payouts, error } = await supabase
          .from('payout_requests')
          .select(`
            *,
            payment_methods(brand, last_four)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          payouts
        }), { headers: corsHeaders });
      }

      case 'get_available_balance': {
        const { userId } = payload;

        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .single();

        const { data: pendingPayouts } = await supabase
          .from('payout_requests')
          .select('amount')
          .eq('user_id', userId)
          .eq('status', 'pending');

        const pendingAmount = pendingPayouts?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const availableBalance = (profile?.wallet_balance || 0) - pendingAmount;

        return new Response(JSON.stringify({
          success: true,
          availableBalance,
          totalBalance: profile?.wallet_balance || 0,
          pendingAmount
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
    console.error('Error in payout-management:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Payout operation failed'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});