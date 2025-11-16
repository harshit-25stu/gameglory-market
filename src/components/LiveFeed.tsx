import { ArrowRight } from "lucide-react";

interface Trade {
  id: number;
  user: string;
  item: string;
  price: number;
  time: string;
}

const mockTrades: Trade[] = [
  { id: 1, user: "ShadowGamer", item: "Dragon Lore AWP", price: 45000, time: "2s ago" },
  { id: 2, user: "ProSniper99", item: "Butterfly Knife", price: 32000, time: "5s ago" },
  { id: 3, user: "NeonNinja", item: "Valorant Phantom Skin", price: 1800, time: "12s ago" },
  { id: 4, user: "CyberWarrior", item: "Rare Fortnite Emote", price: 2500, time: "18s ago" },
  { id: 5, user: "EliteTrader", item: "FIFA Ultimate Card", price: 5600, time: "25s ago" },
];

const LiveFeed = () => {
  return (
    <div className="bg-gradient-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </span>
          Live Trades
        </h2>
        <button className="text-sm text-primary hover:text-primary-glow transition-colors flex items-center gap-1">
          View All <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      
      <div className="space-y-2">
        {mockTrades.map((trade, index) => (
          <div 
            key={trade.id}
            className="flex items-center justify-between p-3 bg-background/50 rounded-lg hover:bg-card-hover transition-colors animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{trade.user}</p>
              <p className="text-xs text-muted-foreground">sold {trade.item}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-success">₹{trade.price.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{trade.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveFeed;
