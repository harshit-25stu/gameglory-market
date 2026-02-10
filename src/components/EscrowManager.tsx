import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, CheckCircle, AlertTriangle, Clock, DollarSign, MessageSquare } from "lucide-react";

interface EscrowManagerProps {
  orderId: string;
  userRole: 'buyer' | 'seller';
}

export const EscrowManager = ({ orderId, userRole }: EscrowManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);

  const { data: escrowData, isLoading } = useQuery({
    queryKey: ['escrow', orderId],
    queryFn: async () => {
      const { data: escrow } = await supabase
        .from('escrow_accounts')
        .select(`
          *,
          orders(*),
          payment_disputes(*)
        `)
        .eq('order_id', orderId)
        .single();

      return escrow;
    },
  });

  const releaseFundsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('escrow-management', {
        body: {
          action: 'release_funds',
          payload: {
            escrowId: escrowData?.id,
            userId: supabase.auth.getUser().then(({ data }) => data.user?.id)
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Funds Released!",
        description: "The funds have been successfully transferred to the seller.",
      });
      queryClient.invalidateQueries({ queryKey: ['escrow', orderId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to release funds",
        variant: "destructive",
      });
    },
  });

  const createDisputeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('escrow-management', {
        body: {
          action: 'create_dispute',
          payload: {
            escrowId: escrowData?.id,
            userId: supabase.auth.getUser().then(({ data }) => data.user?.id),
            reason: disputeReason,
            description: disputeDescription,
            evidenceUrls
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Dispute Created",
        description: "Your dispute has been submitted and will be reviewed by our team.",
      });
      queryClient.invalidateQueries({ queryKey: ['escrow', orderId] });
      setDisputeReason("");
      setDisputeDescription("");
      setEvidenceUrls([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create dispute",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'held': return 'bg-yellow-500';
      case 'released': return 'bg-green-500';
      case 'refunded': return 'bg-blue-500';
      case 'disputed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'held': return 'Funds Secured';
      case 'released': return 'Funds Released';
      case 'refunded': return 'Funds Refunded';
      case 'disputed': return 'Under Dispute';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Loading escrow details...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!escrowData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No escrow account found for this order.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const canReleaseFunds = userRole === 'buyer' && escrowData.status === 'held';
  const canCreateDispute = ['buyer', 'seller'].includes(userRole) && escrowData.status === 'held';
  const hasActiveDispute = escrowData.payment_disputes?.some((d: any) => d.status === 'open');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Escrow Protection
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(escrowData.status)}`} />
            <span className="font-medium">{getStatusText(escrowData.status)}</span>
          </div>
          <Badge variant="outline">
            <DollarSign className="w-3 h-3 mr-1" />
            ${escrowData.total_amount}
          </Badge>
        </div>

        {/* Escrow Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Amount</p>
            <p className="font-medium">${escrowData.total_amount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Platform Fee</p>
            <p className="font-medium">${escrowData.platform_fee}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Seller Receives</p>
            <p className="font-medium">${escrowData.seller_amount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">
              {new Date(escrowData.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        {canReleaseFunds && (
          <div className="space-y-2">
            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Item received? Release funds to complete the transaction.</span>
              </div>
            </div>

            <Button
              onClick={() => releaseFundsMutation.mutate()}
              disabled={releaseFundsMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {releaseFundsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Releasing Funds...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Release Funds to Seller
                </>
              )}
            </Button>
          </div>
        )}

        {canCreateDispute && !hasActiveDispute && (
          <div className="space-y-2">
            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Having issues? Create a dispute to protect your transaction.</span>
              </div>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Create Dispute
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Payment Dispute</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Reason</label>
                    <select
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-lg"
                    >
                      <option value="">Select a reason</option>
                      <option value="item_not_received">Item not received</option>
                      <option value="item_not_as_described">Item not as described</option>
                      <option value="seller_not_responding">Seller not responding</option>
                      <option value="payment_issue">Payment issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={disputeDescription}
                      onChange={(e) => setDisputeDescription(e.target.value)}
                      placeholder="Provide details about the issue..."
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={() => createDisputeMutation.mutate()}
                    disabled={!disputeReason || !disputeDescription || createDisputeMutation.isPending}
                    className="w-full"
                  >
                    {createDisputeMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Creating Dispute...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Submit Dispute
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {hasActiveDispute && (
          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
              <Clock className="h-4 w-4" />
              <span>A dispute is currently active for this transaction. Our team will review it shortly.</span>
            </div>
          </div>
        )}

        {/* Active Disputes */}
        {escrowData.payment_disputes?.map((dispute: any) => (
          <div key={dispute.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">Dispute #{dispute.id.slice(0, 8)}</span>
              </div>
              <Badge variant={dispute.status === 'open' ? 'destructive' : 'secondary'}>
                {dispute.status}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Reason: {dispute.reason}</p>
              <p className="text-sm">{dispute.description}</p>
            </div>

            {dispute.resolution && (
              <div className="bg-muted p-2 rounded text-sm">
                <strong>Resolution:</strong> {dispute.resolution}
                {dispute.admin_notes && (
                  <div className="mt-1 text-muted-foreground">
                    <strong>Admin Notes:</strong> {dispute.admin_notes}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};