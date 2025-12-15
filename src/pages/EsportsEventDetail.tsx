import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Trophy, Calendar, Users, Gamepad2, Plus, Swords, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import InteractivePanel from "@/components/InteractivePanel";

const EsportsEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);
  const [matchForm, setMatchForm] = useState({
    team_a_name: "",
    team_b_name: "",
    round_number: 1,
    match_number: 1,
    scheduled_time: ""
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id || null);
    });
  }, []);

  const { data: event, isLoading } = useQuery({
    queryKey: ["esports-event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("esports_events")
        .select(`*, creator:profiles(username, display_name)`)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const { data: matches } = useQuery({
    queryKey: ["esports-matches", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("esports_matches")
        .select("*")
        .eq("event_id", id)
        .order("round_number", { ascending: true })
        .order("match_number", { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  // Subscribe to match updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`matches-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "esports_matches",
          filter: `event_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["esports-matches", id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const createMatchMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("esports_matches")
        .insert({
          event_id: id,
          ...matchForm,
          scheduled_time: matchForm.scheduled_time || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["esports-matches", id] });
      toast.success("Match added!");
      setIsMatchDialogOpen(false);
      setMatchForm({ team_a_name: "", team_b_name: "", round_number: 1, match_number: 1, scheduled_time: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const updateMatchMutation = useMutation({
    mutationFn: async ({ matchId, updates }: { matchId: string; updates: any }) => {
      const { error } = await supabase
        .from("esports_matches")
        .update(updates)
        .eq("id", matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["esports-matches", id] });
      toast.success("Match updated!");
    }
  });

  const isCreator = userId === event?.created_by;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live": return "bg-destructive text-destructive-foreground";
      case "completed": return "bg-green-500 text-white";
      case "pending": return "bg-muted text-muted-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  // Group matches by round
  const matchesByRound = matches?.reduce((acc: Record<number, any[]>, match) => {
    if (!acc[match.round_number]) acc[match.round_number] = [];
    acc[match.round_number].push(match);
    return acc;
  }, {}) || {};

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Event not found</h1>
          <Button onClick={() => navigate("/esports")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <Button variant="ghost" onClick={() => navigate("/esports")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        {/* Event Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(event.status)}>
                    {event.status === "live" ? "🔴 LIVE" : event.status.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{event.event_type}</Badge>
                </div>
                <h1 className="text-3xl font-bold">{event.title}</h1>
                {event.description && (
                  <p className="text-muted-foreground">{event.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Gamepad2 className="w-4 h-4" />
                    {event.game_title}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {event.participant_count || 0} participants
                  </span>
                  {event.prize_pool && (
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {event.prize_pool}
                    </span>
                  )}
                </div>
              </div>
              {event.stream_url && (
                <Button variant="outline" asChild>
                  <a href={event.stream_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Watch Stream
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bracket / Matches */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="bracket">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="bracket">Bracket</TabsTrigger>
                  <TabsTrigger value="matches">All Matches</TabsTrigger>
                </TabsList>
                {isCreator && (
                  <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Match
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Match</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Team A Name"
                          value={matchForm.team_a_name}
                          onChange={(e) => setMatchForm({ ...matchForm, team_a_name: e.target.value })}
                        />
                        <Input
                          placeholder="Team B Name"
                          value={matchForm.team_b_name}
                          onChange={(e) => setMatchForm({ ...matchForm, team_b_name: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            type="number"
                            placeholder="Round #"
                            value={matchForm.round_number}
                            onChange={(e) => setMatchForm({ ...matchForm, round_number: parseInt(e.target.value) || 1 })}
                          />
                          <Input
                            type="number"
                            placeholder="Match #"
                            value={matchForm.match_number}
                            onChange={(e) => setMatchForm({ ...matchForm, match_number: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <Input
                          type="datetime-local"
                          value={matchForm.scheduled_time}
                          onChange={(e) => setMatchForm({ ...matchForm, scheduled_time: e.target.value })}
                        />
                        <Button
                          onClick={() => createMatchMutation.mutate()}
                          className="w-full"
                          disabled={!matchForm.team_a_name || !matchForm.team_b_name}
                        >
                          Add Match
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <TabsContent value="bracket" className="space-y-4">
                {Object.keys(matchesByRound).length === 0 ? (
                  <Card className="text-center p-12">
                    <Swords className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Matches Yet</h3>
                    <p className="text-muted-foreground">
                      {isCreator ? "Add matches to build the bracket!" : "Matches will appear here once added."}
                    </p>
                  </Card>
                ) : (
                  <div className="flex gap-8 overflow-x-auto pb-4">
                    {Object.entries(matchesByRound).map(([round, roundMatches]) => (
                      <div key={round} className="min-w-[280px]">
                        <h3 className="font-semibold mb-4 text-center">Round {round}</h3>
                        <div className="space-y-4">
                          {roundMatches.map((match: any) => (
                            <Card key={match.id} className="overflow-hidden">
                              <div className="p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge className={getStatusColor(match.status)} variant="secondary">
                                    {match.status}
                                  </Badge>
                                  {match.scheduled_time && (
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(match.scheduled_time), "h:mm a")}
                                    </span>
                                  )}
                                </div>
                                <div className={`flex items-center justify-between p-2 rounded ${match.winner === 'team_a' ? 'bg-green-500/20' : 'bg-muted/50'}`}>
                                  <span className="font-medium">{match.team_a_name}</span>
                                  <span className="font-bold">{match.team_a_score}</span>
                                </div>
                                <div className={`flex items-center justify-between p-2 rounded ${match.winner === 'team_b' ? 'bg-green-500/20' : 'bg-muted/50'}`}>
                                  <span className="font-medium">{match.team_b_name}</span>
                                  <span className="font-bold">{match.team_b_score}</span>
                                </div>
                                {isCreator && match.status !== "completed" && (
                                  <div className="flex gap-2 pt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => updateMatchMutation.mutate({
                                        matchId: match.id,
                                        updates: { team_a_score: match.team_a_score + 1 }
                                      })}
                                    >
                                      +1 A
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => updateMatchMutation.mutate({
                                        matchId: match.id,
                                        updates: { team_b_score: match.team_b_score + 1 }
                                      })}
                                    >
                                      +1 B
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="matches">
                <div className="space-y-4">
                  {matches?.map((match) => (
                    <Card key={match.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">Round {match.round_number}</Badge>
                            <span className="font-semibold">{match.team_a_name}</span>
                            <span className="text-xl font-bold">{match.team_a_score} - {match.team_b_score}</span>
                            <span className="font-semibold">{match.team_b_name}</span>
                          </div>
                          <Badge className={getStatusColor(match.status)}>{match.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Interactive Panel */}
          <div className="lg:col-span-1">
            <InteractivePanel eventId={id} userId={userId} isCreator={isCreator} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EsportsEventDetail;
