from flask import Flask, request, jsonify
from flask_cors import CORS
from Main_Agent import run_agent_query  # your agent workflow
app = Flask(__name__)

CORS(app, 
     origins=["http://localhost:3000", "http://127.0.0.1:3000"],
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

@app.route("/query-float", methods=["POST"])
def query_float():
    data = request.get_json()
    user_query = data.get("query")
    if not user_query:
        return jsonify({"error": "Query field is required."}), 400

    final_state = run_agent_query(user_query)

    if final_state["decision"].lower() == "yes":
        return jsonify({
            "type": "plain",
            "response": final_state["response"],
            "data": []
        })
    else:
        return jsonify({
            "type": "data",
            "data": final_state["data"],
            "response": final_state["response"]
        })

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
