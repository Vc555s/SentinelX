# SOS Feature Integration Guide

This module contains the files necessary to implement a User SOS feature with an Admin Dashboard pinpoint map.

## 📦 Contents

- `src/pages/UserDashboard.tsx`: User-side SOS trigger with Geolocation and Reverse Geocoding.
- `src/pages/Dashboard.tsx`: Admin-side dashboard with focus state coordination.
- `src/components/DashboardMap.tsx`: TomTom map integration with animated "fly-to" and pulsing SOS markers.
- `src/components/AlertFeed.tsx`: Alert list with "View on Map" functionality.
- `src/lib/trafficOfficerData.ts`: Core data structures (`Alert`, `Incident`) and persistence logic.

## 🛠 Prerequisites

1.  **TomTom Maps SDK**:
    ```bash
    npm install @tomtom-international/web-sdk-maps
    ```
2.  **Lucide React** (Icons):
    ```bash
    npm install lucide-react
    ```
3.  **Shadcn UI** (Components used):
    - Button, Card, Badge, Input, Select, ScrollArea.
4.  **TomTom API Key**: Replace the key in `DashboardMap.tsx` and `UserDashboard.tsx` with your own.

## 🚀 Setup Steps

1.  **Data Models**: Update your types using `trafficOfficerData.ts`. Ensure the `Alert` object has an optional `coordinates: [number, number]` field.
2.  **User Trigger**: Use the `handleSOS` function in `UserDashboard.tsx`. It captures latitude/longitude and fetches the street address via TomTom.
3.  **Map Component**: Ensure `DashboardMap.tsx` receives the `focusPos` prop to enable the pinpoint feature.
4.  **Admin Feed**: Update `AlertFeed.tsx` to include the `onViewMap` callback, which should update the `focusedLocation` state in the parent Dashboard.

## 🚨 Customization
- The pulsing animation is defined via a dynamic `<style>` tag in `DashboardMap.tsx` (ID: `sos-map-animation`).
- Change colors or icons by modifying the `getDeviceColor` or `getTypeIcon` functions in the respective components.
