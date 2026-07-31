"""
Chat Memory Manager for storing conversation history.
Only stores user queries and model responses (excludes SQL data).
Includes token limit management for free Gemini API tier.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass
import json
import os


@dataclass
class ChatMessage:
    """Represents a single message in the chat history."""
    role: str  # "user" or "assistant"
    content: str  # The actual message content
    
    def to_dict(self) -> Dict:
        return {"role": self.role, "content": self.content}


class ChatMemory:
    """
    Manages chat memory with token limits.
    For free Gemini API, we limit to approximately 8000 tokens total (roughly 4000 words).
    Each conversation turn uses ~200-500 tokens, so we limit to ~10-15 recent messages.
    """
    
    def __init__(self, max_messages: int = 10, max_tokens: int = 6000):
        """
        Initialize chat memory.
        
        Args:
            max_messages: Maximum number of message pairs (user + assistant) to keep
            max_tokens: Approximate maximum tokens to keep (rough estimate: 1 token ≈ 4 chars)
        """
        self.max_messages = max_messages
        self.max_tokens = max_tokens
        self.messages: List[ChatMessage] = []
        # Store conversations by session_id for multi-user support
        self.sessions: Dict[str, List[ChatMessage]] = {}
    
    def _estimate_tokens(self, text: str) -> int:
        """
        Rough token estimation: 1 token ≈ 4 characters for English text.
        This is a conservative estimate for Gemini.
        """
        return len(text) // 4
    
    def _get_total_tokens(self, messages: List[ChatMessage]) -> int:
        """Calculate total estimated tokens for a list of messages."""
        return sum(self._estimate_tokens(msg.content) for msg in messages)
    
    def _trim_messages(self, messages: List[ChatMessage]) -> List[ChatMessage]:
        """
        Trim messages to fit within token and message limits.
        Keeps the most recent messages.
        """
        # First, limit by message count (keep most recent)
        if len(messages) > self.max_messages * 2:  # *2 because each turn has user + assistant
            messages = messages[-(self.max_messages * 2):]
        
        # Then, limit by tokens (keep most recent that fit)
        total_tokens = self._get_total_tokens(messages)
        if total_tokens > self.max_tokens:
            # Remove oldest messages until we're under the limit
            while total_tokens > self.max_tokens and len(messages) > 2:
                # Keep at least one conversation turn
                removed = messages.pop(0)
                total_tokens -= self._estimate_tokens(removed.content)
        
        return messages
    
    def add_message(self, role: str, content: str, session_id: str = "default"):
        """
        Add a message to the chat history.
        
        Args:
            role: "user" or "assistant"
            content: The message content
            session_id: Session identifier (for multi-user support)
        """
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        
        message = ChatMessage(role=role, content=content)
        self.sessions[session_id].append(message)
        
        # Trim to fit limits
        self.sessions[session_id] = self._trim_messages(self.sessions[session_id])
    
    def get_history(self, session_id: str = "default") -> List[Dict]:
        """
        Get chat history for a session as a list of dictionaries.
        
        Args:
            session_id: Session identifier
            
        Returns:
            List of message dictionaries with "role" and "content" keys
        """
        if session_id not in self.sessions:
            return []
        
        return [msg.to_dict() for msg in self.sessions[session_id]]
    
    def get_history_text(self, session_id: str = "default") -> str:
        """
        Get chat history as formatted text for inclusion in prompts.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Formatted string of chat history
        """
        history = self.get_history(session_id)
        if not history:
            return ""
        
        formatted = []
        for msg in history:
            role_label = "User" if msg["role"] == "user" else "Assistant"
            formatted.append(f"{role_label}: {msg['content']}")
        
        return "\n".join(formatted)
    
    def clear_session(self, session_id: str = "default"):
        """Clear chat history for a specific session."""
        if session_id in self.sessions:
            self.sessions[session_id] = []
    
    def get_message_count(self, session_id: str = "default") -> int:
        """Get the number of messages in a session."""
        if session_id not in self.sessions:
            return 0
        return len(self.sessions[session_id])


# Global memory instance
chat_memory = ChatMemory(max_messages=10, max_tokens=6000)

