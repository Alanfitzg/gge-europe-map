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
