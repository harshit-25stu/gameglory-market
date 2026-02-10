import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Users, Plus, Phone, PhoneOff, MessageCircle, Loader2 } from "lucide-react";
import { RealtimeChat } from "@/utils/RealtimeAudio";

const Hangouts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    game_title: "",
  });
  
  // Voice chat state
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMessages, setVoiceMessages] = useState<string[]>([]);
  const chatRef = useRef<RealtimeChat | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["hangout-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hangout_rooms")
        .select(`
          *,
          host:profiles!hangout_rooms_host_id_fkey(username),
          participants:hangout_participants(count)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as any;
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("hangout_rooms")
        .insert({
          ...formData,
          host_id: userId,
          status: "active",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hangout-rooms"] });
      setOpen(false);
      setFormData({ name: "", description: "", game_title: "" });
      toast({ title: "Hangout room created!" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create hangout room",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      navigate("/auth");
      return;
    }
    createRoomMutation.mutate();
  };

  // Voice chat handlers
  const handleVoiceMessage = (event: any) => {
    console.log('Voice event:', event.type);
    
    if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
    } else if (event.type === 'response.audio_transcript.delta') {
      // Accumulate transcript
    } else if (event.type === 'response.audio_transcript.done') {
      if (event.transcript) {
        setVoiceMessages(prev => [...prev, `AI: ${event.transcript}`]);
      }
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      if (event.transcript) {
        setVoiceMessages(prev => [...prev, `You: ${event.transcript}`]);
      }
    }
  };

  const startVoiceChat = async () => {
    try {
      setIsConnecting(true);
      
      // Request microphone access first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      chatRef.current = new RealtimeChat(handleVoiceMessage);
      await chatRef.current.init();
      setIsVoiceConnected(true);
      
      toast({
        title: "Voice Chat Connected",
        description: "You can now talk with the AI assistant",
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
    setVoiceMessages([]);
    
    toast({
      title: "Voice Chat Ended",
      description: "Disconnected from AI assistant",
    });
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Player Hangouts</h1>
              <p className="text-muted-foreground">
                Voice chat with friends and meet new players
              </p>
            </div>
            
            <div className="flex gap-3">
              {/* AI Voice Assistant */}
              {!isVoiceConnected ? (
                <Button
                  onClick={startVoiceChat}
                  variant="outline"
                  disabled={isConnecting}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Talk to AI Assistant
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={endVoiceChat}
                  variant="destructive"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  End Voice Chat
                </Button>
              )}

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Hangout
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Hangout Room</DialogTitle>
                    <DialogDescription>
                      Set up a voice chat room for your gaming session
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Room Name</Label>
                      <Input
                        id="name"
                        placeholder="Chill Gaming Session"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Just hanging out and playing games..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="game_title">Game (Optional)</Label>
                      <Input
                        id="game_title"
                        placeholder="Valorant, CS2, etc."
                        value={formData.game_title}
                        onChange={(e) => setFormData({ ...formData, game_title: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Create Room
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Voice Chat Panel */}
          {isVoiceConnected && (
            <Card className="mb-8 border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-primary'}`} />
                  AI Voice Assistant
                  {isSpeaking && <span className="text-sm font-normal text-muted-foreground">(Speaking...)</span>}
                </CardTitle>
                <CardDescription>
                  Ask about games, communities, or get help navigating PlayHub
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {voiceMessages.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Start speaking to interact with the AI assistant...
                    </p>
                  ) : (
                    voiceMessages.slice(-5).map((msg, i) => (
                      <div 
                        key={i} 
                        className={`text-sm p-2 rounded ${
                          msg.startsWith('You:') 
                            ? 'bg-muted ml-4' 
                            : 'bg-primary/10 mr-4'
                        }`}
                      >
                        {msg}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading hangout rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No active hangouts. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <Card
                  key={room.id}
                  className="cursor-pointer hover:border-primary transition-colors group"
                  onClick={() => navigate(`/hangout/${room.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <span>{room.name}</span>
                      <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {room.participants?.[0]?.count || 0}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {room.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {room.game_title && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Playing: </span>
                          <span className="font-medium">{room.game_title}</span>
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        Hosted by {room.host?.username || "Unknown"}
                      </div>
                      <Button size="sm" variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Phone className="w-4 h-4 mr-2" />
                        Join Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Hangouts;
