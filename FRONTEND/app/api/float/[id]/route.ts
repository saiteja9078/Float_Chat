import { NextResponse } from "next/server"
import { Pool } from "pg"

// Database connection configuration - matches sql_agent.py
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "argo_db",
  user: process.env.DB_USER || "argo_user",
  password: process.env.DB_PASSWORD || "argo_pass",
})

interface FloatProfile {
  depth: number[]
  temperature: number[]
  salinity: number[]
  pressure: number[]
  dates: string[]
}

interface FloatDataResponse {
  id: string
  name: string
  lat: number
  lng: number
  status: "active" | "recent" | "bgc" | "inactive"
  depth: number
  temperature?: number
  salinity?: number
  lastUpdate: string
  profiles: FloatProfile
  availableCycles?: number[]
  currentCycle?: number
}

// Helper function to strip binary wrapper from strings
function stripBinaryWrapper(value?: string): string | undefined {
  if (typeof value !== "string") return undefined
  return value.replace(/^b'|'\s*$/g, "").trim()
}

// Helper function to extract numeric values from array
function extractNumericValues(arr: any[]): number[] {
  if (!Array.isArray(arr)) return []
  return arr
    .map((v) => {
      const num = typeof v === "string" ? parseFloat(v) : v
      return typeof num === "number" && !isNaN(num) && isFinite(num) ? num : null
    })
    .filter((v): v is number => v !== null)
}

