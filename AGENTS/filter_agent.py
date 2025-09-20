import json
import math
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
from langchain.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
import google.generativeai as genai


# Assume the DATA_STRUCTURE description is unchanged and available.
DATA_STRUCTURE = """
Float Data Structure:
{
    "float_id": {
        "platform_number": "string",
        "wmo_inst_type": "string", 
        "project_name": "string",
        "pi_name": "string",
        "data_centre": "string",
        "launch_info": {
            "date": "YYYY-MM-DD",
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
        "pres_max": float, "pres_min": float, "pres_avg": float, (use pres variables when query is something related depth because depth is almost same as pressure)
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
        "status": "string" vals = (active/inactive)"
        "last_updated": "string"
    }
}
"""

class AgentState(BaseModel):
    messages: List[BaseMessage] = []
    float_ids: List[str] = []
    query_processed: bool = False

# Load data from file
with open("struct.json","r") as f:
    FLOAT_DATA = json.load(f)


def load_float_data(data: Dict[str, Any]):
    """Load float data into the system"""
    global FLOAT_DATA
    FLOAT_DATA = data
    print(f"Loaded {len(FLOAT_DATA)} floats into memory")

# --- All tools remain unchanged ---
@tool
def get_all_float_ids() -> List[str]:
    """
    Returns a list of all float IDs in the dataset.
    This is useful as a starting point for exclusion filters.
    """
    return list(FLOAT_DATA.keys())

@tool
def filter_by_coordinates(lat_min: float, lat_max: float, lon_min: float, lon_max: float, k: Union[int, str] = "all") -> List[str]:
    """
    Filter floats by coordinate boundaries.
    
    Args:
        lat_min: Minimum latitude
        lat_max: Maximum latitude  
        lon_min: Minimum longitude
        lon_max: Maximum longitude
        k: Number of results to return ('all' or integer)
    
    Returns:
        List of float IDs within the coordinate boundaries
    """
    print(f"Filtering by coordinates: lat({lat_min}, {lat_max}), lon({lon_min}, {lon_max})")
    matching_floats = []
    
    for float_id, data in FLOAT_DATA.items():
        launch_info = data.get('launch_info', {})
        lat = launch_info.get('latitude')
        lon = launch_info.get('longitude')
        
        if lat is not None and lon is not None:
            if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
                matching_floats.append(float_id)
    
    print(f"Found {len(matching_floats)} matching floats")
    
    if k == "all":
        return matching_floats
    else:
        return matching_floats[:int(k)]

@tool
def filter_by_date_range(start_date: str, end_date: str, k: Union[int, str] = "all") -> List[str]:
    """
    Filter floats by launch date range.
    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        k: Number of results to return ('all' or integer)
    Returns:
        List of float IDs launched within the date range
    """
    print(f"Filtering by date range: {start_date} to {end_date}")
    matching_floats = []
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError as e:
        print(f"Error parsing input date range: {e}")
        return []

    for float_id, data in FLOAT_DATA.items():
        launch_date_str = data.get('launch_info', {}).get('date')
        if launch_date_str:
            clean_date_str = launch_date_str
            if isinstance(launch_date_str, str) and launch_date_str.startswith("b'") and launch_date_str.endswith("'"):
                clean_date_str = launch_date_str[2:-1]

            if len(clean_date_str) == 14 and clean_date_str.isdigit():
                try:
                    launch_dt = datetime.strptime(clean_date_str[:8], "%Y%m%d")
                    if start_dt <= launch_dt <= end_dt:
                        matching_floats.append(float_id)
                except ValueError:
                    continue
            else:
                continue
    print(f"Found {len(matching_floats)} matching floats")
    if k == "all":
        return matching_floats
    else:
        try:
            return matching_floats[:int(k)]
        except (ValueError, TypeError):
            return matching_floats

