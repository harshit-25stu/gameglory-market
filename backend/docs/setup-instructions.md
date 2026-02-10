# GameGlory Marketplace - Complete Setup Instructions

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# =============================================================================
# FRONTEND ENVIRONMENT VARIABLES (VITE_)
# =============================================================================
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Stripe Payment Processing (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key

# =============================================================================
# BACKEND ENVIRONMENT VARIABLES (Supabase Edge Functions)
# =============================================================================
# Supabase Configuration (Required for all functions)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Stripe Payment Processing (Backend)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key

# AI Services
LOVABLE_API_KEY=your-lovable-api-key
OPENAI_API_KEY=your-openai-api-key
```

## Complete Setup Steps

### 1. Prerequisites Installation

#### Node.js 18+
```bash
# Download from https://nodejs.org/
# Verify installation
node --version  # Should be 18+
npm --version   # Should be included
```

#### Supabase CLI
```bash
# Install globally
npm install -g supabase

# Verify installation
supabase --version
```

#### Git
```bash
# Download from https://git-scm.com/
# Verify installation
git --version
```

### 2. External Service Setup

#### Supabase Setup
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project initialization (5-10 minutes)
4. Go to Project Settings → API
5. Copy the following values:
   - Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - Anon/Public key → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Service Role key → `SUPABASE_SERVICE_ROLE_KEY`

#### Stripe Setup
1. Go to [https://stripe.com](https://stripe.com)
2. Create a Stripe account
3. Complete account verification
4. Go to Developers → API keys
5. Copy the following values:
   - Publishable key → `VITE_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
   - **Use test keys for development** (start with `pk_test_` and `sk_test_`)

#### Lovable AI Setup (Required)
1. Go to [https://lovable.dev](https://lovable.dev)
2. Sign up/Login to your account
3. Go to Account Settings → API Keys
4. Generate a new API key
5. Copy the key → `LOVABLE_API_KEY`

#### OpenAI Setup (Optional)
1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Create an OpenAI account
3. Add credits to your account
4. Go to API Keys section
5. Create a new API key
6. Copy the key → `OPENAI_API_KEY`

### 3. Project Setup

#### Clone and Install
```bash
# Clone the repository
git clone <your-repository-url>
cd gameglory-market-main

# Install dependencies
npm install
```

#### Environment Configuration
```bash
# Copy and edit environment file
cp backend/docs/setup-instructions.md .env.example  # Use this as template
# Edit .env.local with your actual values
```

#### Supabase CLI Setup
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Start local Supabase (optional for development)
supabase start
```

### 4. Database Setup

#### Push Schema
```bash
# Push database migrations
supabase db push

# This will create all tables, functions, and policies
```

#### Initialize Data (Optional)
```sql
-- Run these in Supabase SQL Editor to add default data

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, rarity, points, requirements) VALUES
('First Sale', 'Complete your first successful sale', 'shopping-bag', 'trading', 'common', 100,
 '{"type": "sales_count", "value": 1}'),
('Trusted Seller', 'Maintain a 4.8+ rating with 20+ reviews', 'star', 'reputation', 'rare', 300,
 '{"type": "rating_threshold", "rating": 4.8, "reviews": 20}'),
('Trading Champion', 'Complete 50 successful trades', 'trophy', 'trading', 'epic', 500,
 '{"type": "sales_count", "value": 50}');

-- Insert default notification templates
INSERT INTO notification_templates (name, type, title_template, message_template, priority) VALUES
('trade_offer_received', 'trade', 'New Trade Offer!', 'You received a trade offer for {{item_title}} from {{seller_name}}', 'high'),
('payment_received', 'payment', 'Payment Received!', 'You received ${{amount}} from your sale of {{item_title}}', 'high'),
('order_placed', 'order', 'New Order Received!', 'Someone purchased your {{item_title}} for ${{price}}', 'high');
```

### 5. Deploy Functions

#### Deploy Edge Functions
```bash
# Deploy all functions to production
supabase functions deploy

# Or deploy individual functions
supabase functions deploy ai-recommendations
supabase functions deploy create-payment-intent
supabase functions deploy ai-search
# ... deploy all functions
```

### 6. Start Development

#### Start the Application
```bash
# Start development server
npm run dev

# The app will be available at http://localhost:5173
```

## Development Workflow

### Daily Development
```bash
# Start development server
npm run dev

# Start local Supabase (in another terminal)
supabase start

# View local dashboard
supabase dashboard
```

### Code Changes
```bash
# Frontend changes
npm run dev  # Hot reload enabled

# Backend function changes
supabase functions serve  # Test locally
supabase functions deploy function-name  # Deploy to production

# Database changes
# Edit migration files in backend/database/
supabase db push  # Apply changes
```

### Testing
```bash
# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Frontend Deployment
1. **Vercel**:
   - Connect your GitHub repository
   - Set environment variables in Vercel dashboard
   - Deploy automatically on push

2. **Netlify**:
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Set environment variables

3. **Other Platforms**:
   - Any static hosting service that supports SPA routing
   - Copy `dist/` folder contents to your hosting

### Environment Variables for Hosting
Set these in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

## Troubleshooting

### Common Issues

#### Functions not deploying
```bash
# Check function status
supabase functions logs function-name

# Redeploy with verbose logging
supabase functions deploy function-name --no-verify-jwt
```

#### Database connection issues
```bash
# Check Supabase status
supabase status

# Reset local database
supabase db reset

# Check migration status
supabase db diff
```

#### Payment issues
```bash
# Check Stripe keys are correct
# Ensure you're using test keys for development
# Verify webhook endpoints if needed
```

#### AI function failures
```bash
# Check LOVABLE_API_KEY is set
# Verify API quotas
# Check function logs for specific errors
```

### Testing Functions Locally
```bash
# Test function with curl
curl -X POST 'http://localhost:54321/functions/v1/ai-recommendations' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{"userId": "test-user", "behavior": {"viewed_items": [], "purchased_items": [], "favorited_games": [], "search_queries": [], "trade_history": []}, "limit": 5}'
```

## Security Checklist

- [ ] Environment variables are NOT committed to Git
- [ ] Test API keys are used for development
- [ ] 2FA enabled on all service accounts
- [ ] Row Level Security enabled on all tables
- [ ] Functions have proper CORS configuration
- [ ] Sensitive data is encrypted

## Support Resources

- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Stripe Docs**: [https://stripe.com/docs](https://stripe.com/docs)
- **Lovable Docs**: [https://docs.lovable.dev](https://docs.lovable.dev)
- **React Docs**: [https://react.dev](https://react.dev)
- **Vite Docs**: [https://vitejs.dev](https://vitejs.dev)

## Getting Help

- **Supabase Discord**: [https://supabase.com/discord](https://supabase.com/discord)
- **Stripe Support**: [https://stripe.com/support](https://stripe.com/support)
- **Lovable Support**: [https://lovable.dev/support](https://lovable.dev/support)

---

**🎉 Your GameGlory marketplace is now ready to run!**

Follow these steps carefully, and you'll have a fully functional gaming marketplace with AI features, secure payments, and real-time capabilities.