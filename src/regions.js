/**
 * GGE Europe Map — Region Definitions
 * Colours derived from each region's official crest
 */

export const REGIONS = {
  benelux: {
    id: "benelux",
    name: "Benelux",
    color: "#4DBFBF",
    colorAlt: "#C0392B",
    crest: "assets/benelux-crest.png",
    countries: ["BE", "NL", "LU"],
  },
  "central-east": {
    id: "central-east",
    name: "Central East",
    color: "#2E6CC4",
    colorAlt: "#F5C518",
    crest: "assets/central-east-crest.png",
    countries: [
      "DE",
      "AT",
      "CH",
      "IT",
      "CZ",
      "PL",
      "HU",
      "HR",
      "SI",
      "RO",
      "BG",
      "GR",
      "TR",
      "SK",
      "LV",
      "LT",
      "EE",
      "SM",
      "VA",
      "LI",
      "MC",
    ],
  },
  france: {
    id: "france",
    name: "France",
    color: "#2956A3",
    colorAlt: "#D63031",
    crest: "assets/france-crest.png",
    countries: ["FR"],
  },
  iberia: {
    id: "iberia",
    name: "Iberia",
    color: "#D63031",
    colorAlt: "#E8A838",
    crest: "assets/iberia-crest.png",
    countries: ["ES", "PT", "AD"],
  },
  nordics: {
    id: "nordics",
    name: "Nordics",
    color: "#1B3A6B",
    colorAlt: "#D63031",
    crest: "assets/nordic-crest.png",
    countries: ["SE", "NO", "DK", "FI", "IS", "FO"],
  },
};

/** Reverse lookup: ISO-2 code → regionId */
export const COUNTRY_TO_REGION = {};
for (const [regionId, region] of Object.entries(REGIONS)) {
  for (const code of region.countries) {
    COUNTRY_TO_REGION[code] = regionId;
  }
}
