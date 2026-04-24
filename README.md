# Health Tracker Mobile

Health Tracker Mobile is a React Native application built with Expo, designed to help users monitor their physical progress, workouts, sleep, and measurements.

## Features

- **Dashboard**: A comprehensive summary of your daily status, including sleep score, workout completion, and recent measurements.
- **Sleep Tracking**: Record and visualize sleep data, including sleep score, RHR (Resting Heart Rate), and sleep stages. Sync data with Google Fit and Ultrahuman.
- **Workouts**: Select and follow workout plans, track sets, reps, and weight, and view exercise history and performance suggestions.
- **Measurements**: Track various body measurements (weight, chest, waist, etc.) and visualize progress over time with charts.
- **Progress Photos**: Upload and compare progress photos from different dates to see visual changes.
- **Authentication**: Secure login using Google OAuth.

## Tech Stack

- **Framework**: [Expo](https://expo.dev/) / [React Native](https://reactnative.dev/)
- **UI Components**: [React Native Paper](https://reactnativepaper.com/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Charts**: [React Native Chart Kit](https://github.com/indiespirit/react-native-chart-kit)
- **API Client**: [Axios](https://axios-http.com/)
- **Testing**: [Jest](https://jestjs.io/), [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm or yarn
- Expo Go app on your mobile device (optional, for testing on real hardware)

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the Expo development server:

```bash
npm start
```

You can then run the app on:
- **Android Emulator**: Press `a`
- **iOS Simulator**: Press `i`
- **Web**: Press `w`

## Testing

The project uses Jest and React Native Testing Library for testing.

### Running Tests

To execute all tests, run:

```bash
npm test
```

### Test Structure

- `src/services/__tests__`: Unit tests for API service functions.
- `src/context/__tests__`: Tests for React context providers (e.g., AuthContext).
- `components/__tests__`: Tests for reusable UI components.
- `app/(tabs)/__tests__`: Integration tests for main application screens.

## Project Structure

- `app/`: Expo Router file-based routing and screens.
- `components/`: Reusable React components.
- `constants/`: Theme colors and other global constants.
- `src/services/`: API client and service functions.
- `src/context/`: React Context providers for state management.
- `assets/`: Images, fonts, and other static assets.

## License

This project is private and for personal use.
