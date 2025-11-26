// Mapping from country names in the dataset to ISO 3166-1 alpha-3 codes
// used in Natural Earth GeoJSON data

export const COUNTRY_NAME_TO_ISO = {
  "Algeria": "DZA",
  "Angola": "AGO",
  "Argentina": "ARG",
  "Armenia": "ARM",
  "Australia": "AUS",
  "Austria": "AUT",
  "Bangladesh": "BGD",
  "Belarus": "BLR",
  "Belgium": "BEL",
  "Bolivia": "BOL",
  "Bosnia and Herzegovina": "BIH",
  "Brazil": "BRA",
  "Bulgaria": "BGR",
  "Burkina Faso": "BFA",
  "Cambodia": "KHM",
  "Cameroon": "CMR",
  "Canada": "CAN",
  "Chad": "TCD",
  "Chile": "CHL",
  "China": "CHN",
  "Colombia": "COL",
  "Croatia": "HRV",
  "Cuba": "CUB",
  "Czech Republic": "CZE",
  "Czechoslovakia": "CZE", // Historical - map to Czech Republic
  "Democratic Republic of the Congo": "COD",
  "Denmark": "DNK",
  "Dominican Republic": "DOM",
  "East Germany": "DEU", // Historical - map to Germany
  "Egypt": "EGY",
  "Estonia": "EST",
  "Ethiopia": "ETH",
  "Faroe Islands": "FRO",
  "Finland": "FIN",
  "France": "FRA",
  "Germany": "DEU",
  "Ghana": "GHA",
  "Greece": "GRC",
  "Guatemala": "GTM",
  "Guinea-Bissau": "GNB",
  "Guyana": "GUY",
  "Haiti": "HTI",
  "Hong Kong": "HKG",
  "Hungary": "HUN",
  "India": "IND",
  "Indonesia": "IDN",
  "Iran": "IRN",
  "Iraq": "IRQ",
  "Ireland": "IRL",
  "Israel": "ISR",
  "Italy": "ITA",
  "Ivory Coast": "CIV",
  "Jamaica": "JAM",
  "Japan": "JPN",
  "Kazakhstan": "KAZ",
  "Kenya": "KEN",
  "Kyrgyzstan": "KGZ",
  "Lebanon": "LBN",
  "Lesotho": "LSO",
  "Luxembourg": "LUX",
  "Macedonia": "MKD",
  "Malaysia": "MYS",
  "Mali": "MLI",
  "Martinique": "MTQ",
  "Mauritania": "MRT",
  "Mexico": "MEX",
  "Mongolia": "MNG",
  "Morocco": "MAR",
  "Mozambique": "MOZ",
  "Nepal": "NPL",
  "Netherlands": "NLD",
  "New Zealand": "NZL",
  "Niger": "NER",
  "Nigeria": "NGA",
  "Norway": "NOR",
  "Pakistan": "PAK",
  "Palestine": "PSE",
  "Paraguay": "PRY",
  "Peru": "PER",
  "Philippines": "PHL",
  "Poland": "POL",
  "Portugal": "PRT",
  "Romania": "ROU",
  "Russia": "RUS",
  "Rwanda": "RWA",
  "Saudi Arabia": "SAU",
  "Senegal": "SEN",
  "Serbia": "SRB",
  "Slovakia": "SVK",
  "Slovenia": "SVN",
  "Somalia": "SOM",
  "South Africa": "ZAF",
  "South Korea": "KOR",
  "Soviet Union": "RUS", // Historical - map to Russia
  "Spain": "ESP",
  "Sri Lanka": "LKA",
  "Sudan": "SDN",
  "Sweden": "SWE",
  "Switzerland": "CHE",
  "Syria": "SYR",
  "Taiwan": "TWN",
  "Thailand": "THA",
  "Tunisia": "TUN",
  "Turkey": "TUR",
  "Ukraine": "UKR",
  "United Kingdom": "GBR",
  "United States": "USA",
  "Uruguay": "URY",
  "Venezuela": "VEN",
  "Vietnam": "VNM",
  "West Germany": "DEU", // Historical - map to Germany
  "Yugoslavia": "SRB", // Historical - map to Serbia
  "Zimbabwe": "ZWE"
}

// Reverse mapping: ISO code to country name(s)
// For countries with historical entities, we combine the data
export const ISO_TO_COUNTRY_NAMES = {}

// Build the reverse mapping
Object.entries(COUNTRY_NAME_TO_ISO).forEach(([name, iso]) => {
  if (!ISO_TO_COUNTRY_NAMES[iso]) {
    ISO_TO_COUNTRY_NAMES[iso] = []
  }
  ISO_TO_COUNTRY_NAMES[iso].push(name)
})

// GeoJSON uses different property names for country identification
// This maps from GeoJSON properties to ISO codes
export const getISOFromGeoProperties = (properties) => {
  // Natural Earth GeoJSON uses ISO_A3 or ADM0_A3
  return properties.ISO_A3 || properties.ADM0_A3 || properties.iso_a3 || null
}
