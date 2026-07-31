import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

type RawFloatRecord = {
  project_name?: string
  platform_number?: string
  location?: string
  status?: string
  last_updated?: string
  cycles?: number
  temp_avg?: number
  psal_avg?: number
  pres_max?: number
  pres_avg?: number
  launch_info?: {
    latitude?: number
    longitude?: number
  }
}

type SanitizedFloat = {
  id: string
  name: string
  status: string
  lat: number
  lng: number
  depth: number
  temperature?: number
  salinity?: number
  lastUpdate?: string
  location?: string
  cycles?: number
}

const stripBinaryWrapper = (value?: string) => {
  if (typeof value !== "string") return undefined
  return value.replace(/^b'|'\s*$/g, "").trim()
}

const normalizeStatus = (status?: string) => {
  if (!status) return "unknown"
  return status.trim().toLowerCase()
}

const buildFloatRecord = ([id, record]: [string, RawFloatRecord]): SanitizedFloat | null => {
  const lat = record.launch_info?.latitude
  const lng = record.launch_info?.longitude

  if (typeof lat !== "number" || typeof lng !== "number") {
    return null
  }

  const depthSource = record.pres_max ?? record.pres_avg ?? 0

  return {
    id: id.trim(),
    name: stripBinaryWrapper(record.platform_number) || stripBinaryWrapper(record.project_name) || `Float ${id}`,
    status: normalizeStatus(record.status),
    lat,
    lng,
    depth: Number.isFinite(depthSource) ? Number(depthSource) : 0,
    temperature: typeof record.temp_avg === "number" ? record.temp_avg : undefined,
    salinity: typeof record.psal_avg === "number" ? record.psal_avg : undefined,
    lastUpdate: record.last_updated,
    location: record.location,
    cycles: record.cycles,
  }
}

export async function GET() {
  try {
    const filePath = path.resolve(process.cwd(), "AGENTS_AND_BACKEND", "meta_data.json")
    const raw = await fs.readFile(filePath, "utf-8")
    const parsed = JSON.parse(raw) as Record<string, RawFloatRecord>

    const floats = Object.entries(parsed)
      .map(buildFloatRecord)
      .filter((float): float is SanitizedFloat => Boolean(float))

    return NextResponse.json({ floats, count: floats.length })
  } catch (error) {
    console.error("[api/floats] Failed to read metadata", { error, filePath: (error as any)?.path ?? null })
    return NextResponse.json({ error: "Failed to load float metadata. Check server logs for details." }, { status: 500 })
  }
}

