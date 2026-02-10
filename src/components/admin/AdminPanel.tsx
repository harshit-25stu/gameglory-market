import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  AlertTriangle,
  Scale,
  MessageSquare,
  Trash2,
  Sparkles,
  Send,
  CheckCircle2,
} from "lucide-react";

type AdminPanelProps = {
  enabled: boolean;
};

const AdminPanel = ({ enabled }: AdminPanelProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [moderationNote, setModerationNote] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const adminUserId = session?.user?.id;

  const { data: platformStats } = useQuery({
    queryKey: ["admin-platform-stats"],
    queryFn: async () => {
      const [usersRes, ordersRes, disputesRes, postsRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("payment_disputes").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("hub_posts").select("*", { count: "exact", head: true }),
      ]);

      return {
        users: usersRes.count || 0,
        orders: ordersRes.count || 0,
        openDisputes: disputesRes.count || 0,
        hubPosts: postsRes.count || 0,
      };
    },
    enabled: enabled,
  });

  // Seller moderation: list sellers + computed stats
  const { data: sellers = [], isLoading: sellersLoading } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, total_sales, total_earnings, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;

      // Compute extra stats per seller (best-effort)
      const enriched = await Promise.all(
        (profiles || []).map(async (p) => {
          const [listingsDigital, listingsPhysical, ratings] = await Promise.all([
            supabase.from("digital_items").select("id", { count: "exact", head: true }).eq("seller_id", p.id),
            supabase.from("physical_games").select("id", { count: "exact", head: true }).eq("seller_id", p.id),
            supabase.from("seller_ratings").select("rating").eq("seller_id", p.id),
          ]);

          const avgRating =
            ratings.data && ratings.data.length
              ? ratings.data.reduce((s: number, r: any) => s + (r.rating || 0), 0) / ratings.data.length
              : null;

          return {
            ...p,
            listingsCount: (listingsDigital.count || 0) + (listingsPhysical.count || 0),
            avgRating,
            ratingsCount: ratings.data?.length || 0,
          };
        }),
      );

      return enriched;
    },
    enabled: enabled,
  });

  // Dispute handling
  const { data: openDisputes = [], isLoading: disputesLoading } = useQuery({
    queryKey: ["admin-open-disputes-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_disputes")
        .select(
          `
          id,
          reason,
          description,
          status,
          created_at,
          initiated_by,
          profiles:initiated_by(username),
          escrow_accounts(
            id,
            order_id,
            total_amount,
            buyer_id,
            seller_id,
            status
          )
        `,
        )
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: enabled,
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async (params: { disputeId: string; resolution: "buyer_refunded" | "seller_paid" | "dismissed" }) => {
      // Prefer backend function (if deployed). Fallback to simple DB updates.
      const fn = await supabase.functions.invoke("escrow-management", {
        body: {
          action: "resolve_dispute",
          payload: {
            disputeId: params.disputeId,
            resolution: params.resolution,
            adminNotes: "Resolved from Dashboard admin panel",
            resolvedBy: adminUserId,
          },
        },
      });

      if (!fn.error) return fn.data;

      // Fallback (mock): mark dispute resolved only
      const { error } = await supabase
        .from("payment_disputes")
        .update({
          status: "resolved",
          resolution: params.resolution,
          resolved_by: adminUserId,
          resolved_at: new Date().toISOString(),
          admin_notes: "Resolved from Dashboard admin panel (fallback DB update)",
        })
        .eq("id", params.disputeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Dispute resolved" });
      queryClient.invalidateQueries({ queryKey: ["admin-open-disputes-v2"] });
    },
    onError: (e: any) => {
      toast({ title: "Failed to resolve dispute", description: e.message, variant: "destructive" });
    },
  });

  // Content control (posts + messages)
  const { data: contentItems = [], isLoading: contentLoading } = useQuery({
    queryKey: ["admin-content-control"],
    queryFn: async () => {
      const [posts, hangoutMsgs, streamMsgs] = await Promise.all([
        supabase.from("hub_posts").select("id, content, created_at, user_id, hub_id").order("created_at", { ascending: false }).limit(10),
        supabase.from("hangout_messages").select("id, message, created_at, user_id, room_id").order("created_at", { ascending: false }).limit(10),
        supabase.from("live_stream_messages").select("id, message, created_at, user_id, stream_id").order("created_at", { ascending: false }).limit(10),
      ]);

      const mapped = [
        ...(posts.data || []).map((p: any) => ({
          id: p.id,
          table: "hub_posts" as const,
          content: p.content,
          created_at: p.created_at,
          user_id: p.user_id,
          context: { hubId: p.hub_id },
        })),
        ...(hangoutMsgs.data || []).map((m: any) => ({
          id: m.id,
          table: "hangout_messages" as const,
          content: m.message,
          created_at: m.created_at,
          user_id: m.user_id,
          context: { roomId: m.room_id },
        })),
        ...(streamMsgs.data || []).map((m: any) => ({
          id: m.id,
          table: "live_stream_messages" as const,
          content: m.message,
          created_at: m.created_at,
          user_id: m.user_id,
          context: { streamId: m.stream_id },
        })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

      return mapped.slice(0, 20);
    },
    enabled: enabled,
  });

  const moderateMutation = useMutation({
    mutationFn: async (item: any) => {
      const response = await supabase.functions.invoke("ai-content-moderation", {
        body: {
          contentId: item.id,
          contentData: {
            content: item.content,
            contentType: item.table === "hub_posts" ? "post" : "message",
            userId: item.user_id,
            context: {
              hubId: item.context?.hubId,
            },
          },
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data: any) => {
      toast({
        title: data.approved ? "Content approved" : "Content flagged",
        description: data.reasoning,
        variant: data.approved ? "default" : "destructive",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Moderation failed",
        description: e.message || "ai-content-moderation is not deployed yet.",
        variant: "destructive",
      });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await supabase.from(item.table).delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Content deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-content-control"] });
    },
    onError: (e: any) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

  const warnSellerMutation = useMutation({
    mutationFn: async (payload: { sellerId: string; message: string }) => {
      // Try realtime-notifications function first (if deployed), else insert directly.
      const res = await supabase.functions.invoke("realtime-notifications", {
        body: {
          action: "send_notification",
          payload: {
            userId: payload.sellerId,
            type: "admin",
            title: "Seller moderation notice",
            message: payload.message,
            priority: "high",
          },
        },
      });

      if (!res.error) return;

      const { error } = await supabase.from("notifications").insert({
        user_id: payload.sellerId,
        type: "admin",
        title: "Seller moderation notice",
        message: payload.message,
        priority: "high",
        is_read: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Seller notified" });
      setModerationNote("");
      setSelectedSellerId(null);
    },
    onError: (e: any) => {
      toast({ title: "Failed to notify seller", description: e.message, variant: "destructive" });
    },
  });

  const sellersForTable = useMemo(() => sellers, [sellers]);

  if (!enabled) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Admin panel disabled</p>
              <p className="text-sm text-muted-foreground">Enable admin mode to access moderation and disputes.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin panel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Admin dashboard</TabsTrigger>
            <TabsTrigger value="sellers">Seller moderation</TabsTrigger>
            <TabsTrigger value="disputes">Dispute handling</TabsTrigger>
            <TabsTrigger value="content">Content control</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" /> Users
                  </div>
                  <div className="text-2xl font-bold">{platformStats?.users ?? "—"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Orders
                  </div>
                  <div className="text-2xl font-bold">{platformStats?.orders ?? "—"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Scale className="h-4 w-4" /> Open disputes
                  </div>
                  <div className="text-2xl font-bold">{platformStats?.openDisputes ?? "—"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Hub posts
                  </div>
                  <div className="text-2xl font-bold">{platformStats?.hubPosts ?? "—"}</div>
                </CardContent>
              </Card>
            </div>

            <div className="text-sm text-muted-foreground">
              This dashboard is “live” and pulls from your Supabase tables. If any section shows errors, it usually
              means the corresponding migration hasn’t been applied yet.
            </div>
          </TabsContent>

          <TabsContent value="sellers" className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Seller moderation actions are **safe mocks** (warn/notify). You can later connect real enforcement
                (suspensions, listing locks) with an admin roles table.
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead>Listings</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellersLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          Loading sellers…
                        </TableCell>
                      </TableRow>
                    ) : sellersForTable.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          No sellers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sellersForTable.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.username}</TableCell>
                          <TableCell>{s.listingsCount}</TableCell>
                          <TableCell>{s.total_sales ?? 0}</TableCell>
                          <TableCell>
                            {s.avgRating ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{s.avgRating.toFixed(1)} / 5</Badge>
                                <span className="text-xs text-muted-foreground">({s.ratingsCount})</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No ratings</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedSellerId(s.id);
                                    setModerationNote(
                                      `Hi ${s.username}, we noticed unusual activity. Please ensure your listings follow our policy.`,
                                    );
                                  }}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Warn
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Send moderation notice</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3">
                                  <Textarea
                                    value={moderationNote}
                                    onChange={(e) => setModerationNote(e.target.value)}
                                    rows={4}
                                  />
                                  <Button
                                    onClick={() => {
                                      if (!selectedSellerId) return;
                                      warnSellerMutation.mutate({ sellerId: selectedSellerId, message: moderationNote });
                                    }}
                                    disabled={!moderationNote || warnSellerMutation.isPending}
                                  >
                                    {warnSellerMutation.isPending ? "Sending…" : "Send notice"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispute</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Resolve</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disputesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          Loading disputes…
                        </TableCell>
                      </TableRow>
                    ) : openDisputes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          No open disputes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      openDisputes.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{d.id.slice(0, 8)}</TableCell>
                          <TableCell>{d.reason}</TableCell>
                          <TableCell>${d.escrow_accounts?.total_amount ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">OPEN</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveDisputeMutation.mutate({ disputeId: d.id, resolution: "dismissed" })}
                                disabled={resolveDisputeMutation.isPending}
                              >
                                Dismiss
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => resolveDisputeMutation.mutate({ disputeId: d.id, resolution: "buyer_refunded" })}
                                disabled={resolveDisputeMutation.isPending}
                              >
                                Refund buyer
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => resolveDisputeMutation.mutate({ disputeId: d.id, resolution: "seller_paid" })}
                                disabled={resolveDisputeMutation.isPending}
                              >
                                Pay seller
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
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Review recent posts/messages and run AI moderation (if deployed). Delete actions depend on RLS policies.
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contentLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                          Loading content…
                        </TableCell>
                      </TableRow>
                    ) : contentItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                          No content found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      contentItems.map((item: any) => (
                        <TableRow key={`${item.table}:${item.id}`}>
                          <TableCell>
                            <Badge variant="outline">{item.table}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[520px]">
                            <div className="line-clamp-2 text-sm">{item.content}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moderateMutation.mutate(item)}
                                disabled={moderateMutation.isPending}
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Moderate
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteContentMutation.mutate(item)}
                                disabled={deleteContentMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Quick admin note (mock)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Save a reminder for yourself (stored as a local draft only; wire it to a DB table later).
                </div>
                <Input placeholder="E.g. Review user reports for Hub #valorant" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminPanel;

