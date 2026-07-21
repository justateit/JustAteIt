# Frontend (Expo React Native)

This directory contains the Expo app (React Native) for the JustAte clone. It uses Clerk for authentication and Supabase for storing food images.

## Prerequisites

- Node.js (LTS)
- Expo CLI (optional globally) or use `npx`
- An Expo-compatible mobile device or emulator

## Environment

Create `frontend/.env` (or use Expo's app config env) with the following public values:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=anon_xxx
API_URL=http://<YOUR_BACKEND_HOST>:5000/api
```

The Clerk publishable key is safe to keep on the client; the Clerk secret key must go to the backend only.

## Install & run (local)

Open a PowerShell terminal in `frontend/`:

```powershell
cd .\justate-clone\frontend
npm install
npx expo start
```

Follow the Expo UI to open the app on your device (QR code) or run on an emulator.

## Key integrations

- Clerk: Wrap the app with `ClerkProvider` (see `app/_layout.tsx`). Use `useAuth()` to get the user and the token for backend requests.
- Supabase: Use `@supabase/supabase-js` for uploading and fetching images. Use a public/anon key for client storage access; secure any admin operations server-side.
- Backend: Use Axios (or fetch) and include the Clerk JWT in the `Authorization: Bearer <token>` header for protected endpoints.

## Deployment

### Native (iOS/Android) — EAS

Native binaries are built with [EAS](https://docs.expo.dev/build/introduction/)
using the existing profiles in `eas.json` (`development`, `preview`, `production`):

```powershell
npx eas build --platform android --profile preview      # internal build
npx eas build --platform ios --profile production       # store build
npx eas submit --platform ios                           # store submission
```

### Web — static export

```powershell
npm run lint        # ESLint (must pass in CI)
npm run build:web   # expo export --platform web -> dist/
```

`dist/` is plain static output and can be hosted anywhere. For AWS, an
optional stack (`infra/cloudformation/web-hosting.yml`) serves it from a
private S3 bucket behind CloudFront (OAC, default `*.cloudfront.net`
domain). Deploy the stack once, then publish builds with
`infra/scripts/deploy-web.ps1`.

## Notes & tips

- For image uploads, keep uploads to Supabase Storage and save the returned public URL (or path) in the MongoDB food document.
- If testing locally and your backend is on the same machine, use the host IP (or `adb reverse` for Android emulators) — `localhost` inside the phone/emulator may not point to your dev machine.

## Snap It (camera) feature

I can scaffold a camera component that uses `expo-camera` to capture an image, uploads it to Supabase, and then creates the food record via the backend. Tell me if you want that generated now.

