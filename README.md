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

GitHub Actions runs the same runner on pushes, pull requests, and manual
dispatches. To receive a Discord message after successful tests, add a repository
Actions secret named `DISCORD_WEBHOOK_URL` containing the Discord webhook URL.
