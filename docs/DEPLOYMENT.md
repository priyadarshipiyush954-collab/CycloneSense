# Deployment
## Backend
Deploy the Docker service to Render/Railway/Fly.io. Health check: `/health`.

## Full-Stack Web Application
Deploy the application or static client:
- build: `npm run build`
- output: `dist` (static files in `dist/`, Express server bundled in `dist/server.cjs`)
- start command: `npm start` (or `node dist/server.cjs`)

## CI/CD
GitHub Actions publishes `ghcr.io/<owner>/<repo>:latest` on `main`. Add `RENDER_DEPLOY_HOOK` as a GitHub Actions secret to trigger a Render deploy.

Never commit cloud credentials.
