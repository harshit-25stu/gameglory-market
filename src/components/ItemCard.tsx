import { Heart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ItemCardProps {
  title: string;
  game: string;
  price: number;
  image: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
  trending?: boolean;
}

const rarityColors = {
  common: "border-muted-foreground",
  rare: "border-primary",
  epic: "border-secondary",
  legendary: "border-accent",
};

const rarityGlows = {
  common: "",
  rare: "shadow-glow-primary",
  epic: "shadow-glow-secondary",
  legendary: "shadow-[0_0_20px_hsl(330_100%_60%/0.5)]",
};

const ItemCard = ({ title, game, price, image, rarity = "common", trending }: ItemCardProps) => {
  return (
    <div className={`group relative bg-gradient-card rounded-lg border-2 ${rarityColors[rarity]} ${rarityGlows[rarity]} overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer`}>
      {trending && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-accent/90 rounded-full flex items-center gap-1 text-xs font-bold">
          <TrendingUp className="h-3 w-3" />
          HOT
        </div>
      )}
      
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{game}</p>
          <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="text-xl font-bold text-success">₹{price.toLocaleString()}</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="hover:text-accent">
              <Heart className="h-4 w-4" />
            </Button>
            <Button size="sm" className="bg-gradient-primary hover:opacity-90">
              Buy Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
