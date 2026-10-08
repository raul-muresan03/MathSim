# Deployment: Vercel Services + Neon

[← Back to README](../README.md)

The [live demo](https://mathsim-lac.vercel.app) is already deployed. These steps
are for deploying your own instance using one Vercel project and one Neon
database. Runtime versions are pinned to **Python 3.12** and **Node 24.x**.
Run terminal commands from the repository root; Docker provides the backend
dependencies.

## 1. Create and initialize the database

Create a **Neon Free** project in **AWS Frankfurt**. In **Connect**, select
the intended branch, primary read-write compute, database, and role. Copy both
the direct URL for initialization and the pooled URL for the application.
Keep all generated TLS parameters, including `sslmode=require` and
`channel_binding=require` when present.

For a new database, run the following from the repository root. Python 3 is
used only to prompt for the URL; Docker provides the backend dependencies.

```bash
docker build --target runtime -t mathsim-backend-init ./backend
python3 - <<'PY'
import os
import subprocess
from getpass import getpass

env = {**os.environ, "DATABASE_URL": getpass("Neon direct DATABASE_URL: ")}
subprocess.run([
    "docker", "run", "--rm", "-e", "DATABASE_URL",
    "mathsim-backend-init", "python", "init_db.py",
], env=env, check=True)
PY
```

The script prints `Database schema initialized.` and creates `users`,
`simulations`, and `session_data`. It creates missing tables but does not alter
existing schemas; future model changes require an explicit schema migration.
Do not run the test suite against Neon.

## 2. Import and deploy the Vercel project

1. Generate a **separate production `SECRET_KEY`** using the generator in the
   [local setup section](../README.md#local-development-with-docker), and keep
   it stable across deployments.
2. In Vercel, choose **Add New… → Project** and import the repository from
   `main`. Select **Hobby**, framework preset **Services**, and the repository
   root directory. Vercel should detect exactly `backend` and `frontend` from
   [`vercel.json`](../vercel.json).
3. Add `DATABASE_URL` (the **pooled** Neon URL) and `SECRET_KEY` as **Secret**
   variables for **Production**, then click **Deploy**.
4. After the deployment is **Ready**, open the project's **Settings → Domains**
   and copy its actual production `*.vercel.app` domain. Do not infer it from
   the project name or copy the URL of a Preview deployment.
5. Under **Environment Variables**, add the two **Config** variables below for
   **Production**, using `https://` plus that exact domain, without a trailing
   slash or `/api`.
6. In **Settings → Functions → Function Regions**, select **Frankfurt (`fra1`)**.
   Confirm **main** under **Environments → Production → Branch Tracking** and
   **Standard Protection** under **Deployment Protection** so the production
   domain is publicly accessible.
7. Go to **Deployments → … → Redeploy** on the correct `main` deployment,
   select **Production**, and rebuild with the saved settings. Then test the
   application on the stable production domain in an incognito window.

Final project-level environment variables:

| Variable | Type | Value |
|---|---|---|
| `DATABASE_URL` | Secret | Neon pooled PostgreSQL URL, with all supplied TLS parameters |
| `SECRET_KEY` | Secret | Random production JWT signing key, at least 32 characters |
| `NEXT_PUBLIC_API_URL` | Config | Your actual production origin, copied from the project's Domains settings |
| `CORS_ORIGINS` | Config | The same production origin |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Config | Optional; defaults to `480` |

The first deployment is an intermediate step to obtain the real domain.
Until `NEXT_PUBLIC_API_URL` is set and the frontend rebuilt, API calls from the
browser fall back to `http://localhost:8000`. `NEXT_PUBLIC_*` values are embedded
at build time: saving a new value alone does not update an existing deployment.
Test registration and login only after the redeploy.

Keep production secrets in Vercel, out of Git and `NEXT_PUBLIC_*` variables.
PostgreSQL uses Neon's external pooler with SQLAlchemy `NullPool` and psycopg
`prepare_threshold=None`. Both `postgresql://` and `postgres://` URLs are
accepted. Missing/invalid database configuration or a short JWT key prevents
backend startup. Authorization is enforced by the backend; frontend redirects
are only a UX convenience.

## 3. Verify the public application

- Check the landing page, slideshow, dark mode, and grid images.
- Register → log in → generate a simulation → submit answers → view results
  and saved statistics. Check the interface on a narrow screen as well.
- `GET /api/health` returns `{"status":"ok"}`, but does **not** query the database.
- After 6–10 minutes without database traffic, test login and saved statistics
  again. Neon Free suspends inactive compute after 5 minutes, so the first
  database-backed request may be slower.

Vercel Hobby and Neon Free suit a personal, non-commercial demo within their
usage limits. No custom domain or paid add-on is needed.
