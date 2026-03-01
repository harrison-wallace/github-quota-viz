# System Architecture

## Overview

github-quota-viz is a full-stack application for monitoring GitHub usage with server-side persistent storage, encryption, and real-time projections.

```mermaid
graph TB
    subgraph "Browser (React 19)"
        UI["🎨 React App<br/>ProjectionCard, ModelTable,<br/>CostSummaryCard, etc."]
        Store["📦 State Management<br/>hooks, sessionStorage"]
    end

    subgraph "Network"
        APIKEY["🔐 X-API-Key Header<br/>Request Auth"]
    end

    subgraph "Express API (Node.js)"
        Auth["🔑 Auth Middleware<br/>timingSafeEqual check"]
        Profiles["👤 Profile Routes<br/>CRUD + encrypt/decrypt"]
        Usage["📊 Usage Routes<br/>Upsert snapshots"]
        Settings["⚙️ Settings Routes<br/>Key/value store"]
    end

    subgraph "SQLite Database"
        ProfilesTable["profiles<br/>id, username,<br/>token_enc, iv, tag"]
        SnapshotsTable["usage_snapshots<br/>profile_id, metric,<br/>value, date_str"]
        SettingsTable["settings<br/>key, value"]
        SchemaMeta["schema_meta<br/>version tracking"]
    end

    subgraph "Encryption (Server-side only)"
        Crypto["🔐 AES-256-GCM<br/>Encrypt on write,<br/>Decrypt on read"]
    end

    subgraph "GitHub API"
        GH_USAGE["GET /users/.../billing/usage/summary"]
        GH_MODELS["GET /users/.../billing/premium_request/usage"]
    end

    subgraph "Background Jobs"
        Cron["⏰ dcron Job<br/>Daily model scraping"]
        Scraper["🕷️ Cheerio Scraper<br/>GitHub Docs → models.json"]
    end

    subgraph "Container Runtime"
        nginx["🌐 nginx:alpine<br/>Port 80: SPA + /api/* proxy"]
        Express["⚡ Express:3001<br/>API server (internal only)"]
        Volume["💾 Docker Volume<br/>/data/quota.db"]
    end

    UI -->|HTTPS /api/*| APIKEY
    APIKEY -->|Request| Auth
    Auth -->|/profiles| Profiles
    Auth -->|/usage| Usage
    Auth -->|/settings| Settings

    Profiles -->|encrypt/decrypt| Crypto
    Crypto -->|AES-256-GCM| ProfilesTable
    Usage -->|upsert/query| SnapshotsTable
    Settings -->|read/write| SettingsTable

    Profiles -->|validate token| GH_USAGE
    Profiles -->|validate token| GH_MODELS

    Cron -->|daily| Scraper
    Scraper -->|update| Settings

    nginx -->|proxy_pass| Express
    Express -->|query| SQLite

    SQLite -->|persistent| Volume

    Store -->|sessionStorage| Browser
```

## Data Flow: Usage Refresh

```mermaid
sequenceDiagram
    participant Browser as Browser (React)
    participant API as Express API
    participant GitHub as GitHub API
    participant DB as SQLite

    Browser->>API: GET /api/profiles (list all)
    API->>DB: SELECT * FROM profiles
    DB-->>API: [profile data]
    API-->>Browser: [encrypted profiles]

    loop For each profile
        Browser->>API: POST /api/profiles/{id}/token (decrypt)
        API->>DB: SELECT token_enc,iv,tag FROM profiles
        API->>API: AES-256-GCM decrypt
        API-->>Browser: [decrypted token - not exposed]

        Browser->>GitHub: GET /billing/usage/summary
        GitHub-->>Browser: {copilotUsage, actionsUsage}

        Browser->>API: POST /api/usage (record snapshot)
        API->>DB: INSERT OR REPLACE INTO usage_snapshots
        DB-->>API: OK
    end

    Browser->>API: GET /api/usage/{profileId}/copilot?days=30
    API->>DB: SELECT * FROM usage_snapshots WHERE...
    DB-->>API: [30 days of data]
    API-->>Browser: [{date, value}, ...]

    Browser->>Browser: calculateBurnRate(history, 7, monthStart)
    Browser->>Browser: Filter: history >= '2026-03-01'
    Browser->>Browser: 7-day rolling window
    Browser->>Browser: dailyRate = (newest - oldest) / days

    Browser->>Browser: projectEndOfMonthUsage(usage, rate, quota)
    Browser->>Browser: Render ProjectionCard
```

