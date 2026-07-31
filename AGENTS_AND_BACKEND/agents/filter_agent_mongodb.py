import json
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from pymongo import MongoClient

# MongoDB connection
MONGO_CLIENT = MongoClient("mongodb://localhost:27017/")
MONGO_DB = MONGO_CLIENT["argo_database"]
MONGO_COLLECTION = MONGO_DB["argo_floats"]

# Data structure description for LLM
DATA_STRUCTURE = """
MongoDB Collection: argo_floats
Document Structure:
{
    "_id": "string (platform_number)",
    "platform_number": "string",
    "wmo_inst_type": "string", 
    "project_name": "string",
    "pi_name": "string",
    "data_centre": "string",
    "launch_info": {
        "date": datetime,
        "latitude": float (-90 to 90),
        "longitude": float (-180 to 180),
        "platform_type": "string",
        "float_serial_no": "string",
        "deployment_platform": "string",
        "deployment_cruise_id": "string"
    },
    "location": "string",
    "temp_max": float, "temp_min": float, "temp_avg": float,
    "psal_max": float, "psal_min": float, "psal_avg": float,
    "pres_max": float, "pres_min": float, "pres_avg": float,
    "doxy_max": float, "doxy_min": float, "doxy_avg": float,
    "fluorescence_chla_max": float, "fluorescence_chla_min": float, "fluorescence_chla_avg": float,
    "bbp700_max": float, "bbp700_min": float, "bbp700_avg": float,
    "nitrate_max": float, "nitrate_min": float, "nitrate_avg": float,
    "ph_max": float, "ph_min": float, "ph_avg": float,
    "turbidity_max": float, "turbidity_min": float, "turbidity_avg": float,
    "cdom_max": float, "cdom_min": float, "cdom_avg": float,
    "technical_info": {
        "battery_type": "string",
        "battery_packs": "string",
        "controller_board_type_primary": "string",
        "firmware_version": "string",
        "sensors": [{"name": "string", "maker": "string", "model": "string", "serial_no": "string"}]
    },
    "cycles": int,
    "launch_quality": "string",
    "data_source": "string",
    "status": "string (active/inactive)",
    "last_updated": datetime
}
"""


class SubQuery(BaseModel):
    """Represents a single, executable part of a user's query."""
    label: str = Field(description="A concise, snake_case label for this part of the query (e.g., 'arabian_sea', 'high_pressure_floats').")
    query: str = Field(description="The natural language text for this specific sub-query.")


class QueryDecomposition(BaseModel):
    """A list of sub-queries decomposed from the user's original request."""
    sub_queries: List[SubQuery]


class MongoQuery(BaseModel):
    """MongoDB query structure"""
    filter: Dict[str, Any] = Field(description="MongoDB filter query (find() filter)")
    limit: Optional[int] = Field(default=None, description="Limit number of results (None for all)")
    sort: Optional[List[tuple]] = Field(default=None, description="Sort criteria as list of (field, direction) tuples, e.g., [('temp_max', -1)]")


