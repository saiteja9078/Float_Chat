"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface ThinkingStep {
  step: string
  status: "in_progress" | "completed"
  title: string
  description: string
  result?: any
  details?: any
}

interface AgentThinkingStreamProps {
  steps: ThinkingStep[]
  isLoading?: boolean
}

export default function AgentThinkingStream({ steps, isLoading = false }: AgentThinkingStreamProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatResult = (result: any) => {
    if (!result) return ""
    
    if (typeof result === "object") {
      return Object.entries(result)
        .map(([key, value]) => {
          if (Array.isArray(value) && value.length === 0) {
            return `${key}: []`
          }
          if (Array.isArray(value)) {
            return `${key}: [${value.slice(0, 2).join(", ")}${value.length > 2 ? ", ..." : ""}]`
          }
          return `${key}: ${value}`
        })
        .join(" • ")
    }
    return String(result)
  }

  const activeStep = steps.find((s) => s.status === "in_progress")
  const hasSteps = steps.length > 0

  if (!isLoading) {
    return null
  }

  if (!isExpanded) {
    return (
      <div className="flex items-center gap-3 text-sm mt-2 mb-2">
        {/* Animated dots - slightly smaller */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        </div>
        
        {/* Processing text + dropdown in one flex container */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-white text-sm">
            Processing
          </span>
          
          {/* Dropdown toggle - only show if we have steps */}
          {hasSteps && (
            <button
              onClick={() => setIsExpanded(true)}
              className="p-0.5 hover:bg-muted/50 rounded transition-colors flex-shrink-0"
              title="Show thinking details"
            >
              <ChevronDown className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isExpanded) {
    return (
      <div className="space-y-2 mt-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
          <span className="text-sm font-medium text-white">Processing</span>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-0.5 hover:bg-muted/50 rounded transition-colors flex-shrink-0"
            title="Hide thinking details"
          >
            <ChevronUp className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="space-y-1.5 pl-11">
          {steps.map((step, index) => (
            <div key={`${step.step}-${index}`} className="space-y-1 border-l border-border/30 pl-3">
              {/* Step header */}
              <div className="flex items-start gap-2">
                {/* Status indicator */}
                <div className="flex-shrink-0 pt-0.5 mt-0.5">
                  {step.status === "in_progress" ? (
                    <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-green-500/60 flex items-center justify-center">
                      <span className="text-[8px] text-white">✓</span>
                    </div>
                  )}
                </div>
                
                {/* Step details */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-muted-foreground">{step.title}</div>
                  <div className="text-xs text-muted-foreground/70 mt-0.5">{step.description}</div>
                  
                  {/* Show result data */}
                  {step.result && step.status === "completed" && (
                    <div className="mt-1.5 pt-1.5 border-t border-border/20">
                      <span className="text-[11px] font-medium text-muted-foreground/80">
                        {formatResult(step.result)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
