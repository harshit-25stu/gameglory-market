import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Package, Truck, CheckCircle, Clock, MapPin, ShoppingBag, Loader2 } from "lucide-react";

const Orders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  // Fetch orders as buyer
  const { data: buyerOrders = [], isLoading: loadingBuyer } = useQuery({
    queryKey: ["orders-buyer", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          seller:profiles!orders_seller_id_fkey(username, avatar_url)
        `)
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch orders as seller
  const { data: sellerOrders = [], isLoading: loadingSeller } = useQuery({
    queryKey: ["orders-seller", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(username, avatar_url)
        `)
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Update order status
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: any }) => {
      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Order updated!" });
      queryClient.invalidateQueries({ queryKey: ["orders-seller", userId] });
      queryClient.invalidateQueries({ queryKey: ["orders-buyer", userId] });
      setSelectedOrder(null);
      setTrackingNumber("");
      setCarrier("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive",
      });
    },
  });

  const handleShipOrder = () => {
    if (!selectedOrder || !trackingNumber) return;
    
    updateOrderMutation.mutate({
      orderId: selectedOrder.id,
      updates: {
        status: "shipped",
        tracking_number: trackingNumber,
        carrier: carrier || null,
        shipped_at: new Date().toISOString(),
      }
    });
  };

  const handleConfirmDelivery = (orderId: string) => {
    updateOrderMutation.mutate({
      orderId,
      updates: {
        status: "delivered",
        delivered_at: new Date().toISOString(),
      }
    });
  };

  const handleCompleteOrder = (orderId: string) => {
    updateOrderMutation.mutate({
      orderId,
      updates: { status: "completed" }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "paid": return <ShoppingBag className="w-4 h-4" />;
      case "shipped": 
      case "in_transit": return <Truck className="w-4 h-4" />;
      case "delivered":
      case "completed": return <CheckCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-muted text-muted-foreground";
      case "paid": return "bg-primary/20 text-primary";
      case "shipped":
      case "in_transit": return "bg-yellow-500/20 text-yellow-600";
      case "delivered": return "bg-green-500/20 text-green-600";
      case "completed": return "bg-accent/20 text-accent";
      case "cancelled": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const renderOrderCard = (order: any, isSeller: boolean) => (
    <Card key={order.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={getStatusColor(order.status)}>
                {getStatusIcon(order.status)}
                <span className="ml-1 capitalize">{order.status.replace("_", " ")}</span>
              </Badge>
              <Badge variant="outline" className="text-xs">
                {order.item_type.replace("_", " ")}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Order #{order.id.slice(0, 8)}
            </p>
            <p className="text-sm text-muted-foreground">
              {isSeller ? `Buyer: ${order.buyer?.username}` : `Seller: ${order.seller?.username}`}
            </p>
            
            {order.tracking_number && (
              <div className="mt-2 p-2 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">Tracking:</p>
                <p className="text-sm font-mono">{order.tracking_number}</p>
                {order.carrier && (
                  <p className="text-xs text-muted-foreground">{order.carrier}</p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold text-primary">${order.total_price}</p>
            
            {/* Actions */}
            <div className="mt-2 space-y-1">
              {isSeller && order.status === "paid" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Truck className="w-3 h-3 mr-1" />
                      Ship
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Tracking Information</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="tracking">Tracking Number</Label>
                        <Input
                          id="tracking"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="Enter tracking number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="carrier">Carrier (Optional)</Label>
                        <Input
                          id="carrier"
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          placeholder="e.g., UPS, FedEx, USPS"
                        />
                      </div>
                      <Button 
                        onClick={handleShipOrder}
                        disabled={!trackingNumber || updateOrderMutation.isPending}
                        className="w-full"
                      >
                        {updateOrderMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Truck className="w-4 h-4 mr-2" />
                        )}
                        Mark as Shipped
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {!isSeller && order.status === "shipped" && (
                <Button 
                  size="sm"
                  onClick={() => handleConfirmDelivery(order.id)}
                  disabled={updateOrderMutation.isPending}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Confirm Delivery
                </Button>
              )}

              {!isSeller && order.status === "delivered" && (
                <Button 
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCompleteOrder(order.id)}
                  disabled={updateOrderMutation.isPending}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Complete Order
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const isLoading = loadingBuyer || loadingSeller;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-primary rounded-xl">
              <Package className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Orders
              </h1>
              <p className="text-muted-foreground">Track your purchases and sales</p>
            </div>
          </div>

          <Tabs defaultValue="purchases">
            <TabsList className="mb-6">
              <TabsTrigger value="purchases">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Purchases ({buyerOrders.length})
              </TabsTrigger>
              <TabsTrigger value="sales">
                <Package className="w-4 h-4 mr-2" />
                Sales ({sellerOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="purchases">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : buyerOrders.length === 0 ? (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No purchases yet</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => navigate("/marketplace")}
                    >
                      Browse Marketplace
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {buyerOrders.map((order: any) => renderOrderCard(order, false))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sales">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : sellerOrders.length === 0 ? (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No sales yet</p>
                    <p className="text-sm text-muted-foreground">
                      List something on the marketplace to start selling!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sellerOrders.map((order: any) => renderOrderCard(order, true))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Orders;
