import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, Wallet, Package, History, Star, Settings, 
  Plus, ArrowUpRight, ArrowDownLeft, ShoppingCart, TrendingUp 
} from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  // Fetch profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch wallet transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch inventory
  const { data: inventory = [] } = useQuery({
    queryKey: ["user-inventory", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_inventory")
        .select(`
          *,
          skin:game_skins(*)
        `)
        .eq("user_id", user.id)
        .order("acquired_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch seller ratings for this user
  const { data: ratings = [] } = useQuery({
    queryKey: ["my-ratings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_ratings")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const avgRating = ratings.length > 0 
    ? (ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  const handleAddFunds = () => {
    toast.info("Payment integration coming soon!");
  };

  if (!user || !profile) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {profile.username?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
                    <Badge variant="secondary">Level {profile.trader_level}</Badge>
                    {avgRating && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {avgRating} ({ratings.length} reviews)
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">@{profile.username}</p>
                  <p className="text-sm text-muted-foreground mt-2">{profile.bio || "No bio yet"}</p>
                  
                  <div className="flex gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-xl font-bold">{profile.total_sales}</p>
                      <p className="text-xs text-muted-foreground">Sales</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold">₹{Number(profile.total_earnings).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Earnings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold">{profile.trader_xp}</p>
                      <p className="text-xs text-muted-foreground">XP</p>
                    </div>
                  </div>
                </div>
                
                <Button variant="outline" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Card */}
          <Card className="mb-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-primary/20 rounded-full">
                    <Wallet className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Wallet Balance</p>
                    <p className="text-3xl font-bold text-primary">
                      ₹{Number(profile.wallet_balance || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddFunds} className="bg-gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Funds
                  </Button>
                  <Button variant="outline">
                    Withdraw
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs defaultValue="inventory" className="space-y-6">
            <TabsList className="grid w-full max-w-lg grid-cols-4">
              <TabsTrigger value="inventory">
                <Package className="w-4 h-4 mr-1" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <History className="w-4 h-4 mr-1" />
                History
              </TabsTrigger>
              <TabsTrigger value="listings">
                <ShoppingCart className="w-4 h-4 mr-1" />
                Listings
              </TabsTrigger>
              <TabsTrigger value="reviews">
                <Star className="w-4 h-4 mr-1" />
                Reviews
              </TabsTrigger>
            </TabsList>

            {/* Inventory Tab */}
            <TabsContent value="inventory">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>My Inventory ({inventory.length} items)</span>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {inventory.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                      <p className="text-muted-foreground">No items in inventory</p>
                      <Button className="mt-4" onClick={() => navigate("/skins")}>
                        Browse Marketplace
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {inventory.map((item: any) => (
                        <Card key={item.id} className="overflow-hidden">
                          <div className="aspect-square bg-muted flex items-center justify-center">
                            {item.skin?.image_url ? (
                              <img src={item.skin.image_url} alt={item.skin.title} className="object-cover" />
                            ) : (
                              <span className="text-4xl">🎮</span>
                            )}
                          </div>
                          <CardContent className="p-3">
                            <p className="font-medium truncate">{item.skin?.title || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{item.skin?.game?.toUpperCase()}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                      <p className="text-muted-foreground">No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              tx.type === "deposit" || tx.type === "sale" 
                                ? "bg-green-500/20 text-green-500" 
                                : "bg-red-500/20 text-red-500"
                            }`}>
                              {tx.type === "deposit" || tx.type === "sale" ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium capitalize">{tx.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${
                              tx.type === "deposit" || tx.type === "sale" 
                                ? "text-green-500" 
                                : "text-red-500"
                            }`}>
                              {tx.type === "deposit" || tx.type === "sale" ? "+" : "-"}₹{Math.abs(tx.amount).toLocaleString()}
                            </p>
                            <Badge variant="outline" className="text-xs">{tx.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Listings Tab */}
            <TabsContent value="listings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>My Listings</span>
                    <Button size="sm" className="bg-gradient-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      New Listing
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">No active listings</p>
                    <Button className="mt-4" variant="outline" onClick={() => navigate("/skins")}>
                      Create Listing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Reviews
                    {avgRating && (
                      <Badge variant="secondary" className="ml-2">
                        <Star className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" />
                        {avgRating} avg
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ratings.length === 0 ? (
                    <div className="text-center py-8">
                      <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                      <p className="text-muted-foreground">No reviews yet</p>
                      <p className="text-sm text-muted-foreground">Complete sales to get reviews</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ratings.map((review: any) => (
                        <div key={review.id} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating 
                                    ? "text-yellow-500 fill-yellow-500" 
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.review && (
                            <p className="text-sm">{review.review}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Profile;