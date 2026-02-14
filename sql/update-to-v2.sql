-- Update legacy schema to Starving Artists v2 schema expected by server
-- This preserves legacy tables by renaming them with a timestamp suffix.
-- Run once on the target database.

SET FOREIGN_KEY_CHECKS = 0;

-- Preserve legacy tables if they exist
RENAME TABLE
  games TO games_legacy_20260131,
  game_players TO game_players_legacy_20260131,
  game_sessions TO game_sessions_legacy_20260131,
  game_session_players TO game_session_players_legacy_20260131,
  game_state_snapshots TO game_state_snapshots_legacy_20260131,
  users TO users_legacy_20260131;

SET FOREIGN_KEY_CHECKS = 1;

-- New games table
CREATE TABLE games (
  id VARCHAR(36) PRIMARY KEY,
  status ENUM('lobby', 'playing', 'finished') NOT NULL DEFAULT 'lobby',
  host_player_id VARCHAR(36) NOT NULL,
  current_phase ENUM('morning', 'day', 'night', 'selling') DEFAULT 'morning',
  current_player_id VARCHAR(36),
  day_number INT DEFAULT 1,
  turn_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  winner_id VARCHAR(36) NULL,
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- New players table
CREATE TABLE players (
  id VARCHAR(36) PRIMARY KEY,
  game_id VARCHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  nutrition INT DEFAULT 5,
  score INT DEFAULT 0,
  paintings_completed INT DEFAULT 0,
  food_earned INT DEFAULT 0,
  turn_order INT NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  connected BOOLEAN DEFAULT TRUE,
  last_free_action_day INT DEFAULT 0,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  INDEX idx_game (game_id),
  INDEX idx_connected (connected)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- New game_state table
CREATE TABLE game_state (
  game_id VARCHAR(36) PRIMARY KEY,
  paint_bag JSON NOT NULL,
  paint_market JSON NOT NULL,
  canvas_market JSON NOT NULL,
  canvas_deck JSON NOT NULL,
  actions_taken INT DEFAULT 0,
  selling_phase_data JSON NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Player canvases table
CREATE TABLE player_canvases (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  canvas_definition_id BIGINT UNSIGNED NOT NULL,
  painted_squares JSON,
  completed BOOLEAN DEFAULT FALSE,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (canvas_definition_id) REFERENCES canvases(id) ON DELETE RESTRICT,
  INDEX idx_player (player_id),
  INDEX idx_completed (completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Player paint cubes table
CREATE TABLE player_paint_cubes (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  color VARCHAR(20) NOT NULL,
  is_wild BOOLEAN DEFAULT FALSE,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  INDEX idx_player (player_id),
  INDEX idx_color (color)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
