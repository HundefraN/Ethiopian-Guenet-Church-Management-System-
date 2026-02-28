/**
 * Parses Google Maps URLs to extract latitude and longitude coordinates.
 * Supports common Google Maps URL formats.
 */

export interface ParsedCoords {
  lat: number;
  lng: number;
  zoom?: number;
}

/**
 * Parse Google Maps URL to extract coordinates.
 * Supports: @lat,lng,zoom | q=lat,lng | place/name/@lat,lng
 */
export function parseGoogleMapsUrl(url: string | null | undefined): ParsedCoords | null {
  if (!url || typeof url !== "string" || url.trim() === "") return null;

  const trimmed = url.trim();

  // Format: @lat,lng or @lat,lng,zoom (e.g. maps/@9.0192,38.7525,15z)
  const atMatch = trimmed.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,(\d+))?/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoord(lat, lng)) {
      return { lat, lng, zoom: atMatch[3] ? parseInt(atMatch[3], 10) : undefined };
    }
  }

  // Format: q=lat,lng or q=lat%2Clng (URL encoded)
  const qMatch = trimmed.match(/[?&]q=(-?\d+\.?\d*)[%2C,](-?\d+\.?\d*)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidCoord(lat, lng)) {
      return { lat, lng };
    }
  }

  // Format: ll=lat,lng (legacy)
  const llMatch = trimmed.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (llMatch) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    if (isValidCoord(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}

function isValidCoord(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Default Addis Ababa coordinates when no valid map link */
export const DEFAULT_ETHIOPIA_CENTER = { lat: 9.0192, lng: 38.7525, zoom: 10 };
