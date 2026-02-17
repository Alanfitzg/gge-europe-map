# GGE Europe — Interactive Regional Map

Interactive SVG map of Europe showing 5 GGE regions with hover/focus factsheet panels.

## Regions

| Region           | Countries                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Benelux**      | Belgium, Netherlands, Luxembourg                                                                                                                           |
| **Central East** | Germany, Austria, Switzerland, Italy, Czechia, Poland, Hungary, Croatia, Slovenia, Romania, Bulgaria, Greece, Turkey, Slovakia, Latvia, Lithuania, Estonia |
| **France**       | France, Jersey, Guernsey                                                                                                                                   |
| **Iberia**       | Spain, Portugal, Gibraltar                                                                                                                                 |
| **Nordics**      | Sweden, Norway, Denmark, Finland, Iceland                                                                                                                  |

## Run Locally

**Option 1 — VS Code Live Server:**

1. Install the "Live Server" extension
2. Open `index.html`
3. Click "Go Live" in the status bar

**Option 2 — Python:**

```bash
cd gge-europe-map
python3 -m http.server 8000
```

Then open http://localhost:8000

**Option 3 — Node:**

```bash
npx serve gge-europe-map
```

## File Structure

```
gge-europe-map/
  index.html            Main page with inline SVG map
  src/
    app.js              Interaction logic and factsheet rendering
    styles.css          All styling and animation
    regions.js          Region → country code mappings
    stats.mock.json     Placeholder KPIs (swap for API later)
  assets/               Reserved for additional assets
  README.md
```

## Data Contract

Stats follow this structure per region:

```json
{
  "regionId": "benelux",
  "name": "Benelux",
  "kpis": {
    "clubs": 0,
    "players": 0,
    "matchesYTD": 0,
    "tournamentsYTD": 0,
    "youthTeams": 0
  },
  "notes": ["Bullet 1", "Bullet 2"]
}
```

To connect to live data, replace the `fetch('./src/stats.mock.json')` call in `app.js` with `GET /api/regions/:regionId/stats`.