# REFINED TOOL WITH MINOR BUG FIX
@tool
def filter_by_parameter_value(parameter: str, operator: str, value: float, k: Union[int, str] = "all") -> List[str]:
    """
    Filter floats by parameter values. Accepts general names like 'temperature' or specific names like 'temp_min'.
    If a general name is used (e.g., "temperature > 20"), it matches if ANY of temp_max, temp_min, or temp_avg meet the condition.
    If a specific name is used (e.g., "temp_min > 20"), it ONLY checks that specific field.
    
    Args:
        parameter: General or specific parameter name (e.g., 'temperature', 'temp_min', 'psal_avg')
        operator: Comparison operator ('>', '<', '>=', '<=', '==')
        value: Value to compare against
        k: Number of results to return ('all' or integer)
    
    Returns:
        List of float IDs matching the parameter criteria
    """
    print(f"Filtering by parameter: {parameter} {operator} {value}")
    
    keys_to_check = []
    if parameter.endswith(('_max', '_min', '_avg')):
        keys_to_check.append(parameter)
    else:
        param_key_map = {'temperature': 'temp', 'psal': 'psal', 'pres': 'pres', 'doxy': 'doxy'}
        base_key = param_key_map.get(parameter.lower())
        
        if not base_key:
            keys_to_check.append(parameter)
        else:
            keys_to_check.extend([f"{base_key}_max", f"{base_key}_min", f"{base_key}_avg"])

    matching_floats = []
    
    for float_id, data in FLOAT_DATA.items():
        for key in keys_to_check:
            param_value = data.get(key)
            if param_value is not None and param_value != 0.0:
                match = False
                if operator == '>' and param_value > value: match = True
                elif operator == '<' and param_value < value: match = True
                elif operator == '>=' and param_value >= value: match = True
                elif operator == '<=' and param_value <= value: match = True
                elif (operator == '==' or operator == '=') and param_value == value: match = True
                
                if match:
                    matching_floats.append(float_id)
                    break 
    
    print(f"Found {len(matching_floats)} matching floats")
    
    if k == "all":
        return matching_floats
    else:
        try:
            num_k = int(k)
            return matching_floats[:num_k]
        except (ValueError, TypeError):
            return matching_floats


@tool
def find_extreme_values(parameter: str, extreme_type: str, k: Union[int, str] = "all") -> List[str]:
    """
    Find floats with extreme values (min/max) for a parameter.
    
    Args:
        parameter: Parameter name (e.g., 'temperature', 'psal', 'pres')
        extreme_type: 'min' or 'max'
        k: Number of results to return ('all' or integer)
    
    Returns:
        List of float IDs with extreme values
    """
    print(f"Finding extreme values: {parameter} {extreme_type}")
    param_key_map = {'temperature': 'temp', 'psal': 'psal', 'pres': 'pres', 'doxy': 'doxy'}
    base_key = param_key_map.get(parameter.lower())
    if not base_key:
        print(f"Error: Unknown parameter '{parameter}'")
        return []
    
    param_keys_to_check = [f"{base_key}_max", f"{base_key}_min", f"{base_key}_avg"]
    
    float_values = []
    for float_id, data in FLOAT_DATA.items():
        candidate_values = [data.get(key) for key in param_keys_to_check if data.get(key) is not None and data.get(key) != 0.0]
        if not candidate_values:
            continue

        extreme_value_for_float = max(candidate_values) if extreme_type == 'max' else min(candidate_values)
        float_values.append((float_id, extreme_value_for_float))

    if not float_values: return []
    
    if extreme_type == 'min': float_values.sort(key=lambda x: x[1])
    else: float_values.sort(key=lambda x: x[1], reverse=True)
    
    result_floats = [float_id for float_id, _ in float_values]
    
    if k == "all": return result_floats
    else:
        try: return result_floats[:int(k)]
        except (ValueError, TypeError): return result_floats

