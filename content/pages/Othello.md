# 黑白棋游戏的设计与实现

这篇文章介绍了如何设计和实现一个简单的黑白棋（又叫 Othello）游戏，并且详细解释了代码的结构、设计思路和所使用的主要技术。这个项目使用了 Python 的 `pygame` 库来实现图形化用户界面（GUI），为玩家提供了一个交互式的游戏体验。

## 设计思路

我们首先构建一个标准的 8x8 棋盘，用于黑白棋游戏。初始状态下，棋盘中间放置了四个棋子，分别是黑白相间的排列，这是黑白棋的标准开局。玩家可以通过鼠标点击棋盘上的空格来进行下子。每一回合都有一个倒计时，玩家需要在 60 秒内完成走棋，超时则倒计时重置，不做强制处罚。

游戏还包含“新游戏”和“回退”两个按钮，分别用于重新开始游戏和回到上一状态。棋盘的上下方分别设有不同的功能区域，上方是倒计时和功能按钮，下方则是当前玩家信息和棋子数量的统计。

<img src="../img/Othello.png" alt="Help Desk Image" style="width:50%;" />

## 代码结构

整个项目由几个主要函数组成，每个函数负责不同的任务，以下是代码的结构及每个部分的功能：

1. **初始化和常量定义**

   - 使用 `pygame.init()` 初始化 `pygame` 库。
   - 定义一些常量，包括颜色、棋盘大小、窗口大小、状态栏高度等，用于在后续的绘图和逻辑处理中使用。
2. **界面绘制**

   - `init_board()` 函数用于初始化棋盘，设置初始的黑白棋子布局。
   - `draw_board()` 函数用于绘制棋盘和棋子，包括每一个格子的边框和棋子的颜色。
   - `draw_status_bar()` 函数绘制了两个部分的状态栏：上方的功能按钮区域和下方的棋手状态、棋子数量统计区域。
3. **游戏逻辑**

   - `is_valid_move()` 函数用于判断玩家的落子是否有效，包括检查当前位置是否为空，以及是否可以夹住对方棋子。
   - `get_valid_moves()` 函数用于获取所有有效的移动，帮助玩家判断在哪些位置可以下子。
   - `make_move()` 函数执行实际的下子操作，并根据游戏规则翻转对方的棋子。
4. **主循环**

   - `main()` 函数是游戏的主循环，负责处理用户输入、控制棋盘状态的变化，以及更新屏幕的显示。
   - 主循环中，`pygame` 处理玩家的鼠标点击，判断玩家是否点击了功能按钮或棋盘位置，并作出相应的响应。
   - 在玩家成功下子后，重置倒计时以提醒下一个玩家，并保存棋盘的历史状态用于“回退”功能。

## 主要技术点

1. **图形化用户界面**

   - 使用 `pygame` 来创建游戏窗口，绘制棋盘和按钮，并处理用户的输入事件。
   - `pygame.display.set_mode()` 创建游戏窗口，`pygame.draw.rect()` 和 `pygame.draw.circle()` 用于绘制棋盘的格子和棋子。
2. **状态管理**

   - 游戏状态通过一个二维数组 `board` 来表示，其中 `1` 表示白棋，`-1` 表示黑棋，`0` 表示空格。
   - 每次玩家下子后，更新棋盘状态并保存到 `history` 列表中，以实现回退功能。
3. **计时器功能**

   - 在每一回合中，设置了 60 秒的倒计时，提醒当前玩家在限定时间内完成走棋。倒计时的逻辑通过比较当前时间与上一次操作时间来实现。
4. **按钮功能**

   - 游戏中有两个按钮：“新游戏”按钮可以重新初始化棋盘，开始新的游戏；“回退”按钮可以撤销玩家的上一步操作，甚至可以多次点击回到最初状态。
   - 使用 `pygame.draw.rect()` 绘制按钮，监听鼠标点击事件来判断按钮是否被点击。

## 代码注释

以下是主要代码部分的详细注释：

```python
# Initialize pygame
pygame.init()  # 初始化 Pygame 库，为后续的图形界面设置做好准备

# Constants
WHITE = (255, 255, 255)  # 定义白色，用于绘制白棋
BLACK = (0, 0, 0)        # 定义黑色，用于绘制黑棋
GREEN = (0, 128, 0)      # 定义绿色，用于绘制棋盘背景
...

# Initialize the board
def init_board():
    board = np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=int)  # 创建 8x8 的棋盘，用 0 表示空格
    board[3][3] = board[4][4] = 1  # 初始状态，设置白棋在中间的两个位置
    board[3][4] = board[4][3] = -1 # 初始状态，设置黑棋在中间的两个位置
    return board

# Draw the board
def draw_board(board):
    screen.fill(GREEN)  # 使用绿色填充整个屏幕作为棋盘的背景
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            rect = pygame.Rect(col * SQUARE_SIZE, row * SQUARE_SIZE + STATUS_BAR_HEIGHT, SQUARE_SIZE, SQUARE_SIZE)
            pygame.draw.rect(screen, BLACK, rect, 1)  # 绘制棋盘的边框
            if board[row][col] == 1:
                pygame.draw.circle(screen, WHITE, rect.center, SQUARE_SIZE // 2 - 5)  # 绘制白棋
            elif board[row][col] == -1:
                pygame.draw.circle(screen, BLACK, rect.center, SQUARE_SIZE // 2 - 5)  # 绘制黑棋

# Draw the status bar and buttons
def draw_status_bar(player, board, countdown):
    ...  # 绘制功能按钮和棋手状态信息

# Validate a move
def is_valid_move(board, row, col, player):
    ...  # 检查当前位置是否有效，是否可以夹住对方的棋子

# Main loop
def main():
    ...  # 主游戏循环，处理用户输入、计时器更新、状态切换

if __name__ == "__main__":
    main()  # 启动游戏
```


完整代码：

```
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
```
