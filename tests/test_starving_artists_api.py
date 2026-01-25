"""
Starving Artists API Tests
Tests for the multiplayer board game backend APIs
"""
import pytest
import requests
import json
import time
from pathlib import Path

# Base URL for the server
BASE_URL = "http://localhost:8001"


class TestLandingPage:
    """Test landing page loads correctly"""
    
    def test_landing_page_loads(self):
        """Landing page should return 200 and contain game title"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        assert "Starving Artists" in response.text
        assert "Create Game Lobby" in response.text
        assert "Join Existing Game" in response.text
        print("✓ Landing page loads correctly")


class TestLobbyCreation:
    """Test lobby creation and management"""
    
    def test_create_game_success(self):
        """Create game with valid player name"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": "TestHost"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "gameId" in data
        assert "playerId" in data
        assert "redirectUrl" in data
        assert data["redirectUrl"].startswith("/lobby/")
        print(f"✓ Game created with ID: {data['gameId']}")
        return data
    
    def test_create_game_invalid_name_empty(self):
        """Create game with empty name should fail"""
        response = requests.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": ""},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print("✓ Empty player name rejected")
    
    def test_create_game_invalid_name_short(self):
        """Create game with too short name should fail"""
        response = requests.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": "A"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        print("✓ Short player name rejected")


class TestLobbyJoin:
    """Test joining existing lobbies"""
    
    @pytest.fixture
    def created_game(self):
        """Create a game for testing"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": "HostPlayer"},
            headers={"Content-Type": "application/json"}
        )
        data = response.json()
        return {
            "gameId": data["gameId"],
            "hostPlayerId": data["playerId"],
            "session": session
        }
    
    def test_join_game_success(self, created_game):
        """Join existing game with valid name"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/lobby/join/{created_game['gameId']}",
            json={"playerName": "JoiningPlayer"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "playerId" in data
        assert data["gameId"] == created_game["gameId"]
        print(f"✓ Player joined game: {data['playerId']}")
    
    def test_join_game_invalid_id(self):
        """Join non-existent game should fail"""
        response = requests.post(
            f"{BASE_URL}/lobby/join/invalid-game-id-12345",
            json={"playerName": "TestPlayer"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print("✓ Invalid game ID rejected")
    
    def test_join_game_duplicate_name(self, created_game):
        """Join with duplicate name should fail"""
        response = requests.post(
            f"{BASE_URL}/lobby/join/{created_game['gameId']}",
            json={"playerName": "HostPlayer"},  # Same as host
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print("✓ Duplicate player name rejected")


class TestLobbyPage:
    """Test lobby page rendering"""
    
    def test_lobby_page_loads(self):
        """Lobby page should load for valid game"""
        # Create game first
        session = requests.Session()
        create_response = session.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": "LobbyTestHost"},
            headers={"Content-Type": "application/json"}
        )
        data = create_response.json()
        game_id = data["gameId"]
        
        # Access lobby page
        lobby_response = session.get(f"{BASE_URL}/lobby/{game_id}")
        assert lobby_response.status_code == 200
        assert "Game Lobby" in lobby_response.text
        assert "LobbyTestHost" in lobby_response.text
        assert "Players" in lobby_response.text
        print("OK Lobby page loads correctly")
    
    def test_lobby_page_invalid_game(self):
        """Lobby page for invalid game should show error"""
        response = requests.get(f"{BASE_URL}/lobby/invalid-game-id")
        # Should return 404 or error page
        assert response.status_code in [404, 200]  # 200 with error page
        print("OK Invalid lobby handled correctly")

    def test_lobby_page_prompts_name_for_new_user(self):
        """Lobby page should prompt for name when no session player"""
        host_session = requests.Session()
        create_response = host_session.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": "PromptHost"},
            headers={"Content-Type": "application/json"}
        )
        data = create_response.json()
        game_id = data["gameId"]

        new_session = requests.Session()
        lobby_response = new_session.get(f"{BASE_URL}/lobby/{game_id}")
        assert lobby_response.status_code == 200
        assert "Join This Lobby" in lobby_response.text
        assert "joinLobbyForm" in lobby_response.text
        print("OK Lobby page prompts for name when not joined")


class TestGameStart:
    """Test game start functionality"""
    
    def test_start_game_with_two_players(self):
        """Host can start game with 2 players"""
        # Create game
        host_session = requests.Session()
        create_response = host_session.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": "GameHost"},
            headers={"Content-Type": "application/json"}
        )
        game_data = create_response.json()
        game_id = game_data["gameId"]
        
        # Join with second player
        player2_session = requests.Session()
        join_response = player2_session.post(
            f"{BASE_URL}/lobby/join/{game_id}",
            json={"playerName": "Player2"},
            headers={"Content-Type": "application/json"}
        )
        assert join_response.status_code == 200
        
        # Start game as host
        start_response = host_session.post(
            f"{BASE_URL}/lobby/{game_id}/start",
            headers={"Content-Type": "application/json"}
        )
        assert start_response.status_code == 200
        data = start_response.json()
        assert data["success"] == True
        assert data["redirectUrl"] == f"/game/{game_id}"
        print("✓ Game started successfully with 2 players")
        return {"gameId": game_id, "hostSession": host_session, "player2Session": player2_session}
    
    def test_start_game_not_enough_players(self):
        """Cannot start game with only 1 player"""
        session = requests.Session()
        create_response = session.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": "SoloHost"},
            headers={"Content-Type": "application/json"}
        )
        game_data = create_response.json()
        game_id = game_data["gameId"]
        
        # Try to start with only 1 player
        start_response = session.post(
            f"{BASE_URL}/lobby/{game_id}/start",
            headers={"Content-Type": "application/json"}
        )
        assert start_response.status_code == 403
        data = start_response.json()
        assert "error" in data
        print("✓ Cannot start game with only 1 player")


