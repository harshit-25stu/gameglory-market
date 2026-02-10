import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import ItemCard from "@/components/ItemCard";
import LiveFeed from "@/components/LiveFeed";
import LootBox from "@/components/LootBox";
import { Wallet, TrendingUp, Award, Zap, Users, Package, Video, Mic, Sparkles, ShoppingCart, Radio, Trophy, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import dragonLore from "@/assets/items/dragon-lore.jpg";
import phantomPrime from "@/assets/items/phantom-prime.jpg";
import butterflyFade from "@/assets/items/butterfly-fade.jpg";
import reaverVandal from "@/assets/items/reaver-vandal.jpg";
import karambitDoppler from "@/assets/items/karambit-doppler.jpg";
import glitchpopVandal from "@/assets/items/glitchpop-vandal.jpg";

const Index = () => {
  const trendingItems = [
    { id: 1, title: "Dragon Lore AWP", game: "CS:GO", price: 45000, image: dragonLore, rarity: "legendary" as const, trending: true },
    { id: 2, title: "Phantom Prime", game: "Valorant", price: 3200, image: phantomPrime, rarity: "epic" as const, trending: true },
    { id: 3, title: "Butterfly Knife Fade", game: "CS:GO", price: 32000, image: butterflyFade, rarity: "legendary" as const },
    { id: 4, title: "Reaver Vandal", game: "Valorant", price: 2800, image: reaverVandal, rarity: "epic" as const },
  ];

  const quickLinks = [
    { to: "/games", icon: Sparkles, label: "Game Skins", sub: "All games", accent: "primary" },
    { to: "/marketplace", icon: ShoppingCart, label: "Marketplace", sub: "Buy & sell", accent: "primary" },
    { to: "/trade-in", icon: Sparkles, label: "Trade-In", sub: "AI pricing", accent: "accent" },
    { to: "/orders", icon: Package, label: "Orders", sub: "Track delivery", accent: "secondary" },
    { to: "/hubs", icon: Users, label: "Game Hubs", sub: "Communities", accent: "primary" },
    { to: "/watch-parties", icon: Video, label: "Watch Parties", sub: "Watch together", accent: "accent" },
    { to: "/hangouts", icon: Mic, label: "Hangouts", sub: "Voice chat", accent: "primary" },
    { to: "/streams", icon: Radio, label: "Live Streams", sub: "Watch live", accent: "destructive" },
    { to: "/esports", icon: Trophy, label: "Esports", sub: "Tournaments", accent: "accent" },
  ];

  const accentMap: Record<string, string> = {
    primary: "text-primary bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-glow-primary",
    accent: "text-accent bg-accent/10 group-hover:bg-accent/20 group-hover:shadow-glow-accent",
    secondary: "text-secondary bg-secondary/10 group-hover:bg-secondary/20 group-hover:shadow-glow-secondary",
    destructive: "text-destructive bg-destructive/10 group-hover:bg-destructive/20",
  };

  const borderMap: Record<string, string> = {
    primary: "hover:border-primary/50",
    accent: "hover:border-accent/50",
    secondary: "hover:border-secondary/50",
    destructive: "hover:border-destructive/50",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 space-y-8 page-enter">
        {/* Hero Section */}
        <section className="space-y-6">
          <div className="relative text-center space-y-4 py-16 px-4 rounded-2xl overflow-hidden glass">
            <div className="absolute inset-0 z-0">
              <img src={heroBg} alt="Gaming background" className="w-full h-full object-cover opacity-15" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
            </div>
            
            <div className="relative z-10 space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold">
                <span className="bg-gradient-primary bg-clip-text text-transparent text-glow-primary">
                  Level Up
                </span>
                <br />
                Your Gaming Trades
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                The ultimate marketplace where gamers trade, earn, and flex their collections
              </p>

              {/* XP Bar */}
              <div className="max-w-md mx-auto mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-foreground font-semibold">Diamond Trader</span>
                  </span>
                  <span className="text-muted-foreground">2,450 / 3,000 XP</span>
                </div>
                <div className="xp-bar">
                  <div className="xp-bar-fill" style={{ width: "82%" }} />
                </div>
                <p className="text-xs text-muted-foreground text-center">550 XP to next level</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Wallet} label="Total Earnings" value="₹12,450" change="+23%" trend="up" />
            <StatCard icon={TrendingUp} label="Active Listings" value="8" change="+2" trend="up" />
            <StatCard icon={Award} label="Trade Level" value="Diamond" />
            <StatCard icon={Zap} label="Daily Streak" value="15 days" />
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`glass p-4 rounded-lg border border-border/50 ${borderMap[link.accent]} transition-all group card-lift click-scale`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-all ${accentMap[link.accent]}`}>
                      <link.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.sub}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {["All", "CS:GO", "Valorant", "Fortnite", "FIFA", "GTA V"].map((cat) => (
                <Button
                  key={cat}
                  variant={cat === "All" ? "default" : "outline"}
                  className={`click-scale ${cat === "All" ? "bg-gradient-primary btn-glow" : "glass"}`}
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Trending Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  🔥 Trending Now
                </h2>
                <Button variant="ghost" className="text-primary click-scale">View All</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trendingItems.map((item) => (
                  <ItemCard key={item.id} {...item} />
                ))}
              </div>
            </div>

            {/* New Arrivals */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">✨ Fresh Drops</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ItemCard title="Karambit Doppler" game="CS:GO" price={28500} image={karambitDoppler} rarity="legendary" />
                <ItemCard title="Glitchpop Vandal" game="Valorant" price={2400} image={glitchpopVandal} rarity="epic" />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <LootBox />
            <LiveFeed />
            
            {/* Quick Actions */}
            <div className="glass neon-border-secondary rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-foreground mb-3">Quick Actions</h3>
              <Button className="w-full bg-gradient-primary hover:opacity-90 btn-glow click-scale">
                Sell Your Items
              </Button>
              <Button variant="outline" className="w-full glass click-scale">
                Browse Marketplace
              </Button>
              <Button variant="outline" className="w-full glass click-scale">
                View Collections
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <Link to="/games">
        <button className="fab bottom-6 right-6 p-4 bg-gradient-primary click-scale">
          <Plus className="h-6 w-6 text-primary-foreground" />
        </button>
      </Link>
    </div>
  );
};

export default Index;