## Component Hierarchy

```mermaid
graph TD
    App["App.js<br/>Main orchestrator<br/>- auto-refresh<br/>- profile mgmt"]

    Header["Header/Toolbar<br/>- Profile selector<br/>- Theme selector<br/>- Refresh button"]

    CopilotCard["CopilotProgressBar<br/>- Current usage %<br/>- Month progress"]

    ProjectionCard["ProjectionCard<br/>- Burn rate (7d)<br/>- EOM projection<br/>- Alerts"]

    ModelBreakdown["ModelBreakdownTable<br/>- Copilot usage by model<br/>- Premium multipliers"]

    AvailableModels["AvailableModelsCard<br/>- All GitHub models<br/>- Auto-scraped daily<br/>- Filterable"]

    CostSummary["CostSummaryCard<br/>- Gross costs<br/>- Net costs<br/>- Savings"]

    DbSize["DbSizeIndicator<br/>- SQLite file size<br/>- Auto-poll (5min)"]

    ProfileModal["ProfileModal<br/>- Add profile<br/>- Edit profile<br/>- Delete profile"]

    App -->|renders| Header
    App -->|renders| CopilotCard
    App -->|renders| ProjectionCard
    App -->|renders| ModelBreakdown
    App -->|renders| AvailableModels
    App -->|renders| CostSummary
    App -->|renders| DbSize
    App -->|modal| ProfileModal

    ProjectionCard -->|imports| historicalDataService
    ModelBreakdown -->|imports| githubApi
    AvailableModels -->|imports| modelsService
```

## Burn Rate Calculation (Post v2.1.0)

```mermaid
graph TD
    Start["historicalDataService<br/>getHistoricalData()"]
    
    Start -->|fetch 30 days| SQLite["SQLite<br/>usage_snapshots"]
    
    SQLite -->|return [{date, value}]| History["Array: [{date, value}]<br/>Feb 20 - Mar 20"]
    
    History -->|pass to| BurnRate["calculateBurnRate<br/>(history, 7, monthStart)"]
    
    BurnRate -->|calculate| MonthStart["monthStart = 1st of month<br/>2026-03-01 00:00 UTC"]
    
    MonthStart -->|filter| Filter["Filter history<br/>date >= '2026-03-01'<br/>Result: 20 days (Mar 1-20)"]
    
    Filter -->|check length| Check{"currentMonth<br/>has 2+ points?"}
    
    Check -->|YES| Window["Take last 7 days<br/>OR all if < 7<br/>Result: Mar 14-20"]
    
    Check -->|NO| Fallback["Use last 7 days<br/>of ALL history<br/>isLimited = true"]
    
    Window -->|calculate| CalcRate["dailyRate = (newest - oldest)<br/>÷ daysOfData<br/>= (80 - 20) ÷ 7<br/>= 8.6 req/day"]
    
    Fallback -->|calculate| CalcRate
    
    CalcRate -->|return| Result["{ dailyRate: 8.6,<br/>totalBurned: 60,<br/>daysOfData: 7,<br/>isLimited: false }"]
    
    Result -->|pass to| Projection["projectEndOfMonthUsage<br/>(currentUsage, burnRate, quota)"]
    
    Projection -->|calculate| ProjCalc["projectedTotal<br/>= 80 + (8.6 × 11 days remaining)<br/>= 175 requests"]
    
    ProjCalc -->|render| UI["UI<br/>- Show burn rate: 8.6/d<br/>- Show projection: 175<br/>- Color-code alert"]
```

## Database Schema

```mermaid
erDiagram
    PROFILES ||--o{ USAGE_SNAPSHOTS : has
    PROFILES ||--o{ SETTINGS : uses

    PROFILES {
        INTEGER id PK
        TEXT profile_id UK
        TEXT name
        TEXT username
        BLOB token_enc "AES-256-GCM encrypted"
        BLOB iv "Initialization Vector"
        BLOB tag "Authentication Tag"
        INTEGER created_at
    }

    USAGE_SNAPSHOTS {
        INTEGER id PK
        TEXT profile_id FK
        TEXT metric "copilot|actions"
        REAL value
        INTEGER recorded_at
        TEXT date_str "YYYY-MM-DD (UK)"
        TEXT raw_json
    }

    SETTINGS {
        TEXT key PK
        TEXT value
    }
```

## Deployment: Docker Multi-Stage Build

