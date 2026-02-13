import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminPanel from "@/components/admin/AdminPanel";
import MockPaymentsSandbox from "@/components/payments/MockPaymentsSandbox";
import { LayoutDashboard, Shield, Wallet, Sparkles, Activity } from "lucide-react";

const Dashboard = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin role from database
  useEffect(() => {
    if (!userId) return;
    supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        window.location.href = "/auth";
        return;
      }

      setUserId(session.user.id);

      const { data: p, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        // Don’t hard-fail the whole dashboard; show a toast and continue.
        toast({
          title: "Profile not found",
          description: error.message,
          variant: "destructive",
        });
      }
      setProfile(p);
    });
  }, [toast]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-bold">Dashboard</h1>
                {isAdmin && (
                  <Badge variant="secondary" className="gap-2">
                    <Shield className="h-3.5 w-3.5" />
                    Admin enabled
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                Your control center for trading, moderation, disputes, and payments.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Wallet balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${Number(profile?.wallet_balance || 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mock payments can top-up and simulate escrow.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Trader level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Lvl {profile?.trader_level ?? 1}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  XP: {profile?.trader_xp ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isAdmin ? "Enabled" : "Disabled"}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Moderation, disputes, and content controls.
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="admin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin">Admin panel</TabsTrigger>
              <TabsTrigger value="payments">Mock payments</TabsTrigger>
            </TabsList>

            <TabsContent value="admin">
              <AdminPanel enabled={isAdmin} />
            </TabsContent>

            <TabsContent value="payments">
              <MockPaymentsSandbox userId={userId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Dashboard;

