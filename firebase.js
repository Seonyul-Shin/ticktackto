// Firebase Realtime Database Connector (Highly Optimized for Minimum Bandwidth and Storage)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get, update, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getFirebaseConfig, isFirebaseConfigured } from "./config.js";

let app = null;
let db = null;
let activeListeners = [];

// Board conversions: Array of 9 strings <-> 9-char string (using '.' for empty cells)
export function boardToArray(boardStr) {
  if (!boardStr) return Array(9).fill("");
  return boardStr.split("").map(char => char === "." ? "" : char);
}

export function boardToString(boardArr) {
  return boardArr.map(val => val === "" ? "." : val).join("");
}

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
 * Key mapping for minimal storage:
 * - s: status (waiting | playing | finished)
 * - p: players (X, O names)
 * - b: board string (".........")
 * - t: turn (X | O)
 * - m: lastMoveTime (timestamp)
 * - w: winner
 * - r: rematch requests (X, O booleans)
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
    s: "waiting",
    p: {
      X: hostName,
      O: ""
    },
    b: ".........",
    t: "X",
    m: Date.now(),
    w: null,
    r: {
      X: false,
      O: false
    }
  };

  await set(roomRef, roomData);
  
  // Automatically clean up room if host disconnects to save storage
  onDisconnect(roomRef).remove().catch(err => console.log("onDisconnect failed", err));

  return roomCode;
}

/**
 * Joins an existing multiplayer room.
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
  if (roomData.s !== "waiting" || (roomData.p.O && roomData.p.O !== "")) {
    throw new Error("Room is already full or game has started.");
  }

  // Update room with guest info and change status to playing
  const updates = {};
  updates[`rooms/${roomCode}/p/O`] = guestName;
  updates[`rooms/${roomCode}/s`] = "playing";
  updates[`rooms/${roomCode}/m`] = Date.now();

  await update(ref(database), updates);

  // Setup disconnect cleanup for guest
  const playerORef = ref(database, `rooms/${roomCode}/p/O`);
  const statusRef = ref(database, `rooms/${roomCode}/s`);
  const winnerRef = ref(database, `rooms/${roomCode}/w`);

  onDisconnect(playerORef).set("").catch(e => {});
  // Set host as winner if guest leaves mid-game
  onDisconnect(statusRef).set("finished").catch(e => {});
  onDisconnect(winnerRef).set("host_victory_by_disconnect").catch(e => {});

  return roomData;
}

/**
 * Subscribes to realtime updates of a room.
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
 */
export async function sendMove(roomCode, newBoard, nextTurn) {
  const database = getDb();
  if (!database) return;

  const roomRef = ref(database, `rooms/${roomCode}`);
  const updates = {
    b: boardToString(newBoard),
    t: nextTurn,
    m: Date.now()
  };

  await update(roomRef, updates);
}

/**
 * Declares the winner of the game.
 */
export async function sendGameOver(roomCode, winnerSymbol) {
  const database = getDb();
  if (!database) return;

  const roomRef = ref(database, `rooms/${roomCode}`);
  const updates = {
    s: "finished",
    w: winnerSymbol
  };

  await update(roomRef, updates);
}

/**
 * Triggers a rematch or requests a rematch.
 */
export async function sendRematchRequest(roomCode, playerSymbol, requestState) {
  const database = getDb();
  if (!database) return;

  const rematchRef = ref(database, `rooms/${roomCode}/r/${playerSymbol}`);
  await set(rematchRef, requestState);
}

/**
 * Reset room state for a new game.
 */
export async function resetRoomForRematch(roomCode) {
  const database = getDb();
  if (!database) return;

  const roomRef = ref(database, `rooms/${roomCode}`);
  const updates = {
    s: "playing",
    b: ".........",
    t: "X",
    m: Date.now(),
    w: null,
    r: {
      X: false,
      O: false
    }
  };

  await update(roomRef, updates);
}

/**
 * Cleans up and deletes a room when players leave.
 */
export async function deleteRoom(roomCode) {
  const database = getDb();
  if (!database) return;

  const roomRef = ref(database, `rooms/${roomCode}`);
  await remove(roomRef);
}
