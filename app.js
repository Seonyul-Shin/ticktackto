import { isFirebaseConfigured, getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from "./config.js";
import * as sfx from "./sfx.js";
import { getAIMove } from "./ai.js";
import * as fb from "./firebase.js";

// Game State variables
let currentGameMode = "local"; // "local", "ai", "online"
let aiDifficulty = "hard"; // "easy", "hard"
let playerSymbol = "X"; // Local player's symbol in online mode ("X" or "O")
let activePlayer = "X"; // Whose turn it is ("X" or "O")
let board = Array(9).fill("");
let gameActive = false;

// Scoreboard
let scores = { X: 0, O: 0, ties: 0 };
let playerNames = { X: "Player X", O: "Player O" };

// Timer variables
let timerInterval = null;
let timeRemaining = 15;
let lastMoveTimestamp = 0;

// Online Multiplayer details
let currentRoomCode = null;
let unsubscribeRoomListener = null;
let isHost = false;
let onlineRoomState = null;

// DOM Elements
const lobbyScreen = document.getElementById("lobby-screen");
const roomScreen = document.getElementById("room-screen");
const gameScreen = document.getElementById("game-screen");

const settingsModal = document.getElementById("settings-modal");
const resultModal = document.getElementById("result-modal");

const boardEl = document.getElementById("board");
const squares = document.querySelectorAll(".square");

const turnDisplay = document.getElementById("turn-display");
const turnText = document.getElementById("turn-text");

const timerBox = document.getElementById("timer-box");
const timerProgress = document.getElementById("timer-progress");
const timerNum = document.getElementById("timer-num");

const scoreXLabel = document.getElementById("score-x-label");
const scoreOLabel = document.getElementById("score-o-label");
const scoreXVal = document.getElementById("score-x");
const scoreOVal = document.getElementById("score-o");
const scoreTieVal = document.getElementById("score-tie");

const resultTitle = document.getElementById("result-title");
const resultSubtext = document.getElementById("result-subtext");

const soundToggleBtn = document.getElementById("sound-toggle-btn");
const soundSettingBtn = document.getElementById("sound-setting-btn");
const settingsToggleBtn = document.getElementById("settings-toggle-btn");
const settingsCloseBtn = document.getElementById("settings-close-btn");
const settingsSaveBtn = document.getElementById("settings-save-btn");
const settingsClearBtn = document.getElementById("settings-clear-btn");

const startLocalBtn = document.getElementById("start-local-btn");
const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const leaveRoomBtn = document.getElementById("leave-room-btn");
const copyCodeBtn = document.getElementById("copy-code-btn");
const gameResetBtn = document.getElementById("game-reset-btn");
const gameLeaveBtn = document.getElementById("game-leave-btn");
const modalRematchBtn = document.getElementById("modal-rematch-btn");
const modalCloseBtn = document.getElementById("modal-close-btn");

const playerNameInput = document.getElementById("player-name-input");
const roomCodeInput = document.getElementById("room-code-input");
const displayRoomCode = document.getElementById("display-room-code");
const hostNameEl = document.getElementById("host-name");
const guestNameEl = document.getElementById("guest-name");
const guestSlot = document.getElementById("guest-slot");
const waitingStatus = document.getElementById("waiting-status");

// Game Modes selector
const modeLocalBtn = document.getElementById("mode-local-btn");
const modeAIBtn = document.getElementById("mode-ai-btn");
const aiDifficultyGroup = document.getElementById("ai-difficulty-group");
const diffEasyBtn = document.getElementById("diff-easy-btn");
const diffHardBtn = document.getElementById("diff-hard-btn");

// Firebase settings elements
const fbApiKey = document.getElementById("fb-api-key");
const fbDbUrl = document.getElementById("fb-db-url");
const fbProjectId = document.getElementById("fb-project-id");
const multiplayerOptions = document.getElementById("multiplayer-options");

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
];

// Initialize the Application
window.addEventListener("DOMContentLoaded", () => {
  loadFirebaseConfigInputs();
  checkFirebaseIntegration();
  setupEventListeners();
  updateSoundUI();
});

// Toast / Notification helper
function showToast(message) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Load configurations
function loadFirebaseConfigInputs() {
  const config = getFirebaseConfig();
  fbApiKey.value = config.apiKey || "";
  fbDbUrl.value = config.databaseURL || "";
  fbProjectId.value = config.projectId || "";
}

