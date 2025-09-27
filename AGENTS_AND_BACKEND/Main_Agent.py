import json
from filter_agent import ArgoFloatAgent
from sql_agent import run_agent
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Literal
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from sort_json import sort_cycles_in_floats
from dotenv import load_dotenv
load_dotenv()
class State(TypedDict):
    user_query: str
    dec_queries: List[str]
    data: dict
    response: str
    decision: str


model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
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


def check_relevance(state: State) -> State:
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
                "User Query: {query}"
            )
        ]
    )
    prompt = relevance_prompt.format(query=state["user_query"])
    relevance_result = model.with_structured_output(RelevanceCheck).invoke(prompt)

    if relevance_result.category == "irrelevant":
        return {
            **state,
            "decision": "yes",   # stop further processing
            "response": relevance_result.response
        }
    elif relevance_result.category == "simple":
        return {
            **state,
            "decision": "yes",   # stop further processing
            "response": relevance_result.response
        }

    # category == "data"
    return state


def decompose_query(state: State) -> State:
    # Skip decomposition if already decided as irrelevant
    if state.get("decision") == "yes":
        return state
        
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
                "User Query: {query}"
            )
        ]
    )
    prompt = promts.format(query=state["user_query"])
    response = model.with_structured_output(Decomposed_Queries).invoke(prompt)
    return {
        **state,
        "dec_queries": [response.for_filter_agent, response.for_sql_agent],
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

def execute_queries(state: State) -> State:
    if state.get("decision") == "yes":
        return state
        
    argo_agent = ArgoFloatAgent(API_KEY)
    filtered = argo_agent.query(state["dec_queries"][0])

    # ask LLM if we only need IDs or run SQL
    decision_prompt = f"User query: {state['user_query']}\nFloat IDs: {json.dumps(filtered)}"
    decision = model.with_structured_output(OutPut).invoke(decision_prompt)
    print(decision.response,decision.decision)
    if decision.decision.lower() == "yes":
        return {**state, "response": decision.response, "decision": decision.decision}

    results = run_agent(state["dec_queries"][1], filtered)
    results = sort_cycles_in_floats(results)
    import os

    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "results.json")

    with open(json_path, "w") as f:
        json.dump(results, f, indent=2, default=str)

    return {**state, "data": results, "decision": decision.decision, "response": decision.response}

state: State = {
    "user_query": "compare temperature of any one float in bay of bengal and one float in arabian sea",
    "dec_queries": [],
    "data": {},
    "response": "",
    "decision": "",
}

workflow = StateGraph(State)
workflow.add_node("check_relevance", check_relevance)
workflow.add_node("decompose_query", decompose_query)
workflow.add_node("execute_queries", execute_queries)
workflow.add_edge("check_relevance", "decompose_query")
workflow.add_edge("decompose_query", "execute_queries")
workflow.add_edge("execute_queries", END)
workflow.set_entry_point("check_relevance")
graph = workflow.compile()
# graph.invoke(state)

def run_agent_query(user_query: str):
    state: State = {
        "user_query": user_query,
        "dec_queries": [],
        "data": {},
        "response": "",
        "decision": "",
    }
    return graph.invoke(state)
