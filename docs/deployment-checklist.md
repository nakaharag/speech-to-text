# Production Deployment Checklist

## Pre-Deployment

### Environment Variables

#### Frontend (Next.js)
- [ ] `NEXTAUTH_SECRET` - Strong random secret (32+ chars)
- [ ] `NEXTAUTH_URL` - Production URL (https://speech-to-text.me)
- [ ] `DATABASE_URL` - Production PostgreSQL connection string
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Production Google OAuth
- [ ] `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` - Production Apple OAuth
- [ ] `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` - Live Stripe keys
- [ ] `STRIPE_WEBHOOK_SECRET` - Production webhook secret
- [ ] `RESEND_API_KEY` - Production email API key
- [ ] `NEXT_PUBLIC_APP_URL` - Production app URL

#### Backend (NestJS)
- [ ] `DATABASE_URL` - Production PostgreSQL connection string
- [ ] `OPENAI_API_KEY` - OpenAI API key for Whisper/TTS
- [ ] `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` - Cloudflare R2
- [ ] `R2_BUCKET_NAME` - Production bucket name
- [ ] `CORS_ORIGIN` - Frontend production URL

### Database
- [ ] Run `npx prisma migrate deploy` on production database
- [ ] Verify all indexes are created
- [ ] Set up database backups (daily)
- [ ] Configure connection pooling if needed

### Stripe
- [ ] Create production products/prices
- [ ] Update price IDs in environment
- [ ] Register production webhook endpoint
- [ ] Configure Customer Portal branding
- [ ] Enable tax calculation if needed

### DNS & SSL
- [ ] DNS A/CNAME records configured
- [ ] SSL certificate provisioned (Let's Encrypt or Cloudflare)
- [ ] HTTPS redirect enabled
- [ ] HSTS header configured

### External Services
- [ ] Google OAuth - Production redirect URIs configured
- [ ] Apple OAuth - Production redirect URIs configured
- [ ] Cloudflare R2 - CORS rules configured
- [ ] Resend - Domain verified for production emails

## Deployment

### Build Verification
- [ ] `pnpm build` succeeds without errors
- [ ] `pnpm lint` passes
- [ ] Docker images build successfully
- [ ] Health endpoints respond

### Deploy Steps
1. [ ] Create database backup
2. [ ] Run database migrations
3. [ ] Deploy new container/build
4. [ ] Verify health endpoint responds
5. [ ] Run smoke tests
6. [ ] Monitor error logs for 30 minutes

## Post-Deployment Verification

### Functional Tests
- [ ] Homepage loads correctly
- [ ] Google OAuth sign-in works
- [ ] Email sign-up and verification works
- [ ] Transcription with recording works
- [ ] File upload transcription works
- [ ] Dashboard loads for authenticated users
- [ ] History displays correctly
- [ ] Share link creation works
- [ ] Share page displays correctly
- [ ] Stripe checkout redirects correctly
- [ ] Webhook receives events
- [ ] Dark mode toggle works
- [ ] Language switching works (en, es, pt)

### Performance Checks
- [ ] Lighthouse score > 90 for homepage
- [ ] Time to First Byte < 200ms
- [ ] Largest Contentful Paint < 2.5s
- [ ] No console errors in browser

### Security Checks
- [ ] CSP headers configured
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured
- [ ] No sensitive data in error messages
- [ ] Rate limiting working

## Rollback Plan

### Automatic Rollback Triggers
- Error rate > 5% for 5 minutes
- Response time p95 > 3s for 5 minutes
- Health check failures for 2 minutes

### Manual Rollback Steps
1. Identify the issue and affected version
2. Revert to previous container/build version
3. If database migration issue:
   - Restore from backup
   - Or run down migration if available
4. Verify rollback health
5. Investigate root cause

### Rollback Commands
```bash
# Docker rollback
docker service update --image registry/app:previous-tag app

# Kubernetes rollback
kubectl rollout undo deployment/app
```

## Monitoring

### Key Metrics to Watch
- Request rate and error rate
- Response time (p50, p95, p99)
- Database connection count
- Memory and CPU usage
- Stripe webhook success rate
- Transcription API success rate

### Alerts to Configure
- Error rate > 1%
- p95 latency > 2s
- Database connections > 80%
- Memory usage > 85%
- Failed Stripe webhooks
- OpenAI API failures
