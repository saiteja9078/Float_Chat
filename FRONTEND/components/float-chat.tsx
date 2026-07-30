"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ArrowUp, X, User, Waves, BarChart3, Globe, Plus } from 'lucide-react'
import ArgoGlobe3D from "./argo-globe-3d"
import DataVisualization from "./data-visualization"
import AgentThinkingStream from "./agent-thinking-stream"

const FloatChat = () => {
  const [isMapVisible, setIsMapVisible] = useState(false)
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)
  type Message = {
    id: number
    type: string
    content: string
    timestamp: string
    hasData?: boolean
    data?: any[]
    thinking_steps?: any[]
  }

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "bot",
      content:
        "Welcome to Float Chat! I can help you explore ARGO oceanographic data. Ask me about salinity profiles, temperature data, or BGC parameters from specific regions and time periods.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingThinkingSteps, setStreamingThinkingSteps] = useState<any[]>([])
  const [currentMessageId, setCurrentMessageId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingThinkingSteps])

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      const newMessage = {
        id: messages.length + 1,
        type: "user",
        content: inputMessage,
        timestamp: new Date().toLocaleTimeString(),
      }

      setMessages((prev) => [...prev, newMessage])
      const currentQuery = inputMessage
      setInputMessage("")
      setIsLoading(true)
      setStreamingThinkingSteps([])
      setCurrentMessageId(messages.length + 2)

      try {
        const response = await fetch("http://localhost:5001/query-float", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: currentQuery }),
        })

        if (!response.ok) {
          throw new Error("Failed to get response from API")
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let finalData: any = null
        let buffer = ""

        if (!reader) throw new Error("No response body")

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value)
          const lines = buffer.split('\n')
          // Keep last incomplete line in buffer
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (!line.trim()) continue

            try {
              const update = JSON.parse(line)

              if (update.type === "thinking") {
                setStreamingThinkingSteps(update.all_steps || [])
              } else if (update.type === "complete") {
                finalData = update.data
              } else if (update.type === "error") {
                console.error("[v0] API Error:", update.message)
              }
            } catch (e) {
              console.error("[v0] Error parsing stream:", e)
            }
          }
        }

        if (finalData) {
          const aiResponse = {
            id: messages.length + 2,
            type: "bot",
            content: finalData.response,
            timestamp: new Date().toLocaleTimeString(),
            hasData: finalData.data && Object.keys(finalData.data).length > 0,
            data: finalData.data || [],
            thinking_steps: finalData.thinking_steps || [],
          }

          setMessages((prev) => [...prev, aiResponse])
          setStreamingThinkingSteps([])
        }
      } catch (error) {
        console.error("Error calling API:", error)
        const errorResponse = {
          id: messages.length + 2,
          type: "bot",
          content: "Sorry, I'm having trouble connecting to the data service. Please try again later.",
          timestamp: new Date().toLocaleTimeString(),
        }
        setMessages((prev) => [...prev, errorResponse])
      } finally {
        setIsLoading(false)
        setCurrentMessageId(null)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px"
    }
  }

  const toggleMap = () => {
    setIsMapVisible(!isMapVisible)
    if (isMapFullscreen) {
      setIsMapFullscreen(false)
    }
  }

  const toggleMapFullscreen = () => {
    setIsMapFullscreen(!isMapFullscreen)
  }

  const handleNewChat = () => {
    setMessages([
      {
        id: 1,
        type: "bot",
        content:
          "Welcome to Float Chat! I can help you explore ARGO oceanographic data. Ask me about salinity profiles, temperature data, or BGC parameters from specific regions and time periods.",
        timestamp: new Date().toLocaleTimeString(),
      },
    ])
    setInputMessage("")
    setStreamingThinkingSteps([])
    if (textareaRef.current) {
      textareaRef.current.style.height = "52px"
    }
  }

  const handleViewData = (messageData: any) => {
    if (!messageData || Object.keys(messageData).length === 0) return
  }

  const handleExportMessage = (messageData: any) => {
    if (!messageData || Object.keys(messageData).length === 0) return

    const jsonString = JSON.stringify(messageData, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `float-data-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-screen w-full bg-background flex">
      {/* Chat Section */}
      <div
        className={`${isMapFullscreen ? "hidden" : isMapVisible ? "w-2/5" : "w-full"} transition-all duration-300 ease-in-out flex flex-col bg-background`}
      >
        {/* Header */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Waves className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Float Chat</h1>
                <p className="text-sm text-muted-foreground">ARGO Data Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewChat}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
                title="Start new chat"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={toggleMap}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
                title={isMapVisible ? "Hide Ocean Map" : "Show Ocean Map"}
              >
                <Globe className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {message.type === "user" ? <User className="w-4 h-4" /> : <Waves className="w-4 h-4" />}
              </div>
              <div className={`flex-1 ${message.type === "user" ? "text-right" : "text-left"}`}>
                <div
                  className={`inline-block max-w-[85%] px-4 py-3 rounded-xl ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground border border-border"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {message.thinking_steps && message.thinking_steps.length > 0 && message.type === "bot" && (
                  <AgentThinkingStream steps={message.thinking_steps} isLoading={false} />
                )}
                
                {message.hasData && message.data && Object.keys(message.data).length > 0 && (
                  <DataVisualization data={message.data} isDarkMode={true} />
                )}
                {message.hasData && message.data && (
                  <div className="mt-2 flex gap-2 justify-start">
                    <button
                      onClick={() => handleViewData(message.data)}
                      className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs hover:bg-border transition-colors flex items-center gap-1"
                    >
                      <BarChart3 className="w-3 h-3" />
                      View Data
                    </button>
                    <button
                      onClick={() => handleExportMessage(message.data)}
                      className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs hover:bg-border transition-colors flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                )}
                <div className={`text-xs text-muted-foreground mt-1 ${message.type === "user" ? "text-right" : "text-left"}`}>
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                <Waves className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <AgentThinkingStream steps={streamingThinkingSteps} isLoading={isLoading} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="bg-background px-4 py-4">
          <div className="flex justify-center">
            <div className="w-[70%] relative flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Ask about ARGO float data..."
                rows={1}
                className="flex-1 px-4 py-3 bg-input rounded-2xl resize-none text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0 transition-none"
                style={{ minHeight: "60px", maxHeight: "200px", paddingRight: "48px" }}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="absolute right-4 bottom-3 p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-foreground flex items-center justify-center flex-shrink-0"
                title="Send message"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ocean Map Section */}
      {isMapVisible && (
        <div
          className={`${isMapFullscreen ? "w-full" : "w-3/5"} transition-all duration-500 ease-in-out animate-in slide-in-from-right bg-background`}
        >
          <div className="h-full w-full relative overflow-hidden">
            {/* Map Header */}
            <div className="absolute top-0 left-0 right-0 bg-card/95 backdrop-blur-sm p-4 border-b border-primary z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Waves className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      ARGO Float 3D Globe {isMapFullscreen && "- Fullscreen"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Active Floats
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      Recent Data
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      BGC Sensors
                    </span>
                  </div>
                </div>
                <button
                  onClick={toggleMap}
                  className="p-1 hover:bg-muted rounded-full transition-colors text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="pt-16 h-full">
              <ArgoGlobe3D isFullscreen={isMapFullscreen} onToggleFullscreen={toggleMapFullscreen} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FloatChat
