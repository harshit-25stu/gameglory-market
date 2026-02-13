import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Bell,
  Target,
  AlertTriangle,
  DollarSign,
  Activity,
  LineChart,
  PieChart,
  Zap,
  Eye,
  Loader2
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";

interface PriceAlert {
  id: string;
  game_title: string;
  platform: string;
  target_price: number;
  alert_type: 'below' | 'above' | 'change';
  is_active: boolean;
  created_at: string;
}

interface MarketAnalysis {
  marketCondition: 'bull' | 'bear' | 'sideways' | 'volatile';
  pricePrediction: {
    shortTerm: string;
    longTerm: string;
    confidence: number;
  };
  demandLevel: 'very_high' | 'high' | 'moderate' | 'low' | 'very_low';
  keyInsights: string[];
  recommendations: string[];
  riskFactors: string[];
}

export const MarketIntelligence = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [alertPrice, setAlertPrice] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      }
    });
  }, []);

  // Fetch user's price alerts
  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['price-alerts', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await (supabase as any)
        .from('price_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PriceAlert[];
    },
    enabled: !!userId,
  });

  // Fetch price history
  const { data: priceHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['price-history', selectedGame, selectedPlatform, timeframe],
    queryFn: async () => {
      if (!selectedGame || !selectedPlatform) return null;

      const { data, error } = await supabase.functions.invoke('market-intelligence', {
        body: {
          action: 'get_price_history',
          payload: {
            gameTitle: selectedGame,
            platform: selectedPlatform,
            timeframe
          }
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedGame && !!selectedPlatform,
  });

  // Fetch market analysis
  const { data: marketAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['market-analysis', selectedGame, selectedPlatform, timeframe],
    queryFn: async () => {
      if (!selectedGame || !selectedPlatform) return null;

      const { data, error } = await supabase.functions.invoke('market-intelligence', {
        body: {
          action: 'analyze_market_trends',
          payload: {
            gameTitle: selectedGame,
            platform: selectedPlatform,
            timeframe
          }
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedGame && !!selectedPlatform,
  });

  const createPriceAlert = async () => {
    if (!userId || !selectedGame || !selectedPlatform || !alertPrice) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to create an alert.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('market-intelligence', {
        body: {
          action: 'create_price_alert',
          payload: {
            userId,
            gameTitle: selectedGame,
            platform: selectedPlatform,
            targetPrice: parseFloat(alertPrice),
            alertType: 'below'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Alert Created",
        description: `You'll be notified when ${selectedGame} drops below $${alertPrice}.`,
      });

      refetchAlerts();
      setAlertPrice("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create price alert.",
        variant: "destructive",
      });
    }
  };

  const deleteAlert = async (alertId: string) => {
    const { error } = await (supabase as any)
      .from('price_alerts')
      .delete()
      .eq('id', alertId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete alert.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Alert Deleted",
        description: "Price alert has been removed.",
      });
      refetchAlerts();
    }
  };

  const getMarketConditionColor = (condition: string) => {
    switch (condition) {
      case 'bull': return 'text-green-600 bg-green-100';
      case 'bear': return 'text-red-600 bg-red-100';
      case 'volatile': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getDemandLevelColor = (level: string) => {
    switch (level) {
      case 'very_high':
      case 'high': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'low':
      case 'very_low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Market Intelligence</h1>
          <p className="text-muted-foreground">Track prices, analyze trends, and get market insights</p>
        </div>
      </div>

      <Tabs defaultValue="analysis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">Market Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Price Alerts</TabsTrigger>
          <TabsTrigger value="trends">Price Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          {/* Game Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Game for Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Game Title</label>
                  <Input
                    placeholder="e.g., The Legend of Zelda"
                    value={selectedGame}
                    onChange={(e) => setSelectedGame(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Platform</label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ps5">PlayStation 5</SelectItem>
                      <SelectItem value="ps4">PlayStation 4</SelectItem>
                      <SelectItem value="xbox_series">Xbox Series X/S</SelectItem>
                      <SelectItem value="xbox_one">Xbox One</SelectItem>
                      <SelectItem value="switch">Nintendo Switch</SelectItem>
                      <SelectItem value="pc">PC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Timeframe</label>
                  <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Analysis Results */}
          {marketAnalysis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Market Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Market Condition</span>
                    <Badge className={getMarketConditionColor(marketAnalysis.analysis.marketCondition)}>
                      {marketAnalysis.analysis.marketCondition.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Demand Level</span>
                    <span className={`font-medium ${getDemandLevelColor(marketAnalysis.analysis.demandLevel)}`}>
                      {marketAnalysis.analysis.demandLevel.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span>AI Confidence</span>
                      <span className="text-sm">
                        {Math.round(marketAnalysis.analysis.pricePrediction.confidence * 100)}%
                      </span>
                    </div>
                    <Progress value={marketAnalysis.analysis.pricePrediction.confidence * 100} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Price Predictions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Short Term (1-3 months)</h4>
                    <p className="text-sm">{marketAnalysis.analysis.pricePrediction.shortTerm}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Long Term (3-6 months)</h4>
                    <p className="text-sm">{marketAnalysis.analysis.pricePrediction.longTerm}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Key Insights */}
          {marketAnalysis?.analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {marketAnalysis.analysis.keyInsights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {marketAnalysis.analysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Risk Factors */}
          {marketAnalysis?.analysis?.riskFactors?.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Risk Factors:</strong>
                <ul className="mt-2 space-y-1">
                  {marketAnalysis.analysis.riskFactors.map((risk, index) => (
                    <li key={index} className="text-sm">• {risk}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {/* Create Alert */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Create Price Alert
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Target Price</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Alert Type</label>
                  <Select defaultValue="below">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below">Price drops below</SelectItem>
                      <SelectItem value="above">Price rises above</SelectItem>
                      <SelectItem value="change">Significant change</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={createPriceAlert} className="w-full">
                    <Bell className="w-4 h-4 mr-2" />
                    Create Alert
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Your Price Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts?.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{alert.game_title}</h4>
                          <Badge variant="outline">{alert.platform.replace('_', ' ')}</Badge>
                          <Badge variant="secondary">{alert.alert_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Alert when price {alert.alert_type === 'below' ? 'drops below' :
                            alert.alert_type === 'above' ? 'rises above' : 'changes significantly'} ${alert.target_price}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {new Date(alert.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAlert(alert.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No price alerts yet</p>
                  <p className="text-sm">Create alerts to get notified about price changes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Price History Chart */}
          {priceHistory && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Price History: {selectedGame} ({selectedPlatform})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {priceHistory.priceHistory?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={priceHistory.priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, 'Average Price']} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <LineChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No price history available</p>
                    <p className="text-sm">Price data will appear as more sales occur</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Market Summary */}
          {priceHistory?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">${priceHistory.summary.averagePrice.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Average Price</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">${priceHistory.summary.minPrice.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Lowest Price</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold">${priceHistory.summary.maxPrice.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Highest Price</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Activity className="w-8 h-8 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">{priceHistory.summary.totalSales}</p>
                      <p className="text-xs text-muted-foreground">Total Sales</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};