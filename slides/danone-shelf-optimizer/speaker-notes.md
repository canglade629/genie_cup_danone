# Danone Shelf Optimizer speaker notes

Target duration: 10 minutes.

## Slide 1 — Turn every shelf photo into a commercial action

**Time: 45 seconds**

Retail execution data often explains what happened, but it does not always tell a representative where to go next or what to do when they arrive. Shelf Optimizer combines sell-out, share of shelf, compliance, local demand, and a shelf image in one workflow. The output is a specific store action with a weekly euro value.

## Slide 2 — Shelf execution gaps hide recoverable revenue

**Time: 1 minute**

The business opportunity extends beyond compliance. Danone needs to improve availability, protect premium visibility, and verify trade-spend execution. Field teams have limited time and must currently reconcile multiple sources. The app supports the representative and retailer conversation; it does not replace either.

## Slide 3 — Move from fragmented signals to a measurable store action

**Time: 1 minute**

The differentiator is the closed workflow. First, identify the store where value is recoverable. Second, diagnose the shelf. Third, simulate a better planogram and quantify its impact. Finally, record the decision so management can measure follow-through and later compare projected value with realized sell-out.

## Slide 4 — Spend field time where revenue is most recoverable

**Time: 1 minute**

The Paris map turns stores into a ranked visit queue. Each briefing combines Danone share of shelf, compliance, weekly dairy sales, execution risk, and local signals. The current app consumes a priority score that is precomputed in the governed data layer; it does not calculate the score in the user interface.

## Slide 5 — Local context becomes a specific shelf action

**Time: 1 minute**

POS data is backward-looking. Fitness activity, events, weather, mobility, search, workplace patterns, tourism, basket affinities, and competitive promotions add local context. Signals are not treated as standalone rules. They complement sales and shelf evidence to suggest a relevant assortment, availability, or placement action.

## Slide 6 — Observe the shelf, then test the better outcome

**Time: 1 minute 30 seconds**

A representative captures or selects a shelf image. The application sends the compressed image to a Databricks serving endpoint backed by Llama 4 Maverick. The model identifies brand blocks and empty gaps. Application logic derives share of shelf, OOS, placement, and promotional alerts, then proposes the next-best action.

The representative can reproduce the shelf in the virtual planogram, move products through eye, mid, and low zones, fill empty facings, and save the scenario.

Accuracy caveat: the current multimodal model provides brand-block analysis. A specialized or fine-tuned detector remains the production path for pixel-precise annotations.

## Slide 7 — Translate execution into weekly value

**Time: 1 minute 15 seconds**

The app separates the value into availability, eye-level placement, promotional compliance, and cross-merchandising. As the virtual shelf changes, the projected weekly euro impact changes. This gives the representative a commercial case rather than a visual preference.

The 2–4% and 10–15% ranges are prototype business assumptions. They should be calibrated using matched-store tests and subsequent POS outcomes before being presented as realized incremental revenue.

## Slide 8 — Each accepted action becomes evidence

**Time: 1 minute**

The workflow creates a durable record. Unity Catalog governs sample shelf scenes. Lakebase stores photos, accepted recommendations, simulations, timestamps, and expected lift. Genie gives business users a natural-language route into stores, signals, and planograms. The AI/BI dashboard provides a management view.

The final feedback step is to join accepted actions to subsequent sell-out so the lift model can learn from actual outcomes.

## Slide 9 — One Databricks platform

**Time: 1 minute 15 seconds**

The architecture keeps the whole workflow on Databricks:

- Lakeflow builds the synthetic pilot data products.
- Delta Lake and Unity Catalog provide the governed analytical foundation.
- The SQL Warehouse serves typed application queries.
- The Foundation Model API endpoint performs multimodal shelf analysis.
- Databricks Apps and AppKit deliver the field experience.
- Genie answers natural-language business questions.
- Lakebase records low-latency operational decisions.
- A Unity Catalog Volume governs shelf images.
- The AI/BI dashboard supports management reporting.

Resources and permissions are declared through the Databricks Asset Bundle.

## Slide 10 — Turn data advantage into execution advantage

**Time: 1 minute 15 seconds**

The Paris pilot should prove three things: representatives choose higher-value visits, recommendations change shelf execution, and those changes produce measurable sell-out lift.

Next:

1. Validate brand-detection quality on representative store imagery.
2. Automate the external signal feeds.
3. Join accepted actions to subsequent sell-out.
4. Calibrate lift through controlled-store experiments.
5. Add production persona and access policies.
6. Scale beyond the Paris pilot.

Close with: “One store, one action, one measurable outcome.”