@tool
def filter_by_platform_type(platform_type: str, k: Union[int, str] = "all") -> List[str]:
    """
    Filter floats by platform type.
    
    Args:
        platform_type: Platform type (e.g., 'APEX', 'NOVA', 'ARVOR')
        k: Number of results to return ('all' or integer)
    
    Returns:
        List of float IDs with specified platform type
    """
    print(f"Filtering by platform type: {platform_type}")
    matching_floats = []
    
    for float_id, data in FLOAT_DATA.items():
        float_platform_type = data.get('launch_info', {}).get('platform_type', '')
        if platform_type.upper() in float_platform_type.upper():
            matching_floats.append(float_id)
    
    print(f"Found {len(matching_floats)} matching floats")
    
    if k == "all": return matching_floats
    else: return matching_floats[:int(k)]
@tool
def filter_by_negation(filter_type: str, k: Union[int, str] = "all", **kwargs) -> List[str]:
    """
    Excludes floats based on a specified criterion.
    Use this for queries containing 'not', 'outside', 'except', etc.

    Args:
        filter_type: The type of filter to negate ('coordinates', 'date_range', 'platform_type').
        k: Number of results to return ('all' or integer).
        **kwargs: The parameters for the filter to be negated (e.g., lat_min, lat_max, start_date).

    Returns:
        A list of float IDs that DO NOT match the specified criteria.
    """
    print(f"Executing negation filter for type '{filter_type}' with params {kwargs}")
    
    all_float_ids = set(get_all_float_ids.func())
    
    inner_k = kwargs.pop('k', 'all')
    
    floats_to_exclude = []
    # *** THIS IS THE CORRECTED LOGIC ***
    # We check for the keyword 'in' the filter_type string to make it more robust.
    if 'coordinates' in filter_type:
        floats_to_exclude = filter_by_coordinates.func(k=inner_k, **kwargs)
    elif 'date_range' in filter_type:
        floats_to_exclude = filter_by_date_range.func(k=inner_k, **kwargs)
    elif 'platform_type' in filter_type:
        floats_to_exclude = filter_by_platform_type.func(k=inner_k, **kwargs)
    else:
        # Improved error message for better debugging
        return [f"Error: Invalid filter_type '{filter_type}' for negation."]
        
    final_float_ids = list(all_float_ids - set(floats_to_exclude))
    print(f"Result of negation: {len(final_float_ids)} floats")

    if k == "all":
        return final_float_ids
    else:
        try:
            num_k = int(k)
            return final_float_ids[:num_k]
        except (ValueError, TypeError):
            return final_float_ids
@tool
def combine_filters(float_lists: List[List[str]]) -> List[str]:
    """
    Combine multiple filter results using intersection.
    
    Args:
        float_lists: List of float ID lists to intersect
    
    Returns:
        List of float IDs present in all input lists
    """
    if not float_lists: return []
    result = set(float_lists[0])
    for float_list in float_lists[1:]:
        result.intersection_update(set(float_list))
    return list(result)

# Tool list
tools = [
    filter_by_coordinates,
    filter_by_date_range,
    filter_by_parameter_value,
    find_extreme_values,
    filter_by_platform_type,
    combine_filters,
    filter_by_negation,
    get_all_float_ids,
]

# --- Pydantic models for structured query decomposition ---
class SubQuery(BaseModel):
    """Represents a single, executable part of a user's query."""
    label: str = Field(description="A concise, snake_case label for this part of the query (e.g., 'arabian_sea', 'high_pressure_floats').")
    query: str = Field(description="The natural language text for this specific sub-query.")

class QueryDecomposition(BaseModel):
    """A list of sub-queries decomposed from the user's original request."""
    sub_queries: List[SubQuery]

