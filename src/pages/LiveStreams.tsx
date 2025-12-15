import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Radio, Users, Play, Tv } from "lucide-react";

const LiveStreams = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    stream_url: "",
    stream_platform: "twitch"
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id || null);
    });
  }, []);

  const { data: streams, isLoading } = useQuery({
    queryKey: ["live-streams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_streams")
        .select(`*, host:profiles(username, display_name, avatar_url)`)
        .eq("is_live", true)
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createStreamMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("live_streams")
        .insert({
          host_id: userId,
          ...formData
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-streams"] });
      toast.success("Stream created!");
      setIsDialogOpen(false);
      setFormData({ title: "", description: "", stream_url: "", stream_platform: "twitch" });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = () => {
    if (!userId) {
      navigate("/auth");
      return;
    }
    createStreamMutation.mutate();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "twitch":
        return <Tv className="w-4 h-4 text-purple-500" />;
      case "youtube":
        return <Play className="w-4 h-4 text-red-500" />;
      default:
        return <Radio className="w-4 h-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "twitch":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "youtube":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Live Streams</h1>
            <p className="text-muted-foreground mt-1">Watch gaming streams with the community</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Go Live
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a Stream</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Stream Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <Select
                  value={formData.stream_platform}
                  onValueChange={(value) => setFormData({ ...formData, stream_platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twitch">Twitch</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Stream URL (e.g., twitch.tv/username)"
                  value={formData.stream_url}
                  onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                />
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={!formData.title || !formData.stream_url}
                >
                  Start Streaming
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : streams?.length === 0 ? (
          <Card className="text-center p-12">
            <Radio className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Live Streams</h3>
            <p className="text-muted-foreground mb-4">Be the first to go live!</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Start Streaming
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams?.map((stream) => (
              <Card 
                key={stream.id} 
                className="cursor-pointer hover:border-primary/50 transition-all group overflow-hidden"
                onClick={() => navigate(`/streams/${stream.id}`)}
              >
                <div className="relative h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge variant="destructive" className="gap-1">
                      <Radio className="w-3 h-3 animate-pulse" />
                      LIVE
                    </Badge>
                    <Badge className={getPlatformColor(stream.stream_platform)}>
                      {getPlatformIcon(stream.stream_platform)}
                      <span className="ml-1 capitalize">{stream.stream_platform}</span>
                    </Badge>
                  </div>
                  <Play className="w-16 h-16 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold truncate">{stream.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {stream.host?.display_name || stream.host?.username}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{stream.viewer_count || 0} viewers</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveStreams;
