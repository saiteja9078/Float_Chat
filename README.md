# Multi-Agent Argo Float Query System

An intelligent oceanographic data retrieval system that transforms natural language queries into complex Argo float data analysis through specialized AI agents.

## What It Does

- **Natural Language Queries**: Ask questions like "Compare temperature of floats in Bay of Bengal and Arabian Sea"
- **Geographic Intelligence**: Automatically recognizes ocean regions and applies coordinate boundaries
- **Multi-Parameter Analysis**: Handles temperature, salinity, pressure, dissolved oxygen, and other oceanographic measurements
- **Smart Data Processing**: Converts complex PostgreSQL array data into structured JSON for analysis
- **Interactive Frontend**: Chat interface with real-time data visualization and 3D ocean mapping

## Architecture

**Multi-Agent System:**
- **Decomposition Agent**: Routes queries and determines processing needs
- **Filter Agent**: Applies geographic and parameter filters with domain expertise
- **SQL Agent**: Generates optimized database queries and processes oceanographic arrays

**Tech Stack:**
- Backend: Python, LangGraph, Google Gemini, PostgreSQL, Flask
- Frontend: React, Next.js, Three.js, Recharts
- Data: Global Argo float network (6000+ active floats)

## Setup Instructions

### Prerequisites
```bash
# Required
Python 3.8+
Node.js 16+
PostgreSQL 12+
Google Gemini API Key
```

### 1. Data Setup
```bash
# Download Argo dataset (example floats)
# Data source: Argo Global Data Repository
# ftp://ftp.ifremer.fr/ifremer/argo
# Note: Full dataset is huge,download some float's data and try this out
```

### 2. Usage
```bash
# Access the application
open http://localhost:3000

# Example queries to try:
"Show me floats in the Arabian Sea"
"Compare temperature between Bay of Bengal and Arabian Sea"
"Find the deepest measurements in Indian Ocean"
"Which float has the highest salinity readings?"
```

## Project Structure
```
├── AGENTS_AND_BACKEND/
│   ├── filter_agent.py      # Geographic & parameter filtering
│   ├── sql_agent.py         # Database query generation
│   ├── main_orchestrator.py # Agent coordination
│   ├── app.py              # Flask API server
│   └── requirements.txt
├── FRONTEND/
│   ├── components/         # React components
│   ├── pages/             # Next.js pages
│   ├── utils/             # Utility functions
│   └── package.json
└── README.md
```

## Key Features

**Intelligent Query Processing:**
- Automatic query classification (simple vs. data queries)
- Multi-step query decomposition for complex requests
- Geographic region recognition with coordinate mapping

**Advanced Data Handling:**
- PostgreSQL array processing for oceanographic profiles
- Time-series data structuring and cycle sorting

**Interactive Visualization:**
- 3D globe with float positioning
- Temperature/salinity/pressure profile plotting
- Time-series analysis and comparison charts
- Real-time data exploration interface
  
## Data Sources

- **Argo Global Data Repository**: ftp://ftp.ifremer.fr/ifremer/argo
- **Float Network**: 6000+ active autonomous profiling floats
- **Coverage**: Global ocean measurements since 2000
- **Parameters**: Temperature, salinity, pressure, dissolved oxygen, chlorophyll, pH

## License

MIT License - See LICENSE file for details
