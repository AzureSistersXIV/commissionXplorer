# CommissionXplorer
My own commissions explorer, sorted by artist and with preview of artwork style

## Running tests

Run the test suite after installing dependencies:

```sh
npm ci
npm test
```

Or run the test runner, which installs dependencies before testing:

```sh
npm run test:ci
```

The single GitHub Actions workflow runs tests for pushes, pull requests, and
manual dispatches. On pushes to `main` and manual dispatches, it then builds and
deploys the site to GitHub Pages. To receive a Discord message after a successful
or failed run, add a repository Actions secret named `DISCORD_WEBHOOK_URL`
containing the Discord webhook URL. Set the repository's Pages source to
**GitHub Actions** under **Settings → Pages**; leaving it on branch deployment
will keep a separate “pages build and deployment” workflow running in parallel.
The workflow uses Node 24-compatible GitHub Actions and Ubuntu 24.04.

The Node test suite runs as one CI step, so its use-case, performance, integration,
acceptance, QA, security, resilience, and release-smoke results are logged
together. The existing Discord notification is sent once after the complete
workflow and reports its overall result.

These automated checks use a simulated DOM and mocked API responses. They do
not replace real-browser performance benchmarks, live-server/database integration,
security penetration testing, or a staged beta with real users.
