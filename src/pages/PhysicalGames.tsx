import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Package, Truck, Plus } from "lucide-react";

type Platform = "ps5" | "ps4" | "xbox_series" | "xbox_one" | "switch" | "pc" | "other";

const PhysicalGames = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  const { data: games, isLoading } = useQuery({
    queryKey: ["physical-games", selectedPlatform],
    queryFn: async () => {
      let query = supabase
        .from("physical_games")
        .select(`
          *,
          profiles:seller_id (username, display_name, trader_level)
        `)
        .eq("is_available", true)
        .order("created_at", { ascending: false });

      if (selectedPlatform !== "all") {
        query = query.eq("platform", selectedPlatform as Platform);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const conditionColors = {
    mint: "bg-success/20 text-success",
    excellent: "bg-primary/20 text-primary",
    good: "bg-secondary/20 text-secondary",
    fair: "bg-muted text-muted-foreground",
    poor: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Physical Games Marketplace
            </h1>
            <p className="text-muted-foreground">Buy and sell PS5, Xbox, Switch, and PC games</p>
          </div>
          <Button className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            List Game
          </Button>
        </div>

        {/* Platform Filter */}
        <Tabs defaultValue="all" onValueChange={setSelectedPlatform} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Platforms</TabsTrigger>
            <TabsTrigger value="ps5">PS5</TabsTrigger>
            <TabsTrigger value="ps4">PS4</TabsTrigger>
            <TabsTrigger value="xbox_series">Xbox Series</TabsTrigger>
            <TabsTrigger value="xbox_one">Xbox One</TabsTrigger>
            <TabsTrigger value="switch">Switch</TabsTrigger>
            <TabsTrigger value="pc">PC</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <p className="col-span-full text-center text-muted-foreground">Loading games...</p>
          ) : games && games.length > 0 ? (
            games.map((game: any) => (
              <Card key={game.id} className="bg-gradient-card border-border overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                {/* Game Image */}
                <div className="h-48 bg-muted relative">
                  {game.images && game.images.length > 0 ? (
                    <img 
                      src={game.images[0]} 
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {game.is_sealed && (
                    <Badge className="absolute top-2 right-2 bg-accent">Sealed</Badge>
                  )}
                </div>

                {/* Game Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg text-foreground mb-1">{game.title}</h3>
                    <div className="flex gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {game.platform.toUpperCase()}
                      </Badge>
                      <Badge className={`text-xs ${conditionColors[game.condition as keyof typeof conditionColors]}`}>
                        {game.condition}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {game.description || "No description provided"}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {game.location || "Location not specified"}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {game.shipping_method === "local_pickup" && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Local Pickup Only
                      </span>
                    )}
                    {game.shipping_method === "courier" && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" /> Courier Available
                      </span>
                    )}
                    {game.shipping_method === "both" && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" /> Pickup or Delivery
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="text-2xl font-bold text-success">₹{game.price.toLocaleString()}</p>
                    </div>
                    <Button size="sm" className="bg-gradient-primary">
                      View Details
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                    <span>Seller: {game.profiles?.username || "Unknown"}</span>
                    {game.profiles?.trader_level && (
                      <Badge variant="outline" className="text-xs">
                        Level {game.profiles.trader_level}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground py-12">
              No games found. Be the first to list a game!
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default PhysicalGames;
