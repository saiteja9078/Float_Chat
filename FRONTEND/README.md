# ARGO Float Chat - 3D Oceanographic Data Visualization

A comprehensive AI-powered conversational system for ARGO float data that enables users to query, explore, and visualize oceanographic information using natural language with an interactive 3D globe interface.

## Features

### 🌊 Interactive 3D Globe
- **Black background with blue Earth** - Optimized for oceanographic data visualization
- **Country borders** - White/light gray outlines for clear geographic reference
- **Latitude/longitude coordinates** - Precise positioning for all data points
- **Rotation and zoom controls** - Full 3D navigation capabilities
- **Geographic labels** - Seas, oceans, and countries clearly marked

### 🤖 AI Chat Interface
- **Natural language queries** - Ask about salinity profiles, temperature data, BGC parameters
- **Contextual responses** - AI understands oceanographic terminology and concepts
- **Quick query suggestions** - Pre-built examples for common research questions
- **Data export options** - Export NetCDF files and view detailed profiles

### 📍 ARGO Float Tracking
- **9 Dummy floats** positioned in the Indian Ocean region
- **Real-time status indicators**:
  - 🟢 **Active Floats** - Currently collecting data
  - 🟡 **Recent Data** - Recently updated profiles
  - 🔴 **BGC Sensors** - Bio-Geo-Chemical sensor equipped floats
- **Detailed float information** - Temperature, salinity, depth, coordinates, last update
- **Float trajectories** - Historical movement patterns

### 🎨 Dual Interface Design
- **Split-screen layout** - Chat interface on left, 3D globe on right
- **Smooth transitions** - Animated slide-in/out for map visibility
- **Theme switching** - Light/dark mode support
- **Responsive design** - Adapts to different screen sizes

## Technical Implementation

### Core Technologies
- **Next.js 14** - React framework with App Router
- **react-globe.gl** - 3D globe visualization library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Modern icon library

### Data Sources
- **GeoJSON** - World countries from D3 Graph Gallery
- **ARGO Float Data** - Simulated oceanographic measurements
- **Geographic Labels** - Comprehensive Indian Ocean region coverage

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone or download the project**
   \`\`\`bash
   git clone <repository-url>
   cd argo-float-chat
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. **Required packages** (automatically installed):
   \`\`\`json
   {
     "react-globe.gl": "^2.27.0",
     "next": "^14.0.0",
     "react": "^18.0.0",
     "typescript": "^5.0.0",
     "tailwindcss": "^3.0.0",
     "lucide-react": "^0.400.0"
   }
   \`\`\`

4. **Start development server**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

5. **Open in browser**
   Navigate to `http://localhost:3000`

### Project Structure
\`\`\`
├── components/
│   ├── float-chat.tsx          # Main chat interface component
│   ├── argo-globe-3d.tsx       # 3D globe visualization component
│   └── ui/                     # Shadcn UI components
├── app/
│   ├── page.tsx                # Main application page
│   ├── layout.tsx              # Root layout with fonts
│   └── globals.css             # Global styles and theme
└── README.md                   # This documentation
\`\`\`

## Usage Guide

### Starting the Application
1. Launch the application - you'll see the chat interface
2. Click the **Globe button** in the header to reveal the 3D map
3. Use the **theme toggle** to switch between light/dark modes

### Interacting with the Chat
- **Quick queries** - Click suggested examples to get started
- **Natural language** - Ask questions like:
  - "Show salinity profiles near the equator in March 2023"
  - "Find nearest ARGO floats to 20°N, 65°E"
  - "Compare BGC parameters in Arabian Sea last 6 months"
- **Data actions** - Use "View Profiles" and "Export NetCDF" buttons

### Exploring the 3D Globe
- **Mouse controls**:
  - 🖱️ **Drag** to rotate the globe
  - 🔍 **Scroll** to zoom in/out
  - 📍 **Hover** over floats for detailed information
  - 🌍 **Click** countries for geographic info

### Understanding Float Data
- **Float positions** - Precise latitude/longitude coordinates
- **Status indicators** - Color-coded by operational status
- **Oceanographic data** - Temperature, salinity, depth measurements
- **Trajectory tracking** - Historical movement patterns

## Data Schema

### ARGO Float Interface
\`\`\`typescript
interface ArgoFloat {
  id: string;              // WMO identifier (e.g., "WMO_5906468")
  lat: number;             // Latitude coordinate
  lng: number;             // Longitude coordinate  
  name: string;            // Human-readable name
  status: 'active' | 'recent' | 'bgc';  // Operational status
  depth: number;           // Maximum profiling depth (meters)
  temperature?: number;    // Sea surface temperature (°C)
  salinity?: number;       // Salinity (PSU)
  lastUpdate: string;      // Last data transmission date
  trajectory?: Array<{lat: number; lng: number}>; // Movement history
}
\`\`\`

### Geographic Label Interface
\`\`\`typescript
interface GeographicLabel {
  lat: number;             // Label latitude
  lng: number;             // Label longitude
  name: string;            // Geographic feature name
  type: 'ocean' | 'sea' | 'country';  // Feature type
  size: number;            // Label size multiplier
}
\`\`\`

## Customization

### Adding New Floats
Edit `components/argo-globe-3d.tsx` and add to the `argoFloats` array:
\`\`\`typescript
{
  id: 'WMO_XXXXXX',
  lat: -XX.X,
  lng: XX.X,
  name: 'Float Name',
  status: 'active',
  depth: 2000,
  temperature: XX.X,
  salinity: XX.X,
  lastUpdate: '2024-01-15'
}
\`\`\`

### Modifying Geographic Labels
Add new labels to the `geographicLabels` array:
\`\`\`typescript
{ lat: XX, lng: XX, name: 'Feature Name', type: 'ocean', size: 1.5 }
\`\`\`

### Styling Customization
- **Colors** - Modify Tailwind classes in components
- **Globe appearance** - Adjust `react-globe.gl` props
- **Themes** - Update theme object in `float-chat.tsx`

## Troubleshooting

### Common Issues

1. **Globe not loading**
   - Ensure `react-globe.gl` is installed
   - Check browser console for WebGL errors
   - Verify internet connection for GeoJSON data

2. **Performance issues**
   - Reduce number of float points
   - Lower globe resolution settings
   - Close other browser tabs

3. **Styling problems**
   - Clear browser cache
   - Verify Tailwind CSS is properly configured
   - Check for conflicting CSS rules

### Browser Compatibility
- **Recommended**: Chrome 90+, Firefox 88+, Safari 14+
- **WebGL required** for 3D globe functionality
- **JavaScript enabled** for all interactive features

## Future Enhancements

### Planned Features
- **Real ARGO data integration** - Connect to live oceanographic databases
- **Advanced filtering** - Filter floats by date, depth, parameters
- **Data visualization** - Charts and graphs for profile analysis
- **Export capabilities** - Multiple data format support
- **User authentication** - Personal data queries and saved searches

### Technical Improvements
- **Performance optimization** - Lazy loading and data caching
- **Mobile responsiveness** - Touch-friendly 3D controls
- **Accessibility** - Screen reader support and keyboard navigation
- **Testing suite** - Comprehensive unit and integration tests

## Contributing

This is a proof-of-concept implementation for oceanographic data visualization. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational and research purposes. Please respect the terms of use for any external data sources.

---

**Built with ❤️ for the oceanographic research community**
