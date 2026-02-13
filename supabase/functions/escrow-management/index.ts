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
      case 'release_funds': {
        const { escrowId, userId } = payload;

        // Verify user is the buyer
        const { data: escrow } = await supabase
          .from('escrow_accounts')
          .select('*, orders(*)')
          .eq('id', escrowId)
          .single();

        if (!escrow || escrow.buyer_id !== userId) {
          throw new Error('Unauthorized to release funds');
        }

        if (escrow.status !== 'held') {
          throw new Error('Funds already processed');
        }

        // Release funds
        const { data: result, error } = await supabase.rpc('release_escrow_funds', {
          p_escrow_id: escrowId,
          p_released_by: userId
        });

        if (error) throw error;

        // Send notification to seller
        await supabase.functions.invoke('realtime-notifications', {
          body: {
            action: 'send_template_notification',
            payload: {
              userId: escrow.seller_id,
              templateName: 'payment_received',
              templateVars: {
                amount: escrow.seller_amount,
                item_title: 'Gaming Item'
              }
            }
          }
        });

        return new Response(JSON.stringify({
          success: true,
          message: 'Funds released successfully'
        }), { headers: corsHeaders });
      }

      case 'create_dispute': {
        const { escrowId, userId, reason, description, evidenceUrls } = payload;

        // Verify user is buyer or seller
        const { data: escrow } = await supabase
          .from('escrow_accounts')
          .select('*')
          .eq('id', escrowId)
          .single();

        if (!escrow || (escrow.buyer_id !== userId && escrow.seller_id !== userId)) {
          throw new Error('Unauthorized to create dispute');
        }

        // Create dispute
        const { data: dispute, error } = await supabase
          .from('payment_disputes')
          .insert({
            escrow_id: escrowId,
            initiated_by: userId,
            reason,
            description,
            evidence_urls: evidenceUrls,
            status: 'open'
          })
          .select()
          .single();

        if (error) throw error;

        // Update escrow status
        await supabase
          .from('escrow_accounts')
          .update({
            status: 'disputed',
            dispute_reason: reason,
            updated_at: new Date().toISOString()
          })
          .eq('id', escrowId);

        // Notify the other party
        const otherPartyId = escrow.buyer_id === userId ? escrow.seller_id : escrow.buyer_id;
        await supabase.functions.invoke('realtime-notifications', {
          body: {
            action: 'send_notification',
            payload: {
              userId: otherPartyId,
              type: 'dispute',
              title: 'Payment Dispute Created',
              message: `A dispute has been created for order #${escrow.order_id}. Reason: ${reason}`,
              priority: 'high'
            }
          }
        });

        return new Response(JSON.stringify({
          success: true,
          dispute: dispute
        }), { headers: corsHeaders });
      }

      case 'resolve_dispute': {
        const { disputeId, resolution, resolutionAmount, adminNotes, resolvedBy } = payload;

        // Verify the caller is an admin
        if (!resolvedBy) {
          throw new Error('Authentication required');
        }
        const { data: isAdminUser } = await supabase.rpc('has_role', {
          _user_id: resolvedBy,
          _role: 'admin'
        });
        if (!isAdminUser) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: corsHeaders
          });
        }

        const { data: dispute, error: disputeError } = await supabase
          .from('payment_disputes')
          .select('*, escrow_accounts(*)')
          .eq('id', disputeId)
          .single();

        if (disputeError || !dispute) {
          throw new Error('Dispute not found');
        }

        // Update dispute
        await supabase
          .from('payment_disputes')
          .update({
            status: 'resolved',
            resolution,
            resolution_amount: resolutionAmount,
            resolved_by: resolvedBy,
            admin_notes: adminNotes,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', disputeId);

        // Process resolution
        if (resolution === 'buyer_refunded') {
          await supabase.rpc('refund_escrow_funds', {
            p_escrow_id: dispute.escrow_accounts.id
          });
        } else if (resolution === 'seller_paid') {
          await supabase.rpc('release_escrow_funds', {
            p_escrow_id: dispute.escrow_accounts.id,
            p_released_by: resolvedBy
          });
        } else if (resolution === 'split_payment') {
          // Handle split payment logic
          const buyerAmount = resolutionAmount;
          const sellerAmount = dispute.escrow_accounts.total_amount - buyerAmount;

          // Refund buyer portion
          await supabase
            .from('wallet_transactions')
            .insert({
              user_id: dispute.escrow_accounts.buyer_id,
              amount: buyerAmount,
              type: 'credit',
              description: `Partial refund from dispute resolution for order #${dispute.escrow_accounts.order_id}`,
              escrow_id: dispute.escrow_accounts.id
            });

          // Pay seller portion
          await supabase
            .from('wallet_transactions')
            .insert({
              user_id: dispute.escrow_accounts.seller_id,
              amount: sellerAmount,
              type: 'credit',
              description: `Partial payment from dispute resolution for order #${dispute.escrow_accounts.order_id}`,
              escrow_id: dispute.escrow_accounts.id
            });

          // Update balances
          await supabase
            .from('profiles')
            .update({
              wallet_balance: supabase.raw('wallet_balance + ?', [buyerAmount]),
              updated_at: new Date().toISOString()
            })
            .eq('id', dispute.escrow_accounts.buyer_id);

          await supabase
            .from('profiles')
            .update({
              wallet_balance: supabase.raw('wallet_balance + ?', [sellerAmount]),
              total_earnings: supabase.raw('total_earnings + ?', [sellerAmount]),
              updated_at: new Date().toISOString()
            })
            .eq('id', dispute.escrow_accounts.seller_id);
        }

        // Update escrow status
        await supabase
          .from('escrow_accounts')
          .update({
            status: 'disputed',
            dispute_resolution: resolution,
            dispute_resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', dispute.escrow_accounts.id);

        return new Response(JSON.stringify({
          success: true,
          message: 'Dispute resolved successfully'
        }), { headers: corsHeaders });
      }

      case 'get_escrow_status': {
        const { escrowId, userId } = payload;

        const { data: escrow, error } = await supabase
          .from('escrow_accounts')
          .select(`
            *,
            orders(*),
            payment_disputes(*),
            payments(*)
          `)
          .eq('id', escrowId)
          .single();

        if (error || !escrow) {
          throw new Error('Escrow not found');
        }

        // Verify user has access
        if (escrow.buyer_id !== userId && escrow.seller_id !== userId) {
          throw new Error('Unauthorized');
        }

        return new Response(JSON.stringify({
          success: true,
          escrow
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
    console.error('Error in escrow-management:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Escrow operation failed'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});