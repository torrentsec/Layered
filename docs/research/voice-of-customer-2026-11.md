# Voice of the customer: November 2026

**Owner:** Product Owner. **Purpose:** find unmet needs that should shape the Product Backlog after the backlog's own stories.

## Method

Desk research into public app-store listings and reviews of "what to wear" weather apps (iOS and Google Play), parent-focused dressing apps, runner and cyclist kit calculators, and user complaints about mainstream weather apps. Reddit was out of reach of our research tools this round, so community sentiment comes from store reviews, review aggregators, Trustpilot and forum posts. These are anecdotal signals for discovery, not measurements.

## What people say

| # | Signal | Evidence | What it means for Layered |
|---|---|---|---|
| 1 | Advice should hold for the whole day, not flip-flop hour by hour | A Weather Outfit reviewer complained it "changes suggestions by the hour instead of looking at the overall day" | Keep dressing for the coldest hour of the window. Never change the morning's advice silently; tell people when it changes and why (US-043). |
| 2 | Morning nudge, with the umbrella | Weather Outfit reviewers asked for daily morning notifications with an umbrella reminder | Already planned (US-042). Make the umbrella or waterproof the lead item in the notification text. |
| 3 | Plan tonight for tomorrow | Weather Outfit reviewers asked for notifications for the night and the following day | **New:** an optional evening notification with tomorrow's outfit (US-061). |
| 4 | Dress the family, not just me | A Forecast & What to Wear reviewer wanted a family feature. A whole category of child-dressing apps exists (Tiny Weather, ReadyKid, Dress for Weather, AccuWeather School Day) | **New epic E12, Household:** extra people (for example a child) with their own comfort profile and an age-based offset, shown alongside your own advice (US-062 to US-064). |
| 5 | Plan around fixed moments (school run, bus, dog walk) | AccuWeather lets parents set forecasts around drop-off, dismissal and bus pickup | **New:** *Routines*: named recurring windows (time, duration, days, activity) beyond the commute (US-065, US-066). |
| 6 | Effort matters: runners dress 10–20°F warmer | Running and cycling charts all add an effort-based adjustment and adjust for wind | **New:** an effort level (easy, steady, hard) for running, cycling and hiking that scales the activity offset (US-067). |
| 7 | Rain timing is where trust breaks | Trustpilot and aggregated low-star reviews: rain "starts in 18 minutes" while it's already raining; hourly views that disagree with daily ones; false confidence many days out | Phrase rain timing as approximate ("showers from around 16:00"). Show rain chance, not certainty. Label days beyond about 7 as less certain (US-025, plus new US-068). |
| 8 | "Feels like" is subjective | Trustpilot: "feels like" called extremely subjective; RealFeel reported 5–10° off rivals | Show the real temperature next to feels-like (US-069), and keep personal calibration prominent. |
| 9 | Reliability: "won't load" | Running Weather reviews mention the app failing to load its data | Covered by the MET Norway fallback and offline cache. Add a visible "Try again" on errors (done). |
| 10 | Kit by body zone for sport | Cycling kit selectors list head, hands, torso, legs and feet | Our base, mid, outer, bottoms, footwear and accessories already maps to body zones. Add sport accessories (buff, arm warmers) later (P3). |

## New Product Backlog items

| ID | Story | Pri | Epic |
|---|---|---|---|
| US-061 | As a user, I want an optional evening notification with tomorrow's outfit, so that I can lay clothes out the night before. | P1 | E06 |
| US-062 | As a parent, I want to add another person (such as a child) with their own comfort profile, so that I can dress the household from one app. | P2 | E12 |
| US-063 | As a parent, I want age-appropriate defaults for a child (they lose heat faster and play hard), so that advice is sensible without tuning. | P2 | E12 |
| US-064 | As a parent, I want Today to show each person's outfit side by side, so that the morning rush takes one glance. | P2 | E12 |
| US-065 | As a user, I want to save routines (school run, dog walk, gym) with a time, length, days and activity, so that advice covers my real day. | P1 | E07 |
| US-066 | As a user, I want Today to dress me for the coldest of today's routines and flag differences between them, as it does for the commute. | P1 | E07 |
| US-067 | As a runner or cyclist, I want to set my effort (easy, steady, hard), so that I'm not overdressed for a hard session. | P1 | E07 |
| US-068 | As a user, I want rain timing phrased as approximate and far-off days marked as less certain, so that I'm not misled by false precision. | P1 | E03 |
| US-069 | As a user, I want the real temperature shown next to feels-like, so that I can judge the gap myself. | P2 | E03 |

## Sources

- [Weather Outfit: What to Wear (Google Play)](https://play.google.com/store/apps/details?id=com.byteexperts.weatheroutfits&hl=en_US)
- [Forecast & What to Wear (App Store)](https://apps.apple.com/us/app/forecast-what-to-wear/id1396769360) and [reviews summary](https://justuseapp.com/en/app/1396769360/forecast-what-to-wear/reviews)
- [Running Weather: What to Wear (App Store)](https://apps.apple.com/us/app/running-weather-what-to-wear/id6474908980)
- [TheWear (App Store)](https://apps.apple.com/us/app/thewear/id1481102346), [WeatherFit](https://weatherfit.com/)
- [AccuWeather school-day feature for parents](https://www.yahoo.com/lifestyle/articles/accuweather-feature-helps-parents-dress-220400922.html), [Dress for Weather (Google Play)](https://play.google.com/store/apps/details?id=com.layerkid.app&hl=en-US), [ReadyKid](https://readykid.app/), [Tiny Weather](https://play.google.com/store/apps/details?id=com.limitlessapps.tinyweather&hl=en_US)
- [What to wear running: temperature chart](https://northlabapps.com/blog/what-to-wear-running/), [Cycling kit selector](https://www.dincalculator.com/bike/what-to-wear), [Cycling temperature guide](https://join.cc/cycling-tips/cycling-what-to-wear-temperature-guide)
- [The Weather Channel reviews (Trustpilot)](https://au.trustpilot.com/review/www.weather.com?page=3), [Weather apps ranked from low-star reviews](https://unstar.app/blog/accuweather-weather-channel-carrot-apple-weather-underground-weather-apps-ranked-2026), [Apple Weather: garbage in, garbage out](https://snowingwhen.substack.com/p/apple-weather-garbage-in-garbage)
