# JustAteIt — Local Environment Setup Guide 🛠️

This document provides step-by-step instructions for setting up, configuring, running, and troubleshooting the **JustAteIt** project across both the frontend (Expo / React Native) and backend (FastAPI microservices) stacks.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Repository Structure](#2-repository-structure)
3. [Environment Configuration (.env)](#3-environment-configuration-env)
   - [Frontend Environment (`frontend/.env`)](#frontend-environment-frontendenv)
   - [Backend Environment (`backend/.env`)](#backend-environment-backendenv)
4. [Frontend Setup (Expo & React Native)](#4-frontend-setup-expo--react-native)
   - [Installation](#frontend-installation)
   - [Running on Web](#running-on-web)
   - [Running on iOS Simulator / Physical Device](#running-on-ios)
   - [Running on Android Emulator / Physical Device](#running-on-android)
5. [Backend Setup (FastAPI Microservices)](#5-backend-setup-fastapi-microservices)
   - [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
   - [Option B: Local Python Virtual Environment](#option-b-local-python-virtual-environment)
   - [Database & Supabase Migrations](#database--supabase-migrations)
6. [Troubleshooting & Windows / Metro Quirks](#6-troubleshooting--windows--metro-quirks)
   - [OneDrive / Reparse Point / TreeFS Watcher Conflicts](#onedrive--reparse-point--treefs-watcher-conflicts)
   - [Windows EPERM Errors on Directory Operations](#windows-eperm-errors-on-directory-operations)
   - [PowerShell Script Execution Policy](#powershell-script-execution-policy)
   - [Port Conflicts (8000, 8001, 8002, 8003, 8081)](#port-conflicts)
   - [Expo Telemetry Directory Permission Failure](#expo-telemetry-directory-permission-failure)
7. [Running CI Verification Locally](#7-running-ci-verification-locally)

---

## 1. Prerequisites

Before starting, install the following required developer tooling:

| Tool | Recommended Version | Purpose |
| --- | --- | --- |
| **Node.js** | `v20.x` (LTS) | Frontend runtime (Volta pinned: `20.20.1`) |
| **npm** | `v10.x` | Frontend package manager |
| **Python** | `3.9+` (3.9 - 3.12) | Backend microservices runtime |
| **Git** | `2.40+` | Source code control |
| **Docker & Docker Compose** | Latest Desktop | Container orchestration for backend services |
| **Expo Go** (Mobile) | SDK 57 compatible | Rapid on-device testing on iOS & Android |
| **Watchman** (macOS/Linux) | Latest | Fast filesystem watching |

---

## 2. Repository Structure

```
JustAteIt/
├── backend/
│   ├── api_gateway/              # Unified reverse proxy (port 8000)
│   ├── services/
│   │   ├── user_service/         # User auth profiles, taste DNA & scoring (port 8001)
│   │   ├── catalog_service/      # Venues, dishes, reviews, drafts, Nominatim autocomplete (port 8002)
│   │   └── media_service/        # S3 image uploads & media handling (port 8003)
│   ├── shared/                   # Shared DB connection pool & base models
│   ├── supabase/
│   │   └── migrations/           # Versioned SQL migrations (source of truth)
│   ├── tests/                    # In-process pytest unit & schema invariant test suite
│   ├── docker-compose.yml        # Multi-container local orchestration
│   └── requirements-dev.txt      # Exact-pinned test & linter dependencies
├── frontend/
│   ├── app/                      # Expo Router file-based pages
│   │   ├── (tabs)/               # Tab views: Discover (index), Explore, Saved Logs, Drafts
│   │   ├── record-experience.js  # Meal creation form (autocomplete, meal type, flavor tags)
│   │   └── profile.js            # Profile, stats, journal & taste DNA
│   ├── components/               # Reusable UI widgets & skeletons (<SkeletonPlaceholder />)
│   ├── constants/                # Colors, themes, icons, typography
│   ├── utils/                    # flavorProfileApi.js, mealType.ts, flavorProfiles.ts
│   └── package.json              # React Native 0.86, Expo 57, React 19
├── docs/                         # Production documentation & handoff guides
└── infra/                        # CloudFormation templates & AWS deployment scripts
```

---

## 3. Environment Configuration (.env)

### Frontend Environment (`frontend/.env`)

Create or update `frontend/.env`:

```env
# Clerk Authentication Publishable Key (Required for User Auth)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cGlja2VkLXNjdWxwaW4tNjQuY2xlcmsuYWNjb3VudHMuZGV2JA

# Google Places / Maps API Key (Optional GPS fallback; Nominatim is free & default)
EXPO_PUBLIC_GOOGLE_API_KEY=AIzaSyCKipLc0IRZy2Gx7PdBiSp-0GYz2HzNeDA

# Base API Gateway URL (defaults to http://localhost:8000 for local dev/simulators)
# When testing on a physical mobile device, replace localhost with your workstation LAN IP:
# EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
EXPO_PUBLIC_API_URL=http://localhost:8000
```

### Backend Environment (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```bash
cd backend
cp .env.example .env
```

Annotated key variables in `backend/.env`:

```env
# PostgreSQL Connection (Session pooler mode for SQLAlchemy ORM)
DATABASE_URL=postgresql://postgres.hptdqaydbhtvlmsjdwcn:justateitDevStack@aws-1-us-east-2.pooler.supabase.com:5432/postgres

# Google Places API Key (Catalog Service)
GOOGLE_API_KEY=AIzaSyCKipLc0IRZy2Gx7PdBiSp-0GYz2HzNeDA

# Anthropic Claude API Key (User Service AI Flavor Recommendations)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# AWS S3 Storage Credentials [Marked as Pending Sponsor IAM Credentials]
AWS_ACCESS_KEY_ID=PENDING_SPONSOR_IAM_KEY
AWS_SECRET_ACCESS_KEY=PENDING_SPONSOR_IAM_SECRET
S3_BUCKET=justateit-prod-media-bucket
S3_REGION=us-east-2

# Optional overrides for local S3 emulation (e.g. MinIO or LocalStack)
# S3_ENDPOINT_URL=http://localhost:4566
# S3_PUBLIC_BASE_URL=https://d123456abcdef8.cloudfront.net
```

---

## 4. Frontend Setup (Expo & React Native)

### Frontend Installation

```bash
cd frontend
npm install
```

> [!NOTE]
> If performing clean CI-style installs, run `npm ci`. The repository lockfile is strictly synchronized with React 19 and Expo SDK 57.

### Running on Web

```bash
cd frontend
npm run web
# Or explicitly:
npx expo start --web --port 8081
```

Once Metro boots, open your browser to:
👉 **[http://localhost:8081](http://localhost:8081)**

### Running on iOS

#### iOS Simulator (macOS only)
1. Install Xcode from the Mac App Store and install Command Line Tools: `xcode-select --install`.
2. Start the development server:
   ```bash
   cd frontend
   npm run ios
   ```
3. Press `i` in the interactive terminal to launch the simulator.

#### Physical iOS Device (Expo Go)
1. Install **Expo Go** from the iOS App Store.
2. Ensure your phone and computer are on the same Wi-Fi network.
3. Start the bundler: `npx expo start`.
4. Scan the terminal QR code using the iOS Camera app.

### Running on Android

#### Android Emulator
1. Install Android Studio and set up an Android Virtual Device (AVD) running API 34+.
2. Ensure `ANDROID_HOME` is added to your environment `PATH`.
3. Start the bundler:
   ```bash
   cd frontend
   npm run android
   ```
4. Press `a` in the terminal to connect to the running emulator.

#### Physical Android Device (Expo Go)
1. Install **Expo Go** from Google Play.
2. Start the bundler: `npx expo start`.
3. Scan the QR code from the Expo Go app.

---

## 5. Backend Setup (FastAPI Microservices)

### Option A: Docker Compose (Recommended)

Boot all four microservices with one command:

```bash
cd backend
docker compose up --build
```

Services will start on their designated internal and published ports:
- **API Gateway**: `http://localhost:8000` (Publishes `/api/v1/*`)
- **User Service**: `http://localhost:8001`
- **Catalog Service**: `http://localhost:8002`
- **Media Service**: `http://localhost:8003`

Verify gateway health:
```bash
curl http://localhost:8000/
# Returns: {"status":"ok","service":"API Gateway"}
```

### Option B: Local Python Virtual Environment

If running services directly without Docker:

```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS / Linux:
source .venv/bin/activate

# Install shared test & dev dependencies
pip install -r requirements-dev.txt

# Run Catalog Service
uvicorn services.catalog_service.main:app --reload --port 8002

# In separate terminals:
uvicorn services.user_service.main:app --reload --port 8001
uvicorn services.media_service.main:app --reload --port 8003
uvicorn api_gateway.main:app --reload --port 8000
```

### Database & Supabase Migrations

The single source of truth for the database schema is the migration scripts in `backend/supabase/migrations/`.

Using the Supabase CLI:
```bash
cd backend

# Start local Supabase container (Postgres, Studio, Auth)
supabase start

# Apply pending migrations and deterministic fixtures
supabase db reset

# Deploy migrations to remote hosted project:
supabase db push
```

---

## 6. Troubleshooting & Windows / Metro Quirks

### OneDrive / Reparse Point / TreeFS Watcher Conflicts
- **Problem**: When the repository resides in a OneDrive-synced folder on Windows (e.g. `C:\Users\<user>\OneDrive\Desktop\...`), Metro's filesystem watcher (`TreeFS` or `watchman`) can crash or trigger endless reload loops due to NTFS reparse points and background file hydration.
- **Solution**:
  - `frontend/metro.config.js` is pre-configured with explicit resolution paths:
    ```javascript
    const config = getDefaultConfig(__dirname);
    config.resolver.unstable_enableSymlinks = false;
    ```
  - If you encounter persistent file locks, pause OneDrive synchronization during active development or relocate the workspace to a direct path (e.g. `C:\dev\JustAteIt`).

### Windows EPERM Errors on Directory Operations
- **Problem**: Node.js build processes on Windows can throw `EPERM: operation not permitted, rmdir '.../dist/assets'`.
- **Solution**:
  - Clean the build directory forcefully via PowerShell before building:
    ```powershell
    Remove-Item -Recurse -Force frontend/dist -ErrorAction SilentlyContinue
    cd frontend ; npm run build:web
    ```

### PowerShell Script Execution Policy
- **Problem**: Running `.ps1` deployment scripts returns `File cannot be loaded because running scripts is disabled on this system`.
- **Solution**:
  - Allow script execution for your active session:
    ```powershell
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    ```

### Port Conflicts
- **Problem**: Error `listen EADDRINUSE: address already in use :::8081` or `:::8000`.
- **Solution**:
  - Find and terminate the blocking process:
    ```powershell
    netstat -ano | findstr :8081
    taskkill /PID <PID> /F
    ```

### Expo Telemetry Directory Permission Failure
- **Problem**: `EPERM: operation not permitted, mkdir 'C:\Users\<user>\.expo'`.
- **Solution**:
  - Disable telemetry collection:
    ```powershell
    $env:EXPO_NO_TELEMETRY=1
    npx expo start --web
    ```

---

## 7. Running CI Verification Locally

To verify all checks match the GitHub Actions CI pipeline before pushing:

```powershell
# 1. Frontend ESLint
cd frontend
npm run lint

# 2. Frontend Production Static Web Build
npm run build:web

# 3. Backend Unit & Schema Invariant Tests
cd ..\backend
pytest

# 4. Infrastructure CloudFormation Linter
cfn-lint infra/cloudformation/*.yml
```

