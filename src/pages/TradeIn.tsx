import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, TrendingUp, Package, CheckCircle, Clock, Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

type PriceEstimate = {
  estimatedPrice: number;
  priceRange: { low: number; high: number };
  reasoning: string;
  marketDemand: "high" | "medium" | "low";
  similarListings?: { source: string; price: number }[];
};

const TradeIn = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  // Form state
  const [gameTitle, setGameTitle] = useState("");
  const [platform, setPlatform] = useState<string>("");
  const [condition, setCondition] = useState<string>("");
  const [includesBox, setIncludesBox] = useState(true);
  const [includesManual, setIncludesManual] = useState(true);
  const [description, setDescription] = useState("");
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  // Fetch user's trade-ins
  const { data: tradeIns = [], isLoading } = useQuery({
    queryKey: ["trade-ins", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_ins")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Get AI price estimate
  const priceMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke("ai-trade-pricing", {
        body: { gameTitle, platform, condition, includesBox, includesManual, description }
      });
      
      if (response.error) throw response.error;
      if (response.data.error) throw new Error(response.data.error);
      return response.data as PriceEstimate;
    },
    onSuccess: (data) => {
      setPriceEstimate(data);
      toast({ title: "Price estimate ready!", description: `Estimated value: $${data.estimatedPrice}` });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get price estimate",
        variant: "destructive",
      });
    },
  });

  // Submit trade-in
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !priceEstimate) throw new Error("Missing data");
      
      const { error } = await supabase
        .from("trade_ins")
        .insert({
          user_id: userId,
          game_title: gameTitle,
          platform: platform as any,
          condition: condition as any,
          includes_box: includesBox,
          includes_manual: includesManual,
          description,
          ai_estimated_price: priceEstimate.estimatedPrice,
          ai_price_reasoning: priceEstimate.reasoning,
          status: "quoted"
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Trade-in submitted!", description: "We'll review and get back to you soon." });
      queryClient.invalidateQueries({ queryKey: ["trade-ins", userId] });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit trade-in",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setGameTitle("");
    setPlatform("");
    setCondition("");
    setIncludesBox(true);
    setIncludesManual(true);
    setDescription("");
    setPriceEstimate(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-muted text-muted-foreground";
      case "quoted": return "bg-primary/20 text-primary";
      case "accepted": return "bg-green-500/20 text-green-500";
      case "completed": return "bg-accent/20 text-accent";
      case "rejected": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case "high": return "text-green-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-primary rounded-xl">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Trade-In Center
              </h1>
              <p className="text-muted-foreground">Get instant AI-powered price estimates for your games</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trade-in Form */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Submit a Trade-In
                </CardTitle>
                <CardDescription>
                  Enter your game details and get an instant AI price estimate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="gameTitle">Game Title</Label>
                  <Input
                    id="gameTitle"
                    value={gameTitle}
                    onChange={(e) => setGameTitle(e.target.value)}
                    placeholder="e.g., The Legend of Zelda: Tears of the Kingdom"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Platform</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {Constants.public.Enums.game_platform.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p.replace("_", " ").toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Condition</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {Constants.public.Enums.game_condition.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includesBox"
                      checked={includesBox}
                      onCheckedChange={(checked) => setIncludesBox(checked as boolean)}
                    />
                    <Label htmlFor="includesBox">Includes Box</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includesManual"
                      checked={includesManual}
                      onCheckedChange={(checked) => setIncludesManual(checked as boolean)}
                    />
                    <Label htmlFor="includesManual">Includes Manual</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Additional Notes (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Any scratches, special editions, etc."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={() => priceMutation.mutate()}
                  disabled={!gameTitle || !platform || !condition || priceMutation.isPending}
                  className="w-full bg-gradient-primary"
                >
                  {priceMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Get AI Price Estimate
                    </>
                  )}
                </Button>

                {/* Price Estimate Display */}
                {priceEstimate && (
                  <Card className="mt-4 border-primary/50 bg-primary/5">
                    <CardContent className="pt-6 space-y-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Estimated Value</p>
                        <p className="text-4xl font-bold text-primary">${priceEstimate.estimatedPrice}</p>
                        <p className="text-sm text-muted-foreground">
                          Range: ${priceEstimate.priceRange.low} - ${priceEstimate.priceRange.high}
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <TrendingUp className={`w-4 h-4 ${getDemandColor(priceEstimate.marketDemand)}`} />
                        <span className={`text-sm font-medium ${getDemandColor(priceEstimate.marketDemand)}`}>
                          {priceEstimate.marketDemand.charAt(0).toUpperCase() + priceEstimate.marketDemand.slice(1)} Demand
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground text-center">
                        {priceEstimate.reasoning}
                      </p>

                      {priceEstimate.similarListings && priceEstimate.similarListings.length > 0 && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">Similar Listings:</p>
                          <div className="flex flex-wrap gap-2">
                            {priceEstimate.similarListings.map((listing, i) => (
                              <Badge key={i} variant="outline">
                                {listing.source}: ${listing.price}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => submitMutation.mutate()}
                        disabled={submitMutation.isPending}
                        className="w-full"
                        variant="secondary"
                      >
                        {submitMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Accept & Submit Trade-In
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Trade-in History */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Your Trade-Ins
                </CardTitle>
                <CardDescription>
                  Track the status of your submitted trade-ins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : tradeIns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No trade-ins yet</p>
                    <p className="text-sm">Submit your first trade-in above!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tradeIns.map((tradeIn: any) => (
                      <div
                        key={tradeIn.id}
                        className="p-4 rounded-lg bg-muted/50 border border-border/50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{tradeIn.game_title}</p>
                            <p className="text-sm text-muted-foreground">
                              {tradeIn.platform.replace("_", " ").toUpperCase()} • {tradeIn.condition}
                            </p>
                          </div>
                          <Badge className={getStatusColor(tradeIn.status)}>
                            {tradeIn.status}
                          </Badge>
                        </div>
                        {tradeIn.ai_estimated_price && (
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">AI Estimate:</span>
                            <span className="font-medium text-primary">
                              ${tradeIn.ai_estimated_price}
                            </span>
                          </div>
                        )}
                        {tradeIn.final_price && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Final Offer:</span>
                            <span className="font-medium text-accent">
                              ${tradeIn.final_price}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(tradeIn.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default TradeIn;
