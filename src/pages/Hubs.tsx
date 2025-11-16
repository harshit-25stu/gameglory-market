import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp } from "lucide-react";

const Hubs = () => {
  const { data: hubs, isLoading } = useQuery({
    queryKey: ["game-hubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_hubs")
        .select("*")
        .order("member_count", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Game Hubs
          </h1>
          <p className="text-muted-foreground">
            Join communities for your favorite games and connect with other gamers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <p className="col-span-full text-center text-muted-foreground">Loading hubs...</p>
          ) : hubs && hubs.length > 0 ? (
            hubs.map((hub) => (
              <Link key={hub.id} to={`/hubs/${hub.slug}`}>
                <Card className="bg-gradient-card border-border p-6 hover:scale-105 transition-transform cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                        {hub.name}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {hub.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{hub.member_count?.toLocaleString() || 0} members</span>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground">No hubs found</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Hubs;
