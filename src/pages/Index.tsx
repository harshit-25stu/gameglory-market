import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import ItemCard from "@/components/ItemCard";
import LiveFeed from "@/components/LiveFeed";
import LootBox from "@/components/LootBox";
import { AIRecommendations } from "@/components/AIRecommendations";
import { Wallet, TrendingUp, Award, Zap, Users, Package, Video, Mic, Sparkles, ShoppingCart, Radio, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  // Fetch profile for real stats
  const { data: profile } = useQuery({
    queryKey: ["profile-stats", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).single();
      return data;
    },
    enabled: !!userId,
  });

  // Fetch trending skins from DB
  const { data: trendingSkins = [] } = useQuery({
    queryKey: ["trending-skins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("game_skins")
        .select("*")
        .eq("is_available", true)
        .order("views_count", { ascending: false })
        .limit(4);
      return data || [];
    },
  });

  // Fetch newest skins
  const { data: newSkins = [] } = useQuery({
    queryKey: ["new-skins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("game_skins")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false })
        .limit(2);
      return data || [];
    },
  });

  // Fetch active listing count
  const { data: listingCount } = useQuery({
    queryKey: ["my-listings-count", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("game_skins")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", userId!)
        .eq("is_available", true);
      return count || 0;
    },
    enabled: !!userId,
  });

  const mapRarity = (r: string): "common" | "rare" | "epic" | "legendary" => {
    if (r === "legendary") return "legendary";
    if (r === "epic") return "epic";
    if (r === "rare" || r === "uncommon") return "rare";
    return "common";
  };

  const gameEmojis: Record<string, string> = {
    valorant: "🎯", csgo: "💣", bgmi: "🪖", fortnite: "🛡️", gtav: "🚗",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="space-y-6">
          <div className="relative text-center space-y-4 py-16 px-4 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img src={heroBg} alt="Gaming background" className="w-full h-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background" />
            </div>
            <div className="relative z-10">
              <h1 className="text-5xl md:text-6xl font-bold">
                <span className="bg-gradient-primary bg-clip-text text-transparent">Level Up</span>
                <br />Your Gaming Trades
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mt-4">
                The ultimate marketplace where gamers trade, earn, and flex their collections
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Wallet} label="Wallet Balance" value={`₹${Number(profile?.wallet_balance || 0).toLocaleString()}`} />
            <StatCard icon={TrendingUp} label="Active Listings" value={String(listingCount || 0)} />
            <StatCard icon={Award} label="Trade Level" value={`Level ${profile?.trader_level || 1}`} />
            <StatCard icon={Zap} label="XP" value={String(profile?.trader_xp || 0)} />
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { to: "/dashboard", icon: Sparkles, label: "Dashboard", sub: "Admin + wallet", color: "primary" },
                { to: "/games", icon: Sparkles, label: "Game Skins", sub: "All games", color: "primary", highlight: true },
                { to: "/marketplace", icon: ShoppingCart, label: "Marketplace", sub: "Buy & sell", color: "primary" },
                { to: "/trade-in", icon: Sparkles, label: "Trade-In", sub: "AI pricing", color: "accent" },
                { to: "/orders", icon: Package, label: "Orders", sub: "Track delivery", color: "secondary" },
                { to: "/hubs", icon: Users, label: "Game Hubs", sub: "Communities", color: "primary" },
                { to: "/watch-parties", icon: Video, label: "Watch Parties", sub: "Watch together", color: "accent" },
                { to: "/hangouts", icon: Mic, label: "Hangouts", sub: "Voice chat", color: "primary" },
                { to: "/streams", icon: Radio, label: "Live Streams", sub: "Watch live", color: "destructive" },
                { to: "/esports", icon: Trophy, label: "Esports", sub: "Tournaments", color: "primary" },
              ].map(({ to, icon: Icon, label, sub, color, highlight }) => (
                <Link key={to} to={to} className={`bg-gradient-card p-4 rounded-lg border ${highlight ? "border-primary/30" : "border-border"} hover:border-primary transition-colors group`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-${color}/10 rounded-lg group-hover:bg-${color}/20 transition-colors`}>
                      <Icon className={`h-5 w-5 text-${color}`} />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {["All", "CS:GO", "Valorant", "Fortnite", "BGMI", "GTA V"].map((cat) => (
                <Button key={cat} variant={cat === "All" ? "default" : "outline"} className={cat === "All" ? "bg-gradient-primary" : ""}>
                  {cat}
                </Button>
              ))}
            </div>

            {/* Trending Items from DB */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">🔥 Trending Now</h2>
                <Link to="/skins"><Button variant="ghost" className="text-primary">View All</Button></Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trendingSkins.map((skin: any) => (
                  <ItemCard
                    key={skin.id}
                    title={skin.title}
                    game={skin.game.toUpperCase()}
                    price={skin.price}
                    image={skin.image_url || ""}
                    rarity={mapRarity(skin.rarity)}
                    trending={true}
                  />
                ))}
              </div>
            </div>

            {/* New Arrivals from DB */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">✨ Fresh Drops</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newSkins.map((skin: any) => (
                  <ItemCard
                    key={skin.id}
                    title={skin.title}
                    game={skin.game.toUpperCase()}
                    price={skin.price}
                    image={skin.image_url || ""}
                    rarity={mapRarity(skin.rarity)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <LootBox />
            <LiveFeed />
            <AIRecommendations showHeader={true} limit={4} />
            <div className="bg-gradient-card border border-border rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-foreground mb-3">Quick Actions</h3>
              <Link to="/skins"><Button className="w-full bg-gradient-primary hover:opacity-90">Sell Your Items</Button></Link>
              <Link to="/skins"><Button variant="outline" className="w-full">Browse Marketplace</Button></Link>
              <Link to="/profile"><Button variant="outline" className="w-full">View Collections</Button></Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