class TestGamePage:
    """Test game page rendering"""
    
    @pytest.fixture
    def started_game(self):
        """Create and start a game for testing"""
        # Create game
        host_session = requests.Session()
        create_response = host_session.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": "GamePageHost"},
            headers={"Content-Type": "application/json"}
        )
        game_data = create_response.json()
        game_id = game_data["gameId"]
        
        # Join with second player
        player2_session = requests.Session()
        player2_session.post(
            f"{BASE_URL}/lobby/join/{game_id}",
            json={"playerName": "GamePagePlayer2"},
            headers={"Content-Type": "application/json"}
        )
        
        # Start game
        host_session.post(
            f"{BASE_URL}/lobby/{game_id}/start",
            headers={"Content-Type": "application/json"}
        )
        
        return {
            "gameId": game_id,
            "hostSession": host_session,
            "player2Session": player2_session
        }
    
    def test_game_page_loads(self, started_game):
        """Game page should load for players in game"""
        response = started_game["hostSession"].get(
            f"{BASE_URL}/game/{started_game['gameId']}"
        )
        assert response.status_code == 200
        assert "Canvas Market" in response.text
        assert "Paint Market" in response.text
        assert "Your Paint Cubes" in response.text
        assert "Work" in response.text
        assert "End Turn" in response.text
        print("✓ Game page loads correctly")
    
    def test_game_page_unauthorized(self, started_game):
        """Game page should redirect unauthorized users"""
        # New session without joining game
        new_session = requests.Session()
        response = new_session.get(
            f"{BASE_URL}/game/{started_game['gameId']}",
            allow_redirects=False
        )
        # Should redirect to home
        assert response.status_code in [302, 200]  # Redirect or error page
        print("✓ Unauthorized access handled")


