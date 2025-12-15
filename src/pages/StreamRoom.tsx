import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, Radio, Users, ArrowLeft, ExternalLink } from "lucide-react";

interface Message {
  id: string;
  message: string;
  created_at: string;
  user: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const StreamRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id || null);
    });
  }, []);

  const { data: stream, isLoading } = useQuery({
    queryKey: ["stream", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_streams")
        .select(`*, host:profiles(username, display_name, avatar_url)`)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Fetch initial messages
  useQuery({
    queryKey: ["stream-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_stream_messages")
        .select(`*, user:profiles(username, display_name, avatar_url)`)
        .eq("stream_id", id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
      return data;
    }
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`stream-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_stream_messages",
          filter: `stream_id=eq.${id}`
        },
        async (payload) => {
          const { data: userData } = await supabase
            .from("profiles")
            .select("username, display_name, avatar_url")
            .eq("id", payload.new.user_id)
            .single();

          const newMsg: Message = {
            id: payload.new.id,
            message: payload.new.message,
            created_at: payload.new.created_at,
            user: userData || { username: "Unknown", display_name: null, avatar_url: null }
          };

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !newMessage.trim()) throw new Error("Invalid message");

      const { error } = await supabase
        .from("live_stream_messages")
        .insert({
          stream_id: id,
          user_id: userId,
          message: newMessage.trim()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      navigate("/auth");
      return;
    }
    if (newMessage.trim()) {
      sendMessageMutation.mutate();
    }
  };

  const getEmbedUrl = () => {
    if (!stream?.stream_url) return null;
    
    const url = stream.stream_url.toLowerCase();
    
    if (stream.stream_platform === "twitch" || url.includes("twitch.tv")) {
      const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
      if (match) {
        return `https://player.twitch.tv/?channel=${match[1]}&parent=${window.location.hostname}`;
      }
    }
    
    if (stream.stream_platform === "youtube" || url.includes("youtube.com") || url.includes("youtu.be")) {
      let videoId = "";
      if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
      } else if (url.includes("v=")) {
        videoId = url.split("v=")[1]?.split("&")[0] || "";
      } else if (url.includes("/live/")) {
        videoId = url.split("/live/")[1]?.split("?")[0] || "";
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Stream not found</h1>
          <Button onClick={() => navigate("/streams")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Streams
          </Button>
        </div>
      </div>
    );
  }

  const embedUrl = getEmbedUrl();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <Button variant="ghost" onClick={() => navigate("/streams")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Streams
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Video Player */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="overflow-hidden">
              {embedUrl ? (
                <div className="aspect-video">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-4">
                  <Radio className="w-16 h-16 text-muted-foreground" />
                  <p className="text-muted-foreground">Stream embed not available</p>
                  <Button variant="outline" asChild>
                    <a href={stream.stream_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in new tab
                    </a>
                  </Button>
                </div>
              )}
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={stream.host?.avatar_url || undefined} />
                      <AvatarFallback>
                        {stream.host?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h1 className="text-xl font-bold">{stream.title}</h1>
                      <p className="text-muted-foreground">
                        {stream.host?.display_name || stream.host?.username}
                      </p>
                      {stream.description && (
                        <p className="text-sm text-muted-foreground mt-2">{stream.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {stream.is_live && (
                      <Badge variant="destructive" className="gap-1">
                        <Radio className="w-3 h-3 animate-pulse" />
                        LIVE
                      </Badge>
                    )}
                    <Badge variant="secondary" className="gap-1">
                      <Users className="w-3 h-3" />
                      {stream.viewer_count || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat */}
          <Card className="lg:col-span-1 flex flex-col h-[600px]">
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-lg">Live Chat</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={msg.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {msg.user?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-primary">
                        {msg.user?.display_name || msg.user?.username}
                      </span>
                      <span className="text-sm text-foreground ml-2">{msg.message}</span>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    No messages yet. Start the conversation!
                  </p>
                )}
              </div>
            </ScrollArea>
            <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2">
              <Input
                placeholder={userId ? "Send a message..." : "Login to chat"}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={!userId}
              />
              <Button type="submit" size="icon" disabled={!userId || !newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StreamRoom;