class ArgoFloatAgent:
    def __init__(self, google_api_key: str):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=google_api_key,
            temperature=0
        )
        self.structured_llm = self.llm.with_structured_output(QueryDecomposition)

        self.workflow = StateGraph(AgentState)
        self.workflow.add_node("agent", self.agent_node)
        self.workflow.add_node("action", self.action_node)
        self.workflow.add_edge("agent", "action")
        self.workflow.add_edge("action", END)
        self.workflow.set_entry_point("agent")
        self.app = self.workflow.compile()
    
    # *** UPDATED COMPREHENSIVE PROMPT ***
    def agent_node(self, state: AgentState) -> AgentState:
        """Agent node that processes a user sub-query and determines tools to call"""
        
        system_prompt = f"""
        You are an Argo Float Filter Agent. Your job is to analyze a user query and determine which tools to call.
        You will be given a single, focused query. Convert it into the appropriate tool calls.

        Available tools:
        - filter_by_coordinates(lat_min, lat_max, lon_min, lon_max, k)
        - filter_by_date_range(start_date, end_date, k)
        - filter_by_parameter_value(parameter, operator, value, k)
        - find_extreme_values(parameter, extreme_type, k)
        - filter_by_platform_type(platform_type, k)
        - filter_by_negation(filter_type, k, **kwargs)

        Geographic knowledge:
        - Bay of Bengal: lat_min=5, lat_max=22, lon_min=80, lon_max=95
        - Arabian Sea: lat_min=8, lat_max=25, lon_min=50, lon_max=75
        - Indian Ocean: lat_min=-30, lat_max=30, lon_min=30, lon_max=120
        - If a query only specifies latitude, assume the full longitude range (-180 to 180).
        - If a query only specifies longitude, assume the full latitude range (-90 to 90).

        *** How to Handle Date Range Filters ***
        For queries filtering by a date range, use `filter_by_date_range` with the `start_date` and `end_date` parameters.

        Date Range Example:
        - User Query: "Find floats launched between 2002 and 2020."
        - Correct Tool Call:
        TOOL_CALLS:
        filter_by_date_range: start_date='2002-01-01', end_date='2020-12-31'

        *** How to Handle Simple Parameter Filters ***
        For simple queries filtering by a parameter value, use `filter_by_parameter_value`.

        Filter Example:
        - User Query: "Find floats with temperature greater than 25"
        - Correct Tool Call:
        TOOL_CALLS:
        filter_by_parameter_value: parameter='temperature', operator='>', value=25

        *** How to Handle Negation Queries (NOT, EXCEPT, OUTSIDE) ***
        For any query that involves exclusion, you **MUST USE ONLY** the `filter_by_negation` tool.
        Do not call the standard filter in addition to the negation tool.


        *** How to Handle Combined Queries (AND logic) ***
        If a query requires multiple conditions (e.g., location AND temperature), call the tool for each condition.
        The system will **automatically** combine the results. You **MUST NOT** call `combine_filters` yourself.

        *** How to Handle Extreme Value Queries ***
        For queries asking for 'most', 'least', 'deepest', 'hottest', 'coldest', 'minimum', etc., use `find_extreme_values`.
        - 'deepest' or 'maximum pressure' means `parameter='pres', extreme_type='max'`.
        - 'shallowest' or 'minimum pressure' means `parameter='pres', extreme_type='min'`.
        - 'hottest' or 'most temperature' means `parameter='temperature', extreme_type='max'`.
        - 'coldest' or 'least temperature' means `parameter='temperature', extreme_type='min'`.

        For the user query, determine the appropriate tool calls and respond with ONLY the tool calls in the format:
        TOOL_CALLS:
        [tool_name]: [parameters as comma-separated key=value pairs]
        """
        
        user_query = state.messages[-1].content if state.messages else ""
        prompt = f"{system_prompt}\n\nUser Query: {user_query}\n\nAnalyze the query and provide tool calls:"
        response = self.llm.invoke([HumanMessage(content=prompt)])
        print(f"LLM Response for tool calls: {response.content}")
        state.messages.append(response)
        return state
    
    def action_node(self, state: AgentState) -> AgentState:
        """Execute the tools determined by the agent"""
        last_message = state.messages[-1].content
        try:
            tool_calls = self._parse_tool_calls(last_message)
            print(f"Parsed tool calls: {tool_calls}")
            
            results = []
            for tool_call in tool_calls:
                tool_name = tool_call['tool_name']
                parameters = tool_call['parameters']
                print(f"Executing {tool_name} with {parameters}")
                
                tool_func = next((tool for tool in tools if tool.name == tool_name), None)
                
                if tool_func:
                    if tool_func.name == 'combine_filters':
                        print("Skipping explicit call to combine_filters as it's handled automatically.")
                        continue
                    tool_result = tool_func.func(**parameters)
                    results.append(tool_result)
                    print(f"Tool {tool_name} returned: {len(tool_result)} floats")
            
            if len(results) == 1:
                state.float_ids = results[0]
            elif len(results) > 1:
                print(f"Combining results from {len(results)} tool calls...")
                state.float_ids = combine_filters.func(results)
            else:
                state.float_ids = []
            
            state.query_processed = True
            
        except Exception as e:
            print(f"Error in action_node: {e}")
            import traceback
            traceback.print_exc()
            state.messages.append(AIMessage(content=f"Error processing query: {str(e)}"))
            state.float_ids = []
            state.query_processed = True
        return state
    
    def _parse_tool_calls(self, llm_response: str) -> List[Dict[str, Any]]:
        """Parse tool calls from LLM response with improved parsing"""
        tool_calls = []
        try:
            tool_calls_section = llm_response.split("TOOL_CALLS:")[-1]
            matches = re.findall(r"(\w+):\s*(.*)", tool_calls_section)
            for match in matches:
                tool_name = match[0].strip()
                params_str = match[1].strip()
                parameters = {}
                if params_str:
                    try:
                        param_pairs = re.split(r',\s*(?=\w+=)', params_str)
                        for param_pair in param_pairs:
                            if '=' in param_pair:
                                key, value = param_pair.split('=', 1)
                                key = key.strip()
                                value = value.strip()
                                
                                if value.lower() == 'all': 
                                    parameters[key] = 'all'
                                elif value.lower() in ['true', 'false']: 
                                    parameters[key] = value.lower() == 'true'
                                else:
                                    try:
                                        if '.' in value and not (value.startswith('"') or value.startswith("'")): 
                                            parameters[key] = float(value)
                                        elif value.isdigit() or (value.startswith('-') and value[1:].isdigit()):
                                            parameters[key] = int(value)
                                        else:
                                            parameters[key] = value.strip('"\'')
                                    except ValueError:
                                        parameters[key] = value.strip('"\'')
                        tool_calls.append({'tool_name': tool_name, 'parameters': parameters})
                    except Exception as e:
                        print(f"Could not parse parameters: {params_str}, Error: {e}")
                        continue
        except Exception as e:
            print(f"Error parsing tool calls: {e}")
            import traceback
            traceback.print_exc()
        return tool_calls

    def _execute_sub_query(self, sub_query_text: str) -> List[str]:
        """Helper to run the graph for a single sub-query string."""
        initial_state = AgentState(
            messages=[HumanMessage(content=sub_query_text)],
            float_ids=[],
            query_processed=False
        )
        result_state = self.app.invoke(initial_state)
        return result_state.get("float_ids", [])

    def query(self, user_input: str) -> Dict[str, List[str]]:
        """
        Main method to process user queries.
        It first decomposes the query into sub-queries and then executes each one,
        returning a dictionary of the results.
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


def test_with_actual_data():
    """Test the agent with the newly supported queries."""
    
    API_KEY = "AIzaSyB7zBf20nhqMre20Z0jfpHUU6zuIyPrZgU" # <--- IMPORTANT: PASTE YOUR API KEY HERE
    if API_KEY == "YOUR_GOOGLE_API_KEY":
        print("Please replace 'YOUR_GOOGLE_API_KEY' with your actual Google API key.")
        return

    try:
        agent = ArgoFloatAgent(API_KEY)
        result_filter = agent.query("Find one float in bay of bengal and one float in arabian sea")
        print(json.dumps(result_filter, indent=2))
        
    except FileNotFoundError:
        print("struct.json not found. Please make sure the file exists.")
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_with_actual_data()
