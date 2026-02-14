-- Starving Artists Game Database Schema
-- Version 2.0 - Simplified for maintainability

DROP TABLE IF EXISTS player_paint_cubes;
DROP TABLE IF EXISTS player_canvases;
DROP TABLE IF EXISTS game_state;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS canvases;
DROP TABLE IF EXISTS sessions;

-- Games table
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

-- Players table
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

-- Game state table (stores markets and shared game state)
CREATE TABLE game_state (
  game_id VARCHAR(36) PRIMARY KEY,
  paint_bag JSON NOT NULL,           -- Array of paint cubes in bag
  paint_market JSON NOT NULL,        -- Array of paint cubes in market
  canvas_market JSON NOT NULL,       -- Array of 3 canvas slots
  canvas_deck JSON NOT NULL,         -- Remaining canvases to draw
  actions_taken INT DEFAULT 0,       -- Actions in current phase
  selling_phase_data JSON NULL,      -- Selling phase state
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Canvas definitions (pre-populated game content)
CREATE TABLE canvases (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(128) NOT NULL,
  artist VARCHAR(128),
  year VARCHAR(16),
  star_value INT NOT NULL,
  paint_value INT NOT NULL,
  food_value INT NOT NULL,
  layout_json JSON NOT NULL,
  filename VARCHAR(256),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Player canvases table
CREATE TABLE player_canvases (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  canvas_definition_id BIGINT UNSIGNED NOT NULL,
  painted_squares JSON,              -- Array of {squareId, cubeId, color}
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

-- Sessions table (express-session)
CREATE TABLE sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  expires BIGINT NOT NULL,
  data LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample canvas definitions
-- These are simplified examples - real game would have 92 cards
INSERT INTO canvases (title, layout_json, star_value, paint_value, food_value, filename) VALUES
('Simple Red',
 '{"squares":[{"id":"s1","x":0,"y":0,"allowedColors":["red"]},{"id":"s2","x":1,"y":0,"allowedColors":["red"]},{"id":"s3","x":2,"y":0,"allowedColors":["red"]}]}',
 1, 1, 1, 'simple_red.png'),

('Red and Blue',
 '{"squares":[{"id":"s1","x":0,"y":0,"allowedColors":["red"]},{"id":"s2","x":1,"y":0,"allowedColors":["blue"]},{"id":"s3","x":2,"y":0,"allowedColors":["red"]}]}',
 2, 2, 1, 'red_blue.png'),

('Complex Pattern',
 '{"squares":[{"id":"s1","x":0,"y":0,"allowedColors":["red","blue"]},{"id":"s2","x":1,"y":0,"allowedColors":["yellow"]},{"id":"s3","x":2,"y":0,"allowedColors":["green"]},{"id":"s4","x":0,"y":1,"allowedColors":["black"]},{"id":"s5","x":1,"y":1,"allowedColors":["purple"]},{"id":"s6","x":2,"y":1,"allowedColors":["orange"]}]}',
 4, 3, 2, 'complex.png'),

('Big Painting',
 '{"squares":[{"id":"s1","x":0,"y":0,"allowedColors":["red"]},{"id":"s2","x":1,"y":0,"allowedColors":["red"]},{"id":"s3","x":2,"y":0,"allowedColors":["blue"]},{"id":"s4","x":0,"y":1,"allowedColors":["blue"]},{"id":"s5","x":1,"y":1,"allowedColors":["yellow"]},{"id":"s6","x":2,"y":1,"allowedColors":["yellow"]},{"id":"s7","x":0,"y":2,"allowedColors":["green"]},{"id":"s8","x":1,"y":2,"allowedColors":["green"]},{"id":"s9","x":2,"y":2,"allowedColors":["green"]}]}',
 5, 4, 3, 'big_painting.png');
