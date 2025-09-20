import json
from filter_agent import ArgoFloatAgent
from sql_agent import run_agent
from langgraph.graph import StateGraph, END
from typing import TypedDict, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from sort_json import sort_cycles_in_floats



class State(TypedDict):
    user_query: str
    dec_queries: List[str]
    data: dict


model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    api_key="AIzaSyA8YxYWhMe_nC2N1IHR065TWN_yHiSptAM"
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
                "1. Filter Agent: Responsible for filtering float IDs based on geolocation, "
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


def execute_queries(state: State) -> State:
    argo_agent = ArgoFloatAgent("AIzaSyA8YxYWhMe_nC2N1IHR065TWN_yHiSptAM")
    filtered = argo_agent.query(state["dec_queries"][0])
    results = run_agent(state["dec_queries"][1], filtered)

    # with open("re.txt", "a") as f:
    #     f.write(str(state) + "\n\n")
    # with open("results.json", "w") as f:
    #     f.write(json.dumps(results, indent=2, default=str))

    return {**state, "data": results}


state: State = {
    "user_query": "Compare temperatures of any two floats in Indian ocean",
    "dec_queries": [],
    "data": {},
}

workflow = StateGraph(State)
workflow.add_node("decompose_query", decompose_query)
workflow.add_node("execute_queries", execute_queries)
workflow.add_edge("decompose_query", "execute_queries")
workflow.add_edge("execute_queries", END)
workflow.set_entry_point("decompose_query")
graph = workflow.compile()

final_state = graph.invoke(state)
print(final_state)
sorted_data = sort_cycles_in_floats(final_state["data"])
with open("results.json" ,"w") as f:
    f.write(json.dumps(sorted_data),indent=2,default=str)
