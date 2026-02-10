import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Users,
  Zap,
  Shield,
  Star,
  Trophy,
  Vote,
  Gift,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Send,
  Heart,
  ThumbsUp,
  Crown,
  Target,
  Timer,
  Loader2
} from "lucide-react";

interface StreamMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  is_featured?: boolean;
  is_moderated?: boolean;
  user: {
    username: string;
    avatar_url?: string;
  };
}

interface InteractiveFeature {
  id: string;
  feature_type: 'poll' | 'giveaway' | 'q_and_a' | 'raid';
  title: string;
  options?: string[];
  is_active: boolean;
  vote_counts?: number[];
  duration?: number;
  ends_at?: string;
}

interface StreamStats {
  viewerCount: number;
  chatMessages: number;
  donations: number;
  interactiveEngagement: number;
}

export const StreamEnhancements = ({ streamId, isStreamer = false }: {
  streamId: string;
  isStreamer?: boolean;
}) => {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [pollTitle, setPollTitle] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [selectedPollOption, setSelectedPollOption] = useState<number | null>(null);

  // Fetch stream messages
  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['stream-messages', streamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_stream_messages')
        .select(`
          *,
          user:user_id (
            username,
            avatar_url
          )
        `)
        .eq('stream_id', streamId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data.reverse() as StreamMessage[];
    },
  });

  // Fetch active interactive features
  const { data: activeFeatures, refetch: refetchFeatures } = useQuery({
    queryKey: ['stream-features', streamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stream_interactive_features')
        .select('*')
        .eq('stream_id', streamId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InteractiveFeature[];
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`stream-chat:${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_stream_messages',
        filter: `stream_id=eq.${streamId}`
      }, (payload) => {
        refetchMessages();
      })
      .subscribe();

    // Subscribe to interactive features
    const featureChannel = supabase
      .channel(`stream-features:${streamId}`)
      .on('broadcast', { event: 'interactive_feature' }, (payload) => {
        refetchFeatures();
      })
      .on('broadcast', { event: 'feature_ended' }, (payload) => {
        refetchFeatures();
        toast({
          title: "Feature Ended",
          description: `${payload.feature.title} has concluded!`,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(featureChannel);
    };
  }, [streamId, refetchMessages, refetchFeatures, toast]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('live_stream_messages')
      .insert({
        stream_id: streamId,
        user_id: user.id,
        message: newMessage.trim()
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
    }
  };

  const createPoll = async () => {
    if (!pollTitle.trim() || pollOptions.filter(opt => opt.trim()).length < 2) {
      toast({
        title: "Invalid Poll",
        description: "Please provide a title and at least 2 options",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.functions.invoke('stream-moderation', {
        body: {
          action: 'create_interactive_feature',
          payload: {
            streamId,
            featureType: 'poll',
            title: pollTitle,
            options: pollOptions.filter(opt => opt.trim()),
            createdBy: user?.id
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Poll Created",
        description: "Your poll is now live!",
      });

      setPollTitle("");
      setPollOptions(["", ""]);
      refetchFeatures();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create poll",
        variant: "destructive",
      });
    }
  };

  const voteInPoll = async (featureId: string, optionIndex: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('stream-moderation', {
        body: {
          action: 'submit_interactive_response',
          payload: {
            featureId,
            userId: user.id,
            optionIndex
          }
        }
      });

      if (error) throw error;

      setSelectedPollOption(optionIndex);
      toast({
        title: "Vote Recorded",
        description: "Thanks for participating!",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "destructive",
      });
    }
  };

  const moderateMessage = async (messageId: string, action: string) => {
    if (!isStreamer) return;

    try {
      const { error } = await supabase.functions.invoke('stream-moderation', {
        body: {
          action: 'moderate_content',
          payload: {
            streamId,
            action: action,
            messageId,
            moderatorId: (await supabase.auth.getUser()).data.user?.id
          }
        }
      });

      if (error) throw error;

      refetchMessages();
      toast({
        title: "Moderated",
        description: `Message ${action}d successfully`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Moderation action failed",
        variant: "destructive",
      });
    }
  };

  const sendReaction = async (type: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('stream_reactions')
        .insert({
          stream_id: streamId,
          user_id: user.id,
          reaction_type: type
        });

      if (error) throw error;

      // Show temporary reaction animation
      toast({
        title: `❤️ ${type}`,
        description: "Reaction sent!",
        duration: 1000,
      });

    } catch (error) {
      // Ignore duplicate reactions
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chat Section */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Stream Chat
              <Badge variant="secondary">{messages?.length || 0} messages</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            <div className="h-96 overflow-y-auto space-y-2 p-2 border rounded">
              {messages?.map((message) => (
                <div key={message.id} className={`flex gap-2 ${message.is_featured ? 'bg-yellow-50 border border-yellow-200 p-2 rounded' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{message.user.username}</span>
                      {message.is_featured && <Crown className="w-3 h-3 text-yellow-500" />}
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className={`text-sm ${message.is_moderated ? 'text-muted-foreground italic' : ''}`}>
                      {message.is_moderated ? '[Message moderated]' : message.message}
                    </p>
                  </div>

                  {isStreamer && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moderateMessage(message.id, 'feature_message')}
                      >
                        <Star className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moderateMessage(message.id, 'delete_message')}
                      >
                        <Shield className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Reactions */}
            <div className="flex gap-2">
              {['❤️', '👍', '🎉', '🔥', '😮'].map((emoji) => (
                <Button
                  key={emoji}
                  variant="outline"
                  size="sm"
                  onClick={() => sendReaction(emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Features & Controls */}
      <div className="space-y-4">
        {/* Streamer Controls */}
        {isStreamer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Stream Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Vote className="w-4 h-4 mr-2" />
                    Create Poll
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Stream Poll</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Poll question..."
                      value={pollTitle}
                      onChange={(e) => setPollTitle(e.target.value)}
                    />
                    {pollOptions.map((option, index) => (
                      <Input
                        key={index}
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions];
                          newOptions[index] = e.target.value;
                          setPollOptions(newOptions);
                        }}
                      />
                    ))}
                    <Button
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      variant="outline"
                      size="sm"
                    >
                      Add Option
                    </Button>
                    <Button onClick={createPoll} className="w-full">
                      Launch Poll
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="w-full">
                <Gift className="w-4 h-4 mr-2" />
                Start Giveaway
              </Button>

              <Button variant="outline" className="w-full">
                <Mic className="w-4 h-4 mr-2" />
                Q&A Session
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active Interactive Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Interactive Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeFeatures?.length > 0 ? (
              <div className="space-y-4">
                {activeFeatures.map((feature) => (
                  <div key={feature.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Vote className="w-4 h-4" />
                      <span className="font-medium">{feature.title}</span>
                      <Badge variant="secondary">{feature.feature_type}</Badge>
                    </div>

                    {feature.feature_type === 'poll' && feature.options && (
                      <div className="space-y-2">
                        {feature.options.map((option, index) => {
                          const voteCount = feature.vote_counts?.[index] || 0;
                          const totalVotes = feature.vote_counts?.reduce((sum, count) => sum + count, 0) || 1;
                          const percentage = (voteCount / totalVotes) * 100;

                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">{option}</span>
                                <span className="text-sm text-muted-foreground">{voteCount} votes</span>
                              </div>
                              <Progress value={percentage} className="h-2" />

                              {!selectedPollOption && selectedPollOption !== 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-2"
                                  onClick={() => voteInPoll(feature.id, index)}
                                >
                                  Vote
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {feature.duration && (
                      <div className="flex items-center gap-2 mt-2">
                        <Timer className="w-4 h-4" />
                        <span className="text-sm text-muted-foreground">
                          {feature.duration} minutes remaining
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active features</p>
                <p className="text-sm">Interactive features will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stream Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Stream Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Viewers</span>
              <Badge variant="secondary">1,234</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Chat Messages</span>
              <Badge variant="secondary">{messages?.length || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Interactions</span>
              <Badge variant="secondary">89</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Donations</span>
              <Badge variant="secondary">$156.78</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};