function checkFirebaseIntegration() {
  if (isFirebaseConfigured()) {
    multiplayerOptions.classList.remove("hidden");
  } else {
    multiplayerOptions.classList.add("hidden");
    if (currentGameMode === "online") {
      setGameMode("local");
    }
  }
}

// Setup all click handlers and event bindings
function setupEventListeners() {
  // Game Modes Cards
  modeLocalBtn.addEventListener("click", () => {
    sfx.playClick();
    setGameMode("local");
  });
  
  modeAIBtn.addEventListener("click", () => {
    sfx.playClick();
    setGameMode("ai");
  });

  diffEasyBtn.addEventListener("click", () => {
    sfx.playClick();
    setAIDifficulty("easy");
  });

  diffHardBtn.addEventListener("click", () => {
    sfx.playClick();
    setAIDifficulty("hard");
  });

  // Start Play Local/AI
  startLocalBtn.addEventListener("click", () => {
    sfx.playClick();
    startGame();
  });

  // Settings Modal toggles
  settingsToggleBtn.addEventListener("click", () => {
    sfx.playClick();
    loadFirebaseConfigInputs();
    settingsModal.classList.add("active");
  });

  settingsCloseBtn.addEventListener("click", () => {
    sfx.playClick();
    settingsModal.classList.remove("active");
  });

  settingsSaveBtn.addEventListener("click", () => {
    sfx.playClick();
    const config = {
      apiKey: fbApiKey.value.trim(),
      databaseURL: fbDbUrl.value.trim(),
      projectId: fbProjectId.value.trim(),
      authDomain: fbProjectId.value.trim() ? `${fbProjectId.value.trim()}.firebaseapp.com` : "",
      storageBucket: fbProjectId.value.trim() ? `${fbProjectId.value.trim()}.appspot.com` : ""
    };

    if (config.apiKey && config.databaseURL && config.projectId) {
      saveFirebaseConfig(config);
      showToast("Firebase 설정이 저장되었습니다!");
      checkFirebaseIntegration();
      settingsModal.classList.remove("active");
    } else if (!config.apiKey && !config.databaseURL && !config.projectId) {
      clearFirebaseConfig();
      showToast("설정이 지워졌습니다. 로컬 플레이만 가능합니다.");
      checkFirebaseIntegration();
      settingsModal.classList.remove("active");
    } else {
      showToast("모든 필수 항목을 입력해주세요.");
    }
  });

  settingsClearBtn.addEventListener("click", () => {
    sfx.playClick();
    fbApiKey.value = "";
    fbDbUrl.value = "";
    fbProjectId.value = "";
    clearFirebaseConfig();
    checkFirebaseIntegration();
    showToast("설정이 초기화되었습니다.");
  });

  // Sound Buttons
  const toggleSoundFn = () => {
    const enabled = sfx.toggleSound();
    updateSoundUI();
    sfx.playClick();
  };
  soundToggleBtn.addEventListener("click", toggleSoundFn);
  soundSettingBtn.addEventListener("click", toggleSoundFn);

  // Board Squares interactions
  squares.forEach(square => {
    square.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.getAttribute("data-index"));
      handleSquareClick(idx);
    });
  });

  // Multiplayer: Create Room
  createRoomBtn.addEventListener("click", async () => {
    sfx.playClick();
    const name = playerNameInput.value.trim() || "호스트";
    try {
      showToast("방 코드를 생성하는 중...");
      isHost = true;
      playerSymbol = "X";
      currentRoomCode = await fb.createRoom(name);
      
      displayRoomCode.innerText = currentRoomCode;
      hostNameEl.innerText = name;
      guestNameEl.innerText = "대기 중...";
      guestSlot.classList.remove("filled");
      waitingStatus.innerText = "상대방의 접속을 기다리는 중...";
      
      switchScreen("room");
      subscribeRoom(currentRoomCode);
    } catch (e) {
      showToast("방 생성 실패: " + e.message);
    }
  });

  // Multiplayer: Join Room
  joinRoomBtn.addEventListener("click", async () => {
    sfx.playClick();
    const name = playerNameInput.value.trim() || "게스트";
    const code = roomCodeInput.value.trim();

    if (code.length !== 6 || isNaN(code)) {
      showToast("올바른 6자리 숫자를 입력해주세요.");
      return;
    }

    try {
      showToast("방에 입장하는 중...");
      isHost = false;
      playerSymbol = "O";
      currentRoomCode = code;
      
      const roomData = await fb.joinRoom(code, name);
      
      displayRoomCode.innerText = code;
      hostNameEl.innerText = roomData.players.X;
      guestNameEl.innerText = name;
      guestSlot.classList.add("filled");
      
      switchScreen("room");
      subscribeRoom(code);
    } catch (e) {
      showToast("방 입장 실패: " + e.message);
    }
  });

  // Leaving multiplayer room during wait
  leaveRoomBtn.addEventListener("click", async () => {
    sfx.playClick();
    cleanupRoomAndListeners();
    switchScreen("lobby");
  });

  // Copy Room Code
  copyCodeBtn.addEventListener("click", () => {
    sfx.playClick();
    if (currentRoomCode) {
      navigator.clipboard.writeText(currentRoomCode).then(() => {
        showToast("방 코드가 클립보드에 복사되었습니다!");
      }).catch(e => {
        showToast("복사 실패. 수동으로 복사하세요: " + currentRoomCode);
      });
    }
  });

  // In-Game action buttons
  gameResetBtn.addEventListener("click", () => {
    sfx.playClick();
    if (currentGameMode === "online") {
      fb.sendRematchRequest(currentRoomCode, playerSymbol, true);
      showToast("다시 하기 요청을 보냈습니다.");
    } else {
      resetGameLocal();
    }
  });

  gameLeaveBtn.addEventListener("click", () => {
    sfx.playClick();
    if (currentGameMode === "online") {
      cleanupRoomAndListeners();
    }
    switchScreen("lobby");
  });

  // Result modal buttons
  modalRematchBtn.addEventListener("click", () => {
    sfx.playClick();
    resultModal.classList.remove("active");
    if (currentGameMode === "online") {
      fb.sendRematchRequest(currentRoomCode, playerSymbol, true);
      showToast("다시 하기 요청을 보냈습니다.");
    } else {
      resetGameLocal();
    }
  });

  modalCloseBtn.addEventListener("click", () => {
    sfx.playClick();
    resultModal.classList.remove("active");
  });
}

