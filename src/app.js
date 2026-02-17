import { REGIONS, COUNTRY_TO_REGION } from "./regions.js";

const COUNTRY_NAMES = {
  BE: "Belgium",
  NL: "Netherlands",
  LU: "Luxembourg",
  DE: "Germany",
  AT: "Austria",
  CH: "Switzerland",
  IT: "Italy",
  CZ: "Czechia",
  PL: "Poland",
  HU: "Hungary",
  HR: "Croatia",
  SI: "Slovenia",
  RO: "Romania",
  BG: "Bulgaria",
  GR: "Greece",
  TR: "Turkey",
  SK: "Slovakia",
  LV: "Latvia",
  LT: "Lithuania",
  EE: "Estonia",
  SM: "San Marino",
  VA: "Vatican City",
  LI: "Liechtenstein",
  MC: "Monaco",
  FR: "France",
  ES: "Spain",
  PT: "Portugal",
  AD: "Andorra",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  IS: "Iceland",
  FO: "Faroe Islands",
};

const DEFAULT_VIEWBOX = "0 0 700 700";
const ZOOM_PADDING = 40;

let statsData = {};
let totalEuropeEvents = 0;
let activeRegion = null;
let lockedRegion = null;
let zoomAnim = null;

async function loadStats() {
  try {
    const res = await fetch("./src/stats.mock.json");
    statsData = await res.json();
    totalEuropeEvents = Object.values(statsData).reduce(
      (sum, r) => sum + (r.events || []).length,
      0
    );
  } catch (e) {
    console.warn("Could not load stats:", e);
  }
}

function initMap() {
  const svg = document.querySelector(".europe-map");
  if (!svg) return;

  for (const [regionId, region] of Object.entries(REGIONS)) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("region-group");
    group.dataset.region = regionId;
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `${region.name} region — click to lock`);

    region.countries.forEach((code) => {
      const paths = svg.querySelectorAll(`path[data-iso2="${code}"]`);
      paths.forEach((path) => {
        path.id = `country-${code}`;
        group.appendChild(path);
      });
    });

    svg.appendChild(group);
  }

  svg.querySelectorAll("path[data-iso2]:not([id])").forEach((p) => {
    p.classList.add("country-no-region");
  });

  svg.querySelectorAll(".region-group").forEach((group) => {
    const regionId = group.dataset.region;

    group.addEventListener("mouseenter", () => {
      if (!lockedRegion) activateRegion(regionId);
    });
    group.addEventListener("mouseleave", () => {
      if (!lockedRegion) deactivateRegion();
    });

    group.addEventListener("click", () => toggleLock(regionId));

    group.addEventListener("focus", () => {
      if (!lockedRegion) activateRegion(regionId);
    });
    group.addEventListener("blur", () => {
      if (!lockedRegion) deactivateRegion();
    });
    group.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleLock(regionId);
      }
      if (e.key === "Escape") {
        unlock();
      }
    });
  });

  document.querySelectorAll(".legend-item").forEach((item) => {
    item.addEventListener("mouseenter", () => {
      if (!lockedRegion) activateRegion(item.dataset.region);
    });
    item.addEventListener("mouseleave", () => {
      if (!lockedRegion) deactivateRegion();
    });
    item.addEventListener("click", () => toggleLock(item.dataset.region));
  });

  svg.addEventListener("click", (e) => {
    if (lockedRegion && !e.target.closest(".region-group")) {
      unlock();
    }
  });
}

function toggleLock(regionId) {
  if (lockedRegion === regionId) {
    unlock();
  } else {
    lockedRegion = regionId;
    activateRegion(regionId);
    zoomToRegion(regionId);
    updateLockIndicator();
  }
}

function unlock() {
  lockedRegion = null;
  deactivateRegion();
  zoomToDefault();
  updateLockIndicator();
}

function updateLockIndicator() {
  document.querySelectorAll(".legend-item").forEach((item) => {
    item.classList.toggle(
      "legend-locked",
      item.dataset.region === lockedRegion
    );
  });
}

