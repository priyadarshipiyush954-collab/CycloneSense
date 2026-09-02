# Deployment
## Backend
Deploy the Docker service to Render/Railway/Fly.io. Health check: `/health`.

## Frontend
Deploy `frontend` to Vercel/Netlify:
- build: `npm run build`
- output: `dist`
- env: `VITE_API_URL=https://your-api-domain`

## CI/CD
GitHub Actions publishes `ghcr.io/<owner>/<repo>:latest` on `main`. Add `RENDER_DEPLOY_HOOK` as a GitHub Actions secret to trigger a Render deploy.

Never commit cloud credentials.
