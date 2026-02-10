import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  Search, Filter, Star, TrendingUp, ShoppingCart, Heart, 
  Eye, SlidersHorizontal, Grid3X3, LayoutList 
} from "lucide-react";

const rarityColors: Record<string, string> = {
  common: "bg-gray-500/20 text-gray-400 border-gray-500/50",
  uncommon: "bg-green-500/20 text-green-400 border-green-500/50",
  rare: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  epic: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  legendary: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
};

const conditionLabels: Record<string, string> = {
  factory_new: "Factory New",
  minimal_wear: "Minimal Wear",
  field_tested: "Field-Tested",
  well_worn: "Well-Worn",
  battle_scarred: "Battle-Scarred",
};

const gameEmojis: Record<string, string> = {
  valorant: "🎯",
  csgo: "💣",
  bgmi: "🪖",
  fortnite: "🛡️",
  gtav: "🚗",
};

const SkinMarketplace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameFilter = searchParams.get("game") || "all";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch game skins
  const { data: skins = [], isLoading } = useQuery({
    queryKey: ["game-skins", gameFilter],
    queryFn: async () => {
      let query = supabase
        .from("game_skins")
        .select(`
          *,
          seller:profiles!game_skins_seller_id_fkey(username, avatar_url)
        `)
        .eq("is_available", true);

      if (gameFilter !== "all") {
        query = query.eq("game", gameFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch seller ratings
  const { data: sellerRatings = [] } = useQuery({
    queryKey: ["seller-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_ratings")
        .select("seller_id, rating");
      if (error) throw error;
      return data;
    },
  });

  // Calculate average rating per seller
  const getSellerRating = (sellerId: string) => {
    const ratings = sellerRatings.filter((r: any) => r.seller_id === sellerId);
    if (ratings.length === 0) return null;
    const avg = ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length;
    return { avg: avg.toFixed(1), count: ratings.length };
  };

  // Filter and sort skins
  const filteredSkins = skins
    .filter((skin: any) => {
      const matchesSearch = skin.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRarity = rarityFilter === "all" || skin.rarity === rarityFilter;
      const matchesPrice = skin.price >= priceRange[0] && skin.price <= priceRange[1];
      return matchesSearch && matchesRarity && matchesPrice;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "price_low": return a.price - b.price;
        case "price_high": return b.price - a.price;
        case "popular": return b.views_count - a.views_count;
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const games = ["all", "valorant", "csgo", "bgmi", "fortnite", "gtav"];
  const rarities = ["all", "common", "uncommon", "rare", "epic", "legendary"];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8 page-enter">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {gameFilter !== "all" ? (
                  <span className="flex items-center gap-3">
                    <span>{gameEmojis[gameFilter]}</span>
                    {gameFilter.toUpperCase()} Skins
                  </span>
                ) : (
                  "All Game Skins"
                )}
              </h1>
              <p className="text-muted-foreground mt-1">
                {filteredSkins.length} items available
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/games")}>
                Change Game
              </Button>
              <Button className="bg-gradient-primary">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Sell Skin
              </Button>
            </div>
          </div>

          {/* Game Tabs */}
          <Tabs value={gameFilter} className="mb-6">
            <TabsList className="flex-wrap h-auto gap-1 p-1">
              {games.map((game) => (
                <TabsTrigger
                  key={game}
                  value={game}
                  onClick={() => navigate(`/skins${game !== "all" ? `?game=${game}` : ""}`)}
                  className="capitalize"
                >
                  {game !== "all" && <span className="mr-1">{gameEmojis[game]}</span>}
                  {game === "all" ? "All Games" : game.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Search & Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search skins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={rarityFilter} onValueChange={setRarityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Rarity" />
              </SelectTrigger>
              <SelectContent>
                {rarities.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r === "all" ? "All Rarities" : r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="sm:w-auto"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="mb-6 glass">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}</label>
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      min={0}
                      max={50000}
                      step={100}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="glass overflow-hidden">
                  <div className="aspect-video skeleton-glow" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 skeleton-glow w-3/4" />
                    <div className="h-3 skeleton-glow w-1/2" />
                    <div className="h-6 skeleton-glow w-1/3 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSkins.length === 0 ? (
            <Card className="py-16 glass">
              <CardContent className="empty-state">
                <ShoppingCart className="w-20 h-20 empty-state-icon text-primary" />
                <h3 className="text-xl font-semibold mb-2">No loot here… yet 🎮</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or be the first to drop some fire skins!
                </p>
                <Button className="bg-gradient-primary btn-glow btn-pulse click-scale">List Your Skin</Button>
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
              : "space-y-4"
            }>
              {filteredSkins.map((skin: any) => {
                const rating = getSellerRating(skin.seller_id);
                
                return viewMode === "grid" ? (
                  <Card 
                    key={skin.id}
                    className="group cursor-pointer overflow-hidden glass card-lift click-scale hover:border-primary/50 transition-all"
                    onClick={() => navigate(`/skins/${skin.id}`)}
                  >
                    {/* Image */}
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {skin.image_url ? (
                        <img 
                          src={skin.image_url} 
                          alt={skin.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          {gameEmojis[skin.game] || "🎮"}
                        </div>
                      )}
                      
                      {/* Rarity Badge */}
                      <Badge className={`absolute top-2 left-2 capitalize ${rarityColors[skin.rarity]}`}>
                        {skin.rarity}
                      </Badge>
                      
                      {/* Quick Actions */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="secondary" className="h-8 w-8">
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Views */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/80 px-2 py-1 rounded text-xs">
                        <Eye className="w-3 h-3" />
                        {skin.views_count}
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">{skin.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {gameEmojis[skin.game]} {skin.game.toUpperCase()} • {conditionLabels[skin.condition] || skin.condition}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-primary whitespace-nowrap">
                          ₹{skin.price.toLocaleString()}
                        </p>
                      </div>
                      
                      {/* Seller Info */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">
                          by {skin.seller?.username || "Unknown"}
                        </p>
                        {rating && (
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span>{rating.avg}</span>
                            <span className="text-muted-foreground">({rating.count})</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card 
                    key={skin.id}
                    className="cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => navigate(`/skins/${skin.id}`)}
                  >
                    <CardContent className="p-4 flex gap-4">
                      <div className="w-32 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {skin.image_url ? (
                          <img src={skin.image_url} alt={skin.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {gameEmojis[skin.game] || "🎮"}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{skin.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {skin.game.toUpperCase()} • {conditionLabels[skin.condition] || skin.condition}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">₹{skin.price.toLocaleString()}</p>
                            <Badge className={`capitalize ${rarityColors[skin.rarity]}`}>
                              {skin.rarity}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-sm text-muted-foreground">
                            Seller: {skin.seller?.username}
                          </p>
                          {rating && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              {rating.avg} ({rating.count} reviews)
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Eye className="w-4 h-4" />
                            {skin.views_count} views
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SkinMarketplace;