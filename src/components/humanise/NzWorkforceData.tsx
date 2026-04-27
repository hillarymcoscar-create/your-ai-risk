// NZ Workforce Data box — display-only, no scoring impact.
// Data derived from MBIE Jobs Online Dec 2025 and Stats NZ HLFS Dec 2025.
// Source files: humanise-data/raw-data/govt-sources/

type GroupData = {
  annual_change_pct: number;
  regional_annual_changes: Record<string, number>;
  employed_thousands: number;
  nz_workforce_share_pct: number;
};

// MBIE Jobs Online Dec 2025 — year-on-year % change by ANZSCO group
// Regional figures are cross-group averages of 10 NZ regional indices.
const MBIE: Record<string, { annual_change_pct: number; regional_annual_changes: Record<string, number> }> = {
  "Managers":                            { annual_change_pct: 2.2,  regional_annual_changes: {} },
  "Professionals":                       { annual_change_pct: 4.1,  regional_annual_changes: {} },
  "Technicians and Trades Workers":      { annual_change_pct: 7.6,  regional_annual_changes: {} },
  "Community and Personal Service Workers": { annual_change_pct: 3.6, regional_annual_changes: {} },
  "Clerical and Administrative Workers": { annual_change_pct: 7.4,  regional_annual_changes: {} },
  "Sales Workers":                       { annual_change_pct: 18.1, regional_annual_changes: {} },
  "Machinery Operators and Drivers":     { annual_change_pct: 6.9,  regional_annual_changes: {} },
  "Labourers":                           { annual_change_pct: 7.4,  regional_annual_changes: {} },
};

// Shared regional YoY (MBIE Dec 2025 cross-group averages)
const REGIONAL: Record<string, number> = {
  auckland:                              -1.6,
  wellington:                             8.0,
  canterbury:                            11.7,
  waikato:                               11.0,
  otago_southland:                       16.9,
  bay_of_plenty:                          7.9,
  northland:                              2.8,
  nelson_tasman_marlborough_west_coast:  11.7,
  manawatu_whanganui_taranaki:            3.2,
  gisborne_hawkes_bay:                   -9.5,
};
Object.keys(MBIE).forEach((g) => { MBIE[g].regional_annual_changes = REGIONAL; });

// Stats NZ HLFS Dec 2025 — approximate employment by ANZSCO group
const HLFS: Record<string, { employed_thousands: number; nz_workforce_share_pct: number }> = {
  "Managers":                            { employed_thousands: 276, nz_workforce_share_pct: 9.8  },
  "Professionals":                       { employed_thousands: 541, nz_workforce_share_pct: 19.1 },
  "Technicians and Trades Workers":      { employed_thousands: 350, nz_workforce_share_pct: 12.4 },
  "Community and Personal Service Workers": { employed_thousands: 283, nz_workforce_share_pct: 10.0 },
  "Clerical and Administrative Workers": { employed_thousands: 234, nz_workforce_share_pct: 8.3  },
  "Sales Workers":                       { employed_thousands: 193, nz_workforce_share_pct: 6.8  },
  "Machinery Operators and Drivers":     { employed_thousands: 147, nz_workforce_share_pct: 5.2  },
  "Labourers":                           { employed_thousands: 205, nz_workforce_share_pct: 7.2  },
};

// Map O*NET 2-digit prefix → ANZSCO group name
function onetToAnzscoGroup(onetCode: string): string | null {
  const prefix = parseInt(onetCode.split("-")[0] ?? "0", 10);
  if (prefix === 11) return "Managers";
  if ([13, 15, 17, 19, 21, 23, 25, 27, 29].includes(prefix)) return "Professionals";
  if ([47, 49].includes(prefix)) return "Technicians and Trades Workers";
  if (prefix === 51) return "Technicians and Trades Workers";
  if ([31, 35, 39].includes(prefix)) return "Community and Personal Service Workers";
  if (prefix === 43) return "Clerical and Administrative Workers";
  if (prefix === 41) return "Sales Workers";
  if ([53].includes(prefix)) return "Machinery Operators and Drivers";
  if ([37, 45].includes(prefix)) return "Labourers";
  return null;
}

// Map Quiz region label → MBIE regional key
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

function pctLabel(pct: number): string {
  const abs = Math.abs(pct).toFixed(1).replace(/\.0$/, "");
  return pct >= 0 ? `grew ${abs}%` : `fell ${abs}%`;
}

type Props = {
  onetCode: string | null | undefined;
  region: string | null | undefined;
};

export const NzWorkforceData = ({ onetCode, region }: Props) => {
  if (!onetCode) return null;

  const group = onetToAnzscoGroup(onetCode);
  if (!group) return null;

  const mbie = MBIE[group];
  const hlfs = HLFS[group];
  if (!mbie || !hlfs) return null;

  // Skip Managers workforce share if anomalous (>40% would indicate a data error)
  const showHlfs = hlfs.nz_workforce_share_pct <= 40;

  const regionKey = region ? REGION_KEY[region] : null;
  const regionalPct = regionKey != null ? mbie.regional_annual_changes[regionKey] : undefined;

  return (
    <section
      className="mt-4 rounded-lg border-l-[3px] border-accent bg-accent/10 px-4 py-4 sm:px-5"
      aria-label="NZ workforce data"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-accent">
        NZ Workforce Data — Dec 2025
      </p>

      <ul className="mt-1.5 space-y-1.5">
        <li className="text-[15px] leading-relaxed text-primary">
          Job ads for {group.toLowerCase()} {pctLabel(mbie.annual_change_pct)} in the past year
          {" "}(MBIE Jobs Online, Dec 2025)
        </li>

        {regionalPct != null && region && (
          <li className="text-[15px] leading-relaxed text-primary">
            In {region}, job ads {pctLabel(regionalPct)} annually
          </li>
        )}

        {showHlfs && (
          <li className="text-[15px] leading-relaxed text-primary">
            There are approximately {hlfs.employed_thousands}k {group.toLowerCase()} workers
            in NZ — {hlfs.nz_workforce_share_pct}% of the workforce
          </li>
        )}
      </ul>

      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Source: MBIE Jobs Online Dec 2025 · Stats NZ HLFS Dec 2025
      </p>
    </section>
  );
};
