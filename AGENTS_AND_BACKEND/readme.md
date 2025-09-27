# Argo Float Agent API

A Flask-based API for querying Argo oceanographic float data using AI agents powered by Google's Generative AI.

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Configuration
Open the `.env` file in the project root and add your Google AI API key:

```env
GOOGLE_API_KEY=your_google_api_key_here
```

**To get your Google AI API key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy and paste it into your `.env` file

### 3. Database Setup
Ensure your PostgreSQL database is running and accessible. Update database connection parameters in your configuration files as needed.

## Running the API

Start the Flask development server:
```bash
python api.py
```

The API will be available at `http://localhost:5000`