class ArgoFloatAgent:
    def __init__(self, google_api_key: str):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=google_api_key,
            temperature=0
        )
        self.structured_llm = self.llm.with_structured_output(QueryDecomposition)
        self.mongo_query_llm = self.llm.with_structured_output(MongoQuery)
        self.collection = MONGO_COLLECTION
    
    def _generate_mongo_query(self, user_query: str) -> Dict[str, Any]:
        """
        Generate MongoDB query from user query using LLM.
        Returns a dictionary with 'filter', 'limit', and 'sort' keys.
        """
        system_prompt = f"""
        You are a MongoDB query generator for Argo Float data. Convert the user's natural language query into a MongoDB query.

        {DATA_STRUCTURE}

        Geographic knowledge:
        - Bay of Bengal: lat_min=5, lat_max=22, lon_min=80, lon_max=95
        - Arabian Sea: lat_min=8, lat_max=25, lon_min=50, lon_max=75
        - Indian Ocean: lat_min=-30, lat_max=30, lon_min=30, lon_max=120
        - When user asks about data not in these regions, use approximate boundaries for the nearest region.
        - If a query only specifies latitude, assume the full longitude range (-180 to 180).
        - If a query only specifies longitude, assume the full latitude range (-90 to 90).

        MongoDB Query Guidelines:
        1. Use proper MongoDB operators: $gt, $gte, $lt, $lte, $eq, $ne, $in, $nin, $and, $or, $not
        2. For nested fields, use dot notation: "launch_info.latitude", "launch_info.date"
        3. For date comparisons, use datetime objects or ISO strings
        4. For coordinate ranges, use $gte and $lte for latitude/longitude
        5. For parameter filters (temperature, salinity, pressure), check temp_max, temp_min, temp_avg (or corresponding _max, _min, _avg)
        6. For "greater than" queries on general parameters, use $or to check any of _max, _min, _avg
        7. For "less than" queries, use $or to check any of _max, _min, _avg
        8. For exact matches, use $eq
        9. For negation (NOT, EXCEPT, OUTSIDE), use $not or $ne
        10. For extreme values (max/min), use sort and limit
        11. For "all" results, set limit to None
        12. For "one" or "first N", set appropriate limit

        Examples:
        
        Query: "Find floats in the Arabian Sea"
        Filter: {{"launch_info.latitude": {{"$gte": 8, "$lte": 25}}, "launch_info.longitude": {{"$gte": 50, "$lte": 75}}}}
        Limit: None
        
        Query: "Find floats with temperature greater than 25"
        Filter: {{"$or": [{{"temp_max": {{"$gt": 25}}}}, {{"temp_min": {{"$gt": 25}}}}, {{"temp_avg": {{"$gt": 25}}}}]}}
        Limit: None
        
        Query: "Find floats launched between 2002 and 2020"
        Filter: {{"launch_info.date": {{"$gte": datetime(2002, 1, 1), "$lte": datetime(2020, 12, 31)}}}}
        Limit: None
        
        Query: "Find the float with maximum pressure"
        Filter: {{"pres_max": {{"$exists": True, "$ne": None}}}}
        Sort: [("pres_max", -1)]
        Limit: 1
        
        Query: "Find one float from Bay of Bengal"
        Filter: {{"launch_info.latitude": {{"$gte": 5, "$lte": 22}}, "launch_info.longitude": {{"$gte": 80, "$lte": 95}}}}
        Limit: 1
        
        Query: "Find floats NOT in Indian Ocean"
        Filter: {{"location": {{"$ne": "Indian Ocean"}}}}
        Limit: None

        Now generate a MongoDB query for the following user query:
        User Query: "{user_query}"
        
        Return the query as a JSON object with "filter", "limit", and "sort" keys.
        For dates, use ISO format strings like "2002-01-01T00:00:00" which will be converted to datetime.
        """
        
        try:
            result = self.mongo_query_llm.invoke(system_prompt)
            return {
                "filter": result.filter,
                "limit": result.limit,
                "sort": result.sort
            }
        except Exception as e:
            print(f"Error generating MongoDB query: {e}")
            # Fallback: generate a simple query
            return {"filter": {}, "limit": None, "sort": None}
    
    def _convert_date_strings(self, query_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recursively convert date strings in the query to datetime objects.
        Handles ISO format strings and YYYY-MM-DD format.
        """
        if isinstance(query_dict, dict):
            result = {}
            for key, value in query_dict.items():
                if isinstance(value, dict):
                    # Check if this is a date comparison operator
                    if any(op in value for op in ['$gte', '$lte', '$gt', '$lt', '$eq']):
                        converted_value = {}
                        for op, op_value in value.items():
                            if isinstance(op_value, str):
                                # Try to parse as datetime
                                try:
                                    # Try ISO format first
                                    if 'T' in op_value:
                                        converted_value[op] = datetime.fromisoformat(op_value.replace('Z', '+00:00'))
                                    else:
                                        # Try YYYY-MM-DD format
                                        converted_value[op] = datetime.strptime(op_value, "%Y-%m-%d")
                                except:
                                    converted_value[op] = op_value
                            else:
                                converted_value[op] = op_value
                        result[key] = converted_value
                    else:
                        result[key] = self._convert_date_strings(value)
                elif isinstance(value, list):
                    result[key] = [self._convert_date_strings(item) if isinstance(item, dict) else item for item in value]
                else:
                    result[key] = value
            return result
        return query_dict
    
    def _execute_mongo_query(self, query_dict: Dict[str, Any]) -> List[str]:
        """
        Execute MongoDB query and return list of float IDs.
        """
        try:
            # Convert date strings to datetime objects
            filter_query = self._convert_date_strings(query_dict.get("filter", {}))
            limit = query_dict.get("limit")
            sort_criteria = query_dict.get("sort")
            
            print(f"Executing MongoDB query: filter={filter_query}, limit={limit}, sort={sort_criteria}")
            
            # Build query
            cursor = self.collection.find(filter_query)
            
            # Apply sort if specified
            if sort_criteria:
                # Convert list of tuples to list of tuples for pymongo
                sort_list = [(field, direction) for field, direction in sort_criteria]
                cursor = cursor.sort(sort_list)
            
            # Apply limit if specified
            if limit is not None:
                cursor = cursor.limit(limit)
            
            # Execute and extract float IDs
            results = list(cursor)
            float_ids = [str(doc.get("_id", "")) for doc in results if doc.get("_id")]
            
            print(f"Found {len(float_ids)} floats: {float_ids[:5]}...")
            return float_ids
            
        except Exception as e:
            print(f"Error executing MongoDB query: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _execute_sub_query(self, sub_query_text: str) -> List[str]:
        """Execute a single sub-query and return float IDs."""
        print(f"Processing sub-query: {sub_query_text}")
        
        # Generate MongoDB query from natural language
        mongo_query = self._generate_mongo_query(sub_query_text)
        
        # Execute the query
        float_ids = self._execute_mongo_query(mongo_query)
        
        return float_ids
    
    def query(self, user_input: str) -> Dict[str, List[str]]:
        """
        Main method to process user queries.
        It first decomposes the query into sub-queries and then executes each one,
        returning a dictionary of the results.
        Same interface as the original filter_agent.
        """
        decomposition_prompt = f"""
        Decompose the user's query into one or more distinct sub-queries.
        If the query contains 'or', commas, or asks for multiple distinct things, create a separate sub-query for each part.
        For single complex queries with 'and' conditions, treat it as one sub-query.
        For each sub-query, create a concise, snake_case label.

        Example 1 (OR condition):
        User Query: "Find floats in the Arabian Sea or the Bay of Bengal"
        Result:
        [
            {{ "label": "arabian_sea", "query": "Find floats in the Arabian Sea" }},
            {{ "label": "bay_of_bengal", "query": "Find floats in the Bay of Bengal" }}
        ]
        Example 2 (AND condition):
        User Query: "Get floats in Bay of Bengal that have minimum temperature above 20."
        Result:
        [
            {{ "label": "bay_of_bengal_high_min_temp", "query": "Get floats in Bay of Bengal that have minimum temperature above 20." }}
        ]
        
        Example 3 (Multiple comma-separated requests):
        User Query: "List any one float from the Arabian Sea, and one from the Bay of Bengal."
        Result:
        [
            {{ "label": "one_arabian_sea_float", "query": "List any one float from the Arabian Sea" }},
            {{ "label": "one_bay_of_bengal_float", "query": "List one float from the Bay of Bengal" }}
        ]
        Now, decompose the following query:
        User Query: "{user_input}"
        """

        print(f"--- Decomposing Query: {user_input} ---")
        decomposed_result = self.structured_llm.invoke(decomposition_prompt)
        
        final_results = {}

        for sub_q in decomposed_result.sub_queries:
            print(f"\n--- Executing Sub-Query '{sub_q.label}': {sub_q.query} ---")
            float_ids = self._execute_sub_query(sub_q.query)
            final_results[sub_q.label] = float_ids
            print(f"--- Finished Sub-Query '{sub_q.label}', Found {len(float_ids)} floats ---")
        
        return final_results