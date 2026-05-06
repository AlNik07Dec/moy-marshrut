import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { useWalkStore } from '@/stores/walkStore';

let subscription: Location.LocationSubscription | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let pedometerSubscription: ReturnType<typeof Pedometer.watchStepCount> | null = null;

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function startTracking(): Promise<boolean> {
  const granted = await requestLocationPermission();
  if (!granted) return false;

  useWalkStore.getState().startWalk();

  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 5,
      timeInterval: 3000,
    },
    (loc) => {
      useWalkStore.getState().addCoordinate({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    }
  );

  timerInterval = setInterval(() => {
    useWalkStore.getState().tickSecond();
  }, 1000);

  const isAvailable = await Pedometer.isAvailableAsync();
  if (isAvailable) {
    pedometerSubscription = Pedometer.watchStepCount((result) => {
      useWalkStore.getState().setStepCount(result.steps);
    });
  }

  return true;
}

export function stopTracking(): void {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (pedometerSubscription) {
    pedometerSubscription.remove();
    pedometerSubscription = null;
  }
}