// ─── Zoom / ViewBox Animation ────────────────────

function getRegionBBox(regionId) {
  const svg = document.querySelector(".europe-map");
  const group = svg.querySelector(`.region-group[data-region="${regionId}"]`);
  if (!group) return null;
  return group.getBBox();
}

function parseViewBox(vb) {
  return vb.split(" ").map(Number);
}

function animateViewBox(targetVB, duration = 500) {
  const svg = document.querySelector(".europe-map");
  if (zoomAnim) cancelAnimationFrame(zoomAnim);

  const current = parseViewBox(svg.getAttribute("viewBox"));
  const target = parseViewBox(targetVB);
  const start = performance.now();

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeInOutCubic(progress);

    const vb = current.map((c, i) => c + (target[i] - c) * ease);
    svg.setAttribute("viewBox", vb.map((v) => v.toFixed(1)).join(" "));

    if (progress < 1) {
      zoomAnim = requestAnimationFrame(step);
    } else {
      zoomAnim = null;
    }
  }

  zoomAnim = requestAnimationFrame(step);
}

function zoomToRegion(regionId) {
  const bbox = getRegionBBox(regionId);
  if (!bbox) return;

  const pad = ZOOM_PADDING;
  let x = bbox.x - pad;
  let y = bbox.y - pad;
  let w = bbox.width + pad * 2;
  let h = bbox.height + pad * 2;

  const minSize = 120;
  if (w < minSize) {
    const diff = minSize - w;
    x -= diff / 2;
    w = minSize;
  }
  if (h < minSize) {
    const diff = minSize - h;
    y -= diff / 2;
    h = minSize;
  }

  const aspect = 1;
  if (w / h > aspect) {
    const newH = w / aspect;
    y -= (newH - h) / 2;
    h = newH;
  } else {
    const newW = h * aspect;
    x -= (newW - w) / 2;
    w = newW;
  }

  animateViewBox(`${x} ${y} ${w} ${h}`, 600);
}

function zoomToDefault() {
  animateViewBox(DEFAULT_VIEWBOX, 500);
}

// ─── Region Highlight ────────────────────────────

function activateRegion(regionId) {
  if (activeRegion === regionId) return;
  activeRegion = regionId;

  const svg = document.querySelector(".europe-map");
  svg.classList.add("map-has-active");

  svg
    .querySelectorAll(".region-group")
    .forEach((g) => g.classList.remove("active"));
  const target = svg.querySelector(`.region-group[data-region="${regionId}"]`);
  if (target) {
    target.classList.add("active");
    const region = REGIONS[regionId];
    target.querySelectorAll("path").forEach((p) => {
      p.style.fill = region.color;
    });
  }

  document.querySelectorAll(".legend-item").forEach((item) => {
    item.classList.toggle("legend-active", item.dataset.region === regionId);
  });

  renderFactsheet(regionId);
  showClubDots(regionId);
}

function deactivateRegion() {
  activeRegion = null;

  const svg = document.querySelector(".europe-map");
  svg.classList.remove("map-has-active");

  svg.querySelectorAll(".region-group").forEach((g) => {
    g.classList.remove("active");
    g.querySelectorAll("path").forEach((p) => {
      p.style.fill = "";
    });
  });

  document.querySelectorAll(".legend-item").forEach((item) => {
    item.classList.remove("legend-active");
  });

  renderFactsheetEmpty();
  hideClubDots();
}

// ─── Factsheet Panel ─────────────────────────────

