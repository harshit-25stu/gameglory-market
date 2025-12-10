import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Phone, PhoneOff, Send, Users, Volume2, VolumeX } from "lucide-react";
import { RealtimeChat } from "@/utils/RealtimeAudio";

const HangoutRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // AI Voice chat state
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  // Fetch room details
  const { data: room, isLoading } = useQuery({
    queryKey: ["hangout-room", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hangout_rooms")
        .select(`
          *,
          host:profiles!hangout_rooms_host_id_fkey(username, avatar_url)
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Fetch participants with presence
  const { data: participants = [] } = useQuery({
    queryKey: ["hangout-participants", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hangout_participants")
        .select(`
          *,
          profile:profiles!hangout_participants_user_id_fkey(username, avatar_url)
        `)
        .eq("room_id", id);
      
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ["hangout-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hangout_messages")
        .select(`
          *,
          profile:profiles!hangout_messages_user_id_fkey(username, avatar_url)
        `)
        .eq("room_id", id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Check if user is participant
  const isParticipant = participants.some((p: any) => p.user_id === userId);
  const isHost = room?.host_id === userId;

  // Join room mutation
  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("hangout_participants")
        .insert({ room_id: id, user_id: userId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hangout-participants", id] });
      toast({ title: "Joined the hangout!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join room",
        variant: "destructive",
      });
    },
  });

  // Leave room mutation
  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("hangout_participants")
        .delete()
        .eq("room_id", id)
        .eq("user_id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hangout-participants", id] });
      toast({ title: "Left the hangout" });
      navigate("/hangouts");
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      if (!userId || !id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("hangout_messages")
        .insert({ room_id: id, user_id: userId, message: msg });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["hangout-messages", id] });
    },
  });

  // Update mute status
  const toggleMute = async () => {
    if (!userId || !id) return;
    
    const newMuteStatus = !isMuted;
    setIsMuted(newMuteStatus);
    
    await supabase
      .from("hangout_participants")
      .update({ is_muted: newMuteStatus })
      .eq("room_id", id)
      .eq("user_id", userId);
  };

  // Update presence (last_seen)
  useEffect(() => {
    if (!isParticipant || !id || !userId) return;

    const updatePresence = async () => {
      await supabase
        .from("hangout_participants")
        .update({ last_seen: new Date().toISOString() })
        .eq("room_id", id)
        .eq("user_id", userId);
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [isParticipant, id, userId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`hangout-room-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hangout_participants",
          filter: `room_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["hangout-participants", id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hangout_messages",
          filter: `room_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["hangout-messages", id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Presence tracking with Supabase Realtime
  useEffect(() => {
    if (!id || !userId || !isParticipant) return;

    const presenceChannel = supabase.channel(`presence-${id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('Presence state:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [id, userId, isParticipant]);

  // Voice chat handlers
  const handleVoiceMessage = (event: any) => {
    if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
    }
  };

  const startVoiceChat = async () => {
    try {
      setIsConnecting(true);
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      chatRef.current = new RealtimeChat(handleVoiceMessage);
      await chatRef.current.init();
      setIsVoiceConnected(true);
      
      toast({
        title: "Voice Chat Connected",
        description: "AI assistant is now listening",
      });
    } catch (error) {
      console.error('Error starting voice chat:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to start voice chat',
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const endVoiceChat = () => {
    chatRef.current?.disconnect();
    chatRef.current = null;
    setIsVoiceConnected(false);
    setIsSpeaking(false);
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userId && !isLoading) {
      navigate("/auth");
    }
  }, [userId, isLoading, navigate]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Loading hangout...</p>
        </div>
      </>
    );
  }

  if (!room) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-destructive">Hangout room not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Area */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{room.name}</h1>
                  {room.game_title && (
                    <p className="text-muted-foreground">Playing: {room.game_title}</p>
                  )}
                </div>
                
                {isParticipant && (
                  <div className="flex gap-2">
                    <Button
                      variant={isMuted ? "destructive" : "outline"}
                      size="icon"
                      onClick={toggleMute}
                    >
                      {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                    
                    {!isVoiceConnected ? (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={startVoiceChat}
                        disabled={isConnecting}
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={endVoiceChat}
                      >
                        <VolumeX className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="destructive"
                      onClick={() => leaveRoomMutation.mutate()}
                    >
                      <PhoneOff className="w-4 h-4 mr-2" />
                      Leave
                    </Button>
                  </div>
                )}
              </div>

              {room.description && (
                <p className="text-muted-foreground">{room.description}</p>
              )}

              {/* Voice Status */}
              {isVoiceConnected && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-primary'}`} />
                      <span className="text-sm">AI Assistant {isSpeaking ? 'speaking...' : 'listening'}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Participants Grid */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Participants ({participants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {participants.map((participant: any) => {
                      const isOnline = participant.last_seen && 
                        (Date.now() - new Date(participant.last_seen).getTime()) < 60000;
                      
                      return (
                        <div
                          key={participant.id}
                          className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarFallback>
                                {participant.profile?.username?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                              isOnline ? 'bg-green-500' : 'bg-muted-foreground'
                            }`} />
                            {participant.is_speaking && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                <Volume2 className="w-2 h-2 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium text-center truncate w-full">
                            {participant.profile?.username || "Unknown"}
                            {participant.user_id === room.host_id && " 👑"}
                          </span>
                          {participant.is_muted && (
                            <MicOff className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {!isParticipant && (
                <Button
                  onClick={() => joinRoomMutation.mutate()}
                  className="w-full bg-gradient-primary"
                  size="lg"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Join Hangout
                </Button>
              )}
            </div>

            {/* Sidebar - Chat */}
            <div className="space-y-4">
              <Card className="h-[calc(100vh-12rem)]">
                <CardHeader>
                  <CardTitle>Chat</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col h-[calc(100%-5rem)]">
                  <ScrollArea className="flex-1 mb-4 pr-4">
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">
                          No messages yet. Start the conversation!
                        </p>
                      ) : (
                        messages.map((msg: any) => (
                          <div key={msg.id} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">
                                  {msg.profile?.username?.[0]?.toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {msg.profile?.username || "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground ml-8">{msg.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  
                  {isParticipant && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && message.trim()) {
                            sendMessageMutation.mutate(message);
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={() => message.trim() && sendMessageMutation.mutate(message)}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HangoutRoom;
