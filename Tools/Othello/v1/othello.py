import pygame
import numpy as np
import time

# Initialize pygame
pygame.init()

# Constants
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GREEN = (0, 128, 0)
BOARD_SIZE = 8
SQUARE_SIZE = 80
WINDOW_SIZE = BOARD_SIZE * SQUARE_SIZE
STATUS_BAR_HEIGHT = 80
STATUS_BAR_BOTTOM_HEIGHT = 40
BUTTON_WIDTH = 150
BUTTON_HEIGHT = 40
BUTTON_PADDING = 10
FPS = 30

# Create the screen
screen = pygame.display.set_mode((WINDOW_SIZE, WINDOW_SIZE + STATUS_BAR_HEIGHT + STATUS_BAR_BOTTOM_HEIGHT))
pygame.display.set_caption("Othello (Reversi)")

# Fonts
font = pygame.font.Font(None, 36)

# Directions for searching around a piece
DIRECTIONS = [
    (0, 1), (1, 0), (0, -1), (-1, 0),
    (1, 1), (-1, -1), (1, -1), (-1, 1)
]

# Initialize the board
def init_board():
    board = np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=int)
    board[3][3] = board[4][4] = 1  # White pieces
    board[3][4] = board[4][3] = -1  # Black pieces
    return board

# Draw the board
def draw_board(board):
    screen.fill(GREEN)
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            rect = pygame.Rect(col * SQUARE_SIZE, row * SQUARE_SIZE + STATUS_BAR_HEIGHT, SQUARE_SIZE, SQUARE_SIZE)
            pygame.draw.rect(screen, BLACK, rect, 1)
            if board[row][col] == 1:
                pygame.draw.circle(screen, WHITE, rect.center, SQUARE_SIZE // 2 - 5)
            elif board[row][col] == -1:
                pygame.draw.circle(screen, BLACK, rect.center, SQUARE_SIZE // 2 - 5)

# Draw the status bar and buttons
def draw_status_bar(player, board, countdown):
    # Draw buttons in the functional area (top of the screen)
    status_rect = pygame.Rect(0, 0, WINDOW_SIZE, STATUS_BAR_HEIGHT)
    pygame.draw.rect(screen, WHITE, status_rect)
    new_game_button = pygame.Rect(BUTTON_PADDING, 20, BUTTON_WIDTH, BUTTON_HEIGHT)
    undo_button = pygame.Rect(BUTTON_PADDING * 2 + BUTTON_WIDTH, 20, BUTTON_WIDTH, BUTTON_HEIGHT)
    pygame.draw.rect(screen, BLACK, new_game_button)
    pygame.draw.rect(screen, BLACK, undo_button)
    screen.blit(font.render("New Game", True, WHITE), (BUTTON_PADDING + 20, 25))
    screen.blit(font.render("Undo", True, WHITE), (BUTTON_PADDING * 2 + BUTTON_WIDTH + 45, 25))

    # Draw player turn and piece counts (bottom of the screen)
    black_count = np.sum(board == -1)
    white_count = np.sum(board == 1)
    empty_count = np.sum(board == 0)
    player_text = "Black's Turn" if player == -1 else "White's Turn"
    status_text = f"{player_text} | Black: {black_count}, White: {white_count}, Empty: {empty_count}"
    status_bar_rect = pygame.Rect(0, WINDOW_SIZE + STATUS_BAR_HEIGHT, WINDOW_SIZE, STATUS_BAR_BOTTOM_HEIGHT)
    pygame.draw.rect(screen, WHITE, status_bar_rect)
    text_surface = font.render(status_text, True, BLACK)
    screen.blit(text_surface, (10, WINDOW_SIZE + STATUS_BAR_HEIGHT + 5))

    return new_game_button, undo_button

# Validate a move
def is_valid_move(board, row, col, player):
    if board[row][col] != 0:
        return False
    opponent = -player
    for dr, dc in DIRECTIONS:
        r, c = row + dr, col + dc
        has_opponent = False
        while 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE and board[r][c] == opponent:
            has_opponent = True
            r += dr
            c += dc
        if has_opponent and 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE and board[r][c] == player:
            return True
    return False

# Get all valid moves
def get_valid_moves(board, player):
    return [(r, c) for r in range(BOARD_SIZE) for c in range(BOARD_SIZE) if is_valid_move(board, r, c, player)]

# Make a move
def make_move(board, row, col, player):
    board[row][col] = player
    opponent = -player
    for dr, dc in DIRECTIONS:
        r, c = row + dr, col + dc
        pieces_to_flip = []
        while 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE and board[r][c] == opponent:
            pieces_to_flip.append((r, c))
            r += dr
            c += dc
        if pieces_to_flip and 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE and board[r][c] == player:
            for r_flip, c_flip in pieces_to_flip:
                board[r_flip][c_flip] = player

# Main loop
def main():
    board = init_board()
    player = -1  # Black goes first
    clock = pygame.time.Clock()
    running = True
    history = [board.copy()]
    countdown = 60
    last_move_time = time.time()

    while running:
        current_time = time.time()
        if current_time - last_move_time >= 1:
            countdown -= 1
            last_move_time = current_time
            if countdown <= 0:
                countdown = 0  # Stop at 0, no automatic player switch

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                x, y = event.pos
                if y < STATUS_BAR_HEIGHT:  # Buttons area
                    new_game_button, undo_button = draw_status_bar(player, board, countdown)
                    if new_game_button.collidepoint(x, y):
                        board = init_board()
                        player = -1
                        history = [board.copy()]
                        countdown = 60
                        last_move_time = time.time()
                    elif undo_button.collidepoint(x, y) and len(history) > 1:
                        history.pop()
                        board = history[-1].copy()
                        player = -player
                        countdown = 60
                        last_move_time = time.time()
                elif y >= STATUS_BAR_HEIGHT:  # Only allow clicks on the board area
                    row, col = (y - STATUS_BAR_HEIGHT) // SQUARE_SIZE, x // SQUARE_SIZE
                    if is_valid_move(board, row, col, player):
                        make_move(board, row, col, player)
                        player = -player
                        history.append(board.copy())
                        countdown = 60  # Reset countdown after a valid move
                        last_move_time = current_time

        draw_board(board)
        new_game_button, undo_button = draw_status_bar(player, board, countdown)
        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()

if __name__ == "__main__":
    main()