# Danone Shelf Optimizer

Field-sales decision support for retail execution: prioritize stores, diagnose the shelf, recommend the next action, and quantify weekly euro impact.

> **Prototype note:** This is a working Paris-pilot Databricks App. Store priority, signals, planograms, and sell-out come from Unity Catalog. Shelf “vision” and next-best-action payloads are deterministic demo logic. Databricks Model Serving is the documented production upgrade, not a live integration.

---

## 1. What the app does

Shelf Optimizer is a field-sales decision application for Danone retail execution teams. It connects national sell-out, store-level shelf execution, local demand signals, and commercial lift assumptions to answer four questions:

1. Which stores should a representative visit first?
2. What is wrong—or changing—in each store?
3. What shelf action should Danone propose?
4. What is the expected financial value, and was the action accepted?

**Value proposition:** turn every shelf visit from a manual compliance check into a prioritized, evidence-based commercial action with a quantified euro impact.

### 1.1 Prioritize field activity

The Paris map ranks stores using a precomputed priority score and shows:

- Danone share of shelf (SoS)
- Planogram compliance
- Weekly dairy sales
- Priority tier and score
- Situation summary
- Active local demand signals

Stores appear in a visit queue so representatives spend time where revenue is most recoverable.

**Danone value**

- Better use of limited field capacity
- Less visit preparation
- Focus on stores with real revenue exposure
- Consistent prioritization across reps
- A clear reason for why a store needs intervention

The app **reads** `priority_score` from the Databricks store table. It does not currently compute that score in application code.

### 1.2 Anticipate local demand

External signals sit on top of execution and sales. The prototype covers ten families:

- Fitness activity / Strava
- Sports and local events
- Weather
- Transport mobility and footfall
- Competitor activity
- Basket affinities
- Workplace occupancy
- Consumer search interest
- Family and school calendars
- Tourism

Each signal is translated into a store-specific shelf action (for example more Oikos High Protein near fitness demand, more grab-and-go near commuting hubs, defend eye-level during competitor promotions).

**Danone value**

- Execution becomes forward-looking, not only POS-reactive
- Assortment can be localized vs a single national planogram
- Stronger, store-specific retailer arguments

Signals are already structured in Unity Catalog. The app does not ingest Strava, weather, or mobility feeds itself.

### 1.3 Store briefing

Opening a store produces a visit brief: identity, retailer/format, priority, situation, SoS, compliance, weekly sales, local signals, recommended actions, and photo history.

**Danone value:** less manual prep, more consistent execution quality, a fact-based objective before the aisle conversation.

### 1.4 Shelf-photo analysis

A representative captures or uploads a shelf image. The app returns detections, Danone vs competitor share, OOS voids, wrong placement, missing promo tags, competitor eye-level SKUs, compliance, alerts, and a next-best action (NBA).

Accepting the NBA persists store, recommendation, rationale, projected lift, estimated weekly euros, timestamp, and status.

**Danone value**

- Faster OOS correction
- Protection of share of shelf
- Verification of paid promotional execution
- Consistent recommendations
- An auditable decision record

**Caveat:** analysis does not currently run a vision model on pixels. Production path is Databricks Model Serving (multimodal LLM or YOLO-class detector).

### 1.5 Track shelf evolution

Photos and analysis metadata are stored by store and visit. Reps can compare SoS, compliance, OOS, competitor eye-level, and before/after conditions.

**Danone value:** proof of improvement, evidence for retailer talks, detection of recurring failures, future training data for production vision.

### 1.6 Simulate a better shelf

The virtual planogram shows row, column, SKU, brand, manufacturer, margin, promo requirement, and shelf zone (eye / mid / low). Users can drag facings, apply the recommended layout, fill empties, and save the simulation. Weekly value updates live.

**Danone value:** test the ask before negotiating; connect placement to economics; prioritize high-margin Danone SKUs.

### 1.7 Quantify business value

Projected weekly impact is split into four levers (prototype assumptions):

| Lever | Stated effect |
| --- | --- |
| OOS reduction | 2–4% total sales recovery by restocking voids |
| Eye-level placement | 10–15% SKU lift in the 1.2–1.6 m strike zone |
| Trade-spend compliance | Recovery when paid tags / end-caps are verified |
| Cross-merchandising | Basket uplift (e.g. dairy next to granola / berries) |

