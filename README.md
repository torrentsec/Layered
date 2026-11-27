# Layered

Layered turns your local forecast into what to wear — layers, umbrella, gloves — with commute mode, trip packing lists and morning nudges. It's an installable web app with a Bauhaus-inspired design, free Open-Meteo data and no tracking.

**Live:** https://layered-a9i.pages.dev

## How it decides

Layered looks at the hours you'll be outside, takes the coldest *feels-like* temperature in that window, adjusts it for what you're doing (cycling feels colder, running warmer) and for how you run, then picks a band:

| Dress for | Wear |
|---|---|
| 22° and up | T-shirt |
| 17–22° | T-shirt, light layer optional |
| 12–17° | Two light layers |
| 7–12° | Base layer, jumper, jacket |
| 2–7° | Base layer, jumper, warm coat |
| below 2° | Thermal base, thick jumper, heavy coat |

On top of that come extras: umbrella or waterproof, gloves, hat, scarf, sunglasses, sunscreen, reflective kit, and a warning when it's gusty. Tap **Why this?** to see the working.

## Local development

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # engine unit tests
npm run typecheck
npm run lint
```

The advice engine lives in `src/engine` as pure TypeScript with no DOM access, so it runs the same in the browser, in tests and in the push Worker.

## Notifications

Morning, evening and change-alert notifications come from the `layered-push` Worker in `worker/`. It runs every 15 minutes, reads subscriptions from D1 and sends Web Push messages signed with a VAPID key pair. CI applies the D1 migrations and deploys it after the site.

### Rotating the VAPID keys

1. Generate a new pair: `npx web-push generate-vapid-keys`. It prints a public key and a private key, both base64url.
2. Set the Worker secrets, pasting each value at the prompt rather than on the command line:
   ```sh
   npx wrangler secret put VAPID_PUBLIC_KEY --config worker/wrangler.toml
   npx wrangler secret put VAPID_PRIVATE_KEY --config worker/wrangler.toml
   ```
3. Set the same public key as `VAPID_PUBLIC_KEY` in the Pages project's production environment variables, then redeploy the site so `/api/push/key` serves it.
4. Existing subscriptions are bound to the old public key, so push services reject them. Each device has to turn notifications off and on again to resubscribe with the new key.

Don't keep the private key anywhere else once it is set.

## Licence

Layered is free software under the [GNU AGPL v3.0 or later](LICENSE). If you run a modified copy for other people, the AGPL asks you to offer them its source; the app's Settings → About links to this repository for that reason.

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0). Jost typeface by Owen Earl (SIL Open Font License).

— torrentsec
