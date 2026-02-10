# How to Run GameGlory Marketplace

## Quick start (3 steps)

### 1. Install dependencies

```bash
cd /Users/shreyasingh/Desktop/gameglory-market-main
npm install
```

### 2. Set up environment variables

Create or edit `.env` in the project root with your Supabase keys:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

- Get these from [Supabase](https://supabase.com) → your project → **Settings** → **API** (Project URL + anon public key).

### 3. Start the dev server

```bash
npm run dev
```

- App runs at **http://localhost:5173** (or the port shown in the terminal).
- Edit code and the page will hot-reload.

---

## Other useful commands

| Command | What it does |
|--------|----------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (output in `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## If something doesn’t work

- **Blank page or Supabase errors**  
  Check that `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (no quotes, no spaces around `=`).

- **Port already in use**  
  Vite will offer another port (e.g. 5174). Use the URL it prints in the terminal.

- **`npm install` fails**  
  Use Node 18+ (`node -v`). If needed, install via [nodejs.org](https://nodejs.org) or nvm.
