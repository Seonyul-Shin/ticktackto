// Tic-Tac-Toe AI Player (Minimax)

// Checks if a player has won the game on a given board
function checkWinner(board) {
  const winLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];

  for (let line of winLines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every(square => square !== "")) {
    return "draw";
  }

  return null;
}

// Evaluates the board state score for Minimax
// Maximize AI ("O"), Minimize Human ("X")
function evaluateBoard(board, aiPlayer) {
  const opponent = aiPlayer === "X" ? "O" : "X";
  const winner = checkWinner(board);
  
  if (winner === aiPlayer) return 10;
  if (winner === opponent) return -10;
  if (winner === "draw") return 0;
  return null;
}

// Minimax algorithm implementation
function minimax(board, depth, isMax, aiPlayer) {
  const opponent = aiPlayer === "X" ? "O" : "X";
  const score = evaluateBoard(board, aiPlayer);

  // If game over, return the score
  if (score !== null) return score;

  if (isMax) {
    let best = -1000;
    for (let i = 0; i < 9; i++) {
      if (board[i] === "") {
        board[i] = aiPlayer;
        best = Math.max(best, minimax(board, depth + 1, false, aiPlayer));
        board[i] = ""; // Undo move
      }
    }
    return best;
  } else {
    let best = 1000;
    for (let i = 0; i < 9; i++) {
      if (board[i] === "") {
        board[i] = opponent;
        best = Math.min(best, minimax(board, depth + 1, true, aiPlayer));
        board[i] = ""; // Undo move
      }
    }
    return best;
  }
}

// Returns the best move index (0-8) using Minimax
function getBestMove(board, aiPlayer) {
  let bestVal = -1000;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (board[i] === "") {
      // Try move
      board[i] = aiPlayer;
      
      // Calculate move value
      let moveVal = minimax(board, 0, false, aiPlayer);
      
      // Undo move
      board[i] = "";

      if (moveVal > bestVal) {
        bestVal = moveVal;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

// Returns a random valid move index
function getRandomMove(board) {
  const availableMoves = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === "") {
      availableMoves.push(i);
    }
  }
  if (availableMoves.length === 0) return -1;
  const randomIndex = Math.floor(Math.random() * availableMoves.length);
  return availableMoves[randomIndex];
}

/**
 * Computes the next move for the AI.
 * @param {string[]} board - 9-element string array representing the board
 * @param {string} aiPlayer - Symbol of the AI ("X" or "O")
 * @param {string} difficulty - "easy" or "hard"
 * @returns {number} Move index (0-8)
 */
export function getAIMove(board, aiPlayer, difficulty = "hard") {
  if (difficulty === "easy") {
    // 20% chance of making the best move, 80% chance of random move
    // to give it a slightly human but easy feel
    if (Math.random() < 0.20) {
      return getBestMove(board, aiPlayer);
    }
    return getRandomMove(board);
  }
  
  // Hard mode: unbeatable Minimax
  return getBestMove(board, aiPlayer);
}
