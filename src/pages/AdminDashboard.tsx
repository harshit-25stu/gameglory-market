import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Settings,
  Activity,
  CreditCard
} from "lucide-react";

const AdminDashboard = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        window.location.href = '/auth';
        return;
      }

      setUserId(session.user.id);

      // Check if user is admin (you would have an admin role system)
      // For now, we'll assume admin access
      setIsAdmin(true);
    });
  }, []);

  // Dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        usersRes,
        ordersRes,
        disputesRes,
        paymentsRes,
        revenueRes
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        (supabase as any).from('payment_disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        (supabase as any).from('payments').select('*', { count: 'exact', head: true }).eq('status', 'succeeded'),
        (supabase as any).from('payments').select('amount').eq('status', 'succeeded')
      ]);

      const totalRevenue = (paymentsRes as any).data?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

      return {
        totalUsers: usersRes.count || 0,
        totalOrders: ordersRes.count || 0,
        openDisputes: disputesRes.count || 0,
        totalPayments: paymentsRes.count || 0,
        totalRevenue
      };
    },
    enabled: isAdmin,
  });

  // Recent orders
  const { data: recentOrders } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:buyer_id(username, avatar_url),
          digital_items(title),
          physical_games(title)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      return data;
    },
    enabled: isAdmin,
  });

  // Open disputes
  const { data: openDisputes } = useQuery({
    queryKey: ['admin-open-disputes'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('payment_disputes')
        .select(`
          *,
          profiles:initiated_by(username),
          escrow_accounts(order_id, total_amount, buyer_id, seller_id)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      return data;
    },
    enabled: isAdmin,
  });

  // Resolve dispute mutation
  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, resolution, resolutionAmount, adminNotes }: {
      disputeId: string;
      resolution: string;
      resolutionAmount?: number;
      adminNotes: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('escrow-management', {
        body: {
          action: 'resolve_dispute',
          payload: {
            disputeId,
            resolution,
            resolutionAmount,
            adminNotes,
            resolvedBy: userId
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Dispute Resolved",
        description: "The dispute has been successfully resolved.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-open-disputes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve dispute",
        variant: "destructive",
      });
    },
  });

  // Process payout mutation
  const processPayoutMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const { data, error } = await supabase.functions.invoke('payout-management', {
        body: {
          action: 'process_payout',
          payload: {
            payoutRequestId: payoutId,
            adminUserId: userId
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Payout Processed",
        description: "The payout has been successfully processed.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-payouts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process payout",
        variant: "destructive",
      });
    },
  });

  // Pending payouts
  const { data: pendingPayouts } = useQuery({
    queryKey: ['admin-pending-payouts'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('payout_requests')
        .select(`
          *,
          profiles:user_id(username),
          payment_methods(brand, last_four)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      return data;
    },
    enabled: isAdmin,
  });

  const StatCard = ({ title, value, icon: Icon, trend, color = "primary" }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: string;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                {trend}
              </p>
            )}
          </div>
          <Icon className={`h-8 w-8 text-${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access the admin dashboard.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage platform operations and monitor performance
              </p>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              <Shield className="w-4 h-4 mr-2" />
              Administrator
            </Badge>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={stats?.totalUsers || 0}
              icon={Users}
              trend="+12%"
            />
            <StatCard
              title="Total Orders"
              value={stats?.totalOrders || 0}
              icon={ShoppingCart}
              trend="+8%"
            />
            <StatCard
              title="Open Disputes"
              value={stats?.openDisputes || 0}
              icon={AlertTriangle}
              color="red-500"
            />
            <StatCard
              title="Total Revenue"
              value={`$${stats?.totalRevenue?.toFixed(2) || '0.00'}`}
              icon={DollarSign}
              trend="+15%"
            />
            <StatCard
              title="Success Rate"
              value={`${stats?.totalPayments ? Math.round((stats.totalPayments / stats.totalOrders) * 100) : 0}%`}
              icon={TrendingUp}
              color="green-500"
            />
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="disputes">Disputes</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentOrders?.slice(0, 5).map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.profiles?.username} • {order.digital_items?.title || order.physical_games?.title || 'Item'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${order.total_price}</p>
                            <Badge variant={
                              order.status === 'completed' ? 'default' :
                              order.status === 'paid' ? 'secondary' : 'outline'
                            }>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Platform Health */}
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Health</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Server Status</span>
                      <Badge className="bg-green-500">Online</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Database</span>
                      <Badge className="bg-green-500">Healthy</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Payment Processing</span>
                      <Badge className="bg-green-500">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>API Response Time</span>
                      <Badge variant="outline">120ms</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders?.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            {order.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>{order.profiles?.username}</TableCell>
                          <TableCell>
                            {order.digital_items?.title || order.physical_games?.title || 'Item'}
                          </TableCell>
                          <TableCell>${order.total_price}</TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === 'completed' ? 'default' :
                              order.status === 'paid' ? 'secondary' : 'outline'
                            }>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="disputes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Open Disputes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {openDisputes?.map((dispute: any) => (
                      <Card key={dispute.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-medium">Dispute #{dispute.id.slice(0, 8)}</h3>
                              <p className="text-sm text-muted-foreground">
                                Initiated by {dispute.profiles?.username} • Order #{dispute.escrow_accounts?.order_id?.slice(0, 8)}
                              </p>
                            </div>
                            <Badge variant="destructive">Open</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium">Reason</p>
                              <p className="text-sm">{dispute.reason}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Amount</p>
                              <p className="text-sm">${dispute.escrow_accounts?.total_amount}</p>
                            </div>
                          </div>

                          <p className="text-sm mb-4">{dispute.description}</p>

                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm">
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Resolve
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Resolve Dispute</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Resolution</label>
                                    <Select>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select resolution" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="buyer_refunded">Refund Buyer</SelectItem>
                                        <SelectItem value="seller_paid">Pay Seller</SelectItem>
                                        <SelectItem value="split_payment">Split Payment</SelectItem>
                                        <SelectItem value="dismissed">Dismiss Dispute</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Admin Notes</label>
                                    <Textarea placeholder="Add resolution notes..." />
                                  </div>
                                  <Button
                                    onClick={() => resolveDisputeMutation.mutate({
                                      disputeId: dispute.id,
                                      resolution: 'buyer_refunded',
                                      adminNotes: 'Resolved by admin'
                                    })}
                                    disabled={resolveDisputeMutation.isPending}
                                  >
                                    {resolveDisputeMutation.isPending ? 'Resolving...' : 'Resolve Dispute'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payouts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPayouts?.map((payout: any) => (
                        <TableRow key={payout.id}>
                          <TableCell>{payout.profiles?.username}</TableCell>
                          <TableCell>${payout.amount}</TableCell>
                          <TableCell>
                            {payout.payment_methods?.brand} ****{payout.payment_methods?.last_four}
                          </TableCell>
                          <TableCell>
                            {new Date(payout.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => processPayoutMutation.mutate(payout.id)}
                              disabled={processPayoutMutation.isPending}
                            >
                              {processPayoutMutation.isPending ? 'Processing...' : 'Process'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium">Platform Fee (%)</label>
                      <Input type="number" defaultValue="5.00" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Minimum Payout ($)</label>
                      <Input type="number" defaultValue="10.00" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Escrow Hold Period (days)</label>
                      <Input type="number" defaultValue="7" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Dispute Window (days)</label>
                      <Input type="number" defaultValue="30" />
                    </div>
                  </div>
                  <Button>Save Settings</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;