A representative NBA in the demo uses **+12%** projected lift.

These are **hackathon / business-case assumptions**, not experimentally proven incremental revenue. Production should calibrate against realized POS and matched-store tests.

### 1.8 Close the decision loop

Accepted recommendations and saved simulations form a management log: what was recommended, where, why, expected lift, weekly euros, and when.

Loop: **signal → diagnosis → recommendation → simulation → acceptance → (future) outcome measurement**.

Joining accepted actions to subsequent sell-out is the natural production extension.

### 1.9 Who uses it

| Persona | Role in the app |
| --- | --- |
| Field sales / retail execution reps | Primary users: map, store brief, photo, sandbox, accept NBA |
| Sales / execution managers | Audit trail of accepted actions and projected weekly € |
| Category / commercial stakeholders | Revenue impact page: MAT brand sales, manufacturer share, lift assumptions |

There is a single app with no role-based access in the current code.

---

## 2. Databricks technology used

### 2.1 Implemented (claim these)

| Layer | What it does in this app |
| --- | --- |
| **Databricks Apps** | Hosted runtime for the rep-facing application |
| **AppKit 0.57** | Backend SDK + UI: plugins, typed SQL, charts/tables, warehouse readiness |
| **AppKit plugins** | `analytics()`, `lakebase()`, `server()` only |
| **SQL Warehouse** | Executes registered SQL against Unity Catalog (`CAN_USE`) |
| **Unity Catalog / Delta** | Governed analytics: stores, signals, planograms, lift assumptions, sell-out |
| **Lakebase Postgres** | OLTP for photos, accepted recommendations, simulations (`CAN_CONNECT_AND_CREATE`) |
| **Asset Bundles + Apps deploy** | `databricks.yml` / `app.yaml`; `databricks apps deploy` |

**Analytical tables** (`serverless_stable_6hzlm4_catalog`):

- `shelf_optimizer.stores`
- `shelf_optimizer.external_signals`
- `shelf_optimizer.planogram_slots`
- `shelf_optimizer.sku_lift_assumptions`
- `sellout.sellout_sales`

**Lakebase tables:**

- `app.accepted_recommendations`
- `app.shelf_photos`
- `app.shelf_simulations`

**SQL query keys:** `stores`, `store_detail`, `external_signals`, `store_signals`, `planogram_by_store`, `sos_by_store`, `brand_sales_france`, `manufacturer_value_share`, `lift_assumptions`.

**Actual data path**

```
React (AppKit UI)
  ├─ useAnalyticsQuery / BarChart / DataTable / DonutChart
  │     → AppKit Analytics → SQL Warehouse → UC Delta
  └─ fetch /api/*
        ├─ POST /api/shelf/analyze  → in-process demo heuristics
        └─ recommendations / photos / simulations → Lakebase
```

**Auth (as configured):** app identity to warehouse and Lakebase. On-behalf-of-user `user_api_scopes` is commented out. CLI OAuth is used for deploy.

### 2.2 Not implemented (do not claim as live)

- Databricks Model Serving
- Databricks Agents plugin
- AI/BI Genie
- Vector Search
- Lakeflow Jobs
- Unity Catalog Volumes
- Metric Views (empty registry)
- MLflow / Foundation Model APIs

“Priority agent” in the UI is **product language**. Scores come from Delta columns, not a live agent.

---

## 3. Ten-minute presentation structure

Target: ~10 minutes. Do not over-claim AI vision. End on Databricks architecture and a clear production path.

### Slide 1 — From shelf photo to commercial action

**Time:** 45 seconds

**On slide**

- Product: Danone Shelf Optimizer
- Line: Prioritize the right store, recommend the right shelf action, quantify weekly value
- Paris pilot / field-sales focus
- Sequence: Observe → Decide → Act → Measure

**Notes**

Retail execution data often says what happened, not where to go next or what to do on arrival. This app unifies sell-out, SoS, planogram compliance, local demand, and shelf observations into one field workflow with a euro-denominated action.

---

### Slide 2 — The Danone business problem

**Time:** 1 minute

**On slide**

- Field time is limited
- OOS creates invisible lost sales
- Premium SKUs can sit outside the strike zone
- Promo execution is hard to verify
- National planograms miss local demand
- Visit evidence is fragmented

**Notes**