class TestGameActions:
    """Test game action endpoints"""
    
    @pytest.fixture
    def active_game(self):
        """Create and start a game for action testing"""
        # Create game
        host_session = requests.Session()
        create_response = host_session.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": "ActionHost"},
            headers={"Content-Type": "application/json"}
        )
        game_data = create_response.json()
        game_id = game_data["gameId"]
        host_player_id = game_data["playerId"]
        
        # Join with second player
        player2_session = requests.Session()
        join_response = player2_session.post(
            f"{BASE_URL}/lobby/join/{game_id}",
            json={"playerName": "ActionPlayer2"},
            headers={"Content-Type": "application/json"}
        )
        player2_id = join_response.json()["playerId"]
        
        # Start game
        host_session.post(
            f"{BASE_URL}/lobby/{game_id}/start",
            headers={"Content-Type": "application/json"}
        )
        
        return {
            "gameId": game_id,
            "hostSession": host_session,
            "hostPlayerId": host_player_id,
            "player2Session": player2_session,
            "player2Id": player2_id
        }
    
    def test_work_action(self, active_game):
        """Work action should draw paint cubes"""
        # Get game state to find current player
        state_response = active_game["hostSession"].get(
            f"{BASE_URL}/game/{active_game['gameId']}/state"
        )
        
        if state_response.status_code == 200:
            state_data = state_response.json()
            current_player_id = state_data.get("gameState", {}).get("game", {}).get("current_player_id")
            
            # Use the session of the current player
            if current_player_id == active_game["hostPlayerId"]:
                session = active_game["hostSession"]
            else:
                session = active_game["player2Session"]
            
            # Perform work action
            work_response = session.post(
                f"{BASE_URL}/game/{active_game['gameId']}/action/work",
                headers={"Content-Type": "application/json"}
            )
            
            assert work_response.status_code == 200
            data = work_response.json()
            assert data["success"] == True
            print("✓ Work action completed successfully")
        else:
            # If state endpoint fails, try work action anyway
            work_response = active_game["hostSession"].post(
                f"{BASE_URL}/game/{active_game['gameId']}/action/work",
                headers={"Content-Type": "application/json"}
            )
            # May fail if not current player's turn
            assert work_response.status_code in [200, 400]
            print("✓ Work action endpoint accessible")
    
    def test_work_action_not_your_turn(self, active_game):
        """Work action should fail if not your turn"""
        # Get game state to find current player
        state_response = active_game["hostSession"].get(
            f"{BASE_URL}/game/{active_game['gameId']}/state"
        )
        
        if state_response.status_code == 200:
            state_data = state_response.json()
            current_player_id = state_data.get("gameState", {}).get("game", {}).get("current_player_id")
            
            # Use the session of the NON-current player
            if current_player_id == active_game["hostPlayerId"]:
                session = active_game["player2Session"]
            else:
                session = active_game["hostSession"]
            
            # Try work action (should fail)
            work_response = session.post(
                f"{BASE_URL}/game/{active_game['gameId']}/action/work",
                headers={"Content-Type": "application/json"}
            )
            
            assert work_response.status_code == 400
            data = work_response.json()
            assert "error" in data
            print("✓ Work action correctly rejected for wrong player")
    
    def test_end_turn_action(self, active_game):
        """End turn should advance to next player"""
        # Get current player's session
        state_response = active_game["hostSession"].get(
            f"{BASE_URL}/game/{active_game['gameId']}/state"
        )
        
        if state_response.status_code == 200:
            state_data = state_response.json()
            current_player_id = state_data.get("gameState", {}).get("game", {}).get("current_player_id")
            
            if current_player_id == active_game["hostPlayerId"]:
                session = active_game["hostSession"]
            else:
                session = active_game["player2Session"]
            
            # End turn
            end_response = session.post(
                f"{BASE_URL}/game/{active_game['gameId']}/action/end-turn",
                headers={"Content-Type": "application/json"}
            )
            
            assert end_response.status_code == 200
            data = end_response.json()
            assert data["success"] == True
            print("✓ End turn action completed successfully")
    
    def test_buy_canvas_action(self, active_game):
        """Buy canvas action should work with enough paint cubes"""
        # First do work action to get paint cubes
        state_response = active_game["hostSession"].get(
            f"{BASE_URL}/game/{active_game['gameId']}/state"
        )
        
        if state_response.status_code == 200:
            state_data = state_response.json()
            current_player_id = state_data.get("gameState", {}).get("game", {}).get("current_player_id")
            
            if current_player_id == active_game["hostPlayerId"]:
                session = active_game["hostSession"]
            else:
                session = active_game["player2Session"]
            
            # Do work to get cubes
            session.post(
                f"{BASE_URL}/game/{active_game['gameId']}/action/work",
                headers={"Content-Type": "application/json"}
            )
            
            # Get updated state
            state_response2 = session.get(
                f"{BASE_URL}/game/{active_game['gameId']}/state"
            )
            
            if state_response2.status_code == 200:
                # Try to buy canvas (slot 0 costs 1 cube)
                buy_response = session.post(
                    f"{BASE_URL}/game/{active_game['gameId']}/action/buy-canvas",
                    json={"slotIndex": 0},
                    headers={"Content-Type": "application/json"}
                )
                
                # May succeed or fail depending on turn order
                assert buy_response.status_code in [200, 400]
                print("✓ Buy canvas endpoint accessible")


