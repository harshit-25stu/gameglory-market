import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, TrendingUp, Star, Gamepad2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Recommendation {
  itemType: "game_skin" | "physical_game" | "digital_item";
  title: string;
  game: string;
  platform?: string;
  confidence: number;
  reasoning: string;
  priceRange?: { min: number; max: number };
  rarity?: string;
}

interface AIRecommendationsProps {
  userId?: string;
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export const AIRecommendations = ({
  userId,
  limit = 6,
  showHeader = true,
  className = ""
}: AIRecommendationsProps) => {
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      setCurrentUserId(userId);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setCurrentUserId(session?.user?.id || null);
      });
    }
  }, [userId]);

  const { data: recommendations, isLoading, error, refetch } = useQuery({
    queryKey: ["ai-recommendations", currentUserId, limit],
    queryFn: async () => {
      if (!currentUserId) return null;

      // Get user's behavior data
      const [profileRes, purchasesRes, favoritesRes, viewsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", currentUserId).single(),
        supabase.from("orders").select("item_type").eq("buyer_id", currentUserId),
        supabase.from("user_game_libraries").select("game_title").eq("user_id", currentUserId),
        supabase.from("digital_items").select("title, game_title").eq("seller_id", currentUserId).limit(10)
      ]);

      const behavior = {
        viewed_items: viewsRes.data?.map(item => item.title) || [],
        purchased_items: purchasesRes.data?.map(order => order.item_type) || [],
        favorited_games: favoritesRes.data?.map(lib => lib.game_title) || [],
        search_queries: [], // Could be populated from search history
        trade_history: [] // Could be populated from trade history
      };

      const response = await supabase.functions.invoke("ai-recommendations", {
        body: { userId: currentUserId, behavior, limit }
      });

      if (response.error) throw response.error;
      return response.data as { recommendations: Recommendation[] };
    },
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case "legendary": return "bg-gradient-to-r from-yellow-500 to-orange-500";
      case "epic": return "bg-gradient-to-r from-purple-500 to-pink-500";
      case "rare": return "bg-gradient-to-r from-blue-500 to-cyan-500";
      case "uncommon": return "bg-gradient-to-r from-green-500 to-emerald-500";
      default: return "bg-gradient-to-r from-gray-500 to-slate-500";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-500";
    if (confidence >= 0.6) return "text-yellow-500";
    return "text-orange-500";
  };

  if (!currentUserId) {
    return (
      <Card className={`${className}`}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Sign in to get personalized AI recommendations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className}`}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-3">Failed to load recommendations</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Recommendations
            <Badge variant="secondary" className="ml-auto">
              <Star className="w-3 h-3 mr-1" />
              Personalized
            </Badge>
          </CardTitle>
        </CardHeader>
      )}

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Analyzing your preferences...</span>
          </div>
        ) : recommendations?.recommendations?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.recommendations.map((rec, index) => (
              <div key={index} className="border rounded-lg p-4 hover:border-primary transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-clamp-2">{rec.title}</h4>
                    <p className="text-xs text-muted-foreground">{rec.game}</p>
                    {rec.platform && (
                      <p className="text-xs text-muted-foreground">{rec.platform}</p>
                    )}
                  </div>
                  {rec.rarity && (
                    <Badge className={`text-white text-xs ${getRarityColor(rec.rarity)}`}>
                      {rec.rarity}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className={`w-3 h-3 ${getConfidenceColor(rec.confidence)}`} />
                  <span className={`text-xs font-medium ${getConfidenceColor(rec.confidence)}`}>
                    {Math.round(rec.confidence * 100)}% match
                  </span>
                </div>

                {rec.priceRange && (
                  <p className="text-xs text-muted-foreground mb-2">
                    ${rec.priceRange.min} - ${rec.priceRange.max}
                  </p>
                )}

                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {rec.reasoning}
                </p>

                <Button size="sm" variant="outline" className="w-full" asChild>
                  <Link to={`/${rec.itemType === 'game_skin' ? 'skins' : 'marketplace'}`}>
                    <Gamepad2 className="w-3 h-3 mr-1" />
                    Explore
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recommendations yet</p>
            <p className="text-sm">Start browsing to get personalized suggestions!</p>
          </div>
        )}

        {recommendations?.recommendations?.length > 0 && (
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <Sparkles className="w-4 h-4 mr-2" />
              Refresh Recommendations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};