function updateSoundUI() {
  const enabled = sfx.isSoundEnabled();
  if (enabled) {
    soundToggleBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    soundSettingBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> 소리 활성화됨';
    soundSettingBtn.className = "btn btn-secondary";
  } else {
    soundToggleBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    soundSettingBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> 소리 음소거됨';
    soundSettingBtn.className = "btn btn-outline";
  }
}

// UI State / Screen Navigator
function switchScreen(screenName) {
  lobbyScreen.classList.remove("active");
  roomScreen.classList.remove("active");
  gameScreen.classList.remove("active");

  if (screenName === "lobby") {
    lobbyScreen.classList.add("active");
  } else if (screenName === "room") {
    roomScreen.classList.add("active");
  } else if (screenName === "game") {
    gameScreen.classList.add("active");
  }
}

function setGameMode(mode) {
  currentGameMode = mode;
  modeLocalBtn.classList.remove("active");
  modeAIBtn.classList.remove("active");
  
  if (mode === "local") {
    modeLocalBtn.classList.add("active");
    aiDifficultyGroup.classList.add("hidden");
  } else if (mode === "ai") {
    modeAIBtn.classList.add("active");
    aiDifficultyGroup.classList.remove("hidden");
  }
}

function setAIDifficulty(diff) {
  aiDifficulty = diff;
  diffEasyBtn.classList.remove("active");
  diffHardBtn.classList.remove("active");
  
  if (diff === "easy") {
    diffEasyBtn.classList.add("active");
  } else {
    diffHardBtn.classList.add("active");
  }
}

// ----------------------------------------------------
// LOCAL & AI GAME LOOP PLAYGROUND
// ----------------------------------------------------

function startGame() {
  currentGameMode = modeAIBtn.classList.contains("active") ? "ai" : "local";
  const pName = playerNameInput.value.trim() || "플레이어";
  
  // Set names for local scoreboard
  if (currentGameMode === "ai") {
    playerNames.X = pName;
    playerNames.O = `인공지능 (${aiDifficulty === "easy" ? "쉬움" : "어려움"})`;
  } else {
    playerNames.X = `${pName} X`;
    playerNames.O = `${pName} O`;
  }

  // Clear scores
  scores.X = 0;
  scores.O = 0;
  scores.ties = 0;

  updateScoreboardUI();
  switchScreen("game");
  resetGameLocal();
}

