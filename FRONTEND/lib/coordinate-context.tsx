"use client"

import React, { createContext, useContext, useState } from "react"

interface SelectedCoordinate {
  lat: number
  lng: number
  label?: string
  timestamp: Date
}

interface CoordinateContextType {
  selectedCoordinates: SelectedCoordinate[]
  focusedCoordinate: SelectedCoordinate | null
  addCoordinate: (lat: number, lng: number, label?: string) => void
  removeCoordinate: (index: number) => void
  clearCoordinates: () => void
  setFocusedCoordinate: (coordinate: SelectedCoordinate | null) => void
}

const CoordinateContext = createContext<CoordinateContextType | undefined>(undefined)

export function CoordinateProvider({ children }: { children: React.ReactNode }) {
  const [selectedCoordinates, setSelectedCoordinates] = useState<SelectedCoordinate[]>([])
  const [focusedCoordinate, setFocusedCoordinate] = useState<SelectedCoordinate | null>(null)

  const addCoordinate = (lat: number, lng: number, label?: string) => {
    const newCoord: SelectedCoordinate = {
      lat,
      lng,
      label,
      timestamp: new Date(),
    }
    setSelectedCoordinates((prev) => [...prev, newCoord])
    setFocusedCoordinate(newCoord)
  }

  const removeCoordinate = (index: number) => {
    setSelectedCoordinates((prev) => prev.filter((_, i) => i !== index))
  }

  const clearCoordinates = () => {
    setSelectedCoordinates([])
    setFocusedCoordinate(null)
  }

  return (
    <CoordinateContext.Provider
      value={{ selectedCoordinates, focusedCoordinate, addCoordinate, removeCoordinate, clearCoordinates, setFocusedCoordinate }}
    >
      {children}
    </CoordinateContext.Provider>
  )
}

export function useCoordinates() {
  const context = useContext(CoordinateContext)
  if (context === undefined) {
    throw new Error("useCoordinates must be used within a CoordinateProvider")
  }
  return context
}