```mermaid
graph LR
    subgraph Builder["Builder Stage<br/>node:18-alpine"]
        Node["Node.js 18"]
        npm["npm ci"]
        Build["npm run build"]
        BC["better-sqlite3<br/>compilation"]
    end

    subgraph Production["Production Stage<br/>nginx:alpine"]
        Nginx["nginx:alpine"]
        Static["React build/"]
        Server["Express (copied)"]
    end

    subgraph Runtime["Runtime<br/>Single Container"]
        P80["Port 80<br/>nginx"]
        P3001["Port 3001<br/>Express (internal)"]
        Vol["/data volume<br/>SQLite"]
    end

    Builder -->|copy dist| Production
    Builder -->|copy node_modules| Production

    Production -->|deployed| Runtime

    P80 -->|proxy /api/*| P3001
    P3001 -->|query| Vol
```

## Security Model

```mermaid
graph TD
    User["👤 User<br/>Browser"]
    
    User -->|1. Enter token| ProfileModal["ProfileModal<br/>GUI Form"]
    
    ProfileModal -->|2. Validate| GitHub["GitHub API<br/>Test token"]
    
    GitHub -->|3. Valid?| Check{"Token<br/>Valid?"}
    
    Check -->|NO| Error["❌ Error<br/>Invalid token"]
    
    Check -->|YES| Encrypt["🔐 Encrypt<br/>AES-256-GCM<br/>- 32-byte key<br/>- Random IV<br/>- Auth tag"]
    
    Encrypt -->|4. Store encrypted| DB["SQLite<br/>token_enc, iv, tag<br/>(plaintext never stored)"]
    
    DB -->|5. Stored on disk| Disk["Docker Volume<br/>/data/quota.db"]
    
    User -->|6. Make request<br/>X-API-Key: secret| Express["Express API<br/>timingSafeEqual<br/>constant-time check"]
    
    Express -->|7. Request /usage| Auth{"Auth<br/>OK?"}
    
    Auth -->|NO| Reject["❌ 401 Unauthorized"]
    
    Auth -->|YES| Decrypt["🔓 Decrypt token<br/>Only server-side<br/>Never sent to browser"]
    
    Decrypt -->|8. Use token| GitHub2["GitHub API<br/>Fetch usage data"]
    
    GitHub2 -->|9. Usage data| Record["Record snapshot<br/>in SQLite"]
    
    Record -->|No token exposure| Safe["✅ Safe<br/>- Token never in localStorage<br/>- Token never in sessionStorage<br/>- Token never in logs"]
```

## Auto-Refresh Lifecycle

```mermaid
graph TD
    Start["App mounts"] -->|localStorage: last refresh| Check{"≥ 60 min<br/>since last?"}
    
    Check -->|YES| VisCheck{"Tab<br/>visible?"}
    
    Check -->|NO| Wait["Wait for visibility"]
    
    VisCheck -->|YES| Fetch["fetch() all profiles<br/>record snapshots"]
    
    Wait -->|tab becomes visible| VisCheck
    
    Fetch -->|success| Update["Update state<br/>render cards"]
    
    Update -->|set timeout| Schedule["Schedule next<br/>refresh in 1 hour"]
    
    Schedule -->|1 hour passes| Check2{"Tab<br/>visible?"}
    
    Check2 -->|YES| Fetch
    
    Check2 -->|NO| Queue["Queue for<br/>visibility"]
    
    Queue -->|tab visible| Fetch
    
    Fetch -->|error| Retry["Retry in 5 sec<br/>max 3 times"]
```

---

## Key Files by Responsibility

| File | Responsibility |
|------|---|
| `src/App.js` | Main orchestrator, auto-refresh loop, profile lifecycle |
| `src/components/ProjectionCard.js` | Burn rate calculation, EOM projection, alerts |
| `src/services/historicalDataService.js` | Fetch/record usage, calculate burn rate (month-aware as of v2.1.0) |
| `src/services/githubApi.js` | GitHub API calls with retry logic |
| `server/index.js` | Express setup, helmet, CORS, env validation |
| `server/db.js` | SQLite init, WAL mode, schema, AES key validation |
| `server/routes/profiles.js` | Profile CRUD, AES-256-GCM encrypt/decrypt |
| `server/routes/usage.js` | Usage snapshot upsert/query/history |
| `scripts/scrape-models.js` | Daily cron: scrape GitHub Docs for models |
| `Dockerfile` | Multi-stage build |
| `nginx.conf` | SPA serving + /api/* reverse proxy |
