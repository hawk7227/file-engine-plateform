# File Engine - AI Code Generation Platform

A professional AI-powered code generation platform with a modern Claude-style interface.

## Features

- 🎨 **New Modern UI** - Claude-style chat interface with preview panel
- 🤖 **Real AI Backend** - Integrated with Claude API for code generation
- 📁 **Project Management** - Organize code into projects
- 💬 **Chat History** - Persistent chat storage with Supabase
- 🔐 **Authentication** - User auth with Supabase
- 💳 **Payments** - Stripe integration for subscriptions
- ⚡ **Code Validation** - Real-time syntax checking
- 🚀 **One-Click Deploy** - Deploy to Vercel/GitHub

## Quick Start

### 1. Install Dependencies

```bash
cd file-engine-merged
npm install
```

### 2. Set Up Environment Variables

Copy the example env file:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your values:

```env
# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Required - AI (at least one)
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 3. Set Up Database

Run the Supabase schema (in `supabase/schema.sql`) in your Supabase SQL editor.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
file-engine-merged/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── chat/          # Main AI chat endpoint
│   │   │   ├── generate/      # Code generation
│   │   │   ├── validate/      # Code validation
│   │   │   └── ...
│   │   ├── auth/              # Auth pages
│   │   ├── dashboard/         # Main dashboard (new UI)
│   │   └── ...
│   ├── components/            # React Components
│   │   ├── chat/              # Chat components
│   │   ├── sidebar/           # Sidebar navigation
│   │   ├── preview/           # Code preview panel
│   │   ├── command/           # Command palette
│   │   └── ui/                # UI primitives
│   ├── hooks/                 # React hooks
│   ├── lib/                   # Utilities & configs
│   └── styles/                # Global styles
├── supabase/
│   └── schema.sql             # Database schema
└── package.json
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Anthropic Claude API
- **Payments**: Stripe
- **Icons**: Lucide React

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `ANTHROPIC_API_KEY` | Yes* | Claude API key |
| `OPENAI_API_KEY` | Yes* | OpenAI API key |
| `STRIPE_SECRET_KEY` | No | Stripe secret key |
| `REDIS_URL` | No | Redis for queue |

*At least one AI provider key is required

## Development

```bash
# Run dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build
```

## License

MIT
