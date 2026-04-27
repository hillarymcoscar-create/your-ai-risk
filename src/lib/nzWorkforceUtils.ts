// Extracted from NzWorkforceData.tsx so Results.tsx can compute
// MBIE/HLFS data for inclusion in the email payload.

export type AnzscoGroupData = {
  group: string;
  annual_change_pct: number;
  regional_change?: number;
  employed_thousands: number;
  nz_workforce_share_pct: number;
};

const MBIE_CHANGE: Record<string, number> = {
  "Managers":                            8,
  "Professionals":                       3,
  "Technicians and Trades Workers":      10,
  "Community and Personal Service Workers": 2,
  "Clerical and Administrative Workers": 5,
  "Sales Workers":                       12,
  "Machinery Operators and Drivers":     7,
  "Labourers":                           5,
};

const REGIONAL: Record<string, number> = {
  auckland:                              -1,
  wellington:                             9,
  canterbury:                            11,
  waikato:                               10,
  otago_southland:                       14,
  bay_of_plenty:                          7,
  northland:                              0,
  nelson_tasman_marlborough_west_coast:   9,
  manawatu_whanganui_taranaki:            7,
  gisborne_hawkes_bay:                   -1,
};

const HLFS: Record<string, { employed_thousands: number; nz_workforce_share_pct: number }> = {
  "Managers":                            { employed_thousands: 1394.8, nz_workforce_share_pct: 48.1 },
  "Professionals":                       { employed_thousands: 718.4,  nz_workforce_share_pct: 24.8 },
  "Technicians and Trades Workers":      { employed_thousands: 731.9,  nz_workforce_share_pct: 25.2 },
  "Community and Personal Service Workers": { employed_thousands: 305.1, nz_workforce_share_pct: 10.5 },
  "Clerical and Administrative Workers": { employed_thousands: 262.7,  nz_workforce_share_pct: 9.1  },
  "Sales Workers":                       { employed_thousands: 263.1,  nz_workforce_share_pct: 9.1  },
  "Machinery Operators and Drivers":     { employed_thousands: 210.3,  nz_workforce_share_pct: 7.2  },
  "Labourers":                           { employed_thousands: 148.6,  nz_workforce_share_pct: 5.1  },
};

const REGION_KEY: Record<string, string> = {
  "Auckland":           "auckland",
  "Wellington":         "wellington",
  "Canterbury":         "canterbury",
  "Waikato":            "waikato",
  "Otago":              "otago_southland",
  "Southland":          "otago_southland",
  "Bay of Plenty":      "bay_of_plenty",
  "Northland":          "northland",
  "Tasman":             "nelson_tasman_marlborough_west_coast",
  "Nelson":             "nelson_tasman_marlborough_west_coast",
  "Marlborough":        "nelson_tasman_marlborough_west_coast",
  "West Coast":         "nelson_tasman_marlborough_west_coast",
  "Manawatū-Whanganui": "manawatu_whanganui_taranaki",
  "Taranaki":           "manawatu_whanganui_taranaki",
  "Gisborne":           "gisborne_hawkes_bay",
  "Hawke's Bay":        "gisborne_hawkes_bay",
};

export function onetToAnzscoGroup(onetCode: string): string | null {
  const prefix = parseInt(onetCode.split("-")[0] ?? "0", 10);
  if (prefix === 11) return "Managers";
  if ([13, 15, 17, 19, 21, 23, 25, 27, 29].includes(prefix)) return "Professionals";
  if ([47, 49, 51].includes(prefix)) return "Technicians and Trades Workers";
  if ([31, 35, 39].includes(prefix)) return "Community and Personal Service Workers";
  if (prefix === 43) return "Clerical and Administrative Workers";
  if (prefix === 41) return "Sales Workers";
  if (prefix === 53) return "Machinery Operators and Drivers";
  if ([37, 45].includes(prefix)) return "Labourers";
  return null;
}

export function getAnzscoGroupData(
  onetCode: string | null | undefined,
  region: string | null | undefined
): AnzscoGroupData | null {
  if (!onetCode) return null;
  const group = onetToAnzscoGroup(onetCode);
  if (!group) return null;

  const hlfs = HLFS[group];
  if (!hlfs) return null;
  // Suppress anomalous Managers workforce share (broad ANZSCO definition)
  const showShare = hlfs.nz_workforce_share_pct <= 40;

  const regionKey = region ? REGION_KEY[region] : undefined;
  const regional_change = regionKey != null ? REGIONAL[regionKey] : undefined;

  return {
    group,
    annual_change_pct: MBIE_CHANGE[group] ?? 0,
    regional_change,
    employed_thousands: hlfs.employed_thousands,
    nz_workforce_share_pct: showShare ? hlfs.nz_workforce_share_pct : 0,
  };
}
