# Float Chat - 3D Oceanographic Data Visualization & Chat Agent
[**Click**](https://www.linkedin.com/posts/sai-teja-00aa50289_agents-ai-agentai-ugcPost-7377784651966373889-INw3) for demo.

Float Chat is an AI-powered conversational system and interactive visualization tool for oceanographic data collected by **ARGO Floats**. The project features a split-panel interface: a natural language chat assistant on the left, and a fully interactive 3D WebGL Globe showing float locations, trajectories, and parameters on the right.

---

## 🏗️ Project Architecture

<img width="794" height="570" alt="Screenshot 2026-07-31 at 9 52 59 PM" src="https://github.com/user-attachments/assets/69786a74-7b1c-4815-8657-c763c593d589" />


### 1. Frontend (`frontend/`)
- Built using **Next.js** (App Router), **TypeScript**, and **Tailwind CSS**.
- **3D Globe Visualization**: Employs `react-globe.gl` and `three.js` to render the globe, draw float positions, map historical trajectories, and color-code floats by status (Active, Recent, BGC equipped).
- **Interactive Chat**: Allows sending free-form questions and streams the agent's thinking steps alongside responses.

### 2. Python Backend (`AGENTS_AND_BACKEND/`)
Organized as a modular multi-agent workflow:
- **API Entrypoint (`api/api.py`)**: Flask server serving `/query-float` endpoint. Streams agent reasoning and data results back to the client as newline-delimited JSON (NDJSON).
- **Orchestration Agent (`agents/Main_Agent.py`)**: A LangGraph state machine that handles:
  1. Relevance checks.
  2. Query decomposition.
  3. Orchestrating the retrieval loop (invoking the Filter and SQL agents).
  4. Formulating the final response.
- **Filter Agent (`agents/filter_agent_mongodb.py`)**: Formulates exact MongoDB queries from natural language queries to identify which Float IDs match metadata constraints (e.g., geographic coordinates, time range, sensor types, general boundaries).
- **SQL Agent (`agents/sql_agent.py`)**: Translates natural language requests and the filtered Float IDs into precise SQL queries to extract detailed measurements (temperature, salinity, pressure, BGC indicators) from PostgreSQL.
- **Databases**:
  - **MongoDB** (`argo_database.argo_floats`): Stores high-level float metadata, status, launch coordinates, and sensor inventories.
  - **PostgreSQL** (`argo_db.argo_profiles`): Stores deep multi-depth profile arrays for variables (temperature, salinity, pressure, dissolved oxygen, chlorophyll, backscattering) matching each cycle.

---

## 📂 Codebase Reorganization

The project structure has been refactored for modularity:

```text
floatchat/
├── .gitignore                      # Git exclusion rules (OS, Next.js, Python envs, logs, zip files)
├── README.md                       # Overall project documentation (this file)
├── frontend/                       # Frontend application (Next.js)
│   ├── app/                        # Pages & global styling
│   ├── components/                 # React and 3D globe visualization components
│   ├── lib/                        # Client state context and utilities
│   ├── pnpm-lock.yaml              # Lockfile for pnpm package manager
│   ├── package.json                # Frontend package dependencies
│   └── README.md                   # Frontend setup & usage instructions
└── AGENTS_AND_BACKEND/             # Backend services & agent engine (Python)
    ├── .env                        # Local secret keys (Google Gemini, DB connection settings)
    ├── .env.example                # Configuration template
    ├── requirements.txt            # Python dependencies (pymongo, psycopg2, langchain, etc.)
    ├── api/
    │   └── api.py                  # Flask REST API server (port 5001)
    ├── agents/
    │   ├── Main_Agent.py           # LangGraph master coordinator agent
    │   ├── filter_agent_mongodb.py # MongoDB structured query generator
    │   ├── filter_agent.py         # File-based filter agent fallback
    │   ├── sql_agent.py            # PostgreSQL query generator
    │   └── sort_json.py            # Numeric cycle sorting helpers
    ├── db/
    │   ├── mongodb.py              # MongoDB upsert and cleaning script
    │   ├── sql_setup.py            # PostgreSQL database creation and NetCDF processing
    │   └── chat_memory.py          # Session-based token-managed message cache
    └── data/
        ├── meta_data.json          # Raw float metadata payload
        └── results.json            # Cached result sets
```

---

## 💡 Design Decision: MongoDB Filtering vs. RAG

A core design choice in this application is the use of **MongoDB structured query generation** for metadata filtering rather than **RAG (Retrieval-Augmented Generation)** with vector database search.

### Why RAG was Rejected for Float Metadata
1. **Fuzzy Semantics vs. Exact Numerical Ranges**: 
   - Oceanographic queries are highly quantitative (e.g., *"Find floats in the Arabian Sea between 10°N-20°N latitude"* or *"Find floats with temperature > 25°C"*).
   - RAG relies on vector similarity (cosine distance on embeddings), which measures semantic closeness in language. It has no mathematical understanding of numbers, ranges, inequalities, or logical coordinates.
2. **Deterministic Filters**:
   - Storing structured metadata as text chunks and vectorizing it results in non-deterministic results. Important floats might be missing from the top-k similarity results.
   - Database operations (like sorting by maximum pressure, grouping, or matching array sensors) cannot be reliably executed using vector database retrieval.
3. **Structured vs. Unstructured Data**:
   - The metadata for ARGO floats is highly structured (serial numbers, dates, lists of nested sensors, coordinate limits). Storing this structure in a document database (MongoDB) is the correct paradigm.

### How the MongoDB Filtering Agent Works
Instead of search matching, the **Filter Agent** uses a structured LLM (`gemini-2.5-flash`) to parse natural language constraints and translate them directly into **MongoDB queries**:
- It translates *"Arabian Sea"* into `{"launch_info.latitude": {"$gte": 8, "$lte": 25}, "launch_info.longitude": {"$gte": 50, "$lte": 75}}`.
- It translates *"temperature greater than 25"* into `{"$or": [{"temp_max": {"$gt": 25}}, {"temp_min": {"$gt": 25}}, {"temp_avg": {"$gt": 25}}]}`.
- It translates *"NOT in Indian Ocean"* into `{"location": {"$ne": "Indian Ocean"}}`.

This ensures **100% precision, deterministic matching, and full database query expressiveness**.

---

## 🚀 Running the Application

### 1. Run the Python Backend
1. Navigate to the backend directory:
   ```bash
   cd AGENTS_AND_BACKEND
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template and set your API keys:
   ```bash
   cp .env.example .env
   # Open .env and add your Gemini keys (e.g. MAIN_AGENT_API_KEY)
   ```
5. Run the Flask server:
   ```bash
   python api/api.py
   ```
   The backend will start on `http://localhost:5001`.

### 2. Run the Next.js Frontend
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the packages using `pnpm`:
   ```bash
   pnpm install
   ```
3. Start the dev server:
   ```bash
   pnpm dev
   ```
   The site will load on `http://localhost:3000`. Open it in your browser to start querying the floats!
