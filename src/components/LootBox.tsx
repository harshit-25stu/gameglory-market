import { Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const LootBox = () => {
  const [isOpening, setIsOpening] = useState(false);
  const { toast } = useToast();

  const openLootBox = () => {
    setIsOpening(true);
    setTimeout(() => {
      setIsOpening(false);
      const rewards = [
        { type: "XP Boost", value: "+50 XP" },
        { type: "Discount Code", value: "10% Off" },
        { type: "Free Listing", value: "1 Free Boost" },
        { type: "Mystery Item", value: "Rare Skin" },
      ];
      const reward = rewards[Math.floor(Math.random() * rewards.length)];
      
      toast({
        title: "🎉 Reward Unlocked!",
        description: `You got: ${reward.type} - ${reward.value}`,
      });
    }, 2000);
  };

  return (
    <div className="relative bg-gradient-to-br from-accent/20 to-secondary/20 border-2 border-accent rounded-lg p-6 overflow-hidden group">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0 animate-shimmer" 
           style={{ backgroundSize: "200% 100%" }} />
      
      <div className="relative z-10 text-center space-y-4">
        <div className="inline-block relative">
          <Gift className={`h-16 w-16 text-accent mx-auto ${isOpening ? "animate-pulse-glow" : "animate-float"}`} />
          <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-primary animate-pulse-glow" />
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-foreground mb-1">Daily Loot Drop</h3>
          <p className="text-sm text-muted-foreground">Open your free reward!</p>
        </div>
        
        <Button 
          onClick={openLootBox}
          disabled={isOpening}
          className="w-full bg-gradient-primary hover:opacity-90 font-bold text-base"
        >
          {isOpening ? (
            <>
              <span className="animate-pulse">Opening...</span>
            </>
          ) : (
            "Open Loot Box"
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Next box in: <span className="text-primary font-bold">23:45:12</span>
        </p>
      </div>
    </div>
  );
};

export default LootBox;
