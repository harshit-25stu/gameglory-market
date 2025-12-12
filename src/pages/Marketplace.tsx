import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, Gamepad2, Key, Filter, ShoppingCart } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

const Marketplace = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch physical games
  const { data: physicalGames = [] } = useQuery({
    queryKey: ["physical-games-marketplace"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("physical_games")
        .select(`
          *,
          seller:profiles!physical_games_seller_id_fkey(username, avatar_url)
        `)
        .eq("is_available", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch digital items
  const { data: digitalItems = [] } = useQuery({
    queryKey: ["digital-items-marketplace"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digital_items")
        .select(`
          *,
          seller:profiles!digital_items_seller_id_fkey(username, avatar_url)
        `)
        .eq("is_available", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Combined and filtered items
  const allItems = [
    ...physicalGames.map((item: any) => ({ ...item, itemType: "physical" })),
    ...digitalItems.map((item: any) => ({ ...item, itemType: "digital" })),
  ].filter((item: any) => {
    const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.game_title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === "all" || item.platform === platformFilter;
    const matchesTab = activeTab === "all" || 
      (activeTab === "physical" && item.itemType === "physical") ||
      (activeTab === "digital" && item.itemType === "digital");
    return matchesSearch && matchesPlatform && matchesTab;
  });

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case "physical": return <Package className="w-4 h-4" />;
      case "digital": return <Key className="w-4 h-4" />;
      default: return <Gamepad2 className="w-4 h-4" />;
    }
  };

  const getDigitalTypeBadge = (type: string) => {
    switch (type) {
      case "game_key": return "Game Key";
      case "in_game_item": return "In-Game Item";
      case "currency": return "Currency";
      case "dlc": return "DLC";
      default: return type;
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Hybrid Marketplace
              </h1>
              <p className="text-muted-foreground">
                Physical games & digital items in one place
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/physical-games")} variant="outline">
                <Package className="w-4 h-4 mr-2" />
                Sell Physical
              </Button>
              <Button onClick={() => navigate("/marketplace/sell-digital")} className="bg-gradient-primary">
                <Key className="w-4 h-4 mr-2" />
                Sell Digital
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search games, keys, items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {Constants.public.Enums.game_platform.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.replace("_", " ").toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="all">
                All ({physicalGames.length + digitalItems.length})
              </TabsTrigger>
              <TabsTrigger value="physical">
                <Package className="w-4 h-4 mr-1" />
                Physical ({physicalGames.length})
              </TabsTrigger>
              <TabsTrigger value="digital">
                <Key className="w-4 h-4 mr-1" />
                Digital ({digitalItems.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Items Grid */}
          {allItems.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No items found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or be the first to list something!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allItems.map((item: any) => (
                <Card
                  key={`${item.itemType}-${item.id}`}
                  className="group cursor-pointer hover:border-primary/50 transition-all overflow-hidden"
                  onClick={() => navigate(
                    item.itemType === "physical" 
                      ? `/physical-games/${item.id}` 
                      : `/digital-items/${item.id}`
                  )}
                >
                  {/* Image placeholder */}
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {item.images?.[0] ? (
                      <img 
                        src={item.images[0]} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {item.itemType === "physical" ? (
                          <Package className="w-12 h-12 text-muted-foreground/30" />
                        ) : (
                          <Key className="w-12 h-12 text-muted-foreground/30" />
                        )}
                      </div>
                    )}
                    
                    {/* Type badge */}
                    <Badge 
                      className={`absolute top-2 left-2 ${
                        item.itemType === "physical" 
                          ? "bg-secondary text-secondary-foreground" 
                          : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {getItemTypeIcon(item.itemType)}
                      <span className="ml-1">
                        {item.itemType === "physical" ? "Physical" : getDigitalTypeBadge(item.item_type)}
                      </span>
                    </Badge>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">
                          {item.title || item.game_title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.platform?.replace("_", " ").toUpperCase()}
                          {item.condition && ` • ${item.condition}`}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-primary whitespace-nowrap">
                        ${item.price}
                      </p>
                    </div>

                    {item.seller && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Seller: {item.seller.username}
                      </p>
                    )}
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

export default Marketplace;
