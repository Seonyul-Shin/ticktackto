// Firebase configuration helper.
// Allows users to enter their credentials through a settings panel in the game,
// storing it securely in localStorage, or falls back to an optional pre-configured object.

const DEFAULT_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export function getFirebaseConfig() {
  const saved = localStorage.getItem("tictactoe_firebase_config");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Ensure all required fields exist
      if (parsed.apiKey && parsed.databaseURL && parsed.projectId) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse saved Firebase config:", e);
    }
  }
  return DEFAULT_CONFIG;
}

export function saveFirebaseConfig(config) {
  localStorage.setItem("tictactoe_firebase_config", JSON.stringify(config));
}

export function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  return !!(config.apiKey && config.databaseURL && config.projectId);
}

export function clearFirebaseConfig() {
  localStorage.removeItem("tictactoe_firebase_config");
}
