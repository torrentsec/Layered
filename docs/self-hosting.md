# Self-hosting

You can run your own copy of Layered on Cloudflare's free plan. You need a Cloudflare account, a GitHub fork of this repository and Node 22. Setup takes about half an hour.

What you get:

- **Cloudflare Pages** serves the app and runs the Pages Functions in `functions/` (`/api/forecast`, `/api/sync`, `/api/push`).
- **D1** holds the database `layered-db`: sync copies, push subscriptions and rate-limit counters.
- **A Worker**, `layered-push`, sends notifications on a 15-minute cron trigger.
- **GitHub Actions** deploys all three from `main`.

The app works without the server pieces. With only static hosting you lose the MET Norway fallback, sync and notifications.

## Free plan limits

Small groups stay well inside the free plan. These are the limits that matter:

- Pages Functions and the Worker share the Workers request allowance. The cron trigger uses 96 runs a day.
- D1 has a daily read and write allowance and a storage cap. A sync copy is at most 256 KB and a subscription at most 8 KB.
- A free Worker gets little CPU time per run. Each notification needs a signature. If you serve many subscribers, check the Worker's logs for CPU limit errors.

Check Cloudflare's pricing pages for the current numbers.

## 1. Fork and install

```sh
git clone https://github.com/<you>/Layered && cd Layered
npm ci
npx wrangler login
```

`wrangler login` opens a browser so you can run the one-off setup commands below from your machine. CI uses an API token instead (step 7).

## 2. Create the Pages project

```sh
npx wrangler pages project create layered --production-branch main
```

If the `layered.pages.dev` name is taken, Cloudflare adds a suffix, such as `layered-a9i.pages.dev`. Note your URL. If you choose a different project name, change `--project-name` in the `deploy` script in `package.json` to match.

## 3. Create the database and run the migrations

```sh
npx wrangler d1 create layered-db
```

Copy the `database_id` it prints. The repository never holds a real id: `worker/wrangler.toml` has the placeholder `LAYERED_DB_ID`, and CI swaps it in at deploy time. Do the same once by hand to apply the migrations:

```sh
sed "s/LAYERED_DB_ID/<your database id>/" worker/wrangler.toml > worker/wrangler.deploy.toml
npx wrangler d1 migrations apply layered-db --remote --config worker/wrangler.deploy.toml
rm worker/wrangler.deploy.toml
```

`worker/wrangler.deploy.toml` is in `.gitignore`, so it can't be committed by mistake. New migrations in `migrations/` are applied by CI on every deploy.

## 4. Bind the database to Pages

In the Cloudflare dashboard, go to **Workers & Pages → layered → Settings → Bindings**. Add a **D1 database** binding:

- Variable name: `DB`
- D1 database: `layered-db`

Add it to both the **Production** and **Preview** environments. Without it, sync and notifications answer 503 and the rest of the app still works.

## 5. Create the secrets

**VAPID keys** sign Web Push messages:

```sh
npx web-push generate-vapid-keys
```

**Rate-limit salt** is any long random string. It keeps the hashed client addresses in `rate_limits` from being matched against a list of IPs:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Set them on the Pages project. Paste each value at the prompt, not on the command line, so it stays out of your shell history:

```sh
npx wrangler pages secret put VAPID_PUBLIC_KEY --project-name layered
npx wrangler pages secret put RATE_LIMIT_SALT --project-name layered
```

Set them on the Worker. The Worker doesn't need the salt.

```sh
sed "s/LAYERED_DB_ID/<your database id>/" worker/wrangler.toml > worker/wrangler.deploy.toml
npx wrangler secret put VAPID_PUBLIC_KEY --config worker/wrangler.deploy.toml
npx wrangler secret put VAPID_PRIVATE_KEY --config worker/wrangler.deploy.toml
```

Keep `worker/wrangler.deploy.toml` for the next step.

The private key lives only in the Worker. The Pages project needs only the public key, which `/api/push/key` hands to browsers.

## 6. Point the Worker at your site and deploy it

In `worker/wrangler.toml`, set `VAPID_SUBJECT` to your own site URL or a `mailto:` address. Push services use it to contact you about problems. Then deploy the Worker once and tidy up:

```sh
npx wrangler deploy --config worker/wrangler.deploy.toml
rm worker/wrangler.deploy.toml
```

The Worker has no public URL (`workers_dev = false`). Its only entry point is the cron trigger.

## 7. Give GitHub Actions a token

Create a custom API token in **My Profile → API Tokens → Create Token → Custom token**. Give it only these account permissions, scoped to your account:

| Permission | Why |
|---|---|
| Account · Cloudflare Pages · Edit | Upload `dist/` to the Pages project |
| Account · D1 · Edit | Look up the database id and apply migrations |
| Account · Workers Scripts · Edit | Deploy `layered-push` and its cron trigger |
| Account · Account Settings · Read | Let Wrangler find your account |

It doesn't need zone, DNS or user permissions.

In your fork, go to **Settings → Environments**, create an environment called `production` and add two secrets:

- `CLOUDFLARE_API_TOKEN`: the token above
- `CLOUDFLARE_ACCOUNT_ID`: shown on the right of your Cloudflare dashboard's Workers & Pages page

`deploy.yml` reads them from the `production` environment. Without them, the deploy jobs skip with a warning instead of failing, so forks stay green.

## 8. Deploy

Push to `main`. The **Deploy** workflow:

1. Runs the unit tests and builds `dist/`.
2. Deploys `dist/` and `functions/` to Pages.
3. Looks up the `layered-db` id, writes a temporary Worker config with it, applies any new migrations and deploys `layered-push`.

Open your `*.pages.dev` URL. Then check that it works:

- **Settings → Sync → Create a code** returns a code.
- **Settings → Notifications** subscribes. The next morning push arrives at the time you set.
- **Settings → About** links to the source. If you change the code, point that link (`REPO` in `src/screens/settings/About.tsx`) at your fork. The AGPL requires you to offer your users the source of the version you run.

## Rotating secrets

To rotate the VAPID keys, see [Rotating the VAPID keys](../README.md#rotating-the-vapid-keys) in the README.

Changing `RATE_LIMIT_SALT` only resets the rate-limit counters. Set the new value with `wrangler pages secret put` and redeploy.

## Running it locally

See [Local development](../README.md#local-development) in the README, including `wrangler pages dev` with a local D1.
