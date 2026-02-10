import { useState, useEffect } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, CreditCard, Lock, CheckCircle } from "lucide-react";

interface PaymentFormProps {
  orderId: string;
  amount: number;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}

export const PaymentForm = ({ orderId, amount, onSuccess, onError }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment method
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (methodError) throw methodError;

      setPaymentMethodId(paymentMethod.id);

      // Create payment intent
      const { data: intentData, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          orderId,
          paymentMethodId: paymentMethod.id
        }
      });

      if (intentError) throw new Error(intentError.message);

      // Confirm payment
      const { error: confirmError } = await stripe.confirmCardPayment(
        intentData.paymentIntent.client_secret,
        {
          payment_method: paymentMethod.id,
        }
      );

      if (confirmError) throw confirmError;

      // Verify payment status
      const { data: confirmData, error: confirmStatusError } = await supabase.functions.invoke('confirm-payment', {
        body: {
          paymentIntentId: intentData.paymentIntent.id
        }
      });

      if (confirmStatusError) throw new Error(confirmStatusError.message);

      if (confirmData.success) {
        toast({
          title: "Payment Successful!",
          description: "Your payment has been processed and funds are now in escrow.",
        });
        onSuccess(confirmData);
      } else {
        throw new Error('Payment failed');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "An error occurred during payment processing.",
        variant: "destructive",
      });
      onError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        backgroundColor: 'transparent',
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true,
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Secure Payment
        </CardTitle>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Escrow Protected
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Card Information</label>
            <div className="border rounded-lg p-3 bg-muted/50">
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Your payment information is encrypted and secure</span>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Shield className="h-4 w-4" />
              <span>Funds will be held in escrow until you confirm delivery</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full bg-gradient-primary hover:opacity-90"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Pay ${amount.toFixed(2)}
              </>
            )}
          </Button>
        </form>

        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>By completing this purchase, you agree to our terms of service.</p>
          <p>Questions? Contact our support team.</p>
        </div>
      </CardContent>
    </Card>
  );
};