(function (global) {
  'use strict';

  const PIECE_TYPES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
  const PROMOTION_TYPES = ['queen', 'rook', 'bishop', 'knight'];

  function opponent(color) {
    return color === 'white' ? 'black' : 'white';
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function clonePiece(piece) {
    return piece ? { type: piece.type, color: piece.color } : null;
  }

  function cloneBoard(board) {
    return board.map((row) => row.map(clonePiece));
  }

  function emptyBoard() {
    return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
  }

  function algebraicToSquare(a) {
    if (typeof a !== 'string' || a.length < 2) throw new Error(`Invalid square: ${a}`);
    const file = a[0].toLowerCase();
    const rank = parseInt(a[1], 10);
    const c = file.charCodeAt(0) - 'a'.charCodeAt(0);
    const r = 8 - rank;
    if (!inBounds(r, c)) throw new Error(`Invalid square: ${a}`);
    return { r, c };
  }

  function squareToAlgebraic(sq) {
    const file = String.fromCharCode('a'.charCodeAt(0) + sq.c);
    const rank = String(8 - sq.r);
    return `${file}${rank}`;
  }

  function normalizeSquare(square) {
    if (typeof square === 'string') return algebraicToSquare(square);
    if (!square || typeof square !== 'object') throw new Error(`Invalid square: ${square}`);
    if (typeof square.r === 'number' && typeof square.c === 'number') return { r: square.r, c: square.c };
    if (typeof square.row === 'number' && typeof square.col === 'number') return { r: square.row, c: square.col };
    throw new Error(`Invalid square: ${JSON.stringify(square)}`);
  }

  function createInitialBoard() {
    const board = emptyBoard();

    const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

    for (let c = 0; c < 8; c++) {
      board[0][c] = { type: backRank[c], color: 'black' };
      board[1][c] = { type: 'pawn', color: 'black' };
      board[6][c] = { type: 'pawn', color: 'white' };
      board[7][c] = { type: backRank[c], color: 'white' };
    }

    return board;
  }

  function copyCastlingRights(castlingRights) {
    return {
      white: {
        kingside: !!castlingRights.white?.kingside,
        queenside: !!castlingRights.white?.queenside,
      },
      black: {
        kingside: !!castlingRights.black?.kingside,
        queenside: !!castlingRights.black?.queenside,
      },
    };
  }

  function createInitialGameState() {
    const state = {
      board: createInitialBoard(),
      turn: 'white',
      castlingRights: {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true },
      },
      enPassant: null,
      halfmoveClock: 0,
      fullmoveNumber: 1,
      history: [],
      positionCounts: new Map(),
    };

    const key = positionKey(state);
    state.positionCounts.set(key, 1);
    return state;
  }

  function toBoardLike(stateOrBoard) {
    if (Array.isArray(stateOrBoard)) {
      return {
        board: stateOrBoard,
        turn: 'white',
        castlingRights: { white: { kingside: false, queenside: false }, black: { kingside: false, queenside: false } },
        enPassant: null,
      };
    }
    if (!stateOrBoard || !Array.isArray(stateOrBoard.board)) throw new Error('Expected game state with .board');
    return stateOrBoard;
  }

  function findKing(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'king' && p.color === color) return { r, c };
      }
    }
    return null;
  }

  function isSquareAttacked(stateOrBoard, square, byColor) {
    const state = toBoardLike(stateOrBoard);
    const board = state.board;
    const sq = normalizeSquare(square);

    const pawnDir = byColor === 'white' ? -1 : 1;
    const pawnAttackers = [
      { r: sq.r - pawnDir, c: sq.c - 1 },
      { r: sq.r - pawnDir, c: sq.c + 1 },
    ];

    for (const a of pawnAttackers) {
      if (!inBounds(a.r, a.c)) continue;
      const p = board[a.r][a.c];
      if (p && p.color === byColor && p.type === 'pawn') return true;
    }

    const knightDeltas = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];

    for (const [dr, dc] of knightDeltas) {
      const r = sq.r + dr;
      const c = sq.c + dc;
      if (!inBounds(r, c)) continue;
      const p = board[r][c];
      if (p && p.color === byColor && p.type === 'knight') return true;
    }

    const bishopDirs = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
    const rookDirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    function rayAttacked(dirs, attackers) {
      for (const [dr, dc] of dirs) {
        let r = sq.r + dr;
        let c = sq.c + dc;
        while (inBounds(r, c)) {
          const p = board[r][c];
          if (p) {
            if (p.color === byColor && attackers.includes(p.type)) return true;
            break;
          }
          r += dr;
          c += dc;
        }
      }
      return false;
    }

    if (rayAttacked(bishopDirs, ['bishop', 'queen'])) return true;
    if (rayAttacked(rookDirs, ['rook', 'queen'])) return true;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = sq.r + dr;
        const c = sq.c + dc;
        if (!inBounds(r, c)) continue;
        const p = board[r][c];
        if (p && p.color === byColor && p.type === 'king') return true;
      }
    }

    return false;
  }

  function isCheck(stateOrBoard, color) {
    const state = toBoardLike(stateOrBoard);
    const kingSq = findKing(state.board, color);
    if (!kingSq) throw new Error(`No king found for color ${color}`);
    return isSquareAttacked(state, kingSq, opponent(color));
  }

  function positionKey(stateOrBoard) {
    const state = toBoardLike(stateOrBoard);
    const board = state.board;

    const pieceChar = (p) => {
      const map = { pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', queen: 'q', king: 'k' };
      const ch = map[p.type];
      return p.color === 'white' ? ch.toUpperCase() : ch;
    };

    const rows = [];
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      let row = '';
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) {
          empty++;
        } else {
          if (empty) {
            row += String(empty);
            empty = 0;
          }
          row += pieceChar(p);
        }
      }
      if (empty) row += String(empty);
      rows.push(row);
    }

    const turn = state.turn || 'white';

    const cr = state.castlingRights || { white: { kingside: false, queenside: false }, black: { kingside: false, queenside: false } };
    let castling = '';
    if (cr.white?.kingside) castling += 'K';
    if (cr.white?.queenside) castling += 'Q';
    if (cr.black?.kingside) castling += 'k';
    if (cr.black?.queenside) castling += 'q';
    if (!castling) castling = '-';

    const ep = state.enPassant ? squareToAlgebraic(state.enPassant) : '-';

    return `${rows.join('/')}-${turn}-${castling}-${ep}`;
  }

  function addMove(moves, move) {
    moves.push(move);
  }

  function getPseudoLegalMovesForSquare(stateOrBoard, fromSquare) {
    const state = toBoardLike(stateOrBoard);
    const board = state.board;
    const from = normalizeSquare(fromSquare);

    if (!inBounds(from.r, from.c)) return [];
    const piece = board[from.r][from.c];
    if (!piece) return [];

    const moves = [];
    const color = piece.color;
    const enemy = opponent(color);

    const pushMove = (to, extra = {}) => {
      const target = board[to.r][to.c];
      if (target && target.color === color) return;
      addMove(moves, {
        from,
        to,
        piece: { type: piece.type, color: piece.color },
        captured: target ? { type: target.type, color: target.color } : null,
        ...extra,
      });
    };

    if (piece.type === 'pawn') {
      const dir = color === 'white' ? -1 : 1;
      const startRank = color === 'white' ? 6 : 1;
      const promotionRank = color === 'white' ? 0 : 7;

      const one = { r: from.r + dir, c: from.c };
      if (inBounds(one.r, one.c) && !board[one.r][one.c]) {
        if (one.r === promotionRank) {
          for (const promo of PROMOTION_TYPES) pushMove(one, { promotion: promo });
        } else {
          pushMove(one);
        }

        const two = { r: from.r + 2 * dir, c: from.c };
        if (from.r === startRank && inBounds(two.r, two.c) && !board[two.r][two.c]) {
          const ep = { r: from.r + dir, c: from.c };
          pushMove(two, { createsEnPassant: ep });
        }
      }

      for (const dc of [-1, 1]) {
        const cap = { r: from.r + dir, c: from.c + dc };
        if (!inBounds(cap.r, cap.c)) continue;
        const target = board[cap.r][cap.c];
        if (target && target.color === enemy) {
          if (cap.r === promotionRank) {
            for (const promo of PROMOTION_TYPES) pushMove(cap, { promotion: promo });
          } else {
            pushMove(cap);
          }
        }

        if (state.enPassant && state.enPassant.r === cap.r && state.enPassant.c === cap.c) {
          const capturedSq = { r: from.r, c: cap.c };
          const capturedPiece = board[capturedSq.r][capturedSq.c];
          if (capturedPiece && capturedPiece.type === 'pawn' && capturedPiece.color === enemy) {
            addMove(moves, {
              from,
              to: cap,
              piece: { type: piece.type, color: piece.color },
              captured: { type: 'pawn', color: enemy },
              isEnPassant: true,
            });
          }
        }
      }
    }

    if (piece.type === 'knight') {
      const deltas = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ];
      for (const [dr, dc] of deltas) {
        const to = { r: from.r + dr, c: from.c + dc };
        if (!inBounds(to.r, to.c)) continue;
        pushMove(to);
      }
    }

    if (piece.type === 'bishop' || piece.type === 'rook' || piece.type === 'queen') {
      const dirs = [];
      if (piece.type === 'bishop' || piece.type === 'queen') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      if (piece.type === 'rook' || piece.type === 'queen') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);

      for (const [dr, dc] of dirs) {
        let r = from.r + dr;
        let c = from.c + dc;
        while (inBounds(r, c)) {
          const p = board[r][c];
          if (!p) {
            pushMove({ r, c });
          } else {
            if (p.color === enemy) pushMove({ r, c });
            break;
          }
          r += dr;
          c += dc;
        }
      }
    }

    if (piece.type === 'king') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const to = { r: from.r + dr, c: from.c + dc };
          if (!inBounds(to.r, to.c)) continue;
          pushMove(to);
        }
      }

      const cr = state.castlingRights?.[color];
      const backRank = color === 'white' ? 7 : 0;
      if (from.r === backRank && from.c === 4 && cr) {
        const kingSide = cr.kingside;
        const queenSide = cr.queenside;
        const kingInCheck = isSquareAttacked(state, from, enemy);

        if (!kingInCheck && kingSide) {
          const rookSq = { r: backRank, c: 7 };
          const rook = board[rookSq.r][rookSq.c];
          if (rook && rook.type === 'rook' && rook.color === color) {
            const f = { r: backRank, c: 5 };
            const g = { r: backRank, c: 6 };
            if (!board[f.r][f.c] && !board[g.r][g.c]) {
              if (!isSquareAttacked(state, f, enemy) && !isSquareAttacked(state, g, enemy)) {
                addMove(moves, {
                  from,
                  to: g,
                  piece: { type: 'king', color },
                  captured: null,
                  isCastling: 'kingside',
                });
              }
            }
          }
        }

        if (!kingInCheck && queenSide) {
          const rookSq = { r: backRank, c: 0 };
          const rook = board[rookSq.r][rookSq.c];
          if (rook && rook.type === 'rook' && rook.color === color) {
            const d = { r: backRank, c: 3 };
            const cSq = { r: backRank, c: 2 };
            const b = { r: backRank, c: 1 };
            if (!board[d.r][d.c] && !board[cSq.r][cSq.c] && !board[b.r][b.c]) {
              if (!isSquareAttacked(state, d, enemy) && !isSquareAttacked(state, cSq, enemy)) {
                addMove(moves, {
                  from,
                  to: cSq,
                  piece: { type: 'king', color },
                  captured: null,
                  isCastling: 'queenside',
                });
              }
            }
          }
        }
      }
    }

    return moves;
  }

  function makeMoveInPlace(state, move, { trackHistory = true, trackRepetition = true } = {}) {
    const from = normalizeSquare(move.from);
    const to = normalizeSquare(move.to);

    const changes = [];
    const record = (r, c) => {
      changes.push({ r, c, piece: clonePiece(state.board[r][c]) });
    };

    record(from.r, from.c);
    record(to.r, to.c);

    const prev = {
      turn: state.turn,
      enPassant: state.enPassant ? { r: state.enPassant.r, c: state.enPassant.c } : null,
      castlingRights: copyCastlingRights(state.castlingRights),
      halfmoveClock: state.halfmoveClock,
      fullmoveNumber: state.fullmoveNumber,
    };

    const movedPiece = state.board[from.r][from.c];
    if (!movedPiece) throw new Error('No piece on from-square');

    let capturedSquare = { r: to.r, c: to.c };
    let capturedPiece = state.board[to.r][to.c];

    if (move.isEnPassant) {
      capturedSquare = { r: from.r, c: to.c };
      record(capturedSquare.r, capturedSquare.c);
      capturedPiece = state.board[capturedSquare.r][capturedSquare.c];
      state.board[capturedSquare.r][capturedSquare.c] = null;
    }

    state.board[from.r][from.c] = null;

    const placedPiece = { type: movedPiece.type, color: movedPiece.color };
    if (move.promotion) {
      if (!PROMOTION_TYPES.includes(move.promotion)) throw new Error(`Invalid promotion: ${move.promotion}`);
      placedPiece.type = move.promotion;
    }

    state.board[to.r][to.c] = placedPiece;

    let rookMove = null;
    if (move.isCastling) {
      const backRank = movedPiece.color === 'white' ? 7 : 0;
      if (move.isCastling === 'kingside') {
        const rookFrom = { r: backRank, c: 7 };
        const rookTo = { r: backRank, c: 5 };
        record(rookFrom.r, rookFrom.c);
        record(rookTo.r, rookTo.c);
        state.board[rookTo.r][rookTo.c] = state.board[rookFrom.r][rookFrom.c];
        state.board[rookFrom.r][rookFrom.c] = null;
        rookMove = { rookFrom, rookTo };
      } else if (move.isCastling === 'queenside') {
        const rookFrom = { r: backRank, c: 0 };
        const rookTo = { r: backRank, c: 3 };
        record(rookFrom.r, rookFrom.c);
        record(rookTo.r, rookTo.c);
        state.board[rookTo.r][rookTo.c] = state.board[rookFrom.r][rookFrom.c];
        state.board[rookFrom.r][rookFrom.c] = null;
        rookMove = { rookFrom, rookTo };
      }
    }

    const color = movedPiece.color;
    const enemy = opponent(color);

    state.enPassant = null;
    if (move.createsEnPassant) {
      state.enPassant = { r: move.createsEnPassant.r, c: move.createsEnPassant.c };
    }

    const cr = state.castlingRights;

    const disableCastlingFor = (c) => {
      cr[c].kingside = false;
      cr[c].queenside = false;
    };

    if (movedPiece.type === 'king') disableCastlingFor(color);

    if (movedPiece.type === 'rook') {
      if (color === 'white' && from.r === 7 && from.c === 0) cr.white.queenside = false;
      if (color === 'white' && from.r === 7 && from.c === 7) cr.white.kingside = false;
      if (color === 'black' && from.r === 0 && from.c === 0) cr.black.queenside = false;
      if (color === 'black' && from.r === 0 && from.c === 7) cr.black.kingside = false;
    }

    if (capturedPiece && capturedPiece.type === 'rook') {
      if (enemy === 'white' && capturedSquare.r === 7 && capturedSquare.c === 0) cr.white.queenside = false;
      if (enemy === 'white' && capturedSquare.r === 7 && capturedSquare.c === 7) cr.white.kingside = false;
      if (enemy === 'black' && capturedSquare.r === 0 && capturedSquare.c === 0) cr.black.queenside = false;
      if (enemy === 'black' && capturedSquare.r === 0 && capturedSquare.c === 7) cr.black.kingside = false;
    }

    const isPawnMove = movedPiece.type === 'pawn';
    const isCapture = !!capturedPiece || !!move.isEnPassant;
    if (isPawnMove || isCapture) state.halfmoveClock = 0;
    else state.halfmoveClock = (state.halfmoveClock || 0) + 1;

    if (state.turn === 'black') state.fullmoveNumber = (state.fullmoveNumber || 1) + 1;
    state.turn = opponent(state.turn);

    let positionKeyAfter = null;
    if (trackRepetition && state.positionCounts instanceof Map) {
      positionKeyAfter = positionKey(state);
      state.positionCounts.set(positionKeyAfter, (state.positionCounts.get(positionKeyAfter) || 0) + 1);
    }

    const undo = {
      changes,
      prev,
      move: {
        from,
        to,
        piece: clonePiece(movedPiece),
        captured: capturedPiece ? clonePiece(capturedPiece) : null,
        promotion: move.promotion || null,
        isEnPassant: !!move.isEnPassant,
        isCastling: move.isCastling || null,
      },
      positionKeyAfter,
      rookMove,
    };

    if (trackHistory) {
      state.history.push(undo);
    }

    return undo;
  }

  function undoMoveInPlace(state, undo, { trackHistory = true, trackRepetition = true } = {}) {
    if (trackRepetition && undo.positionKeyAfter && state.positionCounts instanceof Map) {
      const n = state.positionCounts.get(undo.positionKeyAfter) || 0;
      if (n <= 1) state.positionCounts.delete(undo.positionKeyAfter);
      else state.positionCounts.set(undo.positionKeyAfter, n - 1);
    }

    for (let i = undo.changes.length - 1; i >= 0; i--) {
      const ch = undo.changes[i];
      state.board[ch.r][ch.c] = clonePiece(ch.piece);
    }

    state.turn = undo.prev.turn;
    state.enPassant = undo.prev.enPassant ? { r: undo.prev.enPassant.r, c: undo.prev.enPassant.c } : null;
    state.castlingRights = copyCastlingRights(undo.prev.castlingRights);
    state.halfmoveClock = undo.prev.halfmoveClock;
    state.fullmoveNumber = undo.prev.fullmoveNumber;

    if (trackHistory) {
      state.history.pop();
    }
  }

  function getPseudoLegalMoves(stateOrBoard, color) {
    const state = toBoardLike(stateOrBoard);
    const board = state.board;
    const moves = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p || p.color !== color) continue;
        moves.push(...getPseudoLegalMovesForSquare(state, { r, c }));
      }
    }

    return moves;
  }

  function getLegalMoves(stateOrBoard, color) {
    const state = toBoardLike(stateOrBoard);
    const side = color || state.turn;

    const pseudo = getPseudoLegalMoves(state, side);
    const legal = [];

    for (const move of pseudo) {
      const undo = makeMoveInPlace(state, move, { trackHistory: false, trackRepetition: false });
      const ok = !isCheck(state, side);
      undoMoveInPlace(state, undo, { trackHistory: false, trackRepetition: false });
      if (ok) legal.push(move);
    }

    return legal;
  }

  function moveMatches(a, b, { requirePromotionMatch = false } = {}) {
    if (a.from.r !== b.from.r || a.from.c !== b.from.c) return false;
    if (a.to.r !== b.to.r || a.to.c !== b.to.c) return false;

    if (requirePromotionMatch) {
      return (a.promotion || null) === (b.promotion || null);
    }

    if (!b.promotion) return true;
    return (a.promotion || null) === (b.promotion || null);
  }

  function isLegalMove(stateOrBoard, fromSquare, toSquare, color, promotion) {
    const state = toBoardLike(stateOrBoard);
    const from = normalizeSquare(fromSquare);
    const to = normalizeSquare(toSquare);
    const side = color || state.turn;

    const candidate = { from, to, promotion: promotion || null };
    const legal = getLegalMoves(state, side);

    return legal.some((m) => moveMatches(m, candidate));
  }

  function makeMove(state, fromSquare, toSquare, promotion) {
    const from = normalizeSquare(fromSquare);
    const to = normalizeSquare(toSquare);
    const side = state.turn;

    const candidate = { from, to, promotion: promotion || null };
    const legal = getLegalMoves(state, side);

    const chosen = legal.find((m) => moveMatches(m, candidate));
    if (!chosen) {
      throw new Error(`Illegal move: ${squareToAlgebraic(from)} -> ${squareToAlgebraic(to)}${promotion ? `=${promotion}` : ''}`);
    }

    return makeMoveInPlace(state, chosen, { trackHistory: true, trackRepetition: true });
  }

  function undoLastMove(state) {
    const undo = state.history[state.history.length - 1];
    if (!undo) return false;
    undoMoveInPlace(state, undo, { trackHistory: true, trackRepetition: true });
    return true;
  }

  function isCheckmate(stateOrBoard, color) {
    const state = toBoardLike(stateOrBoard);
    const side = color || state.turn;
    if (!isCheck(state, side)) return false;
    return getLegalMoves(state, side).length === 0;
  }

  function isStalemate(stateOrBoard, color) {
    const state = toBoardLike(stateOrBoard);
    const side = color || state.turn;
    if (isCheck(state, side)) return false;
    return getLegalMoves(state, side).length === 0;
  }

  function insufficientMaterial(stateOrBoard) {
    const state = toBoardLike(stateOrBoard);
    const board = state.board;

    const pieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) pieces.push({ ...p, r, c });
      }
    }

    const nonKings = pieces.filter((p) => p.type !== 'king');
    if (nonKings.length === 0) return true;

    if (nonKings.length === 1) {
      const p = nonKings[0];
      if (p.type === 'bishop' || p.type === 'knight') return true;
    }

    if (nonKings.length === 2) {
      const b1 = nonKings[0];
      const b2 = nonKings[1];
      if (b1.type === 'bishop' && b2.type === 'bishop' && b1.color !== b2.color) {
        const sqColor = (x) => (x.r + x.c) % 2;
        if (sqColor(b1) === sqColor(b2)) return true;
      }
    }

    return false;
  }

  function isDraw(stateOrBoard) {
    const state = toBoardLike(stateOrBoard);

    if ((state.halfmoveClock || 0) >= 100) return true;

    if (state.positionCounts instanceof Map) {
      const key = positionKey(state);
      if ((state.positionCounts.get(key) || 0) >= 3) return true;
    }

    return insufficientMaterial(state);
  }

  function getGameResult(stateOrBoard, color) {
    const state = toBoardLike(stateOrBoard);
    const side = color || state.turn;

    if (isCheckmate(state, side)) return 'checkmate';
    if (isStalemate(state, side)) return 'stalemate';
    if (isDraw(state)) return 'draw';
    return 'ongoing';
  }

  function printBoardAscii(stateOrBoard) {
    const state = toBoardLike(stateOrBoard);
    const board = state.board;

    const map = {
      pawn: 'p',
      rook: 'r',
      knight: 'n',
      bishop: 'b',
      queen: 'q',
      king: 'k',
    };

    const lines = [];
    for (let r = 0; r < 8; r++) {
      const rank = 8 - r;
      const cells = [];
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) cells.push('.');
        else {
          const ch = map[p.type] || '?';
          cells.push(p.color === 'white' ? ch.toUpperCase() : ch);
        }
      }
      lines.push(`${rank} ${cells.join(' ')}`);
    }
    lines.push('  a b c d e f g h');
    return lines.join('\n');
  }

  const PIECE_VALUES = {
    pawn: 100,
    knight: 320,
    bishop: 320,
    rook: 500,
    queen: 900,
    king: 0,
  };

  function getDifficultyDepth(elo) {
    const n = typeof elo === 'string' ? parseInt(elo, 10) : elo;
    if (n <= 800) return 1;
    if (n <= 1200) return 2;
    if (n <= 1600) return 3;
    return 4;
  }

  function evaluatePosition(stateOrBoard, perspectiveColor) {
    const state = toBoardLike(stateOrBoard);
    const board = state.board;
    const me = perspectiveColor || state.turn;
    const them = opponent(me);

    let score = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) continue;
        const v = PIECE_VALUES[p.type] || 0;
        score += p.color === me ? v : -v;
      }
    }

    // Simple center control / presence.
    const centerSquares = [
      { r: 3, c: 3 }, // d5
      { r: 3, c: 4 }, // e5
      { r: 4, c: 3 }, // d4
      { r: 4, c: 4 }, // e4
    ];

    for (const sq of centerSquares) {
      const p = board[sq.r][sq.c];
      if (p) score += p.color === me ? 10 : -10;

      if (isSquareAttacked(state, sq, me)) score += 3;
      if (isSquareAttacked(state, sq, them)) score -= 3;
    }

    // King safety (very simple).
    if (isCheck(state, me)) score -= 60;
    if (isCheck(state, them)) score += 60;

    const myKing = findKing(board, me);
    if (myKing) {
      const isCastled = (me === 'white' && myKing.r === 7 && (myKing.c === 6 || myKing.c === 2))
        || (me === 'black' && myKing.r === 0 && (myKing.c === 6 || myKing.c === 2));
      if (isCastled) score += 25;
      else {
        const cr = state.castlingRights?.[me];
        if (cr && !cr.kingside && !cr.queenside) score -= 10;
      }
    }

    return score;
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getBestMove(stateOrBoard, options = {}) {
    const state = toBoardLike(stateOrBoard);
    const depth = Math.max(1, options.depth || 2);
    const randomize = options.randomize !== false;

    const moves = getLegalMoves(state, state.turn);
    if (!moves.length) return null;

    if (randomize) shuffleInPlace(moves);

    const MATE = 100000;

    function negamax(d, alpha, beta, ply) {
      if (isDraw(state)) return 0;
      if (d === 0) return evaluatePosition(state, state.turn);

      const ms = getLegalMoves(state, state.turn);
      if (!ms.length) return isCheck(state, state.turn) ? -MATE + ply : 0;
      if (randomize) shuffleInPlace(ms);

      let best = -Infinity;

      for (const m of ms) {
        const undo = makeMoveInPlace(state, m, { trackHistory: false, trackRepetition: false });
        const score = -negamax(d - 1, -beta, -alpha, ply + 1);
        undoMoveInPlace(state, undo, { trackHistory: false, trackRepetition: false });

        if (score > best) best = score;
        if (score > alpha) alpha = score;
        if (alpha >= beta) break;
      }

      return best;
    }

    let bestScore = -Infinity;
    let bestMoves = [];

    for (const m of moves) {
      const undo = makeMoveInPlace(state, m, { trackHistory: false, trackRepetition: false });
      const score = -negamax(depth - 1, -Infinity, Infinity, 1);
      undoMoveInPlace(state, undo, { trackHistory: false, trackRepetition: false });

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [m];
      } else if (score === bestScore) {
        bestMoves.push(m);
      }
    }

    if (!bestMoves.length) return moves[0];
    if (randomize && bestMoves.length > 1) shuffleInPlace(bestMoves);

    return bestMoves[0];
  }

  const api = {
    PIECE_TYPES,
    PROMOTION_TYPES,
    PIECE_VALUES,
    createInitialBoard,
    createInitialGameState,
    cloneBoard,
    algebraicToSquare,
    squareToAlgebraic,
    getPseudoLegalMovesForSquare,
    getLegalMoves,
    isLegalMove,
    makeMove,
    undoLastMove,
    isSquareAttacked,
    isCheck,
    isCheckmate,
    isStalemate,
    getGameResult,
    isDraw,
    positionKey,
    printBoardAscii,
    evaluatePosition,
    getDifficultyDepth,
    getBestMove,
  };

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = api;
  } else {
    global.ChessEngine = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
