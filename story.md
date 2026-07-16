The Story Behind FloatChat

Oceanographic data is a mess to work with. Argo floats 6000+ autonomous robots drifting through our oceans generate rich profiles of temperature, salinity, and pressure, but actually querying that data means wrestling with NetCDF files, PostgreSQL arrays, and geographic boundaries that live only in an oceanographer's head. We wanted to ask questions in plain English "Compare temperature in Bay of Bengal and Arabian Sea" and just get an answer.

So we built a multi-agent pipeline. A Decomposition Agent figures out what you're actually asking and breaks complex queries into steps. A Filter Agent brings domain expertise knowing that "Arabian Sea" maps to specific lat/long boundaries, that "deepest" means sorting by pressure. A SQL Agent turns that into optimized queries and unpacks messy PostgreSQL arrays into clean JSON. On top of that sits a chat interface with a 3D globe and live charts, so results aren't just numbers they're something you can actually see.

With another 10 hours, we'd focus on three things: ingesting the full global Argo dataset instead of a handful of sample floats, adding a caching/validation layer so the SQL Agent double-checks its own queries before hitting the database, and building out comparative visualizations (side-by-side profile plots, anomaly detection across regions) since right now the frontend renders single-query results better than multi-region comparisons.

What we cut: real-time data ingestion from the live Argo FTP feed, user authentication, and support for additional parameters like dissolved oxygen and chlorophyll beyond temperature/salinity/pressure. We also skipped a proper eval framework for the agents right now correctness is checked by hand, which doesn't scale.

It's rough at the edges, but it proves the core idea: natural language can replace a PhD in oceanographic data wrangling.
