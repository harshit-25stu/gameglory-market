# GameGlory Backend - Deployment Guide

## 🎯 Overview

This guide covers the complete deployment process for the GameGlory gaming marketplace backend infrastructure.

## 📋 Prerequisites

### Required Accounts & Services
- **Supabase Account**: Database and Edge Functions hosting
- **Stripe Account**: Payment processing
- **OpenAI API Key**: AI features (optional but recommended)
- **Lovable API Key**: AI processing gateway

### System Requirements
- Node.js 18+ for local development
- Supabase CLI installed
- Git for version control

## 🚀 Quick Start Deployment

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd gameglory-market-main

# Install dependencies
npm install

# Install Supabase CLI
npm install -g supabase
```

### 2. Supabase Project Setup

```bash
# Login to Supabase
supabase login

# Initialize project (if not already done)
supabase init

# Link to your Supabase project
supabase link --project-ref your-project-ref
```

### 3. Database Setup

```bash
# Start local Supabase (optional for testing)
supabase start

# Push database schema
supabase db push

# Run migrations in order
# Note: Migrations are in backend/database/ folder
supabase db reset  # This will run all migrations
```

### 4. Environment Variables

Create `.env.local` file in the root directory:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Stripe (for frontend)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

Set environment variables in Supabase dashboard (Project Settings > Edge Functions):

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
OPENAI_API_KEY=your_openai_api_key
LOVABLE_API_KEY=your_lovable_api_key
```

### 5. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individual functions
supabase functions deploy ai-recommendations
supabase functions deploy create-payment-intent
supabase functions deploy ai-search
# ... deploy all functions from backend/functions/
```

### 6. Initialize Default Data

```sql
-- Run these SQL commands in Supabase SQL Editor

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, rarity, points, requirements) VALUES
('First Sale', 'Complete your first successful sale', 'shopping-bag', 'trading', 'common', 100,
 '{"type": "sales_count", "value": 1}'),
-- ... (see migration files for full list)

-- Insert default notification templates
INSERT INTO notification_templates (name, type, title_template, message_template, priority) VALUES
('trade_offer_received', 'trade', 'New Trade Offer!', 'You received a trade offer for {{item_title}} from {{seller_name}}', 'high'),
-- ... (see migration files for full list)
```

### 7. Frontend Deployment

```bash
# Build the frontend
npm run build

# Deploy to your hosting platform (Vercel, Netlify, etc.)
# The build output will be in the dist/ folder
```

## 🔧 Function-Specific Setup

### AI Functions Setup

The AI functions require API keys. Ensure these are set in Supabase:

```bash
LOVABLE_API_KEY=your_lovable_key
OPENAI_API_KEY=your_openai_key
```

**Required Functions:**
- `ai-recommendations`
- `ai-fraud-detection`
- `ai-content-moderation`
- `ai-smart-matching`
- `ai-trade-pricing`
- `ai-search`

### Payment Functions Setup

Stripe integration requires:

```bash
STRIPE_SECRET_KEY=your_stripe_secret_key
```

**Required Functions:**
- `create-payment-intent`
- `confirm-payment`
- `escrow-management`
- `payout-management`

### Market Intelligence Setup

No additional setup required beyond database migrations.

**Required Functions:**
- `market-intelligence`

## 🗄️ Database Migrations Order

Run migrations in this exact order:

1. `20250120000001_create_notifications_system.sql`
2. `20250120000002_create_achievements_leaderboards.sql`
3. `20250120000003_create_payment_system.sql`
4. `20250120000004_create_market_intelligence.sql`
5. `20250120000005_enhance_live_streaming.sql`

## 🔒 Security Checklist

### Before Going Live

- [ ] **Environment Variables**: All sensitive keys are set in Supabase (not in code)
- [ ] **RLS Policies**: All tables have proper Row Level Security enabled
- [ ] **CORS Settings**: Functions have proper CORS configuration
- [ ] **Rate Limiting**: Consider implementing rate limits for AI functions
- [ ] **Error Handling**: All functions have proper error handling
- [ ] **Logging**: Sensitive data is not logged

### Payment Security

- [ ] **Stripe Webhooks**: Set up webhook endpoints for payment confirmations
- [ ] **PCI Compliance**: Ensure Stripe handles all card data properly
- [ ] **Escrow Logic**: Test fund release and dispute resolution flows
- [ ] **Payout Verification**: Verify seller identities before enabling payouts

### AI Security

- [ ] **API Rate Limits**: Monitor usage to prevent excessive costs
- [ ] **Content Filtering**: AI moderation is working for user-generated content
- [ ] **Data Privacy**: User data is not exposed in AI processing
- [ ] **Fallback Handling**: Functions work when AI services are unavailable

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check function health
curl -X POST 'https://your-project.supabase.co/functions/v1/health-check' \
  -H 'Authorization: Bearer your-anon-key'
```

### Regular Maintenance Tasks

```sql
-- Run these weekly/monthly in Supabase SQL Editor

-- Update market trends
SELECT update_market_trends();

-- Check price alerts
SELECT check_price_alerts();

-- Clean up old notifications (optional)
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days';

-- Archive old price history (optional)
DELETE FROM price_history WHERE recorded_at < NOW() - INTERVAL '1 year';
```

### Performance Monitoring

Monitor these metrics in Supabase dashboard:
- Function execution times
- Database query performance
- API response times
- Error rates

## 🚨 Troubleshooting

### Common Issues

**Functions not deploying:**
```bash
# Check function logs
supabase functions logs function-name

# Redeploy specific function
supabase functions deploy function-name --no-verify-jwt
```

**Database connection issues:**
```bash
# Reset database
supabase db reset

# Check migration status
supabase db diff
```

**AI functions failing:**
- Check API keys are set correctly
- Verify API quotas/limits
- Check function logs for specific errors

**Payment issues:**
- Verify Stripe keys are correct
- Check webhook endpoints are configured
- Test with Stripe test cards

### Support

For issues:
1. Check Supabase function logs
2. Review database migration status
3. Verify environment variables
4. Test with minimal configuration
5. Check network connectivity

## 🔄 Updates & Scaling

### Adding New Functions

1. Create function in `backend/functions/` appropriate subdirectory
2. Test locally with `supabase functions serve`
3. Deploy with `supabase functions deploy function-name`
4. Update documentation

### Database Schema Changes

1. Create new migration file in `backend/database/`
2. Test migration locally
3. Deploy with `supabase db push`
4. Update type definitions if needed

### Scaling Considerations

- **Edge Functions**: Automatically scale with Supabase
- **Database**: Monitor query performance and add indexes as needed
- **AI Services**: Implement caching and rate limiting
- **Payments**: Monitor Stripe usage and costs

## ✅ Post-Deployment Checklist

- [ ] All functions deployed successfully
- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] Default data inserted
- [ ] Frontend deployed and connected
- [ ] Basic functionality tested
- [ ] Payment flow tested with test cards
- [ ] AI features working
- [ ] Real-time features functional
- [ ] Admin dashboard accessible
- [ ] Monitoring alerts configured

## 🎉 You're Live!

Your GameGlory marketplace is now fully deployed with enterprise-grade features including AI-powered recommendations, secure payments with escrow, real-time notifications, comprehensive analytics, and much more!

Monitor the platform closely in the first few days and address any issues that arise. The system is designed to scale automatically as your user base grows.