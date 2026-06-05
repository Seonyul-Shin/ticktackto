// Firebase Realtime Database Connector
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get, update, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getFirebaseConfig, isFirebaseConfigured } from "./config.js";

let app = null;
let db = null;
let activeListeners = [];

export function getDb() {
  if (db) return db;
  if (!isFirebaseConfigured()) return null;

  try {
    const config = getFirebaseConfig();
    app = initializeApp(config);
    db = getDatabase(app);
    return db;
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    return null;
  }
}

// Generate a random 6-digit numeric room code
function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates a multiplayer room.
 * @param {string} hostName - Name of the hosting player
 * @returns {Promise<string>} - The generated 6-digit room code
 */
export async function createRoom(hostName) {
  const database = getDb();
  if (!database) throw new Error("Firebase database not initialized.");

  let roomCode = generateRoomCode();
  let roomRef = ref(database, `rooms/${roomCode}`);
  
  // Ensure uniqueness
  let snapshot = await get(roomRef);
  while (snapshot.exists()) {
    roomCode = generateRoomCode();
    roomRef = ref(database, `rooms/${roomCode}`);
    snapshot = await get(roomRef);
  }

  const roomData = {
    status: "waiting",
    players: {
      X: hostName,
      O: ""
    },
    board: Array(9).fill(""),
    turn: "X",
    lastMoveTime: Date.now(),
    winner: null,
    rematch: {
      X: false,
      O: false
    }
  };

  await set(roomRef, roomData);
  
  // Automatically clean up room if host disconnects
  onDisconnect(roomRef).remove().catch(err => console.log("onDisconnect failed", err));

  return roomCode;
}

/**
 * Joins an existing multiplayer room.
 * @param {string} roomCode - The 6-digit room code
 * @param {string} guestName - The joining player's name
 * @returns {Promise<object>} - Room state
 */
export async function joinRoom(roomCode, guestName) {
  const database = getDb();
  if (!database) throw new Error("Firebase database not initialized.");

  const roomRef = ref(database, `rooms/${roomCode}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error("Room not found.");
  }

  const roomData = snapshot.val();
  if (roomData.status !== "waiting" || (roomData.players.O && roomData.players.O !== "")) {
    throw new Error("Room is already full or game has started.");
  }

  // Update room with joining player info and change status to playing
  const updates = {};
  updates[`rooms/${roomCode}/players/O`] = guestName;
  updates[`rooms/${roomCode}/status`] = "playing";
  updates[`rooms/${roomCode}/lastMoveTime`] = Date.now();

  await update(ref(database), updates);

  // Setup disconnect cleanup for guest
  const playerORef = ref(database, `rooms/${roomCode}/players/O`);
  const statusRef = ref(database, `rooms/${roomCode}/status`);
  const winnerRef = ref(database, `rooms/${roomCode}/winner`);

  onDisconnect(playerORef).set("").catch(e => {});
  // Set host as winner if guest leaves mid-game
  onDisconnect(statusRef).set("finished").catch(e => {});
  onDisconnect(winnerRef).set("host_victory_by_disconnect").catch(e => {});

  return roomData;
}

/**
 * Subscribes to realtime updates of a room.
 * @param {string} roomCode - The room code
 * @param {function} callback - Function called with new room data
 * @returns {function} - Unsubscribe function
 */
export function listenToRoom(roomCode, callback) {
  const database = getDb();
  if (!database) return () => {};

  const roomRef = ref(database, `rooms/${roomCode}`);
  
  const unsubscribe = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null); // Room was deleted
    }
  });

  activeListeners.push({ roomCode, unsubscribe });
  return unsubscribe;
}

/**
 * Updates the game board and turn in Firebase.
 * @param {string} roomCode - The room code
 * @param {string[]} newBoard - The updated 3x3 board
 * @param {string} nextTurn - The next active player ("X" or "O")
 */
export async function sendMove(roomCode, newBoard, nextTurn) {
  const database = getDb();
  if (!database) return;

  const roomRef = ref(database, `rooms/${roomCode}`);
  const updates = {
    board: newBoard,
    turn: nextTurn,
    lastMoveTime: Date.now()
  };

  await update(roomRef, updates);
}

/**
 * Declares the winner of the game.
 * @param {string} roomCode - Room code
 * @param {string} winnerSymbol - "X", "O", "draw", or "timeout_X" / "timeout_O"
 */
export async function sendGameOver(roomCode, winnerSymbol) {
  const database = getDb();
  if (!database) return;

  const roomRef = ref(database, `rooms/${roomCode}`);
  const updates = {
    status: "finished",
    winner: winnerSymbol
  };

  await update(roomRef, updates);
}

/**
 * Triggers a rematch or requests a rematch.
 * @param {string} roomCode - Room code
 * @param {string} playerSymbol - "X" or "O"
 * @param {boolean} requestState - Rematch request flag
 */
export async function sendRematchRequest(roomCode, playerSymbol, requestState) {
  const database = getDb();
  if (!database) return;

  const rematchRef = ref(database, `rooms/${roomCode}/rematch/${playerSymbol}`);
  await set(rematchRef, requestState);
}

/**
 * Reset room state for a new game.
 * @param {string} roomCode - Room code
 */
export async function resetRoomForRematch(roomCode) {
  const database = getDb();
  if (!database) return;

  const roomRef = ref(database, `rooms/${roomCode}`);
  const updates = {
    status: "playing",
    board: Array(9).fill(""),
    turn: "X",
    lastMoveTime: Date.now(),
    winner: null,
    rematch: {
      X: false,
      O: false
    }
  };

  await update(roomRef, updates);
}

/**
 * Cleans up and deletes a room when players leave.
 * @param {string} roomCode - Room code
 */
export async function deleteRoom(roomCode) {
  const database = getDb();
  if (!database) return;

  const roomRef = ref(database, `rooms/${roomCode}`);
  await remove(roomRef);
}
