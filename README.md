# shelf-optimizer

A Databricks App powered by [AppKit](https://developers.databricks.com/docs/appkit/v0/), featuring React, TypeScript, and Tailwind CSS.

**Enabled plugins:**

- **Analytics** -- SQL query execution against Databricks SQL Warehouses
- **Lakebase** -- Fully managed Postgres database for transactional (OLTP) workloads on Databricks
- **Server** -- Express HTTP server with static file serving and Vite dev mode

## Prerequisites

- Node.js v22+ and npm
- Databricks CLI (for deployment)
- Access to a Databricks workspace

## Databricks Authentication

### Local Development

For local development, configure your environment variables by creating a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set the environment variables you need:

```env
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_APP_PORT=8000
# ... other environment variables, depending on the plugins you use
```

#### Lakebase Configuration

The Lakebase plugin requires additional environment variables for PostgreSQL connectivity. To learn how to configure the Lakebase plugin, see the [Lakebase plugin documentation](https://developers.databricks.com/docs/appkit/v0/plugins/lakebase).

### CLI Authentication

The Databricks CLI requires authentication to deploy and manage apps. Configure authentication using one of these methods:

#### OAuth U2M

Interactive browser-based authentication with short-lived tokens:

```bash
databricks auth login --host https://your-workspace.cloud.databricks.com
```

This will open your browser to complete authentication. The CLI saves credentials to `~/.databrickscfg`.

#### Configuration Profiles

Use multiple profiles for different workspaces:

```ini
[DEFAULT]
host = https://dev-workspace.cloud.databricks.com

[production]
host = https://prod-workspace.cloud.databricks.com
client_id = prod-client-id
client_secret = prod-client-secret
```

Deploy using a specific profile:

```bash
databricks bundle deploy --profile production
```

**Note:** Personal Access Tokens (PATs) are legacy authentication. OAuth is strongly recommended for better security.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

Run the app in development mode with hot reload:

```bash
npm run dev
```

The app will be available at the URL shown in the console output.

### Build

Build both client and server for production:

```bash
npm run build
```

This creates:

- `dist/server.js` - Compiled server bundle
- `client/dist/` - Bundled client assets

### Production

Run the production build:

```bash
npm start
```

## Code Quality

There are a few commands to help you with code quality:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:fix
```

## Deployment with Databricks Asset Bundles

### 1. Configure Bundle

Update `databricks.yml` with your workspace settings:

```yaml
targets:
  default:
    workspace:
      host: https://your-workspace.cloud.databricks.com
```

Make sure to replace all placeholder values in `databricks.yml` with your actual resource IDs.

### 2. Deploy

Deploy the app, synthetic-data pipeline, Genie space, and AI/BI dashboard together:

```bash
databricks bundle validate --strict -t default --profile FEVM
databricks bundle deploy -t default --profile FEVM
databricks bundle run shelf_optimizer_synthetic_data -t default --profile FEVM
```

The bundle deploys and starts the app, creates or updates the **Danone Shelf Optimizer**
Genie space, publishes the **Danone Shelf Optimizer — Retail Execution** dashboard, and
installs a serverless Lakeflow Declarative Pipeline that recreates the synthetic
`stores`, `planogram_slots`, `external_signals`, and `sku_lift_assumptions` datasets.
The app exposes the Genie space under **Ask Genie** and runs questions on behalf of the
signed-in user.

The four synthetic tables were originally created manually. Before the first pipeline
run in an existing workspace, remove those disposable legacy tables once so the
pipeline can take ownership of their names:

```sql
DROP TABLE IF EXISTS serverless_stable_6hzlm4_catalog.shelf_optimizer.stores;
DROP TABLE IF EXISTS serverless_stable_6hzlm4_catalog.shelf_optimizer.planogram_slots;
DROP TABLE IF EXISTS serverless_stable_6hzlm4_catalog.shelf_optimizer.external_signals;
DROP TABLE IF EXISTS serverless_stable_6hzlm4_catalog.shelf_optimizer.sku_lift_assumptions;
```

Run `databricks bundle summary -t default --profile FEVM` to print all resource URLs.

### Deploy to Production

1. Configure the production target in `databricks.yml`
2. Deploy to production:

```bash
databricks bundle validate --strict -t prod --profile production
databricks bundle deploy -t prod --profile production
```

> **Restarting a stopped app:** apps stop after a period of inactivity. To start one again without redeploying, run `databricks apps start <APP_NAME>`.

## Project Structure

```
* client/          # React frontend
  * src/           # Source code
  * public/        # Static assets
* server/          # Express backend
  * server.ts      # Server entry point
  * routes/        # Routes
* shared/          # Shared types
* config/          # Configuration
  * queries/       # SQL query files
* resources/       # Bundle-managed pipeline, Genie space, and dashboard
* src/pipelines/   # Synthetic Lakeflow pipeline SQL
* databricks.yml   # Bundle configuration
* app.yaml         # App configuration
* .env.example     # Environment variables example
```

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React.js, TypeScript, Vite, Tailwind CSS, React Router
- **UI Components**: Radix UI, shadcn/ui
- **Databricks**: AppKit SDK
