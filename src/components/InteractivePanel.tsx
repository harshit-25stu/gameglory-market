import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BarChart3, Target, Sparkles, Plus, ThumbsUp, Heart, Flame, Zap } from "lucide-react";

interface InteractivePanelProps {
  streamId?: string;
  eventId?: string;
  userId: string | null;
  isCreator?: boolean;
}

const REACTIONS = [
  { type: "fire", icon: Flame, label: "🔥" },
  { type: "heart", icon: Heart, label: "❤️" },
  { type: "thumbsup", icon: ThumbsUp, label: "👍" },
  { type: "zap", icon: Zap, label: "⚡" }
];

const InteractivePanel = ({ streamId, eventId, userId, isCreator }: InteractivePanelProps) => {
  const queryClient = useQueryClient();
  const [isPollDialogOpen, setIsPollDialogOpen] = useState(false);
  const [isPredictionDialogOpen, setIsPredictionDialogOpen] = useState(false);
  const [pollForm, setPollForm] = useState({ question: "", options: ["", "", "", ""] });
  const [predictionForm, setPredictionForm] = useState({ title: "", option_a: "", option_b: "" });
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});

  // Fetch active polls
  const { data: polls } = useQuery({
    queryKey: ["polls", streamId, eventId],
    queryFn: async () => {
      let query = supabase
        .from("stream_polls")
        .select("*")
        .eq("is_active", true);

      if (streamId) query = query.eq("stream_id", streamId);
      if (eventId) query = query.eq("event_id", eventId);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch poll votes
  const { data: pollVotes } = useQuery({
    queryKey: ["poll-votes", polls?.map(p => p.id)],
    queryFn: async () => {
      if (!polls?.length) return {};
      
      const { data, error } = await supabase
        .from("poll_votes")
        .select("*")
        .in("poll_id", polls.map(p => p.id));

      if (error) throw error;
      
      // Group votes by poll and option
      const grouped: Record<string, Record<number, number>> = {};
      data?.forEach(vote => {
        if (!grouped[vote.poll_id]) grouped[vote.poll_id] = {};
        grouped[vote.poll_id][vote.option_index] = (grouped[vote.poll_id][vote.option_index] || 0) + 1;
      });
      return grouped;
    },
    enabled: !!polls?.length
  });

  // Fetch active predictions
  const { data: predictions } = useQuery({
    queryKey: ["predictions", streamId, eventId],
    queryFn: async () => {
      let query = supabase
        .from("stream_predictions")
        .select("*")
        .eq("is_active", true);

      if (streamId) query = query.eq("stream_id", streamId);
      if (eventId) query = query.eq("event_id", eventId);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch prediction entries
  const { data: predictionEntries } = useQuery({
    queryKey: ["prediction-entries", predictions?.map(p => p.id)],
    queryFn: async () => {
      if (!predictions?.length) return {};
      
      const { data, error } = await supabase
        .from("prediction_entries")
        .select("*")
        .in("prediction_id", predictions.map(p => p.id));

      if (error) throw error;
      
      // Group entries by prediction and option
      const grouped: Record<string, { a: number; b: number }> = {};
      data?.forEach(entry => {
        if (!grouped[entry.prediction_id]) grouped[entry.prediction_id] = { a: 0, b: 0 };
        if (entry.selected_option === "a") grouped[entry.prediction_id].a += entry.points_wagered;
        else grouped[entry.prediction_id].b += entry.points_wagered;
      });
      return grouped;
    },
    enabled: !!predictions?.length
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("interactive-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "poll_votes" },
        () => queryClient.invalidateQueries({ queryKey: ["poll-votes"] })
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prediction_entries" },
        () => queryClient.invalidateQueries({ queryKey: ["prediction-entries"] })
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stream_reactions" },
        (payload) => {
          const type = payload.new.reaction_type;
          setReactionCounts(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Create poll mutation
  const createPollMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      
      const options = pollForm.options.filter(o => o.trim());
      if (options.length < 2) throw new Error("Need at least 2 options");

      const { error } = await supabase
        .from("stream_polls")
        .insert({
          stream_id: streamId || null,
          event_id: eventId || null,
          created_by: userId,
          question: pollForm.question,
          options: options
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      toast.success("Poll created!");
      setIsPollDialogOpen(false);
      setPollForm({ question: "", options: ["", "", "", ""] });
    },
    onError: (error) => toast.error(error.message)
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("poll_votes")
        .insert({ poll_id: pollId, user_id: userId, option_index: optionIndex });

      if (error) {
        if (error.code === "23505") throw new Error("You already voted!");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll-votes"] });
      toast.success("Vote recorded!");
    },
    onError: (error) => toast.error(error.message)
  });

  // Create prediction mutation
  const createPredictionMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("stream_predictions")
        .insert({
          stream_id: streamId || null,
          event_id: eventId || null,
          created_by: userId,
          ...predictionForm
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
      toast.success("Prediction created!");
      setIsPredictionDialogOpen(false);
      setPredictionForm({ title: "", option_a: "", option_b: "" });
    },
    onError: (error) => toast.error(error.message)
  });

  // Enter prediction mutation
  const enterPredictionMutation = useMutation({
    mutationFn: async ({ predictionId, option }: { predictionId: string; option: string }) => {
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("prediction_entries")
        .insert({
          prediction_id: predictionId,
          user_id: userId,
          selected_option: option,
          points_wagered: 100
        });

      if (error) {
        if (error.code === "23505") throw new Error("You already entered!");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prediction-entries"] });
      toast.success("Prediction entered! 100 points wagered");
    },
    onError: (error) => toast.error(error.message)
  });

  // Send reaction mutation
  const sendReactionMutation = useMutation({
    mutationFn: async (reactionType: string) => {
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("stream_reactions")
        .insert({
          stream_id: streamId || null,
          event_id: eventId || null,
          user_id: userId,
          reaction_type: reactionType
        });

      if (error) throw error;
    }
  });

  return (
    <Card className="h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Interactive
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="reactions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reactions">React</TabsTrigger>
            <TabsTrigger value="polls">Polls</TabsTrigger>
            <TabsTrigger value="predictions">Predict</TabsTrigger>
          </TabsList>

          {/* Reactions Tab */}
          <TabsContent value="reactions" className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {REACTIONS.map(({ type, label }) => (
                <Button
                  key={type}
                  variant="outline"
                  className="h-12 text-xl relative"
                  onClick={() => sendReactionMutation.mutate(type)}
                  disabled={!userId}
                >
                  {label}
                  {reactionCounts[type] > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {reactionCounts[type]}
                    </span>
                  )}
                </Button>
              ))}
            </div>
            {!userId && (
              <p className="text-xs text-muted-foreground text-center">Login to react</p>
            )}
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls" className="space-y-4">
            {isCreator && (
              <Dialog open={isPollDialogOpen} onOpenChange={setIsPollDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Poll
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Poll</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Question"
                      value={pollForm.question}
                      onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })}
                    />
                    {pollForm.options.map((opt, i) => (
                      <Input
                        key={i}
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...pollForm.options];
                          newOpts[i] = e.target.value;
                          setPollForm({ ...pollForm, options: newOpts });
                        }}
                      />
                    ))}
                    <Button onClick={() => createPollMutation.mutate()} className="w-full">
                      Create Poll
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {polls?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active polls
              </p>
            ) : (
              polls?.map((poll) => {
                const votes = pollVotes?.[poll.id] || {};
                const totalVotes = Object.values(votes).reduce((a: number, b: number) => a + b, 0);
                const options = poll.options as string[];

                return (
                  <div key={poll.id} className="space-y-2 p-3 border rounded-lg">
                    <p className="font-medium text-sm">{poll.question}</p>
                    {options.map((option, i) => {
                      const count = votes[i] || 0;
                      const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;

                      return (
                        <Button
                          key={i}
                          variant="outline"
                          className="w-full justify-between h-auto py-2"
                          onClick={() => voteMutation.mutate({ pollId: poll.id, optionIndex: i })}
                          disabled={!userId}
                        >
                          <span>{option}</span>
                          <span className="text-muted-foreground">{percent}%</span>
                        </Button>
                      );
                    })}
                    <p className="text-xs text-muted-foreground text-center">
                      {totalVotes} votes
                    </p>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            {isCreator && (
              <Dialog open={isPredictionDialogOpen} onOpenChange={setIsPredictionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Prediction
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Prediction</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Prediction title"
                      value={predictionForm.title}
                      onChange={(e) => setPredictionForm({ ...predictionForm, title: e.target.value })}
                    />
                    <Input
                      placeholder="Option A"
                      value={predictionForm.option_a}
                      onChange={(e) => setPredictionForm({ ...predictionForm, option_a: e.target.value })}
                    />
                    <Input
                      placeholder="Option B"
                      value={predictionForm.option_b}
                      onChange={(e) => setPredictionForm({ ...predictionForm, option_b: e.target.value })}
                    />
                    <Button onClick={() => createPredictionMutation.mutate()} className="w-full">
                      Create Prediction
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {predictions?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active predictions
              </p>
            ) : (
              predictions?.map((pred) => {
                const entries = predictionEntries?.[pred.id] || { a: 0, b: 0 };
                const total = entries.a + entries.b;
                const percentA = total ? Math.round((entries.a / total) * 100) : 50;
                const percentB = total ? Math.round((entries.b / total) * 100) : 50;

                return (
                  <div key={pred.id} className="space-y-3 p-3 border rounded-lg">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      {pred.title}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="flex-col h-auto py-3"
                        onClick={() => enterPredictionMutation.mutate({ predictionId: pred.id, option: "a" })}
                        disabled={!userId}
                      >
                        <span className="font-medium">{pred.option_a}</span>
                        <span className="text-xs text-primary">{percentA}%</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-col h-auto py-3"
                        onClick={() => enterPredictionMutation.mutate({ predictionId: pred.id, option: "b" })}
                        disabled={!userId}
                      >
                        <span className="font-medium">{pred.option_b}</span>
                        <span className="text-xs text-primary">{percentB}%</span>
                      </Button>
                    </div>
                    <Progress value={percentA} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {total} points wagered
                    </p>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InteractivePanel;
