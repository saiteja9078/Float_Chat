# Float Chat - ARGO Float 3D Oceanographic Data Visualization & AI Assistant

Float Chat is a comprehensive full-stack application that provides an interactive 3D globe visualization of oceanographic data (ARGO floats) combined with an intelligent AI chat interface. Users can query, explore, and visualize complex oceanographic information using natural language.

The project is divided into two main components:
1. **Frontend**: A Next.js web application featuring an interactive 3D globe and a chat UI.
2. **Backend (Agents & API)**: A Flask-based Python backend running a LangGraph-orchestrated multi-agent system powered by Gemini 2.5 Flash, which parses natural language into database filters and SQL queries.

## Architecture

- **Frontend (`/FRONTEND`)**: Built with Next.js, Tailwind CSS, and `react-globe.gl`. It communicates with the backend via the `/query-float` API endpoint.
- **Backend & Agents (`/AGENTS_AND_BACKEND`)**: Built with Flask and LangGraph. It uses a graph-based agentic workflow:
  - **Relevance Checker**: Classifies if the query is related to Argo floats and whether it needs dataset access.
  - **Query Decomposer**: Breaks down the natural language query into instructions for the specialized sub-agents.
  - **Filter Agent**: Identifies and filters relevant float IDs based on geographical, temporal, or parameter-specific criteria.
  - **SQL Agent**: Generates and executes SQL queries to retrieve specific float data (temperature, salinity, depth, etc.) and formats the result as JSON.

## Features

- **Interactive 3D Globe**: Built-in 3D visualization of the Earth with interactive ARGO floats, country borders, and geographic labels.
- **AI Chat Interface**: Talk to the AI to query complex ARGO float datasets using natural language (e.g., "Show salinity profiles near the equator in 2023").
- **Multi-Agent Workflow**: A LangGraph system dynamically breaks down queries, searches data, executes SQL, and retrieves relevant results.
- **Real-time Updates**: The Flask backend streams the AI's "thinking" steps back to the frontend, providing visibility into the agent's decision-making process.

## Prerequisites

- **Node.js**: v18 or higher (for the frontend).
- **Python**: v3.9 or higher (for the backend).
- **API Keys**: Google Gemini API keys are required for the agent system.

## Setup Instructions

### 1. Backend Setup (`/AGENTS_AND_BACKEND`)

1. Navigate to the backend directory:
   ```bash
   cd AGENTS_AND_BACKEND
   ```

2. Create and activate a Python virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```
   *Ensure you provide the `MAIN_AGENT_API_KEY` and `FILTER_AGENT_API_KEY` variables.*

5. Start the Flask API server:
   ```bash
   python api.py
   ```
   The backend will start running on `http://localhost:5001`.

### 2. Frontend Setup (`/FRONTEND`)

1. Navigate to the frontend directory:
   ```bash
   cd FRONTEND
   ```

2. Install the Node.js dependencies:
   ```bash
   npm install
   # or yarn install / pnpm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to `http://localhost:3000`.

## Project Structure

```text
Float_Chat/
├── AGENTS_AND_BACKEND/      # Python backend and AI Agent logic
│   ├── Main_Agent.py        # LangGraph workflow orchestrator
│   ├── api.py               # Flask API server
│   ├── filter_agent.py      # Sub-agent for filtering float data
│   ├── sql_agent.py         # Sub-agent for generating and executing SQL queries
│   ├── chat_memory.py       # Manages conversation history context
│   └── requirements.txt     # Python dependencies
└── FRONTEND/                # Next.js frontend application
    ├── app/                 # Next.js app router and pages
    ├── components/          # React components (Globe, Chat UI)
    ├── package.json         # Node.js dependencies
    └── README.md            # Frontend-specific documentation
```
