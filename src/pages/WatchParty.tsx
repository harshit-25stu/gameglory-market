import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Users, Send } from "lucide-react";

const WatchParty = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  // Fetch watch party details
  const { data: party, isLoading } = useQuery({
    queryKey: ["watch-party", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_parties")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      setIsHost(data.host_id === userId);
      return data;
    },
    enabled: !!id && !!userId,
  });

  // Fetch participants with profiles
  const { data: participants = [] } = useQuery({
    queryKey: ["watch-party-participants", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_party_participants")
        .select(`
          *,
          profile:profiles!watch_party_participants_user_id_fkey(username)
        `)
        .eq("party_id", id);
      
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Fetch messages with profiles
  const { data: messages = [] } = useQuery({
    queryKey: ["watch-party-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_party_messages")
        .select(`
          *,
          profile:profiles!watch_party_messages_user_id_fkey(username)
        `)
        .eq("party_id", id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Join party mutation
  const joinPartyMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("watch_party_participants")
        .insert({ party_id: id, user_id: userId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-party-participants", id] });
      toast({ title: "Joined watch party!" });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      if (!userId || !id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("watch_party_messages")
        .insert({ party_id: id, user_id: userId, message: msg });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["watch-party-messages", id] });
    },
  });

  // Sync video state mutation
  const syncVideoMutation = useMutation({
    mutationFn: async ({ eventType, videoTime }: { eventType: string; videoTime: number }) => {
      if (!userId || !id) throw new Error("Not authenticated");
      
      // Update party state
      const { error: partyError } = await supabase
        .from("watch_parties")
        .update({
          current_video_time: videoTime,
          is_playing: eventType === "play",
        })
        .eq("id", id);
      
      if (partyError) throw partyError;

      // Create event
      const { error: eventError } = await supabase
        .from("watch_party_events")
        .insert({
          party_id: id,
          event_type: eventType,
          video_time: videoTime,
          created_by: userId,
        });
      
      if (eventError) throw eventError;
    },
  });

  // Handle video controls (host only)
  const handlePlay = () => {
    if (!isHost || !videoRef.current) return;
    syncVideoMutation.mutate({
      eventType: "play",
      videoTime: videoRef.current.currentTime,
    });
  };

  const handlePause = () => {
    if (!isHost || !videoRef.current) return;
    syncVideoMutation.mutate({
      eventType: "pause",
      videoTime: videoRef.current.currentTime,
    });
  };

  const handleSeek = () => {
    if (!isHost || !videoRef.current) return;
    syncVideoMutation.mutate({
      eventType: "seek",
      videoTime: videoRef.current.currentTime,
    });
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`watch-party-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "watch_party_participants",
          filter: `party_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["watch-party-participants", id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "watch_party_messages",
          filter: `party_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["watch-party-messages", id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "watch_party_events",
          filter: `party_id=eq.${id}`,
        },
        (payload) => {
          // Sync video for non-hosts
          if (!isHost && videoRef.current && payload.new) {
            const event = payload.new as any;
            videoRef.current.currentTime = event.video_time;
            
            if (event.event_type === "play") {
              videoRef.current.play();
            } else if (event.event_type === "pause") {
              videoRef.current.pause();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, isHost, queryClient]);

  // Check if user is participant
  const isParticipant = participants.some((p) => p.user_id === userId);

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
          <p className="text-muted-foreground">Loading watch party...</p>
        </div>
      </>
    );
  }

  if (!party) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-destructive">Watch party not found</p>
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
            {/* Video Player */}
            <div className="lg:col-span-2 space-y-4">
              <h1 className="text-3xl font-bold">{party.title}</h1>
              {party.description && (
                <p className="text-muted-foreground">{party.description}</p>
              )}
              
              <div className="bg-card rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={party.video_url}
                  controls={isHost}
                  className="w-full aspect-video"
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSeeked={handleSeek}
                />
              </div>

              {!isParticipant && (
                <Button
                  onClick={() => joinPartyMutation.mutate()}
                  className="w-full"
                >
                  Join Watch Party
                </Button>
              )}

              {isHost && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => videoRef.current?.play()}
                    variant="outline"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Play for Everyone
                  </Button>
                  <Button
                    onClick={() => videoRef.current?.pause()}
                    variant="outline"
                    size="sm"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause for Everyone
                  </Button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Participants */}
              <div className="bg-card rounded-lg p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants ({participants.length})
                </h3>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {participant.profile?.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {participant.profile?.username || "Unknown"}
                          {participant.user_id === party.host_id && " (Host)"}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Chat */}
              {isParticipant && (
                <div className="bg-card rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Chat</h3>
                  <ScrollArea className="h-96 mb-4">
                    <div className="space-y-3">
                      {messages.map((msg) => (
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
                          </div>
                          <p className="text-sm text-muted-foreground ml-8">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WatchParty;
