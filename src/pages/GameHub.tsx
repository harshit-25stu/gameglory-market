import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ItemCard from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, MessageSquare, Plus } from "lucide-react";
import dragonLore from "@/assets/items/dragon-lore.jpg";
import phantomPrime from "@/assets/items/phantom-prime.jpg";

const GameHub = () => {
  const { slug } = useParams();

  const { data: hub } = useQuery({
    queryKey: ["game-hub", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_hubs")
        .select("*")
        .eq("slug", slug)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["hub-posts", hub?.id],
    queryFn: async () => {
      if (!hub?.id) return [];
      const { data, error } = await supabase
        .from("hub_posts")
        .select(`
          *,
          profiles:user_id (username, display_name, avatar_url)
        `)
        .eq("hub_id", hub.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!hub?.id,
  });

  // Mock items for now - will be filtered by game in the future
  const mockItems = [
    {
      id: 1,
      title: "Dragon Lore AWP",
      game: hub?.name || "CS:GO",
      price: 45000,
      image: dragonLore,
      rarity: "legendary" as const,
      trending: true,
    },
    {
      id: 2,
      title: "Phantom Prime",
      game: hub?.name || "Valorant",
      price: 3200,
      image: phantomPrime,
      rarity: "epic" as const,
    },
  ];

  if (!hub) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hub Header */}
        <div className="bg-gradient-card rounded-lg p-8 mb-8 border border-border">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
                {hub.name} Hub
              </h1>
              <p className="text-muted-foreground mb-4">{hub.description}</p>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-primary" />
                  {hub.member_count?.toLocaleString() || 0} members
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Active
                </span>
              </div>
            </div>
            <Button className="bg-gradient-primary">Join Hub</Button>
          </div>
        </div>

        {/* Hub Content Tabs */}
        <Tabs defaultValue="marketplace" className="space-y-6">
          <TabsList>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="guides">Guides</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Trending Items</h2>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Sell Item
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockItems.map((item) => (
                <ItemCard key={item.id} {...item} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="community" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Community Posts</h2>
              <Button className="bg-gradient-primary">
                <MessageSquare className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </div>
            <div className="space-y-4">
              {posts && posts.length > 0 ? (
                posts.map((post: any) => (
                  <div key={post.id} className="bg-gradient-card p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {post.profiles?.username?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <span className="font-medium">{post.profiles?.display_name || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-foreground">{post.content}</p>
                    {post.image_url && (
                      <img src={post.image_url} alt="Post" className="mt-2 rounded-lg max-h-64 object-cover" />
                    )}
                    <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                      <span>{post.likes_count} likes</span>
                      <span>{post.comments_count} comments</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">No posts yet. Be the first to post!</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="guides">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Guides coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default GameHub;
