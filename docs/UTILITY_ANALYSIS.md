# Audist V5.0 Utility Analysis

## Purpose and boundary

V5.0 creates a reproducible purchased-energy, water, demand, and cost baseline from stored utility bills. It does not perform weather normalization, tariff modeling, interval analysis, end-use disaggregation, source-energy EUI, or whole-building simulation.

## Canonical records

`utilityAccounts[]` preserves individual Electricity, Natural Gas, Water, and Other Fuel accounts. Each account has a stable `utilityAccountId`, type, provider, label, meter number, rate schedule, service address, notes, migration context, and `bills[]`. Each bill has a stable `utilityBillId`, its parent UUID, start/end/days, usage and explicit unit, peak kW, total and optional component costs, estimated flag, source, notes, and optional migration/import context.

Legacy `utility` fields remain intact. When legacy monthly records contain data, Audist makes an additive account-based copy. It does not invent exact dates, provider, meter, tariff, demand, usage, or cost. Month-only limitations and migration context remain visible. An empty V4.x utility collection does not trigger an audit rewrite.

## Deterministic analysis

For accounts with at least 12 distinct billing months and no gap/overlap condition, Audist reports actual-period annual usage/cost, maximum and average recorded monthly demand, average daily use, and total-cost/usage blended rate. Partial data is totaled only for its entered period and is never silently annualized.

- Electric site energy: `kWh × 3.412 kBtu/kWh`.
- Gas site energy: `therms × 100 kBtu/therm`.
- Site EUI: included site energy divided by entered building area.
- Demand intensity: recorded maximum electric kW converted to `W/ft²` (equivalent to `kW/1,000 ft²`).
- Daily normalization: usage or cost divided by recorded/computed billing days.
- Baseload screening: minimum normalized monthly usage × 365, only for a complete account with at least 12 usable normalized bills. This is a screening estimate, not end-use measurement.

Facility annual totals for a utility type are not claimed unless every included account of that type is complete. Building area has no default; its source is stored separately. Multiple accounts remain individually visible.

## Completeness and QA/QC

Statuses are `COMPLETE_12_MONTHS`, `COMPLETE_24_MONTHS`, `PARTIAL`, `GAPS`, and `NO_DATA`. Flags identify duplicate IDs/periods, overlap, gaps, invalid or missing dates, missing days/use/cost, periods outside 20–45 days, negative values, zero use with demand, and unsupported or ambiguous units. Audist reports flags and does not repair source bills.

Facility QA warns when calculated ECM electricity or gas savings exceed a complete purchased-energy baseline, when active electric savings sum above annual kWh, or when demand reduction exceeds observed peak. Warnings never alter calculations.

## Rates and provenance

Entered analysis rates remain separate from derived historical blended rates. Both appear as explicitly labeled calculation input candidates. Conflicting equal-priority values require a user choice, and changes to selected bills/rate fingerprints make dependent calculations stale. A blended rate is not a tariff. Derived outputs retain contributing bill UUIDs/count.

## CSV architecture

The zero-dependency parser supports quoted CSV and requires explicit mappings for billing start, billing end, usage, cost, and usage unit. It returns previewable bill objects and never imports automatically. The mapping/confirmation UI is deferred to V5.0.x because provider formats vary; manual entry is the supported V5.0 UI.

## Export and future compatibility

`audit.json` remains canonical and includes accounts, bills, and a derived utility-analysis snapshot in exports. Package format 2 expands `tables/utilities.csv` and adds only summarized analysis to the manifest. Export validates account/bill relationships. Weather normalization and purchased-energy/end-use reconciliation are future releases.