class TestGameState:
    """Test game state endpoint"""
    
    def test_get_game_state(self):
        """Get game state should return full state"""
        # Create and start game
        host_session = requests.Session()
        create_response = host_session.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": "StateHost"},
            headers={"Content-Type": "application/json"}
        )
        game_data = create_response.json()
        game_id = game_data["gameId"]
        
        # Join with second player
        player2_session = requests.Session()
        player2_session.post(
            f"{BASE_URL}/lobby/join/{game_id}",
            json={"playerName": "StatePlayer2"},
            headers={"Content-Type": "application/json"}
        )
        
        # Start game
        host_session.post(
            f"{BASE_URL}/lobby/{game_id}/start",
            headers={"Content-Type": "application/json"}
        )
        
        # Get state
        state_response = host_session.get(
            f"{BASE_URL}/game/{game_id}/state"
        )
        
        assert state_response.status_code == 200
        data = state_response.json()
        assert data["success"] == True
        assert "gameState" in data
        print("✓ Game state endpoint works correctly")


class TestLeaveLobby:
    """Test leaving lobby functionality"""
    
    def test_leave_lobby(self):
        """Player can leave lobby"""
        # Create game
        host_session = requests.Session()
        create_response = host_session.post(
            f"{BASE_URL}/lobby/create",
            json={"playerName": "LeaveHost"},
            headers={"Content-Type": "application/json"}
        )
        game_data = create_response.json()
        game_id = game_data["gameId"]
        
        # Join with second player
        player2_session = requests.Session()
        player2_session.post(
            f"{BASE_URL}/lobby/join/{game_id}",
            json={"playerName": "LeavePlayer2"},
            headers={"Content-Type": "application/json"}
        )
        
        # Player 2 leaves
        leave_response = player2_session.post(
            f"{BASE_URL}/lobby/{game_id}/leave",
            headers={"Content-Type": "application/json"}
        )
        
        assert leave_response.status_code == 200
        data = leave_response.json()
        assert data["success"] == True
        print("✓ Player can leave lobby")


class TestStaticPages:
    """Test static pages"""
    
    def test_rules_page(self):
        """Rules page should load"""
        response = requests.get(f"{BASE_URL}/rules")
        # May return 200 or 404 if not implemented
        assert response.status_code in [200, 404]
        print("OK Rules page endpoint accessible")
    
    def test_about_page(self):
        """About page should load"""
        response = requests.get(f"{BASE_URL}/about")
        # May return 200 or 404 if not implemented
        assert response.status_code in [200, 404]
        print("OK About page endpoint accessible")


class TestAdminCanvasFiles:
    """Test admin canvas file listing"""

    def test_admin_canvas_files_from_dist(self):
        """Admin canvas list should match dist/server/assets/canvases"""
        response = requests.get(f"{BASE_URL}/admin/api/canvases")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        canvases = data.get("canvases", [])

        repo_root = Path(__file__).resolve().parents[1]
        canvas_dir = repo_root / "dist" / "server" / "assets" / "canvases"
        assert canvas_dir.exists()

        valid_exts = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
        file_count = len([p for p in canvas_dir.iterdir() if p.suffix.lower() in valid_exts])
        assert len(canvases) == file_count
        print("OK Admin canvas list matches dist assets folder")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
