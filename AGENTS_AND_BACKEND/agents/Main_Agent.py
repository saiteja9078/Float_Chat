import sys
import os

# Add db directory to lookup paths
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
sys.path.append(os.path.join(parent_dir, "db"))

import json
from dotenv import load_dotenv
from filter_agent import ArgoFloatAgent
from sql_agent import run_agent
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Literal
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from sort_json import sort_cycles_in_floats
from chat_memory import chat_memory



# Load environment variables from .env file
load_dotenv()

class State(TypedDict):
    user_query: str
    dec_queries: List[str]
    data: dict
    response: str
    decision: str
    session_id: str  # For managing multiple conversation sessions
    thinking_steps: List[dict]  # For tracking thinking steps

# Load API keys from environment variables
MAIN_AGENT_API_KEY = os.getenv("MAIN_AGENT_API_KEY")
FILTER_AGENT_API_KEY = os.getenv("FILTER_AGENT_API_KEY")

if not MAIN_AGENT_API_KEY:
    raise ValueError("MAIN_AGENT_API_KEY not found in environment variables. Please check your .env file.")
if not FILTER_AGENT_API_KEY:
    raise ValueError("FILTER_AGENT_API_KEY not found in environment variables. Please check your .env file.")

# Initialize model with main agent API key
model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    api_key=MAIN_AGENT_API_KEY
)


class Decomposed_Queries(BaseModel):
    for_filter_agent: str = Field(description="This variable is for Filter Agent.")
    for_sql_agent: str = Field(description="This is for SQL Agent.")
class RelevanceCheck(BaseModel):
    category: Literal["irrelevant", "simple", "data"] = Field(
        description=(
            "irrelevant = not related to Argo floats\n"
            "simple = related to Argo floats but can be answered without SQL or filters\n"
            "data = requires SQL/filter agent to fetch actual float data"
        )
    )
    response: str = Field(
        description="If category is 'irrelevant' or 'simple', provide the response directly. "
                    "If 'data', leave this empty."
    )


def check_relevance(state: State, thinking_queue=None) -> State:
    # Get chat history for context
    session_id = state.get("session_id", "default")
    chat_history = chat_memory.get_history_text(session_id)
    
    history_context = ""
    if chat_history:
        history_context = f"\n\nPrevious conversation:\n{chat_history}\n"
    
    thinking_steps = state.get("thinking_steps", [])
    
    step_update = {
        "step": "relevance_check",
        "status": "in_progress",
        "title": "Checking Relevance",
        "description": "Analyzing query to determine if it relates to ARGO floats"
    }
    thinking_steps.append(step_update)
    
    if thinking_queue:
        thinking_queue.put({
            "type": "thinking",
            "step": step_update,
            "all_steps": thinking_steps
        })
    
    relevance_prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Classify the query into one of three categories:\n"
                "- irrelevant: Not related to Argo floats\n"
                "- simple: Related to Argo floats but answerable without querying the dataset\n"
                "- data: Needs dataset access (filter agent + SQL)\n\n"
                "Examples of simple queries:\n"
                "- 'What are Argo floats?'\n"
                "- 'How do floats measure salinity?'\n"
                "- 'Which parameters do Argo floats collect?'\n\n"
                "Examples of data queries:\n"
                "- 'Show me temperature of float 1902677 in 2020'\n"
                "- 'Compare salinity between floats in Bay of Bengal and Arabian Sea'\n\n"
                "{history_context}"
                "User Query: {query}"
            )
        ]
    )
    prompt = relevance_prompt.format(
        query=state["user_query"],
        history_context=history_context
    )
    relevance_result = model.with_structured_output(RelevanceCheck).invoke(prompt)
    
    thinking_steps[-1]["status"] = "completed"
    thinking_steps[-1]["result"] = relevance_result.category
    
    if thinking_queue:
        thinking_queue.put({
            "type": "thinking",
            "step": thinking_steps[-1],
            "all_steps": thinking_steps
        })

    if relevance_result.category == "irrelevant":
        return {
            **state,
            "decision": "yes",
            "response": relevance_result.response,
            "thinking_steps": thinking_steps
        }
    elif relevance_result.category == "simple":
        return {
            **state,
            "decision": "yes",
            "response": relevance_result.response,
            "thinking_steps": thinking_steps
        }

    return {**state, "thinking_steps": thinking_steps}


def decompose_query(state: State, thinking_queue=None) -> State:
    if state.get("decision") == "yes":
        return state
    
    session_id = state.get("session_id", "default")
    chat_history = chat_memory.get_history_text(session_id)
    
    history_context = ""
    if chat_history:
        history_context = f"\n\nPrevious conversation:\n{chat_history}\n"
    
    thinking_steps = state.get("thinking_steps", [])
    
    step_update = {
        "step": "decompose",
        "status": "in_progress",
        "title": "Decomposing Query",
        "description": "Breaking down query into Filter Agent and SQL Agent instructions"
    }
    thinking_steps.append(step_update)
    
    if thinking_queue:
        thinking_queue.put({
            "type": "thinking",
            "step": step_update,
            "all_steps": thinking_steps
        })
        
    promts = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are coordinating two specialized agents:\n"
                "1. Filter Agent: Responsible for filtering float IDs based on geolocation/year or any attribute, "
                "highest/lowest attribute values, or any other user-specified criteria.\n"
                "2. SQL Agent: Responsible for taking the filtered float IDs, converting natural language "
                "requests into SQL queries, retrieving the data, and returning it as a JSON file.\n\n"
                "Your task is to decompose the user's query into two parts:\n"
                "- for_filter_agent: Instructions specifically for the Filter Agent.\n"
                "- for_sql_agent: Instructions specifically for the SQL Agent.\n\n"
                "{history_context}"
                "User Query: {query}"
            )
        ]
    )
    prompt = promts.format(
        query=state["user_query"],
        history_context=history_context
    )
    response = model.with_structured_output(Decomposed_Queries).invoke(prompt)
    
    thinking_steps[-1]["status"] = "completed"
    thinking_steps[-1]["details"] = {
        "filter_instruction": response.for_filter_agent,
        "sql_instruction": response.for_sql_agent
    }
    
    if thinking_queue:
        thinking_queue.put({
            "type": "thinking",
            "step": thinking_steps[-1],
            "all_steps": thinking_steps
        })
    
    return {
        **state,
        "dec_queries": [response.for_filter_agent, response.for_sql_agent],
        "thinking_steps": thinking_steps
    }


