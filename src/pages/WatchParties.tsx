import { useState, useEffect } from "react";
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
import { Calendar, Users, Video, Plus } from "lucide-react";

const WatchParties = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    scheduled_time: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ["watch-parties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_parties")
        .select(`
          *,
          host:profiles!watch_parties_host_id_fkey(username)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createPartyMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("watch_parties")
        .insert({
          ...formData,
          host_id: userId,
          status: "scheduled",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["watch-parties"] });
      setOpen(false);
      setFormData({ title: "", description: "", video_url: "", scheduled_time: "" });
      toast({ title: "Watch party created!" });
      navigate(`/watch-party/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create watch party",
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
    createPartyMutation.mutate();
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Watch Parties</h1>
              <p className="text-muted-foreground">
                Watch videos together with your gaming community in real-time
              </p>
            </div>
            
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Watch Party
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Watch Party</DialogTitle>
                  <DialogDescription>
                    Set up a synchronized viewing experience for your community
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Tournament Finals Watch Party"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Join us to watch the championship match..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="video_url">Video URL</Label>
                    <Input
                      id="video_url"
                      type="url"
                      placeholder="https://example.com/video.mp4"
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_time">Scheduled Time (Optional)</Label>
                    <Input
                      id="scheduled_time"
                      type="datetime-local"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Watch Party
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading watch parties...</p>
            </div>
          ) : parties.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No watch parties yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parties.map((party) => (
                <Card
                  key={party.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => navigate(`/watch-party/${party.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <span>{party.title}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        party.status === "live" ? "bg-red-500" :
                        party.status === "scheduled" ? "bg-primary" : "bg-muted"
                      }`}>
                        {party.status}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {party.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Hosted by {party.host?.username || "Unknown"}</span>
                    </div>
                      {party.scheduled_time && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(party.scheduled_time).toLocaleString()}</span>
                        </div>
                      )}
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

export default WatchParties;
