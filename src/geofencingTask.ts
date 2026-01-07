import * as TaskManager from "expo-task-manager";

export const GEOFENCE_TASK_NAME = "TRIP_GEOFENCE_TASK";

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log("Geofencing task error:", error);
    return;
  }

  // data.locations is an array; we only need the latest point
  const { locations } = data as any;
  const location = locations && locations[0];
  if (!location) return;

  const { latitude, longitude } = location.coords;
  console.log("Background location update:", latitude, longitude);
  // TODO: You can add background geofence checks and notifications here if needed.
});