The opportunity is broader than compliance: availability, visibility, premium mix, and trade-spend effectiveness. The app supports the representative; it does not replace the retailer relationship.

---

### Slide 3 — One workflow from signal to value

**Time:** 1 minute

**On slide**

1. Prioritize stores  
2. Understand local demand  
3. Analyze shelf execution  
4. Recommend NBA  
5. Simulate a better shelf  
6. Quantify impact  
7. Save the decision  
8. Measure future outcomes  

**Notes**

The differentiator is the closed loop. We do not stop at a dashboard. Accepted actions persist so management can later compare expected value with realized sell-out.

---

### Slide 4 — Put field effort where value is recoverable

**Time:** 1 minute

**On slide**

- Paris priority map + visit queue
- Inputs: SoS, compliance, weekly sales, execution risk, local signals
- Output: store briefing

**Notes**

A critical store with meaningful weekly sales and a deteriorating shelf should beat a low-value compliant store. Be explicit: the app **consumes** a precomputed priority score from Unity Catalog.

---

### Slide 5 — Local signals become local shelf actions

**Time:** 1 minute

**On slide**

- Fitness, events, weather, mobility, search, baskets, competitor pressure
- Example: high fitness intensity → more Oikos HP availability and eye-level facings

**Notes**

POS is backward-looking. Signals explain why next week’s demand may differ by neighborhood. They are combined with SoS, OOS, compliance, and sales—not used as standalone rules.

---

### Slide 6 — Observe, recommend, and simulate

**Time:** 1 minute 30 seconds

**On slide**

- Photo capture
- Detect: OOS, competitor eye-level, wrong placement, missing promo tags
- Next-best action
- Virtual shelf + apply recommended layout

**Notes**

Say out loud: in this prototype, analysis is simulated with deterministic rules. Production would connect this step to Databricks Model Serving.

---

### Slide 7 — Translate execution into euros

**Time:** 1 minute 15 seconds

**On slide**

- OOS recovery: 2–4%
- Eye-level SKU lift: 10–15%
- Trade-spend compliance
- Cross-merchandising
- Live projected weekly €

**Notes**

The representative negotiates with a commercial case, not a visual preference. Caveat: these are prototype assumptions; production should recalibrate with POS and controlled-store tests.

---

### Slide 8 — Close the loop for sales management

**Time:** 1 minute

**On slide**

- Accepted-action log
- Photo history
- Saved simulations
- Timestamped expected lift
- Future join to realized sales

**Notes**

Every accept creates a structured record. That is coaching, accountability, and the dataset needed to learn which recommendations actually work.

---

### Slide 9 — Why Databricks

**Time:** 1 minute 15 seconds

**On slide**

- Unity Catalog / Delta — governed analytics
- SQL Warehouse — live queries
- Databricks Apps + AppKit — field UX
- Lakebase — photos, simulations, decisions
- Asset Bundles — packaged permissions
- Next: Model Serving for production vision

**Notes**

Analytics and operational state stay on one platform. Do **not** list Genie, Agents, or Vector Search as implemented.

---

### Slide 10 — Pilot value and next steps

**Time:** 1 minute 15 seconds

**On slide**

Immediate:

- Better visit prioritization
- Shorter OOS duration
- Protect premium eye-level
- Verify promo execution
- Auditable action pipeline

Production:

1. Real photo inference via Model Serving  
2. Automated signal ingestion  
3. Join accepted actions to subsequent sell-out  
4. Validate lift with matched-store tests  
5. Rep / manager access policies  
6. Scale beyond Paris  

**Close**

Shelf Optimizer turns Danone’s data advantage into an execution advantage—one store, one action, and one measurable outcome at a time.

---

## 4. Screens (for demo order)

| Order | Route | What to show |
| --- | --- | --- |
| 1 | `/welcome` | Value proposition and Databricks architecture strip |
| 2 | `/map` or `/map?tour=1` | Priority map, KPIs, signal strip, visit queue |
| 3 | `/signals` | Demand families → recommended shelf actions |
| 4 | `/stores/:storeId` photos | Brief, signals, upload/analyze, NBA accept, history |
| 5 | `/stores/:storeId?tab=sandbox` | Drag layout, live €, save simulation |
| 6 | `/revenue` | MAT brand sales, manufacturer share, lift assumptions |
| 7 | `/actions` | Decision log and projected weekly € from accepted NBAs |
