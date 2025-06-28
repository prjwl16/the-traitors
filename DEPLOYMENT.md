# 🚀 Deploying Whispers to Vercel

## Prerequisites
- GitHub account with your repository
- Vercel account (free tier works)
- OpenAI API key
- PostgreSQL database (we'll set this up)

## Step 1: Set up Database

### Option A: Vercel Postgres (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Storage" → "Create Database" → "Postgres"
3. Choose a name like "whispers-db"
4. Select your region
5. Copy the connection string


### Option B: Neon (Free PostgreSQL)
1. Go to [Neon](https://neon.tech)
2. Create a free account
3. Create a new project
4. Copy the connection string

### Option C: Supabase (Free PostgreSQL)
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string

## Step 2: Deploy to Vercel

### Method 1: Vercel Dashboard (Easiest)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository: `prjwl16/the-traitors`
4. Configure environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
5. Click "Deploy"

### Method 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY

# Redeploy with environment variables
vercel --prod
```

## Step 3: Set up Database Schema

After deployment, you need to set up your database:

1. In your Vercel project dashboard, go to "Functions"
2. Find any API route and click "View Function Logs"
3. Or use Vercel CLI:

```bash
# Generate Prisma client for production
vercel env pull .env.local
npx prisma generate
npx prisma db push
```

## Step 4: Environment Variables

Make sure these are set in Vercel:

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: Your OpenAI API key
- `NEXTAUTH_URL`: Your Vercel domain (e.g., https://your-app.vercel.app)

## Step 5: Test Your Deployment

1. Visit your Vercel URL
2. Create a new game
3. Add players and start the game
4. Test the Room of Secrets
5. Verify AI features are working

## Troubleshooting

### Database Issues
- Make sure your DATABASE_URL is correct
- Check that the database allows connections from Vercel
- Verify Prisma schema is pushed to the database

### OpenAI Issues
- Verify your OPENAI_API_KEY is valid
- Check you have sufficient OpenAI credits
- Monitor function logs for API errors

### Build Issues
- Check Vercel function logs
- Ensure all dependencies are in package.json
- Verify TypeScript compilation

## Production Considerations

1. **Database Backups**: Set up regular backups
2. **Monitoring**: Use Vercel Analytics
3. **Error Tracking**: Consider Sentry integration
4. **Rate Limiting**: Implement for OpenAI API calls
5. **Caching**: Add Redis for session management

## Support

If you encounter issues:
1. Check Vercel function logs
2. Review this deployment guide
3. Check the GitHub repository for updates
