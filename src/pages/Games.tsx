import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Users, TrendingUp, Star } from "lucide-react";

interface GameCardProps {
  id: string;
  name: string;
  logo: string;
  gradient: string;
  itemCount: number;
  popularSkins: string[];
  activeOffers: number;
}

const GameCard = ({ id, name, logo, gradient, itemCount, popularSkins, activeOffers }: GameCardProps) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="group cursor-pointer overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
      onClick={() => navigate(`/marketplace?game=${id}`)}
    >
      <div className={`h-40 ${gradient} relative flex items-center justify-center overflow-hidden`}>
        <span className="text-6xl">{logo}</span>
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <Badge className="absolute top-3 right-3 bg-background/80 text-foreground">
          <TrendingUp className="w-3 h-3 mr-1" />
          {activeOffers} offers
        </Badge>
      </div>
      
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{name}</h3>
          <Badge variant="secondary">
            <Gamepad2 className="w-3 h-3 mr-1" />
            {itemCount} items
          </Badge>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Popular Skins:</p>
          <div className="flex flex-wrap gap-1">
            {popularSkins.slice(0, 3).map((skin, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                <Star className="w-2 h-2 mr-1 text-yellow-500" />
                {skin}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="pt-2 border-t border-border/50">
          <p className="text-sm text-primary font-semibold group-hover:underline">
            Browse {name} Items →
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const Games = () => {
  const games: GameCardProps[] = [
    {
      id: "valorant",
      name: "Valorant",
      logo: "🎯",
      gradient: "bg-gradient-to-br from-red-500/20 via-red-600/10 to-background",
      itemCount: 156,
      popularSkins: ["Prime Vandal", "Reaver Operator", "Elderflame", "Ion Phantom", "Oni Phantom"],
      activeOffers: 42,
    },
    {
      id: "csgo",
      name: "CS:GO / CS2",
      logo: "💣",
      gradient: "bg-gradient-to-br from-orange-500/20 via-orange-600/10 to-background",
      itemCount: 284,
      popularSkins: ["AWP Dragon Lore", "AK-47 Fire Serpent", "M4A4 Howl", "Karambit Doppler", "Desert Eagle Blaze"],
      activeOffers: 89,
    },
    {
      id: "bgmi",
      name: "BGMI / PUBG",
      logo: "🪖",
      gradient: "bg-gradient-to-br from-yellow-500/20 via-yellow-600/10 to-background",
      itemCount: 98,
      popularSkins: ["Blood Raven X-Suit", "Glacier M416", "Pharaoh X-Suit", "The Fool Set", "Avian Tyrant"],
      activeOffers: 31,
    },
    {
      id: "fortnite",
      name: "Fortnite",
      logo: "🛡️",
      gradient: "bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-background",
      itemCount: 203,
      popularSkins: ["Renegade Raider", "Skull Trooper", "John Wick", "Black Knight", "Drift"],
      activeOffers: 56,
    },
    {
      id: "gtav",
      name: "GTA V / Online",
      logo: "🚗",
      gradient: "bg-gradient-to-br from-green-500/20 via-green-600/10 to-background",
      itemCount: 67,
      popularSkins: ["Heist Crew Outfit", "Impotent Rage", "Space Interloper", "Alien Bodysuit", "SWAT Tactical"],
      activeOffers: 18,
    },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-4">
              Choose Your Game
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Browse skins, items, and collectibles from the most popular games
            </p>
          </div>

          {/* Stats Bar */}
          <div className="flex justify-center gap-8 mb-10">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">808+</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-accent">236</p>
              <p className="text-sm text-muted-foreground">Active Offers</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-secondary">5</p>
              <p className="text-sm text-muted-foreground">Games</p>
            </div>
          </div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12 p-8 rounded-2xl bg-gradient-card border border-border">
            <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Can't find your game?</h2>
            <p className="text-muted-foreground mb-4">
              Request a new game to be added to our marketplace
            </p>
            <Badge variant="outline" className="text-sm">Coming Soon: More Games</Badge>
          </div>
        </div>
      </div>
    </>
  );
};

export default Games;