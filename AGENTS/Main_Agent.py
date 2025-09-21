import json
from filter_agent import ArgoFloatAgent
from sql_agent import run_agent
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Literal
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from sort_json import sort_cycles_in_floats
API_KEY = "AIzaSyC3FYXWPut8ufr4fFJ9jllt44CeCy35prY"

class State(TypedDict):
    user_query: str
    dec_queries: List[str]
    data: dict
    response: str
    decision: str


model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    api_key=API_KEY
)


class Decomposed_Queries(BaseModel):
    for_filter_agent: str = Field(description="This variable is for Filter Agent.")
    for_sql_agent: str = Field(description="This is for SQL Agent.")


def decompose_query(state: State) -> State:
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
        description="If decision is 'yes', provide the float IDs here in a user-friendly format."
    )

def execute_queries(state: State) -> State:
    argo_agent = ArgoFloatAgent(API_KEY)
    filtered = argo_agent.query(state["dec_queries"][0])

    # ask LLM if we only need IDs or run SQL
    decision_prompt = f"User query: {state['user_query']}\nFloat IDs: {json.dumps(filtered)}"
    decision = model.with_structured_output(OutPut).invoke(decision_prompt)

    if decision.decision.lower() == "yes":
        print(decision.response,decision.decision)
        return {**state, "response": decision.response, "decision": decision.decision}

    results = run_agent(state["dec_queries"][1], filtered)
    results = sort_cycles_in_floats(results)
    import os

    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "results.json")

    with open(json_path, "w") as f:
        json.dump(results, f, indent=2, default=str)

    return {**state, "data": results, "decision": decision.decision, "response": ""}

state: State = {
    "user_query": "compare temperature of any one float in bay of bengal and one float in arabian sea",
    "dec_queries": [],
    "data": {},
    "response": "",
    "decision": "",
}

workflow = StateGraph(State)
workflow.add_node("decompose_query", decompose_query)
workflow.add_node("execute_queries", execute_queries)
workflow.add_edge("decompose_query", "execute_queries")
workflow.add_edge("execute_queries", END)
workflow.set_entry_point("decompose_query")
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