function resetGameLocal() {
  board = Array(9).fill("");
  activePlayer = "X";
  gameActive = true;
  
  // Clear HTML grid items
  squares.forEach(sq => {
    sq.innerHTML = "";
    sq.className = "square";
  });

  updateTurnDisplay();
  startTimer();
}

// Start Turn Timer
function startTimer() {
  clearInterval(timerInterval);
  timeRemaining = 15;
  timerNum.innerText = timeRemaining;
  timerNum.classList.remove("danger");
  
  // Reset SVGs progress circle stroke
  timerProgress.style.strokeDashoffset = "0";
  timerProgress.classList.remove("warning");

  lastMoveTimestamp = Date.now();

  timerInterval = setInterval(() => {
    // If online, check elapsed database seconds
    if (currentGameMode === "online" && onlineRoomState) {
      const elapsed = (Date.now() - onlineRoomState.lastMoveTime) / 1000;
      timeRemaining = Math.max(0, Math.ceil(15 - elapsed));
    } else {
      timeRemaining--;
    }

    timerNum.innerText = timeRemaining;

    // Progress circle: 126 is total stroke-dasharray (circumference of r=20 circle)
    const offset = 126 - (126 * (timeRemaining / 15));
    timerProgress.style.strokeDashoffset = offset;

    // Trigger tick sound effects
    if (timeRemaining <= 3 && timeRemaining > 0) {
      sfx.playTimerAlert();
      timerNum.classList.add("danger");
      timerProgress.classList.add("warning");
    } else {
      sfx.playTick();
    }

    // Time's up!
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    }
  }, 1000);
}

// Handle time-out defeat
function handleTimeout() {
  if (!gameActive) return;
  gameActive = false;
  sfx.playTimeout();

  // The player whose turn it was loses by timeout
  const timeoutPlayer = activePlayer;
  const winner = timeoutPlayer === "X" ? "O" : "X";
  
  if (currentGameMode === "online") {
    // Only the timed-out player or the host submits the game over to prevent double submissions
    if (timeoutPlayer === playerSymbol) {
      fb.sendGameOver(currentRoomCode, `timeout_${timeoutPlayer}`);
    }
  } else {
    // Increment score
    scores[winner]++;
    updateScoreboardUI();
    showResult(`timeout_${timeoutPlayer}`);
  }
}

// Handle Board Clicks
function handleSquareClick(index) {
  if (!gameActive || board[index] !== "") return;

  // If online, verify if it's the player's turn
  if (currentGameMode === "online") {
    if (activePlayer !== playerSymbol) {
      showToast("당신의 차례가 아닙니다!");
      return;
    }
    
    // Play move local immediately, then push to Firebase
    sfx.playClick();
    board[index] = playerSymbol;
    drawSymbol(index, playerSymbol);
    
    const nextTurn = playerSymbol === "X" ? "O" : "X";
    
    // Check local win first to submit GameOver if match concludes
    const win = checkWinnerLocal();
    if (win) {
      gameActive = false;
      fb.sendGameOver(currentRoomCode, win.winner);
    } else {
      fb.sendMove(currentRoomCode, board, nextTurn);
    }
    return;
  }

  // Local/AI Mode
  sfx.playClick();
  board[index] = activePlayer;
  drawSymbol(index, activePlayer);

  const win = checkWinnerLocal();
  if (win) {
    handleLocalGameOver(win);
  } else {
    // Switch turn
    activePlayer = activePlayer === "X" ? "O" : "X";
    updateTurnDisplay();
    startTimer();

    // AI Turn Trigger
    if (currentGameMode === "ai" && activePlayer === "O" && gameActive) {
      // Small visual delay for AI decision-making (makes it feel natural)
      gameActive = false; // Block user inputs
      setTimeout(() => {
        const aiMove = getAIMove(board, "O", aiDifficulty);
        if (aiMove !== -1) {
          sfx.playClick();
          board[aiMove] = "O";
          drawSymbol(aiMove, "O");

          const aiWin = checkWinnerLocal();
          gameActive = true; // Unblock inputs
          
          if (aiWin) {
            handleLocalGameOver(aiWin);
          } else {
            activePlayer = "X";
            updateTurnDisplay();
            startTimer();
          }
        }
      }, 600);
    }
  }
}

