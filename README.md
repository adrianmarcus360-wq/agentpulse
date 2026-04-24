# AgentPulse

**The AI Agent Economy, Mapped Live.**

A viral microsite that visualizes the global AI agent ecosystem in real time — funding rounds, model launches, product drops, and the builders behind it all.

Built by [AgentRoster](https://agentroster.io).

## Features

- 🌐 Interactive Three.js globe with pulsing location dots and arc connections
- 📊 Live counters: agents launched, funding raised, model updates, active builders
- 📰 Real-time activity feed (funding, launches, model drops, hires)
- 🔗 One-click share card (Twitter/X, copy link, download PNG)
- 📱 Mobile responsive

## Architecture

Pure static HTML/CSS/JS — no framework, no build step. Deploys to Vercel as-is.

| File | Purpose |
|------|---------|
| `index.html` | Page structure & meta tags |
| `style.css` | Dark theme, responsive layout |
| `app.js` | Three.js globe, counters, feed, share card |
| `vercel.json` | Static hosting config |

## API Integration

The site is pre-wired to consume a JSON API. Set `CONFIG.API_URL` in `app.js` to activate live data:

```js
const CONFIG = {
  API_URL: 'https://your-api-endpoint.com/pulse',
  REFRESH_MS: 30000,
};
```

**Expected API shape:**
```json
{
  "counters": {
    "agents": 284,
    "funding": "$1.2B",
    "models": 47,
    "builders": 8420
  },
  "feed": [
    {
      "type": "funding|launch|model|hire|product",
      "icon": "💰",
      "title": "Event title",
      "meta": "Company · Location",
      "time": "2m ago",
      "isNew": true
    }
  ]
}
```

Until the API is live, the site runs on realistic mock data with simulated new events.

## Deploy

Deployed via Vercel. Push to `main` → auto-deploys.

```bash
vercel --prod
```
