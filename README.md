# 🏎️ DealerPulse: Enterprise Sales Command Center

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**DealerPulse** is a full-stack, prescriptive analytics platform designed for automotive dealerships. It transforms raw sales pipeline data into actionable executive insights, helping leaders minimize capital risk, prevent rep burnout, and eliminate sales bottlenecks.

🔴 **[View Live Demo Here](https://dealerpulse-ebon.vercel.app/)** ---

## ✨ Key Features

* **🧠 Zero-Latency Heuristic "AI" Engine:** A Python/FastAPI backend that calculates deterministic Deal Health Scores (0-100) and prescribes plain-English "Next Best Actions" without relying on slow or expensive external LLM APIs.
* **💼 Executive Boardroom Mode:** A dedicated, distraction-free presentation UI triggered by a single click (or the `ESC` key) optimized for projector screens and investor meetings.
* **📊 Advanced Operational Diagnostics:** Tracks CEO-level KPIs including **Capital at Risk** (monetizing pipeline bottlenecks), **Sales Velocity** (average days to close), and a **Rep Capacity Index** that flags reps juggling too many active deals.
* **🎯 Contextual Quota Pacing:** Decoupled target tracking that calculates historical quarterly pacing independently of global time filters.
* **⚡ Enterprise UI & Fluidity:** Features a `table-fixed` DOM architecture to prevent layout shifts, and a dynamic currency formatting engine that automatically scales metrics between Lakhs (₹) and Crores (₹) for immediate readability.

---

## 🛠️ Tech Stack

**Frontend (Client-Side Aggregation & UI):**
* React.js / Next.js
* Tailwind CSS (Styling & Responsive Layouts)
* Recharts (Zero-dependency SVG Data Visualization)
* Lucide React (Iconography)

**Backend (Data Synthesis & Heuristic Logic):**
* Python 3
* FastAPI
* Uvicorn 