// Drawing animated SVGs inside square grid cells
function drawSymbol(index, symbol) {
  const cell = squares[index];
  cell.innerHTML = ""; // Clear

  if (symbol === "X") {
    cell.innerHTML = `
      <svg class="symbol-svg" viewBox="0 0 100 100">
        <line class="symbol-path x-path-1" x1="22" y1="22" x2="78" y2="78" />
        <line class="symbol-path x-path-2" x1="78" y1="22" x2="22" y2="78" />
      </svg>
    `;
    cell.classList.add("x-placed");
  } else if (symbol === "O") {
    cell.innerHTML = `
      <svg class="symbol-svg" viewBox="0 0 100 100">
        <circle class="symbol-path o-path" cx="50" cy="50" r="38" />
      </svg>
    `;
    cell.classList.add("o-placed");
  }
}

function checkWinnerLocal() {
  for (let pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], pattern };
    }
  }
  if (board.every(cell => cell !== "")) {
    return { winner: "draw", pattern: null };
  }
  return null;
}

function handleLocalGameOver(winResult) {
  gameActive = false;
  clearInterval(timerInterval);

  if (winResult.winner === "draw") {
    scores.ties++;
    sfx.playDraw();
  } else {
    scores[winResult.winner]++;
    // Highlight winning squares
    winResult.pattern.forEach(idx => {
      squares[idx].classList.add("winning-line");
    });
    sfx.playWin();
  }
  updateScoreboardUI();
  
  // Wait brief moment so users can enjoy the grid SVG animation before modal popup
  setTimeout(() => {
    showResult(winResult.winner);
  }, 700);
}

function updateTurnDisplay() {
  turnDisplay.className = `turn-indicator ${activePlayer.toLowerCase()}-turn`;
  
  if (currentGameMode === "online") {
    const currentName = playerNames[activePlayer];
    if (activePlayer === playerSymbol) {
      turnText.innerText = `내 차례 (${playerSymbol})`;
    } else {
      turnText.innerText = `${currentName}의 차례`;
    }
  } else {
    turnText.innerText = `${playerNames[activePlayer]}의 차례`;
  }
}

function updateScoreboardUI() {
  scoreXLabel.innerText = playerNames.X;
  scoreOLabel.innerText = playerNames.O;
  
  scoreXVal.innerText = scores.X;
  scoreOVal.innerText = scores.O;
  scoreTieVal.innerText = scores.ties;
}

// Results and Firework effects
function showResult(winner) {
  resultTitle.className = "winner-message";
  
  // Custom confetti configs
  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  if (winner === "draw") {
    resultTitle.innerText = "무승부!";
    resultTitle.classList.add("tie-win");
    resultSubtext.innerText = "막상막하의 승부였습니다! 다시 겨뤄보세요.";
    sfx.playDraw();
  } else if (winner.startsWith("timeout_")) {
    const loser = winner.split("_")[1];
    const winPlayer = loser === "X" ? "O" : "X";
    
    resultTitle.innerText = `${winPlayer} 승리!`;
    resultTitle.classList.add(winPlayer.toLowerCase() + "-win");
    resultSubtext.innerText = `시간 초과! ${playerNames[loser]}의 시간 부족으로 기권패하였습니다.`;
    
    sfx.playWin();
    if (currentGameMode === "online" && winPlayer === playerSymbol) {
      triggerConfetti();
    } else if (currentGameMode !== "online" && (winPlayer === "X" || (currentGameMode === "local" && winPlayer === "O"))) {
      triggerConfetti();
    }
  } else {
    // Normal Win
    resultTitle.innerText = `${playerNames[winner]} 승리!`;
    resultTitle.classList.add(winner.toLowerCase() + "-win");
    resultSubtext.innerText = `승리를 축하합니다! 화려한 플레이였습니다.`;
    
    sfx.playWin();
    
    // Play fireworks confetti
    if (currentGameMode === "online" && winner === playerSymbol) {
      triggerConfetti();
    } else if (currentGameMode !== "online" && (winner === "X" || (currentGameMode === "local" && winner === "O"))) {
      triggerConfetti();
    }
  }

  // Adjust Rematch Button state
  if (currentGameMode === "online") {
    modalRematchBtn.innerText = "다시 하기 (요청)";
    modalRematchBtn.disabled = false;
  } else {
    modalRematchBtn.innerText = "다시 하기";
    modalRematchBtn.disabled = false;
  }

  resultModal.classList.add("active");
}

