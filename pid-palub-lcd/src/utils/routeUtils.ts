import { RouteConfig, Stop } from '../types';

/**
 * Creates a reversed route configuration where stops are in opposite order,
 * preserving the exact segment travel times between adjacent pairs of stops.
 */
export function reverseRoute(route: RouteConfig): RouteConfig {
  const n = route.stops.length;
  if (n <= 1) return { ...route };

  const reversedStops: Stop[] = [];
  const timestamp = Date.now();

  for (let i = n - 1; i >= 0; i--) {
    const originalStop = route.stops[i];

    // Segment travel time:
    // For the new first stop (previously the terminus), time to start/arrive is either 1 min or previous stop 0's minutes
    // For subsequent stops, the travel time from the stop before it (which was originalStop[i+1])
    // is exactly originalStop[i+1].minutes!
    const travelTime =
      i === n - 1 ? (route.stops[0]?.minutes || 1) : (route.stops[i + 1]?.minutes || 2);

    reversedStops.push({
      ...originalStop,
      id: `${originalStop.id}-rev-${timestamp}-${i}`,
      minutes: travelTime,
    });
  }

  return {
    ...route,
    stops: reversedStops,
  };
}
