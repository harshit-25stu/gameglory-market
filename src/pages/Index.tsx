import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import ItemCard from "@/components/ItemCard";
import LiveFeed from "@/components/LiveFeed";
import LootBox from "@/components/LootBox";
import { Wallet, TrendingUp, Award, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";
import dragonLore from "@/assets/items/dragon-lore.jpg";
import phantomPrime from "@/assets/items/phantom-prime.jpg";
import butterflyFade from "@/assets/items/butterfly-fade.jpg";
import reaverVandal from "@/assets/items/reaver-vandal.jpg";
import karambitDoppler from "@/assets/items/karambit-doppler.jpg";
import glitchpopVandal from "@/assets/items/glitchpop-vandal.jpg";

const Index = () => {
  // Mock data - will be replaced with real data
  const trendingItems = [
    {
      id: 1,
      title: "Dragon Lore AWP",
      game: "CS:GO",
      price: 45000,
      image: dragonLore,
      rarity: "legendary" as const,
      trending: true,
    },
    {
      id: 2,
      title: "Phantom Prime",
      game: "Valorant",
      price: 3200,
      image: phantomPrime,
      rarity: "epic" as const,
      trending: true,
    },
    {
      id: 3,
      title: "Butterfly Knife Fade",
      game: "CS:GO",
      price: 32000,
      image: butterflyFade,
      rarity: "legendary" as const,
    },
    {
      id: 4,
      title: "Reaver Vandal",
      game: "Valorant",
      price: 2800,
      image: reaverVandal,
      rarity: "epic" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section with Stats */}
        <section className="space-y-6">
          <div className="relative text-center space-y-4 py-16 px-4 rounded-2xl overflow-hidden">
            {/* Hero Background */}
            <div className="absolute inset-0 z-0">
              <img 
                src={heroBg} 
                alt="Gaming background"
                className="w-full h-full object-cover opacity-20"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background" />
            </div>
            
            {/* Hero Content */}
            <div className="relative z-10">
              <h1 className="text-5xl md:text-6xl font-bold">
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Level Up
                </span>
                <br />
                Your Gaming Trades
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mt-4">
                The ultimate marketplace where gamers trade, earn, and flex their collections
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={Wallet}
              label="Total Earnings"
              value="₹12,450"
              change="+23%"
              trend="up"
            />
            <StatCard 
              icon={TrendingUp}
              label="Active Listings"
              value="8"
              change="+2"
              trend="up"
            />
            <StatCard 
              icon={Award}
              label="Trade Level"
              value="Diamond"
            />
            <StatCard 
              icon={Zap}
              label="Daily Streak"
              value="15 days"
            />
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Marketplace */}
          <div className="lg:col-span-2 space-y-6">
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {["All", "CS:GO", "Valorant", "Fortnite", "FIFA", "GTA V"].map((cat) => (
                <Button
                  key={cat}
                  variant={cat === "All" ? "default" : "outline"}
                  className={cat === "All" ? "bg-gradient-primary" : ""}
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
                <Button variant="ghost" className="text-primary">View All</Button>
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
                <ItemCard
                  title="Karambit Doppler"
                  game="CS:GO"
                  price={28500}
                  image={karambitDoppler}
                  rarity="legendary"
                />
                <ItemCard
                  title="Glitchpop Vandal"
                  game="Valorant"
                  price={2400}
                  image={glitchpopVandal}
                  rarity="epic"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Activity & Rewards */}
          <div className="space-y-6">
            <LootBox />
            <LiveFeed />
            
            {/* Quick Actions */}
            <div className="bg-gradient-card border border-border rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-foreground mb-3">Quick Actions</h3>
              <Button className="w-full bg-gradient-primary hover:opacity-90">
                Sell Your Items
              </Button>
              <Button variant="outline" className="w-full">
                Browse Marketplace
              </Button>
              <Button variant="outline" className="w-full">
                View Collections
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
