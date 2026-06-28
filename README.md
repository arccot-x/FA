# Frictionless Finance

Cross-platform personal finance app optimized for Android, built with:

- Expo React Native mobile app
- Node.js and Express API
- PostgreSQL with Prisma
- Supabase Storage for receipt images and vault documents
- Zustand state management

## Project Layout

- `backend` - Express API, Prisma schema, upload/storage services
- `mobile` - Expo app with Home, Quick Add, Snap & Save, Bills, Vault, and Analytics screens

## Local Setup

1. Install dependencies from the repo root:

   ```powershell
   npm install
   ```

2. Configure backend environment:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

3. Update `backend\.env` with your Supabase PostgreSQL database URL and Supabase Storage keys.

4. Generate Prisma client and run a migration:

   ```powershell
   npm --workspace backend run prisma:generate
   npm --workspace backend run prisma:migrate
   npm --workspace backend run prisma:seed
   ```

5. Start the backend:

   ```powershell
   npm run backend:dev
   ```

6. In another terminal, start Expo:

   ```powershell
   npm run mobile:start
   ```

The mobile app defaults to `http://10.0.2.2:4000/api` for Android emulator access. Set `EXPO_PUBLIC_API_URL` if you use a physical device or a different host.

## Deploy Backend To Render

This repo includes `render.yaml` for a Render Blueprint. It creates:

- `frictionless-finance-api` - Node/Express web service

The database is Supabase Postgres, so Render does not create a database.

### Render Steps

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint**.
3. Connect the GitHub repo and select the root `render.yaml`.
4. When Render asks for secret values, add:

   ```text
   DATABASE_URL=postgresql://postgres.jaxtcqhjiuypbcbvugkz:YOUR_REAL_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
   SUPABASE_URL=https://jaxtcqhjiuypbcbvugkz.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   If your Supabase password contains special characters such as `@`, `#`, `%`, `/`, or `:`, URL-encode it before putting it in `DATABASE_URL`.

5. Deploy. Render will install backend dependencies, generate Prisma Client, build TypeScript, run `prisma migrate deploy`, and start the API.
6. Open the service URL and check:

   ```text
   https://frictionless-finance-api.onrender.com/health
   ```

   It should return:

   ```json
   {"ok":true}
   ```

### Make The Mobile App Use Render

After Render gives you the real service URL, create `mobile/.env`:

```text
EXPO_PUBLIC_API_URL=https://your-render-service.onrender.com/api
```

Then rebuild or restart the mobile app:

```powershell
npm --workspace mobile run android
```

For the connected phone debug build, keep Metro running. For a standalone APK later, build a release/dev-client build after setting the same `EXPO_PUBLIC_API_URL`.
