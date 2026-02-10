import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  Gamepad2,
  Activity,
  Calendar,
  Target,
  Award,
  Zap
} from "lucide-react";

const Analytics = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/auth';
      } else {
        setUserId(session.user.id);
      }
    });
  }, []);

  // Get user's analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', userId, timeRange],
    queryFn: async () => {
      if (!userId) return null;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Fetch various analytics data
      const [
        profileData,
        ordersData,
        listingsData,
        tradeInsData,
        hubMembershipsData,
        notificationsData
      ] = await Promise.all([
        // User profile stats
        supabase.from('profiles').select('*').eq('id', userId).single(),

        // Orders analytics
        supabase.from('orders').select('*').eq('seller_id', userId)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true }),

        // Listings performance
        supabase.from('digital_items').select('*').eq('seller_id', userId),

        // Trade-ins
        supabase.from('trade_ins').select('*').eq('user_id', userId),

        // Hub memberships
        supabase.from('hub_members').select('*, game_hubs(*)').eq('user_id', userId),

        // Notifications
        supabase.from('notifications').select('*').eq('user_id', userId)
          .order('created_at', { ascending: false }).limit(50)
      ]);

      // Process data for charts
      const ordersByDay = processOrdersByDay(ordersData.data || []);
      const revenueByDay = processRevenueByDay(ordersData.data || []);
      const categoryDistribution = processCategoryDistribution(listingsData.data || []);
      const tradeInStatus = processTradeInStatus(tradeInsData.data || []);

      return {
        profile: profileData.data,
        orders: ordersData.data || [],
        listings: listingsData.data || [],
        tradeIns: tradeInsData.data || [],
        hubs: hubMembershipsData.data || [],
        notifications: notificationsData.data || [],
        charts: {
          ordersByDay,
          revenueByDay,
          categoryDistribution,
          tradeInStatus
        }
      };
    },
    enabled: !!userId,
  });

  const processOrdersByDay = (orders: any[]) => {
    const dailyOrders: { [key: string]: number } = {};

    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      dailyOrders[date] = (dailyOrders[date] || 0) + 1;
    });

    return Object.entries(dailyOrders).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString(),
      orders: count
    }));
  };

  const processRevenueByDay = (orders: any[]) => {
    const dailyRevenue: { [key: string]: number } = {};

    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + order.total_price;
    });

    return Object.entries(dailyRevenue).map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString(),
      revenue
    }));
  };

  const processCategoryDistribution = (listings: any[]) => {
    const categories: { [key: string]: number } = {};

    listings.forEach(listing => {
      const category = listing.item_type;
      categories[category] = (categories[category] || 0) + 1;
    });

    return Object.entries(categories).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  };

  const processTradeInStatus = (tradeIns: any[]) => {
    const statuses: { [key: string]: number } = {};

    tradeIns.forEach(tradeIn => {
      const status = tradeIn.status;
      statuses[status] = (statuses[status] || 0) + 1;
    });

    return Object.entries(statuses).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  };

  const StatCard = ({ title, value, change, icon: Icon, trend }: {
    title: string;
    value: string | number;
    change?: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <p className={`text-xs flex items-center mt-1 ${
                trend === 'up' ? 'text-green-600' :
                trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                {change}
              </p>
            )}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  if (!userId || isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-lg">Loading analytics...</p>
          </div>
        </div>
      </>
    );
  }

  if (!analytics) return null;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Track your performance and insights across the platform
              </p>
            </div>
            <div className="flex gap-2">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </Button>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Earnings"
              value={`$${analytics.profile?.total_earnings || 0}`}
              change="+12.5%"
              icon={DollarSign}
              trend="up"
            />
            <StatCard
              title="Items Sold"
              value={analytics.orders.length}
              change="+8.2%"
              icon={ShoppingCart}
              trend="up"
            />
            <StatCard
              title="Active Listings"
              value={analytics.listings.filter(l => l.is_available).length}
              change="-2.1%"
              icon={Package}
              trend="down"
            />
            <StatCard
              title="Trader Level"
              value={analytics.profile?.trader_level || 1}
              icon={Award}
            />
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="listings">Listings</TabsTrigger>
              <TabsTrigger value="community">Community</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analytics.charts.revenueByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Trade-in Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Trade-in Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.charts.tradeInStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {analytics.charts.tradeInStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.notifications.slice(0, 5).map((notification: any) => (
                      <div key={notification.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                        </div>
                        <Badge variant={notification.is_read ? "secondary" : "default"}>
                          {notification.is_read ? 'Read' : 'New'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sales" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Orders Over Time */}
                <Card>
                  <CardHeader>
                    <CardTitle>Orders Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.charts.ordersByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="orders"
                          stroke="#8884d8"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.orders.slice(0, 5).map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${order.total_price}</p>
                            <Badge variant={
                              order.status === 'completed' ? 'default' :
                              order.status === 'pending' ? 'secondary' : 'outline'
                            }>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="listings" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Listing Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.charts.categoryDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Listings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Top Listings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.listings
                        .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
                        .slice(0, 5)
                        .map((listing: any) => (
                        <div key={listing.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{listing.title}</p>
                            <p className="text-sm text-muted-foreground">{listing.game_title}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${listing.price}</p>
                            <p className="text-xs text-muted-foreground">
                              {listing.views_count || 0} views
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="community" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hub Memberships */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Game Hubs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.hubs.slice(0, 5).map((membership: any) => (
                        <div key={membership.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                            <Gamepad2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{membership.game_hubs?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Joined {new Date(membership.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {membership.game_hubs?.member_count || 0} members
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Achievement Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle>Achievement Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Award className="w-8 h-8 text-yellow-500" />
                          <div>
                            <p className="font-medium">Trading Champion</p>
                            <p className="text-sm text-muted-foreground">Complete 50 trades</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{analytics.orders.length}/50</p>
                          <div className="w-20 bg-muted rounded-full h-2 mt-1">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${Math.min((analytics.orders.length / 50) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="w-8 h-8 text-blue-500" />
                          <div>
                            <p className="font-medium">Community Builder</p>
                            <p className="text-sm text-muted-foreground">Join 10 game hubs</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{analytics.hubs.length}/10</p>
                          <div className="w-20 bg-muted rounded-full h-2 mt-1">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${Math.min((analytics.hubs.length / 10) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Analytics;