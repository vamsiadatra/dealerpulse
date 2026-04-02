# DealerPulse: Engineering Decisions

## 1. What I Chose to Build & Why
I built a full-stack dashboard featuring a React (Next.js) frontend and a Python (FastAPI) backend. The product is heavily biased toward *actionability*. Rather than simply visualizing total sales, the core feature is the **Bottleneck Engine**—a system that identifies active leads that haven't transitioned stages in over 7 days, allowing branch managers to immediately follow up with underperforming reps.

## 2. Key Product Decisions and Tradeoffs
* **Python API + Next.js UI:** While I could have parsed the JSON entirely on the client, I chose to build a proper FastAPI backend deployed via Vercel Serverless Functions. This separation of concerns creates a solid RESTful architecture that mimics how this app would work in production (where the API would eventually connect to a PostgreSQL database), keeping the frontend lightweight.
* **JavaScript over TypeScript:** To prioritize deployment speed and rapid iteration for the take-home timeline, I opted for clean Javascript.
* **Calculated "Now":** Because the dataset is synthetic, the Python backend dynamically calculates the "current date" based on the maximum `last_activity_at` timestamp to accurately measure stagnant leads without hardcoding dates.

## 3. What I'd Build Next With More Time
* **Logistics Analysis Tab:** I would build a secondary view analyzing the `delay_reason` field to find correlations between specific geographic branches and logistical supply-chain failures.
* **Authentication & RLS:** Implementing Row Level Security so a Branch Manager only sees their branch's pipeline, while the CEO gets the aggregate view.

## 4. Interesting Data Patterns
* A significant bottleneck occurs after the "Test Drive" phase. The data shows leads often sit idle in the "Negotiation" stage for days, indicating sales reps might need better pricing enablement tools or manager intervention to close deals faster.