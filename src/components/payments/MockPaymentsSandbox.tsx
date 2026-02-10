import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Shield, ArrowDownToLine, ArrowUpRight, Plus, RefreshCcw, AlertTriangle } from "lucide-react";

type MockPaymentsSandboxProps = {
  userId: string | null;
};

const PLATFORM_FEE_PCT = 0.05;

const MockPaymentsSandbox = ({ userId }: MockPaymentsSandboxProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [topUpAmount, setTopUpAmount] = useState<string>("25");
  const [purchaseAmount, setPurchaseAmount] = useState<string>("10");
  const [sellerId, setSellerId] = useState<string>("");
  const [itemType, setItemType] = useState<string>("digital_item");
  const [itemTitle, setItemTitle] = useState<string>("Mock Item");

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
  });

  const effectiveUserId = userId || session?.user?.id || null;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["wallet-profile", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, username, wallet_balance").eq("id", effectiveUserId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["mock-sellers", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, username").neq("id", effectiveUserId).limit(25);
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
  });

  const { data: escrows = [], isLoading: escrowsLoading } = useQuery({
    queryKey: ["mock-escrows", effectiveUserId],
    queryFn: async () => {
      // Escrow table is created by our migrations. If the user hasn't applied them yet,
      // this will error; we show a helpful toast.
      const { data, error } = await supabase
        .from("escrow_accounts")
        .select("*")
        .or(`buyer_id.eq.${effectiveUserId},seller_id.eq.${effectiveUserId}`)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
    retry: false,
  });

  const { data: walletTx = [] } = useQuery({
    queryKey: ["mock-wallet-tx", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
    retry: false,
  });

  const balance = useMemo(() => Number(profile?.wallet_balance || 0), [profile]);

  const topUpMutation = useMutation({
    mutationFn: async () => {
      const amt = Number(topUpAmount);
      if (!effectiveUserId) throw new Error("Not signed in");
      if (!amt || amt <= 0) throw new Error("Enter a valid top up amount");

      // Add wallet transaction
      const { error: txErr } = await supabase.from("wallet_transactions").insert({
        user_id: effectiveUserId,
        amount: amt,
        type: "credit",
        status: "completed",
        description: "Mock top-up (dev sandbox)",
      });
      if (txErr) throw txErr;

      // Update wallet balance
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ wallet_balance: balance + amt })
        .eq("id", effectiveUserId);
      if (profErr) throw profErr;
    },
    onSuccess: () => {
      toast({ title: "Wallet topped up", description: `+$${Number(topUpAmount).toFixed(2)}` });
      queryClient.invalidateQueries({ queryKey: ["wallet-profile", effectiveUserId] });
      queryClient.invalidateQueries({ queryKey: ["mock-wallet-tx", effectiveUserId] });
    },
    onError: (e: any) => toast({ title: "Top up failed", description: e.message, variant: "destructive" }),
  });

  const createMockPurchaseMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveUserId) throw new Error("Not signed in");

      const amt = Number(purchaseAmount);
      if (!sellerId) throw new Error("Select a seller");
      if (!amt || amt <= 0) throw new Error("Enter a valid purchase amount");
      if (amt > balance) throw new Error("Insufficient wallet balance (top up first)");

      const platformFee = Number((amt * PLATFORM_FEE_PCT).toFixed(2));
      const sellerAmount = Number((amt - platformFee).toFixed(2));

      // 1) Create an order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          buyer_id: effectiveUserId,
          seller_id: sellerId,
          item_id: crypto.randomUUID(), // mock item id
          item_type: itemType,
          status: "paid",
          total_price: amt,
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      // 2) Create escrow record (held)
      const { error: escrowErr } = await supabase.from("escrow_accounts").insert({
        order_id: order.id,
        buyer_id: effectiveUserId,
        seller_id: sellerId,
        total_amount: amt,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
        status: "held",
      });
      if (escrowErr) throw escrowErr;

      // 3) Debit buyer wallet (funds moved into escrow)
      const { error: txErr } = await supabase.from("wallet_transactions").insert({
        user_id: effectiveUserId,
        amount: -amt,
        type: "debit",
        status: "completed",
        description: `Mock purchase: ${itemTitle} (escrow held)`,
        reference_id: order.id,
      });
      if (txErr) throw txErr;

      const { error: profErr } = await supabase.from("profiles").update({ wallet_balance: balance - amt }).eq("id", effectiveUserId);
      if (profErr) throw profErr;

      return order.id as string;
    },
    onSuccess: (orderId) => {
      toast({ title: "Mock purchase created", description: `Order ${String(orderId).slice(0, 8)} — funds held in escrow.` });
      queryClient.invalidateQueries({ queryKey: ["wallet-profile", effectiveUserId] });
      queryClient.invalidateQueries({ queryKey: ["mock-wallet-tx", effectiveUserId] });
      queryClient.invalidateQueries({ queryKey: ["mock-escrows", effectiveUserId] });
    },
    onError: (e: any) => toast({ title: "Mock purchase failed", description: e.message, variant: "destructive" }),
  });

  const releaseEscrowMutation = useMutation({
    mutationFn: async (escrowId: string) => {
      if (!effectiveUserId) throw new Error("Not signed in");

      const { data: escrow, error } = await supabase.from("escrow_accounts").select("*").eq("id", escrowId).single();
      if (error) throw error;
      if (escrow.buyer_id !== effectiveUserId) throw new Error("Only the buyer can release escrow");
      if (escrow.status !== "held") throw new Error("Escrow is not in held status");

      // Update escrow
      const { error: upErr } = await supabase.from("escrow_accounts").update({ status: "released", released_at: new Date().toISOString() }).eq("id", escrowId);
      if (upErr) throw upErr;

      // Credit seller wallet
      const { data: sellerProfile, error: spErr } = await supabase.from("profiles").select("wallet_balance, total_earnings").eq("id", escrow.seller_id).single();
      if (spErr) throw spErr;

      const newSellerBal = Number(sellerProfile.wallet_balance || 0) + Number(escrow.seller_amount || 0);
      const newEarnings = Number(sellerProfile.total_earnings || 0) + Number(escrow.seller_amount || 0);

      const { error: sellerTxErr } = await supabase.from("wallet_transactions").insert({
        user_id: escrow.seller_id,
        amount: Number(escrow.seller_amount || 0),
        type: "credit",
        status: "completed",
        description: `Mock escrow released (order ${String(escrow.order_id).slice(0, 8)})`,
        reference_id: escrow.order_id,
        escrow_id: escrowId,
      });
      if (sellerTxErr) throw sellerTxErr;

      const { error: sellerUpErr } = await supabase
        .from("profiles")
        .update({ wallet_balance: newSellerBal, total_earnings: newEarnings })
        .eq("id", escrow.seller_id);
      if (sellerUpErr) throw sellerUpErr;

      // Mark order completed
      await supabase.from("orders").update({ status: "completed" }).eq("id", escrow.order_id);
    },
    onSuccess: () => {
      toast({ title: "Escrow released", description: "Seller has been credited (mock)." });
      queryClient.invalidateQueries({ queryKey: ["mock-escrows", effectiveUserId] });
    },
    onError: (e: any) => toast({ title: "Release failed", description: e.message, variant: "destructive" }),
  });

  const refundEscrowMutation = useMutation({
    mutationFn: async (escrowId: string) => {
      if (!effectiveUserId) throw new Error("Not signed in");

      const { data: escrow, error } = await supabase.from("escrow_accounts").select("*").eq("id", escrowId).single();
      if (error) throw error;
      if (escrow.status !== "held") throw new Error("Escrow is not in held status");

      // Update escrow status
      const { error: upErr } = await supabase.from("escrow_accounts").update({ status: "refunded" }).eq("id", escrowId);
      if (upErr) throw upErr;

      // Credit buyer wallet back
      const { data: buyerProfile, error: bpErr } = await supabase.from("profiles").select("wallet_balance").eq("id", escrow.buyer_id).single();
      if (bpErr) throw bpErr;

      const newBuyerBal = Number(buyerProfile.wallet_balance || 0) + Number(escrow.total_amount || 0);

      const { error: buyerTxErr } = await supabase.from("wallet_transactions").insert({
        user_id: escrow.buyer_id,
        amount: Number(escrow.total_amount || 0),
        type: "credit",
        status: "completed",
        description: `Mock escrow refund (order ${String(escrow.order_id).slice(0, 8)})`,
        reference_id: escrow.order_id,
        escrow_id: escrowId,
      });
      if (buyerTxErr) throw buyerTxErr;

      const { error: buyerUpErr } = await supabase.from("profiles").update({ wallet_balance: newBuyerBal }).eq("id", escrow.buyer_id);
      if (buyerUpErr) throw buyerUpErr;

      // Cancel order
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", escrow.order_id);
    },
    onSuccess: () => {
      toast({ title: "Escrow refunded", description: "Buyer has been credited (mock)." });
      queryClient.invalidateQueries({ queryKey: ["mock-escrows", effectiveUserId] });
      queryClient.invalidateQueries({ queryKey: ["wallet-profile", effectiveUserId] });
      queryClient.invalidateQueries({ queryKey: ["mock-wallet-tx", effectiveUserId] });
    },
    onError: (e: any) => toast({ title: "Refund failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Mock Payments Sandbox (Wallet + Escrow)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Your wallet</div>
                <div className="text-2xl font-bold">
                  {profileLoading ? "—" : `$${balance.toFixed(2)}`}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["wallet-profile", effectiveUserId] });
                queryClient.invalidateQueries({ queryKey: ["mock-wallet-tx", effectiveUserId] });
                queryClient.invalidateQueries({ queryKey: ["mock-escrows", effectiveUserId] });
              }}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top-up */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Mock wallet top-up
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} placeholder="Amount" />
                  <Button onClick={() => topUpMutation.mutate()} disabled={topUpMutation.isPending}>
                    <ArrowDownToLine className="h-4 w-4 mr-2" />
                    Add funds
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This simulates a successful payment and directly credits your wallet.
                </p>
              </CardContent>
            </Card>

            {/* Mock purchase */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Create mock purchase (escrow held)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="Item title" />
                  <Input value={purchaseAmount} onChange={(e) => setPurchaseAmount(e.target.value)} placeholder="Amount" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                  >
                    <option value="">Select seller…</option>
                    {sellers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.username}
                      </option>
                    ))}
                  </select>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                  >
                    <option value="digital_item">digital_item</option>
                    <option value="physical_game">physical_game</option>
                    <option value="game_skin">game_skin</option>
                  </select>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Platform fee: {(PLATFORM_FEE_PCT * 100).toFixed(0)}%</span>
                  <span>
                    Seller receives: $
                    {(() => {
                      const amt = Number(purchaseAmount || 0);
                      return (amt - amt * PLATFORM_FEE_PCT).toFixed(2);
                    })()}
                  </span>
                </div>

                <Button onClick={() => createMockPurchaseMutation.mutate()} disabled={createMockPurchaseMutation.isPending}>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Create mock purchase
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              This is a <b>mock</b> payment flow (no Stripe). It writes into your Supabase tables:
              <span className="font-mono"> profiles</span>, <span className="font-mono">wallet_transactions</span>,
              <span className="font-mono"> orders</span>, <span className="font-mono">escrow_accounts</span>.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escrow list */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Escrow ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escrow</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {escrowsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Loading escrows…
                  </TableCell>
                </TableRow>
              ) : escrows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No escrow records yet.
                  </TableCell>
                </TableRow>
              ) : (
                escrows.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{String(e.id).slice(0, 8)}</TableCell>
                    <TableCell className="font-mono text-xs">{String(e.order_id).slice(0, 8)}</TableCell>
                    <TableCell>${Number(e.total_amount || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "held" ? "secondary" : e.status === "released" ? "default" : "outline"}>
                        {String(e.status).toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => releaseEscrowMutation.mutate(e.id)}
                          disabled={releaseEscrowMutation.isPending || e.status !== "held" || e.buyer_id !== effectiveUserId}
                        >
                          Release
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => refundEscrowMutation.mutate(e.id)}
                          disabled={refundEscrowMutation.isPending || e.status !== "held"}
                        >
                          Refund
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Wallet transactions */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Recent wallet transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {walletTx.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    No wallet transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                walletTx.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{t.description || t.type}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={Number(t.amount) >= 0 ? "text-green-600" : "text-red-600"}>
                        {Number(t.amount) >= 0 ? "+" : ""}
                        ${Number(t.amount).toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockPaymentsSandbox;

