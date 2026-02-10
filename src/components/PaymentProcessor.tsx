import { useState } from "react";
import { useStripe, useElements, PaymentElement, Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Wallet, Shield, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface PaymentProcessorProps {
  amount: number;
  currency?: string;
  buyerId: string;
  sellerId: string;
  orderId: string;
  itemType: string;
  itemId: string;
  description: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: any) => void;
}

const PaymentForm: React.FC<PaymentProcessorProps> = ({
  amount,
  currency = "usd",
  buyerId,
  sellerId,
  orderId,
  itemType,
  itemId,
  description,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'payment-processor',
        {
          body: {
            action: 'create_payment_intent',
            payload: {
              amount,
              currency,
              buyerId,
              sellerId,
              orderId,
              itemType,
              itemId,
              description,
            }
          }
        }
      );

      if (paymentError) throw paymentError;

      const { paymentIntent: pi } = paymentData;

      // Confirm payment
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        throw confirmError;
      }

      // Confirm payment on backend
      const { data: confirmData } = await supabase.functions.invoke('payment-processor', {
        body: {
          action: 'confirm_payment',
          payload: {
            paymentIntentId: pi.id,
            orderId,
            buyerId,
            sellerId,
            itemTitle: description,
            amount,
          }
        }
      });

      setPaymentIntent(pi);
      toast({
        title: "Payment Successful!",
        description: `$${amount} has been securely processed.`,
      });

      onSuccess?.(pi);

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "An error occurred during payment.",
        variant: "destructive",
      });
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <Shield className="w-4 h-4 text-green-500" />
        <span className="text-sm text-muted-foreground">
          Your payment is secured with 256-bit SSL encryption and protected by our escrow system.
        </span>
      </div>

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-gradient-primary"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${amount} {currency.toUpperCase()}
          </>
        )}
      </Button>

      {paymentIntent && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700">
            Payment confirmed! Funds are now held in escrow.
          </span>
        </div>
      )}
    </form>
  );
};

export const PaymentProcessor: React.FC<PaymentProcessorProps> = (props) => {
  const options = {
    mode: 'payment' as const,
    amount: Math.round(props.amount * 100),
    currency: props.currency || 'usd',
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Secure Payment
          </CardTitle>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">${props.amount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Platform Fee</span>
              <span className="text-sm">${(props.amount * 0.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="font-medium">Total</span>
              <span className="font-bold text-primary">${(props.amount * 1.05).toFixed(2)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PaymentForm {...props} />
        </CardContent>
      </Card>
    </Elements>
  );
};

export const WalletTopUp: React.FC<{ userId: string; onSuccess?: () => void }> = ({
  userId,
  onSuccess
}) => {
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleTopUp = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // In a real implementation, this would redirect to Stripe Checkout
      // For now, we'll simulate the process
      const { data, error } = await supabase.functions.invoke('payment-processor', {
        body: {
          action: 'add_wallet_funds',
          payload: {
            userId,
            amount: parseFloat(amount),
            paymentMethodId: 'simulated_payment_method'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Wallet Topped Up!",
        description: `$${amount} has been added to your wallet.`,
      });

      onSuccess?.();
      setAmount("");

    } catch (error: any) {
      toast({
        title: "Top-up Failed",
        description: error.message || "Failed to top up wallet.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Top Up Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Amount (USD)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            min="1"
            step="0.01"
          />
        </div>

        <Button
          onClick={handleTopUp}
          disabled={isProcessing || !amount}
          className="w-full bg-gradient-primary"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              Add ${amount || '0.00'}
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          Funds are added instantly and can be used for purchases immediately.
        </div>
      </CardContent>
    </Card>
  );
};

export const EscrowStatus: React.FC<{ orderId: string }> = ({ orderId }) => {
  const [escrowStatus, setEscrowStatus] = useState<any>(null);

  useState(() => {
    // Fetch escrow status
    supabase
      .from('escrow_transactions')
      .select('*')
      .eq('order_id', orderId)
      .single()
      .then(({ data }) => setEscrowStatus(data));
  });

  if (!escrowStatus) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'released': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'held': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Escrow Protection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Amount Held</span>
          <span className="font-semibold">${escrowStatus.amount}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Status</span>
          <Badge className={getStatusColor(escrowStatus.status)}>
            {escrowStatus.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {escrowStatus.status === 'confirmed' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Funds are securely held in escrow. The seller will receive payment once you confirm delivery.
            </p>
          </div>
        )}

        {escrowStatus.status === 'released' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              Payment has been released to the seller. Thank you for using our platform!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};