"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, X, User, Waves, BarChart3, Globe, Download, Moon, Sun } from "lucide-react"
import ArgoGlobe3D from "./argo-globe-3d"
import DataVisualization from "./data-visualization"

const FloatChat = () => {
  const [isMapVisible, setIsMapVisible] = useState(false)
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  type Message = {
    id: number
    type: string
    content: string
    timestamp: string
    hasData?: boolean
    data?: any[] // Added data field for API responses
  }

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "bot",
      content:
        "Welcome to Float Chat! I can help you explore ARGO oceanographic data. Try asking me about salinity profiles, temperature data, or BGC parameters from specific regions and time periods.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Sample quick query suggestions
  const quickQueries = [
    "Show salinity profiles near the equator in March 2023",
    "Compare BGC parameters in Arabian Sea last 6 months",
    "Find nearest ARGO floats to 20°N, 65°E",
    "Temperature profiles at 200m depth in Indian Ocean",
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

      try {
        // Call Flask API
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

        const responseText = await response.text()
        const cleanedResponseText = responseText.replace(/:\s*NaN/g, ": null")
        const data = JSON.parse(cleanedResponseText)

        const aiResponse = {
          id: messages.length + 2,
          type: "bot",
          content: data.response,
          timestamp: new Date().toLocaleTimeString(),
          hasData: data.type === "data",
          data: data.data || [],
        }

        setMessages((prev) => [...prev, aiResponse])
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
      }
    }
  }

  const handleQuickQuery = (query: string) => {
    setInputMessage(query)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleMap = () => {
    setIsMapVisible(!isMapVisible)
    if (isMapFullscreen) {
      setIsMapFullscreen(false)
    }
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const toggleMapFullscreen = () => {
    setIsMapFullscreen(!isMapFullscreen)
  }

  const theme = {
    bg: isDarkMode ? "bg-gray-900" : "bg-white",
    chatBg: isDarkMode ? "bg-gray-900" : "bg-white",
    border: isDarkMode ? "border-gray-700" : "border-gray-200",
    text: isDarkMode ? "text-gray-100" : "text-gray-900",
    textSecondary: isDarkMode ? "text-gray-400" : "text-gray-600",
    quickQueryBg: isDarkMode ? "bg-gray-800" : "bg-gray-50",
    quickQueryBorder: isDarkMode ? "border-gray-700" : "border-gray-200",
    quickQueryText: isDarkMode ? "text-gray-300" : "text-gray-700",
    quickQueryButtonBg: isDarkMode ? "bg-gray-700" : "bg-white",
    quickQueryButtonBorder: isDarkMode ? "border-gray-600" : "border-gray-300",
    quickQueryButtonHover: isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-100",
    quickQueryButtonText: isDarkMode ? "text-gray-200" : "text-gray-800",
    messageBg: isDarkMode ? "bg-gray-800" : "bg-gray-100",
    messageBorder: isDarkMode ? "border-gray-700" : "border-gray-200",
    messageText: isDarkMode ? "text-gray-100" : "text-gray-900",
    inputBg: isDarkMode ? "bg-gray-900" : "bg-white",
    inputBorder: isDarkMode ? "border-gray-700" : "border-gray-200",
    inputField: isDarkMode
      ? "bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500",
    botAvatar: isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white",
    loadingBg: isDarkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-600",
  }

  return (
    <div className={`h-screen w-full ${theme.bg} flex`}>
      {/* Chat Section */}
      <div
        className={`${isMapFullscreen ? "hidden" : isMapVisible ? "w-2/5" : "w-full"} transition-all duration-300 ease-in-out flex flex-col ${theme.chatBg}`}
      >
        <div className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Waves className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-lg font-semibold ${theme.text}`}>Float Chat</h1>
                <p className={`text-sm ${theme.textSecondary}`}>ARGO Data Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleMap}
                className={`p-2 rounded-lg transition-colors ${
                  isMapVisible
                    ? isDarkMode
                      ? "bg-gray-700"
                      : "bg-gray-100"
                    : isDarkMode
                      ? "hover:bg-gray-700"
                      : "hover:bg-gray-100"
                }`}
                title={isMapVisible ? "Hide Ocean Map" : "Show Ocean Map"}
              >
                <Globe className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Query Suggestions */}
        {messages.length === 1 && (
          <div className={`p-4 ${theme.quickQueryBg} border-b ${theme.quickQueryBorder}`}>
            <div className={`text-sm ${theme.quickQueryText} font-medium mb-3`}>Try these examples:</div>
            <div className="space-y-2">
              {quickQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuery(query)}
                  className={`w-full text-left p-3 ${theme.quickQueryButtonBg} border ${theme.quickQueryButtonBorder} rounded-lg ${theme.quickQueryButtonHover} transition-colors text-sm ${theme.quickQueryButtonText}`}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === "user" ? "bg-green-600 text-white" : theme.botAvatar
                }`}
              >
                {message.type === "user" ? <User className="w-4 h-4" /> : <Waves className="w-4 h-4" />}
              </div>
              <div className={`flex-1 ${message.type === "user" ? "text-right" : "text-left"}`}>
                <div
                  className={`inline-block max-w-[80%] px-4 py-3 rounded-2xl ${
                    message.type === "user" ? "bg-green-600 text-white" : `${theme.messageBg} ${theme.messageText}`
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.hasData && message.data && Object.keys(message.data).length > 0 && (
                  <DataVisualization data={message.data} isDarkMode={isDarkMode} />
                )}
                {message.hasData && message.data && (
                  <div className="mt-2 flex gap-2 justify-start">
                    <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs hover:bg-blue-200 transition-colors flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      View Data
                    </button>
                    <button className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs hover:bg-green-200 transition-colors flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                )}
                <div
                  className={`text-xs ${theme.textSecondary} mt-1 ${message.type === "user" ? "text-right" : "text-left"}`}
                >
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.botAvatar}`}>
                <Waves className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className={`inline-block px-4 py-3 rounded-2xl ${theme.loadingBg}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm">Diving Deep...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className={`p-4 border-t ${theme.inputBorder}`}>
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about ARGO float data..."
                rows={1}
                className={`w-full p-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm ${theme.inputField} transition-all`}
                style={{ minHeight: "48px", maxHeight: "120px" }}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Ocean Map Section */}
      {isMapVisible && (
        <div
          className={`${
            isMapFullscreen ? "w-full" : "w-3/5"
          } transition-all duration-500 ease-in-out animate-in slide-in-from-right`}
        >
          <div className="h-full w-full relative overflow-hidden">
            {/* Map Header */}
            <div className="absolute top-0 left-0 right-0 bg-black/90 backdrop-blur-sm p-4 border-b border-blue-600 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Waves className="w-5 h-5 text-blue-300" />
                    <h3 className="font-semibold text-blue-100">
                      ARGO Float 3D Globe {isMapFullscreen && "- Fullscreen Mode"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-blue-200">
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
                <div className="flex items-center gap-2">
                  <button onClick={toggleMap} className="p-1 hover:bg-blue-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-blue-200" />
                  </button>
                </div>
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