def execute_queries(state: State, thinking_queue=None) -> State:
    if state.get("decision") == "yes":
        return state
    
    session_id = state.get("session_id", "default")
    chat_history = chat_memory.get_history_text(session_id)
    
    history_context = ""
    if chat_history:
        history_context = f"\n\nPrevious conversation:\n{chat_history}\n"
    
    thinking_steps = state.get("thinking_steps", [])
    
    step_update = {
        "step": "filter_agent",
        "status": "in_progress",
        "title": "Executing Filter Agent",
        "description": "Finding relevant ARGO floats based on criteria"
    }
    thinking_steps.append(step_update)
    
    if thinking_queue:
        thinking_queue.put({
            "type": "thinking",
            "step": step_update,
            "all_steps": thinking_steps
        })
        
    argo_agent = ArgoFloatAgent(FILTER_AGENT_API_KEY)
    filtered = argo_agent.query(state["dec_queries"][0])
    
    floats_found = 0
    sample_ids = []
    
    if isinstance(filtered, dict):
        for key, value in filtered.items():
            if isinstance(value, list):
                sample_ids.extend(value[:3])
                floats_found += len(value)
    elif isinstance(filtered, list):
        sample_ids = filtered[:3]
        floats_found = len(filtered)
    
    thinking_steps[-1]["status"] = "completed"
    thinking_steps[-1]["result"] = {
        "floats_found": floats_found,
        "sample_ids": sample_ids
    }
    
    if thinking_queue:
        thinking_queue.put({
            "type": "thinking",
            "step": thinking_steps[-1],
            "all_steps": thinking_steps
        })

    decision_prompt = f"{state['user_query']}\nFloat IDs: {json.dumps(filtered)}"
    decision = model.with_structured_output(OutPut).invoke(decision_prompt)
    
    if decision.decision.lower() == "yes":
        return {
            **state,
            "response": decision.response,
            "decision": decision.decision,
            "thinking_steps": thinking_steps
        }

    step_update = {
        "step": "sql_agent",
        "status": "in_progress",
        "title": "Executing SQL Agent",
        "description": "Fetching and processing data from database"
    }
    thinking_steps.append(step_update)
    
    if thinking_queue:
        thinking_queue.put({
            "type": "thinking",
            "step": step_update,
            "all_steps": thinking_steps
        })
    
    results = run_agent(state["dec_queries"][1], filtered)
    results = sort_cycles_in_floats(results)
    
    data_count = 0
    float_count = 0
    if isinstance(results, dict):
        for key, value in results.items():
            if isinstance(value, list):
                data_count += len(value)
                float_count += len(value)
    elif isinstance(results, list):
        data_count = len(results)
        float_count = len(results)
    
    thinking_steps[-1]["status"] = "completed"
    thinking_steps[-1]["result"] = {
        "data_points": data_count,
        "float_count": float_count
    }
    
    if thinking_queue:
        thinking_queue.put({
            "type": "thinking",
            "step": thinking_steps[-1],
            "all_steps": thinking_steps
        })
    
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "results.json")

    with open(json_path, "w") as f:
        json.dump(results, f, indent=2, default=str)

    return {
        **state,
        "data": results,
        "decision": decision.decision,
        "response": decision.response,
        "thinking_steps": thinking_steps
    }


class OutPut(BaseModel):
    decision: Literal["yes", "no"] = Field(
        description=(
            "According to the user's query decide whether he wants to see only the float IDs "
            "or the actual data. "
            "'yes' = only float IDs, 'no' = fetch data with SQL." 
        )
    )
    response: str = Field(
        description="If decision is 'yes', provide the float IDs here in a user-friendly format.If decision is 'no' provide a simple explaination of something like heres time series and depth related plots provide this response based on users query"
    )

def build_graph():
    workflow = StateGraph(State)
    workflow.add_node("check_relevance", check_relevance)
    workflow.add_node("decompose_query", decompose_query)
    workflow.add_node("execute_queries", execute_queries)
    workflow.add_edge("check_relevance", "decompose_query")
    workflow.add_edge("decompose_query", "execute_queries")
    workflow.add_edge("execute_queries", END)
    workflow.set_entry_point("check_relevance")
    return workflow.compile()

graph = build_graph()

def run_agent_query(user_query: str, session_id: str = "default", thinking_queue=None):
    """
    Run the agent query with real-time thinking updates.
    """
    chat_memory.add_message("user", user_query, session_id)
    
    state: State = {
        "user_query": user_query,
        "dec_queries": [],
        "data": {},
        "response": "",
        "decision": "",
        "session_id": session_id,
        "thinking_steps": [],
    }
    
    # Manually execute nodes to pass thinking_queue
    state = check_relevance(state, thinking_queue)
    state = decompose_query(state, thinking_queue)
    state = execute_queries(state, thinking_queue)
    
    if state.get("response"):
        chat_memory.add_message("assistant", state["response"], session_id)
    
    return state
