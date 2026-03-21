This is the Next.js TypeScript frontend for the LFC church management system.

## Getting Started

Set the backend base URL in your env file:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

Current migration slice:

- typed env config for backend URL
- typed API request helper
- typed local session helper
- Next.js login page
- Next.js register page
- protected shell with sidebar navigation
- first routed dashboard and section pages in TypeScript

Main files:

- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(app)/layout.tsx`
- `components/layout/app-shell.tsx`
- `lib/api.ts`
- `lib/session.ts`
- `lib/env.ts`
