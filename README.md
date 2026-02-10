# Backend (Node.js + Express)

This folder contains the API server for the JustAte clone. It is responsible for verifying Clerk tokens, interacting with MongoDB Atlas, and exposing REST endpoints for the mobile frontend.

## Environment

Create `backend/.env` with the following keys:

```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/justate-clone
CLERK_SECRET_KEY=sk_xxx
CLERK_PUBLISHABLE_KEY=pk_xxx
PORT=5000
```

Do NOT commit `backend/.env` to version control.

## Install & run (local)

Open a PowerShell terminal in `backend/`:

```powershell
cd .\justate-clone\backend
npm install
# start in development
node server.js
# or use nodemon if you have it: npx nodemon server.js
```

If you prefer running with PM2 for a persistent process in production:

```powershell
npm install -g pm2
pm2 start server.js --name justate-backend
```

## Key files (suggested)

- `server.js` — app entry point, connects to MongoDB and mounts routes
- `src/models/` — Mongoose schemas (User, Food, etc.)
- `src/controllers/` — business logic for food logs, profiles
- `src/middleware/` — Clerk auth verification middleware
- `src/routes/` — API endpoint routes

## Example endpoints

- GET `/api/foods` — returns foods for the authenticated user (Clerk token required)
- POST `/api/foods` — add a new food entry

Use the Clerk middleware (or `@clerk/clerk-sdk-node`) server-side to protect routes.

## Deploying to AWS

You can deploy to Elastic Beanstalk, an EC2 instance, or a container service. For a quick start using Elastic Beanstalk:

1. Install and configure the AWS CLI and Elastic Beanstalk CLI.
2. Ensure environment variables (MONGODB_URI, CLERK_SECRET_KEY, etc.) are set in the Beanstalk environment configuration.
3. `eb init` and `eb create` to create the app/environment, then `eb deploy`.

Security: restrict MongoDB access to your backend IP(s) or use VPC peering for production.

## Notes

- Use the Clerk SDK to verify tokens server-side. The example in the root initialization guide uses `ClerkExpressRequireAuth()`.
- Keep credentials secure and rotate keys if compromised.

