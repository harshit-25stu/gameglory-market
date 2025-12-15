import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trophy, Calendar, Users, Gamepad2, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const EsportsEvents = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    game_title: "",
    event_type: "tournament",
    start_time: "",
    prize_pool: "",
    stream_url: ""
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id || null);
    });
  }, []);

  const { data: events, isLoading } = useQuery({
    queryKey: ["esports-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("esports_events")
        .select(`*, creator:profiles(username, display_name)`)
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("esports_events")
        .insert({
          created_by: userId,
          title: formData.title,
          description: formData.description,
          game_title: formData.game_title,
          event_type: formData.event_type,
          start_time: formData.start_time,
          prize_pool: formData.prize_pool || null,
          stream_url: formData.stream_url || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["esports-events"] });
      toast.success("Event created!");
      setIsDialogOpen(false);
      setFormData({ title: "", description: "", game_title: "", event_type: "tournament", start_time: "", prize_pool: "", stream_url: "" });
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
    createEventMutation.mutate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live": return "bg-destructive text-destructive-foreground";
      case "upcoming": return "bg-primary text-primary-foreground";
      case "completed": return "bg-muted text-muted-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const upcomingEvents = events?.filter(e => e.status === "upcoming") || [];
  const liveEvents = events?.filter(e => e.status === "live") || [];
  const completedEvents = events?.filter(e => e.status === "completed") || [];

  const EventCard = ({ event }: { event: any }) => (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-all group overflow-hidden"
      onClick={() => navigate(`/esports/${event.id}`)}
    >
      <div className="relative h-32 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 flex items-center justify-center">
        <Trophy className="w-12 h-12 text-primary/50 group-hover:text-primary transition-colors" />
        <div className="absolute top-3 left-3">
          <Badge className={getStatusColor(event.status)}>
            {event.status === "live" ? "🔴 LIVE" : event.status.toUpperCase()}
          </Badge>
        </div>
        {event.prize_pool && (
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className="bg-background/80">
              💰 {event.prize_pool}
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg truncate">{event.title}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Gamepad2 className="w-4 h-4" />
          <span>{event.game_title}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Users className="w-4 h-4" />
          <span>{event.participant_count || 0} participants</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              Esports Events
            </h1>
            <p className="text-muted-foreground mt-1">Tournaments, matches & competitive gaming</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Esports Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Event Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <Textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <Input
                  placeholder="Game (e.g., Valorant, CS:GO)"
                  value={formData.game_title}
                  onChange={(e) => setFormData({ ...formData, game_title: e.target.value })}
                />
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tournament">Tournament</SelectItem>
                    <SelectItem value="match">Single Match</SelectItem>
                    <SelectItem value="league">League</SelectItem>
                    <SelectItem value="showmatch">Showmatch</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
                <Input
                  placeholder="Prize Pool (optional)"
                  value={formData.prize_pool}
                  onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                />
                <Input
                  placeholder="Stream URL (optional)"
                  value={formData.stream_url}
                  onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                />
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={!formData.title || !formData.game_title || !formData.start_time}
                >
                  Create Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="live" className="gap-2">
              🔴 Live ({liveEvents.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2">
              <Clock className="w-4 h-4" /> Upcoming ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <Trophy className="w-4 h-4" /> Completed ({completedEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            {liveEvents.length === 0 ? (
              <Card className="text-center p-12">
                <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Live Events</h3>
                <p className="text-muted-foreground">Check back later for live tournaments!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {upcomingEvents.length === 0 ? (
              <Card className="text-center p-12">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Upcoming Events</h3>
                <p className="text-muted-foreground mb-4">Be the first to create an esports event!</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedEvents.length === 0 ? (
              <Card className="text-center p-12">
                <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Completed Events</h3>
                <p className="text-muted-foreground">Past tournaments will appear here.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EsportsEvents;
