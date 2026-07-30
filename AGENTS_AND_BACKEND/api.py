from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from Main_Agent import run_agent_query
import json
import queue
import threading

print("Flask app started!")

app = Flask(__name__)

# ✅ Allow CORS for your frontend
CORS(app, resources={
    r"/query-float": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"]
    }
})

# Global dictionary to store thinking queues for each request
thinking_queues = {}
queue_counter = 0
queue_lock = threading.Lock()

@app.route("/query-float", methods=["POST"])
def query_float():
    global queue_counter
    data = request.get_json()
    user_query = data.get("query")
    session_id = data.get("session_id", "default")
    
    if not user_query:
        return jsonify({"error": "Query field is required."}), 400

    # Create a unique queue for this request
    with queue_lock:
        queue_counter += 1
        request_id = queue_counter
    
    thinking_queue = queue.Queue()
    thinking_queues[request_id] = thinking_queue
    
    # Run agent in a separate thread to avoid blocking
    def run_agent_thread():
        try:
            final_state = run_agent_query(user_query, session_id, thinking_queue)
            thinking_queue.put({"type": "complete", "data": final_state})
        except Exception as e:
            thinking_queue.put({"type": "error", "message": str(e)})
        finally:
            thinking_queue.put(None)  # Signal end of stream
    
    thread = threading.Thread(target=run_agent_thread)
    thread.daemon = True
    thread.start()
    
    # Return stream response
    return Response(
        stream_thinking_updates(thinking_queue),
        mimetype='application/x-ndjson'
    )

def stream_thinking_updates(thinking_queue):
    """Stream thinking updates from the queue as NDJSON"""
    while True:
        try:
            item = thinking_queue.get(timeout=5)
            
            if item is None:
                break
            
            yield json.dumps(item) + '\n'
        except queue.Empty:
            continue
        except Exception as e:
            yield json.dumps({"type": "error", "message": str(e)}) + '\n'
            break

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
