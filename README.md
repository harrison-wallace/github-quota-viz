# GitHub Usage Dashboard

A production-ready, self-hosted React application for visualizing GitHub Actions and Copilot Premium Request usage for individual users. Features real-time usage tracking, cost breakdowns, and multiple theme options.

![GitHub Usage Dashboard](https://img.shields.io/badge/React-19-blue) ![Bootstrap](https://img.shields.io/badge/Bootstrap-5-purple) ![Docker](https://img.shields.io/badge/Docker-Ready-green)

## Screenshots

<p align="center">
  <img src="docs/gh-usage-1.png" alt="Dashboard Overview" width="800"/>
</p>

<p align="center">
  <img src="docs/gh-usage-2.png" alt="Available Models" width="800"/>
</p>

<p align="center">
  <img src="docs/gh-usage-3.png" alt="Cost Breakdown" width="800"/>
</p>

## Features

- **Real-time Usage Tracking**: Monitor GitHub Actions minutes and Copilot Premium Requests
- **Cost Breakdown**: View gross costs, net costs, and subscription savings
- **Available Models**: Auto-updating list of all GitHub Copilot AI models with premium request multipliers
- **Visual Analytics**: Progress bars and pie charts showing usage distribution
- **Multiple Themes**: 5 built-in color themes (Default, Ocean Blue, Sunset, Forest, Purple Haze)
- **Responsive Design**: Mobile-friendly interface built with Bootstrap 5
- **Profile Management**: Add multiple GitHub profiles via secure GUI (tokens stored encrypted in browser)
- **Dockerized Deployment**: Single-stage nginx container
- **CI/CD Ready**: Jenkins pipeline using tinyclock deployment pattern

## Architecture

### Tech Stack
- **Frontend**: React 18, Bootstrap 5, React-Bootstrap
- **Charts**: Recharts
- **HTTP Client**: Axios with retry logic
- **Web Scraping**: Node.js with Cheerio (for auto-updating models)
- **Background Jobs**: Cron (inside container for daily model updates)
- **Deployment**: Docker (nginx:alpine with multi-stage build)
- **CI/CD**: Jenkins (declarative pipeline)

### API Endpoints Used
1. `GET /users/{username}/settings/billing/usage/summary` - Monthly aggregated usage summary
2. `GET /users/{username}/settings/billing/premium_request/usage` - Copilot Premium Requests by model
3. `GET /users/{username}/settings/billing/usage` - Detailed daily usage (optional)

## Prerequisites

- Node.js 20+ (for local development)
- Docker (for containerized deployment)
- GitHub Fine-Grained Personal Access Token with **"Plan" (read)** permission
- Jenkins (optional, for CI/CD)

### GitHub Token Setup

**IMPORTANT**: This application requires a **fine-grained** Personal Access Token (not classic PAT).

1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Set token name, expiration, and resource owner
4. Under "Permissions" → "Account permissions" → select **"Plan"** with **read** access
5. Generate token and copy it (starts with `github_pat_`)

Classic PATs will NOT work as they don't have the "Plan" permission option.

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd github-quota-viz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```
   
   The app will open at `http://localhost:3000`

4. **Add your GitHub Profile**
   
   On first load, click "Add Profile" and enter:
   - **Profile Name**: A friendly name (e.g., "Work", "Personal")
   - **GitHub Username**: Your GitHub username
   - **GitHub Token**: A fine-grained PAT with "Plan" read permission
   
   The token is validated and stored securely in your browser (base64 encoded in localStorage).

 5. **Build for production**
    ```bash
    npm run build
    ```

    The build artifacts will be in the `build/` directory.

### Docker Deployment (Manual)

1. **Build the React app**
   ```bash
   npm install
   npm run build
   ```

2. **Build Docker image**
   ```bash
   docker build -t github-quota-viz .
   ```

3. **Run container**
   ```bash
   docker run -d \
     --name github-quota-viz \
     -p 8085:80 \
     --restart unless-stopped \
     github-quota-viz
   ```

4. **Access the dashboard and add your profile**
   
   Open `http://localhost:8085` in your browser and add your GitHub profile via the GUI.

**Note**: The container now includes a background service that automatically scrapes GitHub Docs for the latest Copilot models every 24 hours. Initial scrape runs on container startup.

## Configuration

### Profile Management

Profiles are managed entirely through the GUI:

1. Click the **Profile** button in the top toolbar
2. Click **+ Add/Manage Profiles**
3. Enter your profile details and GitHub token
4. The token is validated against GitHub's API before saving

**Security Notes:**
- Tokens are base64 encoded and stored in browser localStorage
- Tokens are per-browser (not shared between devices)
- You can add multiple profiles and switch between them
- Profiles are stored per-tab in sessionStorage for active selection

### Chart & Theme Settings

- **Themes**: Select from 5 color themes via the Theme dropdown
- **Chart Type**: Choose between Pie Chart or Bar Chart for Copilot usage

## Usage

### Dashboard Interface

1. **Profile Selector**: Switch between configured GitHub profiles
2. **Theme Selector**: Choose from 5 color themes
3. **Refresh Button**: Reload usage data manually
4. **Settings**: Change chart type (Pie or Bar)
5. **Cost Summary Card**: Shows gross costs, net costs, and savings
6. **Actions Usage Card**: Displays Actions minutes with progress bar
7. **Copilot Usage Card**: Shows Copilot requests with pie chart breakdown
8. **Available Models Card**: Auto-updating list with sortable columns, color-coded multipliers (green to red), and provider filtering

### Auto-Refresh

The dashboard automatically refreshes data every hour when the tab is visible.

### Available Copilot Models

The dashboard includes an **Available Models** card that displays all GitHub Copilot AI models:

- **Auto-updating**: Data is scraped from GitHub Docs every 24 hours via background cron job
- **Provider Filter**: Filter models by provider (OpenAI, Anthropic, Google, xAI, etc.)
- **Sortable Columns**: Click any column header to sort by Model, Provider, Status, Paid Plans, or Free Plan
- **Status Indicators**: Shows GA (Generally Available), Preview, or Closing/Retiring status
- **Premium Multipliers**: Color-coded badges (green → red) showing request cost multipliers for both paid and free plans
  - **Green**: Included (0x) or low cost (≤0.5x)
  - **Orange**: Medium cost (≤1x)
  - **Red**: High cost (≤2x)
  - **Purple**: Premium tier (>2x)
- **Self-contained**: All data stays within the container - no external API dependencies

The models data is served from `/models.json` and polled by the React app every 24 hours. Default sort is by Paid Plans (highest multipliers first).

### Understanding the Data

- **Gross Cost**: Total cost without subscription
- **Net Cost**: Actual cost after subscription credits (typically $0 for Pro users)
- **Savings**: Amount covered by your GitHub subscription
- **Progress Bars**: Color-coded usage indicators (green < 70%, yellow 70-90%, red > 90%)

## Project Structure

```
github-quota-viz/
├── public/
│   ├── index.html              # HTML template
│   └── favicon.ico
├── scripts/
│   ├── scrape-models.js        # GitHub Docs scraper for models data
│   └── start.sh                # Container entrypoint with cron
├── src/
│   ├── components/
│   │   ├── ActionsUsageCard.js     # Actions usage display
│   │   ├── AvailableModelsCard.js  # Available Copilot models with multipliers
│   │   ├── CopilotUsageCard.js     # Copilot usage with pie chart
│   │   ├── CostSummaryCard.js      # Cost breakdown table
│   │   ├── ProfileModal.js         # Profile management GUI
│   │   └── SkeletonCard.js         # Loading skeletons
│   ├── services/
│   │   ├── githubApi.js            # API client with retry logic
│   │   ├── modelsService.js        # Models data fetching and polling
│   │   ├── profileService.js       # Profile CRUD operations
│   │   └── themeService.js         # Theme management
│   ├── App.js                      # Main application
│   ├── index.js                    # Entry point
│   └── index.css                   # Custom styles
├── .dockerignore
├── .env.example                    # Environment template (optional)
├── .gitignore
├── Dockerfile                      # nginx-based container
├── docker-entrypoint.sh            # Container startup script
├── Jenkinsfile                     # CI/CD pipeline
├── package.json
└── README.md
```

## API Rate Limits

The GitHub API has the following rate limits:
- **Authenticated requests**: 5,000 requests per hour
- **Billing endpoints**: May have lower limits

The app includes retry logic with exponential backoff to handle temporary failures.

## Troubleshooting

### Profile Management

**Error: "Token is invalid"**
- Verify it's a **fine-grained** token (not classic PAT)
- Ensure token has **"Plan" read** permission
- Check token hasn't expired
- Verify the token isn't revoked in GitHub settings

**Profiles not persisting**
- Profiles are stored in browser localStorage
- Clear browser cache = clear profiles
- Use private/incognito mode to test without affecting main storage

### Container Issues

**Check container logs:**
```bash
docker logs github-quota-viz
```

**Models not updating:**
- The scraper runs every 24 hours via cron (inside the container)
- Check `/var/log/cron.log` in the container for scraper output
- Manual re-scrape: `docker exec github-quota-viz node /app/scripts/scrape-models.js`

**Verify container is running:**
```bash
docker ps | grep github-quota-viz
```

**If using proxy networking:**
```bash
docker network inspect proxy  # Verify network exists
docker inspect github-quota-viz  # Check network connections
```

### No Data Displayed

- Verify the GitHub token is valid via the "Validate" button in the Profile modal
- Check browser console for errors (F12 → Console)
- Ensure username exists and has billing data available
- Confirm API endpoints are accessible (may fail behind restrictive firewalls)

### Build Failures

**Clear npm cache:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Check Node.js version:**
```bash
node --version  # Should be 20+
```

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
```

The build artifacts will be in the `build/` directory.

## Themes

Available themes:
1. **Default**: Classic GitHub blue
2. **Ocean Blue**: Deep blue ocean tones
3. **Sunset**: Warm orange and purple gradient
4. **Forest**: Green nature-inspired palette
5. **Purple Haze**: Rich purple and pink tones

Themes are persisted in localStorage and apply across sessions.

## Security Considerations

### Profile Storage

- **Tokens are base64 encoded** in browser localStorage (not encrypted - use HTTPS in production)
- **Tokens are per-browser** and not shared between devices
- **Tokens are never sent to any server** - all API calls go directly to GitHub
- Use fine-grained tokens with minimum required permissions ("Plan" read only)
- Rotate tokens regularly if compromised
- For sensitive environments, consider using a reverse proxy to intercept and validate tokens

### Environment Variables

**The `.env` file should NEVER be committed to git.**

- `.env` is in `.gitignore` and will not be tracked
- Use `.env.example` as a reference only (it's optional)
- Profiles are created via the GUI and stored in localStorage

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with [Create React App](https://create-react-app.dev/)
- Charts powered by [Recharts](https://recharts.org/)
- UI components from [React-Bootstrap](https://react-bootstrap.github.io/)
- Icons from [React Icons](https://react-icons.github.io/react-icons/)

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ for GitHub users who want visibility into their usage and costs.**