// Generate profile data from metadata statistics
function generateProfileFromMetadata(meta: any): FloatProfile {
  const depthMax = meta.pres_max || meta.pres_avg || 2000
  const depthMin = meta.pres_min || 0
  const tempMax = meta.temp_max || meta.temp_avg || 25
  const tempMin = meta.temp_min || 5
  const tempAvg = meta.temp_avg || 15
  const salMax = meta.psal_max || meta.psal_avg || 35.5
  const salMin = meta.psal_min || meta.psal_avg || 34.5
  const salAvg = meta.psal_avg || 35.0

  // Generate depth profile (pressure in dbar, which is approximately depth in meters)
  const depthSteps = 50
  const depths: number[] = []
  const temperatures: number[] = []
  const salinities: number[] = []
  const pressures: number[] = []
  const dates: string[] = []

  // Generate a realistic profile
  for (let i = 0; i < depthSteps; i++) {
    const depth = depthMin + ((depthMax - depthMin) * i) / (depthSteps - 1)
    depths.push(depth)
    pressures.push(depth) // Pressure ≈ depth in dbar

    // Temperature typically decreases with depth
    const depthRatio = i / (depthSteps - 1)
    const temp = tempMax - (tempMax - tempMin) * depthRatio + (Math.random() - 0.5) * 2
    temperatures.push(Math.max(tempMin, Math.min(tempMax, temp)))

    // Salinity typically increases slightly with depth
    const sal = salMin + (salMax - salMin) * depthRatio * 0.3 + (Math.random() - 0.5) * 0.2
    salinities.push(Math.max(salMin, Math.min(salMax, sal)))

    // Generate dates (last 10 cycles)
    const daysAgo = Math.floor(i / 5)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    dates.push(date.toISOString().split("T")[0])
  }

  return {
    depth: depths,
    temperature: temperatures,
    salinity: salinities,
    pressure: pressures,
    dates: dates,
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let client
  try {
    const { id } = await params
    const floatId = id

    if (!floatId) {
      return NextResponse.json({ error: "Float ID is required" }, { status: 400 })
    }

    // Get cycle number from query parameters (default to 1)
    const { searchParams } = new URL(request.url)
    const cycleNumber = parseInt(searchParams.get("cycle") || "1", 10)

    // Step 1: Load metadata first (primary source)
    let floatRecord: any = null
    let floatName = `Float ${floatId}`
    try {
      const { promises: fs } = await import("fs")
      const path = await import("path")
      const filePath = path.resolve(process.cwd(), "AGENTS_AND_BACKEND", "meta_data.json")
      const raw = await fs.readFile(filePath, "utf-8")
      const parsed = JSON.parse(raw) as Record<string, any>
      floatRecord = parsed[floatId]

      if (!floatRecord) {
        return NextResponse.json(
          { error: `Float ${floatId} not found in metadata` },
          { status: 404 }
        )
      }

      // Extract float name
      const platformNum = stripBinaryWrapper(floatRecord.platform_number)
      const projectName = stripBinaryWrapper(floatRecord.project_name)
      floatName = platformNum || projectName || `Float ${floatId}`
    } catch (metaError: any) {
      console.error(`[api/float/${floatId}] Failed to load metadata:`, metaError)
      return NextResponse.json(
        { error: "Failed to load float metadata", details: metaError.message },
        { status: 500 }
      )
    }

    // Step 2: Try to enhance with database profile data
    let profiles: FloatProfile
    let dbLat: number | null = null
    let dbLng: number | null = null
    let dbLastUpdate: string | null = null
    let availableCycles: number[] = []

    try {
      client = await pool.connect()
      console.log(`[api/float/${floatId}] Connected to database, querying for float_id: ${floatId}`)

      // Try querying with float_id as both string and integer (in case of type mismatch)
      // First, get all available cycles for this float
      const cyclesQuery = `
        SELECT DISTINCT cycle_number
        FROM argo_profiles
        WHERE float_id = $1 OR float_id::text = $1
        ORDER BY cycle_number ASC
      `
      const cyclesResult = await client.query(cyclesQuery, [floatId])
      availableCycles = cyclesResult.rows.map((row) => row.cycle_number)
      console.log(`[api/float/${floatId}] Available cycles:`, availableCycles)

      // Query for specific cycle (or latest if cycle not found)
      const query = `
        SELECT 
          float_id,
          cycle_number,
          juld,
          latitude,
          longitude,
          pressure,
          temperature,
          salinity,
          pressure_adjusted,
          temperature_adjusted,
          salinity_adjusted
        FROM argo_profiles
        WHERE (float_id = $1 OR float_id::text = $1)
          AND cycle_number = $2
        ORDER BY juld DESC NULLS LAST
        LIMIT 1
      `

      let result = await client.query(query, [floatId, cycleNumber])
      console.log(`[api/float/${floatId}] Database query for cycle ${cycleNumber} returned ${result.rows.length} rows`)
      
      // If cycle not found, try to get the first available cycle or cycle 1
      if (result.rows.length === 0 && availableCycles.length > 0) {
        const fallbackCycle = availableCycles.includes(1) ? 1 : availableCycles[0]
        console.log(`[api/float/${floatId}] Cycle ${cycleNumber} not found, using fallback cycle: ${fallbackCycle}`)
        result = await client.query(query, [floatId, fallbackCycle])
      }
      
      // If no results, try with trimmed float_id
      if (result.rows.length === 0) {
        const trimmedFloatId = floatId.trim()
        console.log(`[api/float/${floatId}] Trying with trimmed float_id: "${trimmedFloatId}"`)
        const retryResult = await client.query(query, [trimmedFloatId])
        console.log(`[api/float/${floatId}] Retry query returned ${retryResult.rows.length} rows`)
        
        if (retryResult.rows.length > 0) {
          result = retryResult
        }
      }

      if (result.rows.length > 0) {
        console.log(`[api/float/${floatId}] Using database data for profiles`)
        // Use database data for the selected cycle
        const cycleData = result.rows[0]
        const actualCycleNumber = cycleData.cycle_number
        dbLat = cycleData.latitude
        dbLng = cycleData.longitude
        dbLastUpdate = cycleData.juld
          ? new Date(cycleData.juld).toISOString()
          : null

        const cyclePressures = extractNumericValues(
          cycleData.pressure_adjusted || cycleData.pressure || []
        )
        const cycleTemperatures = extractNumericValues(
          cycleData.temperature_adjusted || cycleData.temperature || []
        )
        const cycleSalinities = extractNumericValues(
          cycleData.salinity_adjusted || cycleData.salinity || []
        )

        const cycleDate = cycleData.juld
          ? new Date(cycleData.juld).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]

        // Use original values from SQL database, remove duplicates by using Set
        const allDepths: number[] = []
        const allTemperatures: number[] = []
        const allSalinities: number[] = []
        const allPressures: number[] = []
        const allDates: string[] = []

        // Track seen depth values to avoid duplicates (using rounded values to handle floating point precision)
        const seenDepths = new Set<string>()

        // Use data from the selected cycle only - original values from SQL
        for (let i = 0; i < cyclePressures.length; i++) {
          const pressure = cyclePressures[i]
          // Only process valid pressure values and avoid duplicates
          if (pressure !== undefined && pressure !== null && !isNaN(pressure)) {
            // Round to 2 decimal places to avoid floating point duplicates
            const roundedPressure = Math.round(pressure * 100) / 100
            const depthKey = roundedPressure.toString()

            if (!seenDepths.has(depthKey)) {
              seenDepths.add(depthKey)
              allPressures.push(pressure)
              allDepths.push(pressure)

              // Use original temperature value or null if missing
              const tempValue =
                cycleTemperatures[i] !== undefined &&
                cycleTemperatures[i] !== null &&
                !isNaN(cycleTemperatures[i])
                  ? cycleTemperatures[i]
                  : null
              allTemperatures.push(tempValue)

              // Use original salinity value or null if missing
              const salValue =
                cycleSalinities[i] !== undefined &&
                cycleSalinities[i] !== null &&
                !isNaN(cycleSalinities[i])
                  ? cycleSalinities[i]
                  : null
              allSalinities.push(salValue)

              allDates.push(cycleDate)
            }
          }
        }

        // Calculate cycle-specific averages from valid (non-null) values only
        const validTemps = allTemperatures.filter((t) => t !== null && t !== undefined && !isNaN(t))
        const cycleAvgTemp =
          validTemps.length > 0
            ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length
            : undefined

        const validSalinities = allSalinities.filter((s) => s !== null && s !== undefined && !isNaN(s))
        const cycleAvgSalinity =
          validSalinities.length > 0
            ? validSalinities.reduce((a, b) => a + b, 0) / validSalinities.length
            : undefined

        const cycleMaxDepth = allDepths.length > 0 ? Math.max(...allDepths) : 0

        // If no valid data, create constant graphs
        if (allDepths.length === 0 || (validTemps.length === 0 && validSalinities.length === 0)) {
          // Create constant profile with two points for flat line
          const constantDepth = cycleMaxDepth > 0 ? cycleMaxDepth : 1000
          const constantTemp = cycleAvgTemp !== undefined ? cycleAvgTemp : 15
          const constantSal = cycleAvgSalinity !== undefined ? cycleAvgSalinity : 35

          profiles = {
            depth: [0, constantDepth],
            temperature: [constantTemp, constantTemp],
            salinity: [constantSal, constantSal],
            pressure: [0, constantDepth],
            dates: [cycleDate, cycleDate],
          }
        } else {
          // Fill null values with constant (average) for graphing - creates flat line for missing data
          const filledTemps = allTemperatures.map((t) =>
            t !== null && t !== undefined ? t : cycleAvgTemp || 15
          )
          const filledSalinities = allSalinities.map((s) =>
            s !== null && s !== undefined ? s : cycleAvgSalinity || 35
          )

          profiles = {
            depth: allDepths,
            temperature: filledTemps,
            salinity: filledSalinities,
            pressure: allPressures,
            dates: allDates,
          }
        }

        console.log(`[api/float/${floatId}] Generated profile with ${allDepths.length} data points`)
        console.log(`[api/float/${floatId}] Cycle ${cycleNumber} averages - Temp: ${cycleAvgTemp}, Salinity: ${cycleAvgSalinity}, Max Depth: ${cycleMaxDepth}`)

        // Update temperature, salinity, and depth with cycle-specific values
        if (cycleAvgTemp !== undefined) {
          temperature = cycleAvgTemp
        }
        if (cycleAvgSalinity !== undefined) {
          salinity = cycleAvgSalinity
        }
        if (cycleMaxDepth > 0) {
          depth = cycleMaxDepth
        }
      } else {
        // No database data, generate from metadata
        console.warn(`[api/float/${floatId}] No rows found in database for float_id: ${floatId}, generating from metadata`)
        profiles = generateProfileFromMetadata(floatRecord)
      }
    } catch (dbError: any) {
      // Database error, use metadata-generated profiles
      console.error(`[api/float/${floatId}] Database query failed:`, {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        stack: dbError.stack
      })
      profiles = generateProfileFromMetadata(floatRecord)
    } finally {
      if (client) {
        client.release()
      }
    }

    // Step 3: Build response using metadata as base, enhanced with DB data
    const lat = dbLat !== null ? dbLat : floatRecord.launch_info?.latitude || 0
    const lng = dbLng !== null ? dbLng : floatRecord.launch_info?.longitude || 0
    const status = (floatRecord.status || "active").toLowerCase() as any
    let depth = floatRecord.pres_max || floatRecord.pres_avg || 0
    let temperature = floatRecord.temp_avg
    let salinity = floatRecord.psal_avg
    const lastUpdate = dbLastUpdate || floatRecord.last_updated || new Date().toISOString()

    const floatData: FloatDataResponse = {
      id: floatId,
      name: floatName,
      lat,
      lng,
      status,
      depth,
      temperature,
      salinity,
      lastUpdate,
      profiles,
    }

    // Add available cycles and current cycle to response
    return NextResponse.json({
      ...floatData,
      availableCycles: availableCycles || [],
      currentCycle: cycleNumber,
    })
  } catch (error: any) {
    try {
      const { id } = await params
      console.error(`[api/float/${id}] Error:`, error)
    } catch {
      console.error(`[api/float] Error:`, error)
    }
    return NextResponse.json(
      {
        error: "Failed to fetch float data",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
