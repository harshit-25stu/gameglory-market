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

// Initialize Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface StreamModerationRequest {
  streamId: string;
  action: 'moderate_message' | 'timeout_user' | 'ban_user' | 'delete_message' | 'feature_message';
  targetUserId?: string;
  messageId?: string;
  reason?: string;
  duration?: number; // for timeouts in minutes
}

interface InteractiveFeature {
  streamId: string;
  featureType: 'poll' | 'giveaway' | 'q_and_a' | 'raid';
  title: string;
  options?: string[];
  duration?: number;
  prize?: string;
  targetStreamer?: string;
}

const validateModerationRequest = (body: unknown): body is StreamModerationRequest => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.streamId === 'string' &&
    typeof b.action === 'string' &&
    ['moderate_message', 'timeout_user', 'ban_user', 'delete_message', 'feature_message'].includes(b.action as string)
  );
};

const validateInteractiveRequest = (body: unknown): body is InteractiveFeature => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.streamId === 'string' &&
    typeof b.featureType === 'string' &&
    typeof b.title === 'string'
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
      case 'moderate_content': {
        const moderationData = payload as StreamModerationRequest;

        if (!validateModerationRequest(moderationData)) {
          return new Response(JSON.stringify({ error: 'Invalid moderation data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if user has moderation permissions for this stream
        const { data: stream } = await supabase
          .from('live_streams')
          .select('host_id')
          .eq('id', moderationData.streamId)
          .single();

        if (!stream) {
          return new Response(JSON.stringify({ error: 'Stream not found' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        // TODO: Check if current user is moderator or streamer
        // For now, assume permission granted

        switch (moderationData.action) {
          case 'moderate_message':
            await moderateMessage(moderationData);
            break;
          case 'timeout_user':
            await timeoutUser(moderationData);
            break;
          case 'ban_user':
            await banUser(moderationData);
            break;
          case 'delete_message':
            await deleteMessage(moderationData);
            break;
          case 'feature_message':
            await featureMessage(moderationData);
            break;
        }

        // Log moderation action
        await supabase.from('moderation_logs').insert({
          stream_id: moderationData.streamId,
          moderator_id: payload.moderatorId,
          action: moderationData.action,
          target_user_id: moderationData.targetUserId,
          target_message_id: moderationData.messageId,
          reason: moderationData.reason,
          duration: moderationData.duration
        });

        return new Response(JSON.stringify({
          success: true,
          action: moderationData.action
        }), { headers: corsHeaders });
      }

      case 'create_interactive_feature': {
        const featureData = payload as InteractiveFeature;

        if (!validateInteractiveRequest(featureData)) {
          return new Response(JSON.stringify({ error: 'Invalid feature data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create interactive feature
        const { data: feature, error } = await supabase
          .from('stream_interactive_features')
          .insert({
            stream_id: featureData.streamId,
            feature_type: featureData.featureType,
            title: featureData.title,
            options: featureData.options,
            duration: featureData.duration,
            prize: featureData.prize,
            target_streamer: featureData.targetStreamer,
            is_active: true,
            created_by: payload.createdBy
          })
          .select()
          .single();

        if (error) throw error;

        // Notify stream viewers about new interactive feature
        await supabase
          .channel(`stream:${featureData.streamId}`)
          .send({
            type: 'broadcast',
            event: 'interactive_feature',
            payload: { feature }
          });

        return new Response(JSON.stringify({
          success: true,
          feature
        }), { headers: corsHeaders });
      }

      case 'submit_interactive_response': {
        const { featureId, userId, response, optionIndex } = payload;

        // Record user response
        const { error } = await supabase
          .from('interactive_responses')
          .insert({
            feature_id: featureId,
            user_id: userId,
            response: response,
            option_index: optionIndex
          });

        if (error) throw error;

        // Update feature statistics
        if (optionIndex !== undefined) {
          await updateFeatureStats(featureId, optionIndex);
        }

        return new Response(JSON.stringify({
          success: true
        }), { headers: corsHeaders });
      }

      case 'end_interactive_feature': {
        const { featureId } = payload;

        // End the feature
        const { error } = await supabase
          .from('stream_interactive_features')
          .update({
            is_active: false,
            ended_at: new Date().toISOString()
          })
          .eq('id', featureId);

        if (error) throw error;

        // Get final results
        const { data: results } = await supabase
          .from('interactive_responses')
          .select('option_index, count')
          .eq('feature_id', featureId);

        // Announce results in stream
        const { data: feature } = await supabase
          .from('stream_interactive_features')
          .select('*')
          .eq('id', featureId)
          .single();

        await supabase
          .channel(`stream:${feature.stream_id}`)
          .send({
            type: 'broadcast',
            event: 'feature_ended',
            payload: { feature, results }
          });

        return new Response(JSON.stringify({
          success: true,
          results
        }), { headers: corsHeaders });
      }

      case 'raid_stream': {
        const { fromStreamId, toStreamerId, viewerCount } = payload;

        // Create raid event
        const { data: raid, error } = await supabase
          .from('stream_raids')
          .insert({
            from_stream_id: fromStreamId,
            to_streamer_id: toStreamerId,
            viewer_count: viewerCount,
            initiated_by: payload.initiatedBy
          })
          .select()
          .single();

        if (error) throw error;

        // Notify target streamer
        await supabase.functions.invoke('realtime-notifications', {
          body: {
            action: 'send_notification',
            payload: {
              userId: toStreamerId,
              type: 'stream',
              title: 'Incoming Raid!',
              message: `You're being raided by ${viewerCount} viewers!`,
              data: { raidId: raid.id, fromStreamId }
            }
          }
        });

        return new Response(JSON.stringify({
          success: true,
          raid
        }), { headers: corsHeaders });
      }

      case 'update_stream_stats': {
        const { streamId, viewerCount, chatMessages, donations } = payload;

        // Update real-time stream statistics
        const { error } = await supabase
          .from('live_streams')
          .update({
            viewer_count: viewerCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', streamId);

        if (error) throw error;

        // Store streaming metrics
        await supabase.from('stream_metrics').insert({
          stream_id: streamId,
          viewer_count: viewerCount,
          chat_messages: chatMessages || 0,
          donations: donations || 0,
          recorded_at: new Date().toISOString()
        });

        return new Response(JSON.stringify({
          success: true
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
    console.error('Error in stream-moderation:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

async function moderateMessage(data: StreamModerationRequest) {
  // Use AI to moderate message content
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  // Get the message content
  const { data: message } = await supabase
    .from('live_stream_messages')
    .select('message')
    .eq('id', data.messageId)
    .single();

  if (message) {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a stream moderation AI. Analyze chat messages for inappropriate content, spam, and violations of streaming guidelines."
          },
          {
            role: "user",
            content: `Analyze this chat message for moderation: "${message.message}"`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "moderate_message",
              description: "Decide if a message should be moderated",
              parameters: {
                type: "object",
                properties: {
                  shouldModerate: { type: "boolean" },
                  reason: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high"] }
                },
                required: ["shouldModerate"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "moderate_message" } }
      }),
    });

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const moderation = JSON.parse(toolCall.function.arguments);

      if (moderation.shouldModerate) {
        // Delete or hide the message
        await supabase
          .from('live_stream_messages')
          .update({ is_moderated: true, moderation_reason: moderation.reason })
          .eq('id', data.messageId);
      }
    }
  }
}

async function timeoutUser(data: StreamModerationRequest) {
  // Add user to timeout list for the stream
  await supabase.from('stream_timeouts').insert({
    stream_id: data.streamId,
    user_id: data.targetUserId,
    duration_minutes: data.duration || 10,
    reason: data.reason,
    moderated_by: data.moderatorId
  });
}

async function banUser(data: StreamModerationRequest) {
  // Ban user from the stream
  await supabase.from('stream_bans').insert({
    stream_id: data.streamId,
    user_id: data.targetUserId,
    reason: data.reason,
    banned_by: data.moderatorId,
    is_permanent: true
  });
}

async function deleteMessage(data: StreamModerationRequest) {
  await supabase
    .from('live_stream_messages')
    .update({ is_deleted: true })
    .eq('id', data.messageId);
}

async function featureMessage(data: StreamModerationRequest) {
  await supabase
    .from('live_stream_messages')
    .update({ is_featured: true })
    .eq('id', data.messageId);
}

async function updateFeatureStats(featureId: string, optionIndex: number) {
  // Update vote counts for polls
  const { data: existing } = await supabase
    .from('interactive_responses')
    .select('count')
    .eq('feature_id', featureId)
    .eq('option_index', optionIndex);

  const currentCount = existing?.[0]?.count || 0;

  await supabase
    .from('stream_interactive_features')
    .update({
      vote_counts: supabase.sql`vote_counts[${optionIndex}] = ${currentCount + 1}`
    })
    .eq('id', featureId);
}