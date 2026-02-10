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

// Create Supabase client for database operations
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
      case 'send_notification': {
        const { userId, type, title, message, data, priority, expiresHours } = payload;

        const { data: notification, error } = await supabase.rpc('send_notification', {
          p_user_id: userId,
          p_type: type,
          p_title: title,
          p_message: message,
          p_data: data || {},
          p_priority: priority || 'normal',
          p_expires_hours: expiresHours
        });

        if (error) throw error;

        // Trigger real-time notification via Supabase Realtime
        await supabase
          .channel(`notifications:${userId}`)
          .send({
            type: 'broadcast',
            event: 'new_notification',
            payload: { notificationId: notification }
          });

        return new Response(JSON.stringify({
          success: true,
          notificationId: notification
        }), { headers: corsHeaders });
      }

      case 'send_template_notification': {
        const { userId, templateName, templateVars } = payload;

        const { data: notification, error } = await supabase.rpc('send_notification_from_template', {
          p_user_id: userId,
          p_template_name: templateName,
          p_template_vars: templateVars || {}
        });

        if (error) throw error;

        // Trigger real-time notification
        await supabase
          .channel(`notifications:${userId}`)
          .send({
            type: 'broadcast',
            event: 'new_notification',
            payload: { notificationId: notification }
          });

        return new Response(JSON.stringify({
          success: true,
          notificationId: notification
        }), { headers: corsHeaders });
      }

      case 'mark_as_read': {
        const { notificationId, userId } = payload;

        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('user_id', userId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      case 'mark_all_as_read': {
        const { userId } = payload;

        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
          .eq('is_read', false);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      case 'get_unread_count': {
        const { userId } = payload;

        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          count: count || 0
        }), { headers: corsHeaders });
      }

      case 'bulk_send': {
        const { notifications } = payload;

        for (const notification of notifications) {
          const { userId, type, title, message, data, priority } = notification;

          await supabase.rpc('send_notification', {
            p_user_id: userId,
            p_type: type,
            p_title: title,
            p_message: message,
            p_data: data || {},
            p_priority: priority || 'normal'
          });
        }

        return new Response(JSON.stringify({
          success: true,
          sent: notifications.length
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
    console.error('Error in realtime-notifications:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});