// ----------------------------------------------------
// MULTIPLAYER FIREBASE REALTIME LOOP
// ----------------------------------------------------

function subscribeRoom(roomCode) {
  // Clear any existing listener
  if (unsubscribeRoomListener) unsubscribeRoomListener();

  unsubscribeRoomListener = fb.listenToRoom(roomCode, (room) => {
    if (!room) {
      // Room was deleted or shut down
      showToast("대기방이 닫혔거나 존재하지 않습니다.");
      cleanupRoomAndListeners();
      switchScreen("lobby");
      return;
    }

    onlineRoomState = room;
    
    // 1. Sync Lobby User State
    if (room.status === "waiting") {
      hostNameEl.innerText = room.players.X;
      if (room.players.O && room.players.O !== "") {
        guestNameEl.innerText = room.players.O;
        guestSlot.classList.add("filled");
      } else {
        guestNameEl.innerText = "대기 중...";
        guestSlot.classList.remove("filled");
      }
    }

    // 2. Transits screen from lobby to game when O player joins
    if (room.status === "playing" && gameScreen.style.display !== "flex") {
      playerNames.X = room.players.X;
      playerNames.O = room.players.O;
      
      scores.X = 0;
      scores.O = 0;
      scores.ties = 0;
      updateScoreboardUI();
      
      switchScreen("game");
      sfx.playWin(); // Celebrate start
      showToast("게임이 곧 시작됩니다! 실시간 대전!");
    }

    // 3. Game Playing updates
    if (room.status === "playing") {
      gameActive = true;
      activePlayer = room.turn;
      
      // Update Board drawing on changes
      for (let i = 0; i < 9; i++) {
        if (board[i] !== room.board[i]) {
          board[i] = room.board[i];
          drawSymbol(i, board[i]);
          
          // Trigger placing click sounds
          if (board[i] !== "") {
            sfx.playClick();
          }
        }
      }

      // Highlight winning lines if any
      squares.forEach(sq => sq.classList.remove("winning-line"));

      updateTurnDisplay();
      startTimer();
    }

    // 4. Game GameOver updates
    if (room.status === "finished") {
      gameActive = false;
      clearInterval(timerInterval);

      // Sync final board state
      for (let i = 0; i < 9; i++) {
        if (board[i] !== room.board[i]) {
          board[i] = room.board[i];
          drawSymbol(i, board[i]);
        }
      }

      // Highlight winning squares
      const win = checkWinnerLocal();
      if (win && win.pattern) {
        win.pattern.forEach(idx => {
          squares[idx].classList.add("winning-line");
        });
      }

      // Update local scores
      if (room.winner === "draw") {
        scores.ties++;
      } else if (room.winner.startsWith("timeout_")) {
        const loser = room.winner.split("_")[1];
        const winner = loser === "X" ? "O" : "X";
        scores[winner]++;
      } else {
        scores[room.winner]++;
      }
      updateScoreboardUI();

      // Rematch buttons handling
      const rX = room.rematch?.X || false;
      const rO = room.rematch?.O || false;

      // Update rematch UI message
      if (rX && rO) {
        // Both accepted rematch! Host triggers reset
        if (isHost) {
          fb.resetRoomForRematch(currentRoomCode);
        }
        resultModal.classList.remove("active");
      } else {
        // One player requested rematch
        if (playerSymbol === "X" && rX) {
          modalRematchBtn.innerText = "대기 중...";
          modalRematchBtn.disabled = true;
        } else if (playerSymbol === "O" && rO) {
          modalRematchBtn.innerText = "대기 중...";
          modalRematchBtn.disabled = true;
        } else if (rX || rO) {
          modalRematchBtn.innerText = "수락하기";
        }
      }

      // Pop result modal if not active already
      if (!resultModal.classList.contains("active")) {
        setTimeout(() => {
          showResult(room.winner);
        }, 700);
      }
    }
  });
}

function cleanupRoomAndListeners() {
  clearInterval(timerInterval);
  if (unsubscribeRoomListener) {
    unsubscribeRoomListener();
    unsubscribeRoomListener = null;
  }
  
  if (currentRoomCode) {
    if (isHost) {
      fb.deleteRoom(currentRoomCode).catch(e => console.log("Delete room failed", e));
    }
  }

  currentRoomCode = null;
  onlineRoomState = null;
  gameActive = false;
}