function renderFactsheet(regionId) {
  const panel = document.getElementById("factsheet");
  const region = REGIONS[regionId];
  const stats = statsData[regionId] || {
    kpis: {},
    notes: [],
    byCountry: [],
    events: [],
  };
  const kpis = stats.kpis || {};
  const byCountry = stats.byCountry || [];
  const events = stats.events || [];

  const countryNames = region.countries
    .map((c) => COUNTRY_NAMES[c] || c)
    .filter(Boolean);

  const isLocked = lockedRegion === regionId;
  const kpiTiles = buildKpiTiles(kpis);

  panel.innerHTML = `
    <div class="factsheet-content">
      <div class="factsheet-header">
        <img class="region-crest" src="${region.crest}" alt="${region.name} crest">
        <div>
          <h2>${region.name}</h2>
          <p class="country-count">${region.countries.length} countries${isLocked ? ' &middot; <span class="lock-badge">Pinned</span>' : ""}</p>
        </div>
      </div>

      <div class="kpi-grid">
        ${kpiTiles}
      </div>

      ${
        stats.notes && stats.notes.length
          ? `
        <div class="factsheet-notes">
          <h3>Highlights</h3>
          <ul>${stats.notes.map((n) => `<li>${n}</li>`).join("")}</ul>
        </div>
      `
          : ""
      }

      ${buildSpotlights(stats)}

      ${
        events.length > 0
          ? `
        <div class="events-timeline">
          <div class="events-header" data-expand-events="events-list">
            <div>
              <h3>Upcoming Events</h3>
              <div class="events-summary">${events.length} event${events.length !== 1 ? "s" : ""} on the calendar</div>
            </div>
            <span class="events-expand-icon">+</span>
          </div>
          <div class="events-list collapsed" id="events-list">
          ${events
            .map(
              (e) => `
            <div class="event-card ${e.isMajor ? "event-major" : ""}">
              <div class="event-date">${formatDate(e.date)}</div>
              <div class="event-details">
                <div class="event-title">${e.title}</div>
                <div class="event-meta">${e.location} &middot; ${e.host}</div>
                <div class="event-sports">${e.sports.map((s) => `<span class="sport-tag">${s}</span>`).join("")}</div>
              </div>
            </div>
          `
            )
            .join("")}
          </div>
        </div>
      `
          : ""
      }

      ${
        byCountry.length > 0
          ? `
        <div class="country-breakdown">
          <h3>Clubs by Country</h3>
          ${byCountry
            .map(
              (c, i) => `
            <div class="country-section">
              <div class="country-header" data-expand="country-${i}">
                <span class="country-flag">${c.flag || ""}</span>
                <span class="country-name">${c.country}</span>
                <span class="country-club-count">${c.clubCount}</span>
                <span class="expand-icon">+</span>
              </div>
              <div class="club-list collapsed" id="country-${i}">
                ${c.clubs
                  .map((cl) => {
                    const name = typeof cl === "string" ? cl : cl.name;
                    const loc = typeof cl === "string" ? "" : cl.location || "";
                    return `<span class="club-chip" ${loc ? `title="${loc}"` : ""}>${name}</span>`;
                  })
                  .join("")}
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `
          : `
        <div class="countries-list">
          <h3>Countries</h3>
          <div class="country-tags">
            ${countryNames.map((n) => `<span class="country-tag">${n}</span>`).join("")}
          </div>
        </div>
      `
      }

      <div class="factsheet-footer">
        Source: GGE internal databases (2026)
      </div>
    </div>
  `;

  panel.querySelectorAll(".country-header[data-expand]").forEach((header) => {
    header.addEventListener("click", () => {
      const targetId = header.dataset.expand;
      const list = document.getElementById(targetId);
      const icon = header.querySelector(".expand-icon");
      if (list) {
        list.classList.toggle("collapsed");
        icon.textContent = list.classList.contains("collapsed")
          ? "+"
          : "\u2212";
      }
    });
  });

  panel
    .querySelectorAll(".spotlight-card[data-expand-card]")
    .forEach((card) => {
      card.addEventListener("click", () => {
        const targetId = card.dataset.expandCard;
        const body = document.getElementById(targetId);
        const icon = card.querySelector(".spotlight-expand-icon");
        if (body) {
          body.classList.toggle("collapsed");
          icon.textContent = body.classList.contains("collapsed")
            ? "+"
            : "\u2212";
        }
      });
    });

  panel
    .querySelectorAll(".events-header[data-expand-events]")
    .forEach((header) => {
      header.addEventListener("click", () => {
        const targetId = header.dataset.expandEvents;
        const list = document.getElementById(targetId);
        const icon = header.querySelector(".events-expand-icon");
        if (list) {
          list.classList.toggle("collapsed");
          icon.textContent = list.classList.contains("collapsed")
            ? "+"
            : "\u2212";
        }
      });
    });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildSpotlights(stats) {
  const items = [];
  if (stats.spotlight) items.push(stats.spotlight);
  if (stats.spotlights) items.push(...stats.spotlights);
  if (items.length === 0) return "";

  return `
    <div class="spotlight">
      <h3>Spotlight</h3>
      ${items
        .map(
          (sp, i) => `
        <div class="spotlight-card" data-expand-card="spotlight-body-${i}">
          <div class="spotlight-card-header">
            ${sp.crest ? `<img class="spotlight-crest" src="${sp.crest}" alt="${sp.title}">` : ""}
            ${sp.flag ? `<span class="spotlight-flag">${sp.flag}</span>` : ""}
            <div>
              <div class="spotlight-title">${sp.title}</div>
              ${sp.accolade ? `<div class="spotlight-accolade">${sp.accolade}</div>` : ""}
            </div>
            <span class="spotlight-expand-icon">+</span>
          </div>
          <div class="spotlight-body collapsed" id="spotlight-body-${i}">
            <div class="spotlight-desc">${sp.description}</div>
            ${
              sp.stats
                ? `
              <div class="spotlight-stats">
                ${sp.stats.map((s) => `<span class="spotlight-stat">${s}</span>`).join("")}
              </div>
            `
                : ""
            }
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function buildKpiTiles(kpis) {
  const tiles = [];

  if (kpis.clubs != null) tiles.push({ value: kpis.clubs, label: "Clubs" });
  if (kpis.countries != null)
    tiles.push({ value: kpis.countries, label: "Countries" });
  if (kpis.calendarEvents != null)
    tiles.push({ value: kpis.calendarEvents, label: "Calendar Events" });
  if (kpis.tournaments != null)
    tiles.push({ value: kpis.tournaments, label: "Tournaments" });
  if (kpis.players != null && kpis.players > 0)
    tiles.push({ value: kpis.players, label: "Players" });
  if (kpis.matchesYTD != null && kpis.matchesYTD > 0)
    tiles.push({ value: kpis.matchesYTD, label: "Matches YTD" });
  if (kpis.tournamentsYTD != null && kpis.tournamentsYTD > 0)
    tiles.push({ value: kpis.tournamentsYTD, label: "Tournaments YTD" });
  if (kpis.youthTeams != null && kpis.youthTeams > 0)
    tiles.push({ value: kpis.youthTeams, label: "Youth Teams" });
  if (kpis.fixtures != null && kpis.fixtures > 0)
    tiles.push({ value: kpis.fixtures, label: "Fixtures" });
  if (kpis.calendarInterests != null && kpis.calendarInterests > 0)
    tiles.push({ value: kpis.calendarInterests, label: "Calendar Interests" });

  if (tiles.length === 0) {
    tiles.push({ value: 0, label: "Clubs" });
    tiles.push({ value: 0, label: "Events" });
  }

  const isOdd = tiles.length % 2 !== 0;

  return tiles
    .map((t, i) => {
      const fullWidth = isOdd && i === tiles.length - 1;
      return `<div class="kpi-tile${fullWidth ? " full-width" : ""}">
      <div class="kpi-value">${fmt(t.value)}</div>
      <div class="kpi-label">${t.label}</div>
    </div>`;
    })
    .join("");
}

function renderFactsheetEmpty() {
  const panel = document.getElementById("factsheet");
  panel.innerHTML = `
    <div class="factsheet-empty">
      <img class="gge-logo-large" src="assets/gge-crest.png" alt="Gaelic Games Europe">
      <p>Hover a region to preview<br>Click to pin, zoom and scroll stats</p>
    </div>
  `;
}

function fmt(n) {
  if (n == null) return "\u2014";
  return Number(n).toLocaleString();
}

// ─── Club Dots ───────────────────────────────────

const CITY_LATLNG = {
  // Nordics
  Stockholm: [59.33, 18.07],
  Gothenburg: [57.71, 11.97],
  Malmö: [55.6, 13.0],
  Gävle: [60.67, 17.15],
  Sandviken: [60.62, 16.78],
  Luleå: [65.58, 22.15],
  Copenhagen: [55.68, 12.57],
  Aarhus: [56.15, 10.22],
  Odense: [55.4, 10.39],
  Hillerød: [55.93, 12.31],
  Helsinki: [60.17, 24.94],
  Tampere: [61.5, 23.79],
  Oulu: [65.01, 25.47],
  Oslo: [59.91, 10.75],
  Reykjavik: [64.15, -21.9],
  // Benelux
  Amsterdam: [52.37, 4.9],
  Maastricht: [50.85, 5.69],
  "The Hague": [52.08, 4.3],
  Eindhoven: [51.44, 5.47],
  Groningen: [53.22, 6.57],
  Nijmegen: [51.84, 5.87],
  Brussels: [50.85, 4.36],
  Leuven: [50.88, 4.7],
  Luxembourg: [49.61, 6.13],
  Cologne: [50.94, 6.96],
  Frankfurt: [50.11, 8.68],
  Düsseldorf: [51.23, 6.77],
  Aachen: [50.78, 6.08],
  Darmstadt: [49.87, 8.65],
  Hamburg: [53.55, 10.0],
  // France
  Paris: [48.86, 2.35],
  Rennes: [48.11, -1.68],
  Nantes: [47.22, -1.55],
  Lyon: [45.76, 4.83],
  Bordeaux: [44.84, -0.58],
  Strasbourg: [48.57, 7.75],
  Toulouse: [43.6, 1.44],
  Lille: [50.63, 3.06],
  Clermont: [45.78, 3.08],
  Angers: [47.47, -0.56],
  "Le Mans": [48.0, 0.2],
  Montpellier: [43.61, 3.88],
  Valbonne: [43.64, 7.01],
  "Aix-en-Provence": [43.53, 5.44],
  Niort: [46.32, -0.46],
  Poitiers: [46.58, 0.34],
  "St. Brieuc": [48.51, -2.76],
  Brest: [48.39, -4.49],
  Vannes: [47.66, -2.76],
  Lorient: [47.75, -3.37],
  Quimper: [48.0, -4.1],
  "St. Coulomb": [48.67, -1.92],
  Liffre: [48.21, -1.51],
  Mondeville: [49.18, -0.33],
  Arthon: [47.07, -1.72],
  "Pas-en-Artois": [50.18, 2.47],
  Brittany: [48.2, -3.0],
  "Jersey, Channel Islands": [49.21, -2.13],
  "Guernsey, Channel Islands": [49.45, -2.54],
  // Iberia
  Vigo: [42.23, -8.72],
  "A Coruña": [43.37, -8.4],
  Boqueixón: [42.78, -8.39],
  Gondomar: [42.1, -8.77],
  Boiro: [42.65, -8.88],
  "A Guarda": [41.9, -8.87],
  Poio: [42.44, -8.69],
  Ourense: [42.34, -7.86],
  Cambados: [42.51, -8.81],
  Galicia: [42.5, -8.2],
  Barcelona: [41.39, 2.17],
  Madrid: [40.42, -3.7],
  "Vitoria-Gasteiz": [42.85, -2.67],
  Bilbao: [43.26, -2.93],
  Valencia: [39.47, -0.38],
  Zaragoza: [41.65, -0.88],
  Sevilla: [37.39, -5.98],
  Málaga: [36.72, -4.42],
  Marbella: [36.51, -4.88],
  Sitges: [41.24, 1.81],
  Girona: [41.98, 2.82],
  "Santiago de Compostela": [42.88, -8.54],
  Lisbon: [38.72, -9.14],
  Porto: [41.15, -8.61],
  Gibraltar: [36.14, -5.35],
  // Central East
  Munich: [48.14, 11.58],
  Berlin: [52.52, 13.4],
  Stuttgart: [48.78, 9.18],
  Dresden: [51.05, 13.74],
  Augsburg: [48.37, 10.9],
  Zurich: [47.38, 8.54],
  Geneva: [46.2, 6.15],
  Basel: [47.56, 7.59],
  Bern: [46.95, 7.45],
  Warsaw: [52.23, 21.01],
  Wroclaw: [51.11, 17.04],
  Bydgoszcz: [53.12, 18.01],
  Olsztyn: [53.78, 20.48],
  Milan: [45.46, 9.19],
  Rome: [41.9, 12.5],
  Vienna: [48.21, 16.37],
  Salzburg: [47.8, 13.04],
  Prague: [50.08, 14.44],
  Strakonice: [49.26, 13.9],
  Zagreb: [45.81, 15.98],
  Budapest: [47.5, 19.04],
  Tallinn: [59.44, 24.75],
  Bratislava: [48.15, 17.11],
  Switzerland: [46.82, 8.23],
};

const CITY_OVERRIDES = {
  Reykjavik: { x: 45, y: 110 },
};

const DOT_COLOR = "#F5C518";

function geoToSvg(lat, lng) {
  const x = (22.07 - 0.1896 * lat) * lng + 68.51 + 1.931 * lat;
  const latRad = (lat * Math.PI) / 180;
  const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = -687.3 * mercY + 1132.5;
  return { x, y };
}

function getCityCoords(location) {
  if (CITY_OVERRIDES[location]) return CITY_OVERRIDES[location];
  const ll = CITY_LATLNG[location];
  if (!ll) return null;
  return geoToSvg(ll[0], ll[1]);
}

function showClubDots(regionId) {
  hideClubDots();
  const svg = document.querySelector(".europe-map");
  const stats = statsData[regionId];
  if (!svg || !stats || !stats.byCountry) return;

  const seen = new Set();
  const cities = [];

  stats.byCountry.forEach((country) => {
    (country.clubs || []).forEach((club) => {
      const loc = typeof club === "string" ? "" : club.location || "";
      if (!loc) return;
      const key = loc.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      cities.push({ name: club.name, location: loc });
    });
  });

  const dotGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  dotGroup.classList.add("club-dots-group");
  dotGroup.dataset.region = regionId;

  const shuffled = cities.sort(() => Math.random() - 0.5);

  shuffled.forEach((club, i) => {
    const coords = getCityCoords(club.location);
    if (!coords) {
      console.warn("No coords for:", club.location);
      return;
    }

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.classList.add("club-dot");
    circle.setAttribute("cx", coords.x.toFixed(1));
    circle.setAttribute("cy", coords.y.toFixed(1));
    circle.setAttribute("r", "0");
    circle.style.fill = DOT_COLOR;
    circle.style.animationDelay = `${i * 60}ms`;

    const title = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title"
    );
    title.textContent = club.name;
    circle.appendChild(title);

    dotGroup.appendChild(circle);
  });

  svg.appendChild(dotGroup);
}

function hideClubDots() {
  document.querySelectorAll(".club-dots-group").forEach((g) => g.remove());
}

// ─── Boot ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadStats();
  initMap();
  renderFactsheetEmpty();
  buildLegend();
});

function buildLegend() {
  const container = document.querySelector(".map-legend");
  if (!container) return;

  for (const [id, region] of Object.entries(REGIONS)) {
    const item = document.createElement("div");
    item.classList.add("legend-item");
    item.dataset.region = id;
    item.innerHTML = `<span class="legend-dot" style="background:${region.color}"></span>${region.name}`;
    container.appendChild(item);
  }
}
