/**
 * Tron Lightcycle Game - Self-playing AI game as background effect
 * 6 AI players compete, leaving light trails that fade after 5 seconds
 */

type Direction = 'up' | 'down' | 'left' | 'right';

interface Point {
  x: number;
  y: number;
}

interface Player {
  id: number;
  colorIndex: number;
  headX: number;
  headY: number;
  direction: Direction;
  trail: Point[];
  isAlive: boolean;
  respawnTimer: number;
  svg: SVGSVGElement;
  path: SVGPathElement;
  head: SVGCircleElement;
  explosion: SVGGElement | null;
}

interface TronConfig {
  playerCount: number;
  speed: number;
  gridSize: number;
  trailLength: number; // max trail length in pixels
  respawnDelay: number;
  straightProbability: number;
}

export class TronGameManager {
  private container: HTMLElement | null = null;
  private players: Player[] = [];
  private occupiedCells: Map<string, number> = new Map();
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private motionQuery: MediaQueryList;
  private isReducedMotion: boolean;
  private cleanupFns: (() => void)[] = [];
  private vw: number = 0;
  private vh: number = 0;

  private config: TronConfig = {
    playerCount: 3,
    speed: 150,
    gridSize: 50,
    trailLength: 1250, // 25 grid cells × 50px
    respawnDelay: 2000,
    straightProbability: 0.7,
  };

  // Player colors for light and dark modes
  private lightColors = [
    '#d4a574', // amber
    '#8b7355', // brown
    '#6b8e6b', // sage
    '#7b68a6', // purple
    '#5d8aa8', // steel
    '#a67b5b', // sienna
  ];

  private darkColors = [
    '#00d4ff', // cyan
    '#ff6b6b', // red
    '#50fa7b', // green
    '#bd93f9', // purple
    '#ffb86c', // orange
    '#ff79c6', // pink
  ];

  constructor() {
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.isReducedMotion = this.motionQuery.matches;
  }

  init(): () => void {
    if (this.isReducedMotion) {
      return () => {};
    }

    this.updateViewportSize();
    this.createContainer();
    this.initPlayers();

    const handleMotionChange = (e: MediaQueryListEvent) => {
      this.isReducedMotion = e.matches;
      if (this.isReducedMotion) {
        this.stop();
      } else {
        this.start();
      }
    };
    this.motionQuery.addEventListener('change', handleMotionChange);
    this.cleanupFns.push(() => {
      this.motionQuery.removeEventListener('change', handleMotionChange);
    });

    const handleResize = () => {
      this.updateViewportSize();
    };
    window.addEventListener('resize', handleResize);
    this.cleanupFns.push(() => {
      window.removeEventListener('resize', handleResize);
    });

    this.start();

    return () => this.cleanup();
  }

  private updateViewportSize(): void {
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
  }

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'grid-pulse-container';
    this.container.className = 'grid-pulse-container';
    this.container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.container);
  }

  private initPlayers(): void {
    const spawnPositions = this.getInitialSpawnPositions();

    for (let i = 0; i < this.config.playerCount; i++) {
      const spawn = spawnPositions[i];
      const player = this.createPlayer(i, spawn);
      this.players.push(player);
    }
  }

  private getInitialSpawnPositions(): Array<{ x: number; y: number; direction: Direction }> {
    const grid = this.config.gridSize;
    const gridLinesX = Math.floor(this.vw / grid);
    const gridLinesY = Math.floor(this.vh / grid);
    const positions: Array<{ x: number; y: number; direction: Direction }> = [];

    // Distribute 3 players around the edges
    // Top edge
    positions.push({
      x: Math.floor(gridLinesX * 0.5) * grid,
      y: 0,
      direction: 'down',
    });

    // Bottom left
    positions.push({
      x: Math.floor(gridLinesX * 0.25) * grid,
      y: Math.floor(gridLinesY) * grid,
      direction: 'up',
    });

    // Bottom right
    positions.push({
      x: Math.floor(gridLinesX * 0.75) * grid,
      y: Math.floor(gridLinesY) * grid,
      direction: 'up',
    });

    return positions;
  }

  private createPlayer(
    id: number,
    spawn: { x: number; y: number; direction: Direction }
  ): Player {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('grid-trace-svg', `tron-player-${id + 1}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    // Create path for the trail
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('grid-trace-path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);

    // Create circle for the head
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.classList.add('grid-trace-head');
    head.setAttribute('r', '4');
    head.setAttribute('cx', String(spawn.x));
    head.setAttribute('cy', String(spawn.y));
    svg.appendChild(head);

    this.container?.appendChild(svg);

    const player: Player = {
      id,
      colorIndex: id,
      headX: spawn.x,
      headY: spawn.y,
      direction: spawn.direction,
      trail: [{ x: spawn.x, y: spawn.y }],
      isAlive: true,
      respawnTimer: 0,
      svg,
      path,
      head,
      explosion: null,
    };

    // Add initial position to occupied cells
    this.addToOccupiedCells(spawn.x, spawn.y, id);

    return player;
  }

  private start(): void {
    if (this.isReducedMotion || !this.container) return;

    this.lastTime = performance.now();
    this.animate();
  }

  private stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.players.forEach((player) => {
      player.svg.remove();
    });
    this.players = [];
    this.occupiedCells.clear();
  }

  private animate = (): void => {
    if (this.isReducedMotion) return;

    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    for (const player of this.players) {
      if (player.isAlive) {
        this.updatePlayer(player, deltaTime);
      } else {
        this.updateRespawnTimer(player, deltaTime);
      }
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private updatePlayer(player: Player, deltaTime: number): void {
    const distance = this.config.speed * deltaTime;
    const grid = this.config.gridSize;

    // Calculate new position
    let newX = player.headX;
    let newY = player.headY;

    switch (player.direction) {
      case 'up':
        newY -= distance;
        break;
      case 'down':
        newY += distance;
        break;
      case 'left':
        newX -= distance;
        break;
      case 'right':
        newX += distance;
        break;
    }

    // Check if we've crossed an actual grid line (not cell midpoint)
    let crossedIntersection = false;
    let intersectionX = 0;
    let intersectionY = 0;

    switch (player.direction) {
      case 'down':
        // Check if we crossed a horizontal grid line going down
        const nextLineDown = Math.ceil(player.headY / grid) * grid;
        if (player.headY < nextLineDown && newY >= nextLineDown) {
          crossedIntersection = true;
          intersectionX = Math.round(player.headX / grid) * grid;
          intersectionY = nextLineDown;
        }
        break;
      case 'up':
        // Check if we crossed a horizontal grid line going up
        const nextLineUp = Math.floor(player.headY / grid) * grid;
        if (player.headY > nextLineUp && newY <= nextLineUp) {
          crossedIntersection = true;
          intersectionX = Math.round(player.headX / grid) * grid;
          intersectionY = nextLineUp;
        }
        break;
      case 'right':
        // Check if we crossed a vertical grid line going right
        const nextLineRight = Math.ceil(player.headX / grid) * grid;
        if (player.headX < nextLineRight && newX >= nextLineRight) {
          crossedIntersection = true;
          intersectionX = nextLineRight;
          intersectionY = Math.round(player.headY / grid) * grid;
        }
        break;
      case 'left':
        // Check if we crossed a vertical grid line going left
        const nextLineLeft = Math.floor(player.headX / grid) * grid;
        if (player.headX > nextLineLeft && newX <= nextLineLeft) {
          crossedIntersection = true;
          intersectionX = nextLineLeft;
          intersectionY = Math.round(player.headY / grid) * grid;
        }
        break;
    }

    if (crossedIntersection) {
      // Check for collision at the intersection
      if (this.checkCollision(intersectionX, intersectionY, player.id)) {
        this.triggerCrash(player);
        return;
      }

      // Make AI decision at intersection
      const newDirection = this.getAIDirection(player, intersectionX, intersectionY);
      if (newDirection === null) {
        this.triggerCrash(player);
        return;
      }

      // Add intersection to trail and occupied cells
      player.trail.push({ x: intersectionX, y: intersectionY });
      this.addToOccupiedCells(intersectionX, intersectionY, player.id);

      // Calculate how far past the intersection we moved
      let distPastIntersection = 0;
      switch (player.direction) {
        case 'up':
          distPastIntersection = intersectionY - newY;
          break;
        case 'down':
          distPastIntersection = newY - intersectionY;
          break;
        case 'left':
          distPastIntersection = intersectionX - newX;
          break;
        case 'right':
          distPastIntersection = newX - intersectionX;
          break;
      }

      // Continue in the new direction from the intersection
      player.direction = newDirection;
      switch (newDirection) {
        case 'up':
          newX = intersectionX;
          newY = intersectionY - distPastIntersection;
          break;
        case 'down':
          newX = intersectionX;
          newY = intersectionY + distPastIntersection;
          break;
        case 'left':
          newX = intersectionX - distPastIntersection;
          newY = intersectionY;
          break;
        case 'right':
          newX = intersectionX + distPastIntersection;
          newY = intersectionY;
          break;
      }
    }

    // Update head position smoothly
    player.headX = newX;
    player.headY = newY;

    // Trim trail to max length
    this.trimTrail(player);

    // Render the player
    this.renderPlayer(player);
  }

  private getAIDirection(
    player: Player,
    x: number,
    y: number
  ): Direction | null {
    const safeDirs = this.getSafeDirections(player, x, y);

    if (safeDirs.length === 0) {
      return null; // No safe direction - crash
    }

    // Prefer continuing straight if safe
    if (safeDirs.includes(player.direction)) {
      if (Math.random() < this.config.straightProbability) {
        return player.direction;
      }
    }

    // Pick a random safe direction
    return safeDirs[Math.floor(Math.random() * safeDirs.length)];
  }

  private getSafeDirections(player: Player, x: number, y: number): Direction[] {
    const grid = this.config.gridSize;
    const safeDirs: Direction[] = [];
    const opposite: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };

    const directions: Direction[] = ['up', 'down', 'left', 'right'];

    for (const dir of directions) {
      // Can't reverse direction
      if (dir === opposite[player.direction]) continue;

      let nextX = x;
      let nextY = y;

      switch (dir) {
        case 'up':
          nextY -= grid;
          break;
        case 'down':
          nextY += grid;
          break;
        case 'left':
          nextX -= grid;
          break;
        case 'right':
          nextX += grid;
          break;
      }

      if (!this.checkCollision(nextX, nextY, player.id)) {
        safeDirs.push(dir);
      }
    }

    return safeDirs;
  }

  private checkCollision(x: number, y: number, playerId: number): boolean {
    const grid = this.config.gridSize;

    // Wall collision
    if (x < 0 || x > this.vw || y < 0 || y > this.vh) {
      return true;
    }

    // Trail collision
    const cellX = Math.round(x / grid);
    const cellY = Math.round(y / grid);
    const cellKey = `${cellX},${cellY}`;
    const occupant = this.occupiedCells.get(cellKey);

    // Collision if cell is occupied (even by self - can't cross own trail)
    if (occupant !== undefined) {
      return true;
    }

    return false;
  }

  private addToOccupiedCells(x: number, y: number, playerId: number): void {
    const grid = this.config.gridSize;
    const cellX = Math.round(x / grid);
    const cellY = Math.round(y / grid);
    const cellKey = `${cellX},${cellY}`;
    this.occupiedCells.set(cellKey, playerId);
  }

  private removeFromOccupiedCells(x: number, y: number): void {
    const grid = this.config.gridSize;
    const cellX = Math.round(x / grid);
    const cellY = Math.round(y / grid);
    const cellKey = `${cellX},${cellY}`;
    this.occupiedCells.delete(cellKey);
  }

  private trimTrail(player: Player): void {
    const maxLength = this.config.trailLength;
    const trail = player.trail;

    // Calculate total trail length from head backwards
    let totalLength = 0;

    // Include distance from last trail point to current head position
    if (trail.length > 0) {
      const lastPoint = trail[trail.length - 1];
      const dx = player.headX - lastPoint.x;
      const dy = player.headY - lastPoint.y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }

    // Calculate cumulative length from head (end) backwards
    for (let i = trail.length - 1; i > 0; i--) {
      const dx = trail[i].x - trail[i - 1].x;
      const dy = trail[i].y - trail[i - 1].y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      totalLength += segmentLength;

      if (totalLength > maxLength) {
        // Remove all points before index i-1
        while (trail.length > 0 && trail.length > i) {
          // Actually we want to keep from i-1 onwards, remove points before that
          break;
        }

        // Remove old points and update collision map
        const pointsToRemove = i - 1;
        for (let j = 0; j < pointsToRemove; j++) {
          const oldPoint = trail.shift()!;
          this.removeFromOccupiedCells(oldPoint.x, oldPoint.y);
        }
        return;
      }
    }
  }

  private triggerCrash(player: Player): void {
    player.isAlive = false;
    player.respawnTimer = this.config.respawnDelay;

    // Create explosion effect
    this.createExplosion(player);

    // Hide head
    player.head.style.opacity = '0';

    // Add fading class to path
    player.path.classList.add('fading');

    // Clear trail from collision map after fade animation
    setTimeout(() => {
      this.clearPlayerTrail(player);
    }, 500);
  }

  private createExplosion(player: Player): void {
    const explosion = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    explosion.classList.add('tron-explosion');

    // Create expanding circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(player.headX));
    circle.setAttribute('cy', String(player.headY));
    circle.setAttribute('r', '10');
    circle.classList.add('explosion-circle');
    explosion.appendChild(circle);

    // Create particle lines
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(player.headX));
      line.setAttribute('y1', String(player.headY));
      line.setAttribute('x2', String(player.headX + Math.cos(angle) * 20));
      line.setAttribute('y2', String(player.headY + Math.sin(angle) * 20));
      line.classList.add('explosion-line');
      explosion.appendChild(line);
    }

    player.svg.appendChild(explosion);
    player.explosion = explosion;

    // Remove explosion after animation
    setTimeout(() => {
      explosion.remove();
      player.explosion = null;
    }, 500);
  }

  private clearPlayerTrail(player: Player): void {
    for (const point of player.trail) {
      this.removeFromOccupiedCells(point.x, point.y);
    }
    player.trail = [];
    player.path.setAttribute('d', '');
    player.path.classList.remove('fading');
  }

  private updateRespawnTimer(player: Player, deltaTime: number): void {
    player.respawnTimer -= deltaTime * 1000;

    if (player.respawnTimer <= 0) {
      this.respawnPlayer(player);
    }
  }

  private respawnPlayer(player: Player): void {
    const spawn = this.getRandomSafeSpawn();

    player.headX = spawn.x;
    player.headY = spawn.y;
    player.direction = spawn.direction;
    player.trail = [{ x: spawn.x, y: spawn.y }];
    player.isAlive = true;
    player.respawnTimer = 0;

    // Show head again
    player.head.style.opacity = '1';
    player.head.setAttribute('cx', String(spawn.x));
    player.head.setAttribute('cy', String(spawn.y));

    // Add initial position to occupied cells
    this.addToOccupiedCells(spawn.x, spawn.y, player.id);
  }

  private getRandomSafeSpawn(): { x: number; y: number; direction: Direction } {
    const grid = this.config.gridSize;
    const gridLinesX = Math.floor(this.vw / grid);
    const gridLinesY = Math.floor(this.vh / grid);
    const maxAttempts = 50;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number, direction: Direction;

      switch (edge) {
        case 0: // Top edge
          x = Math.floor(Math.random() * gridLinesX) * grid;
          y = 0;
          direction = 'down';
          break;
        case 1: // Right edge
          x = gridLinesX * grid;
          y = Math.floor(Math.random() * gridLinesY) * grid;
          direction = 'left';
          break;
        case 2: // Bottom edge
          x = Math.floor(Math.random() * gridLinesX) * grid;
          y = gridLinesY * grid;
          direction = 'up';
          break;
        case 3: // Left edge
        default:
          x = 0;
          y = Math.floor(Math.random() * gridLinesY) * grid;
          direction = 'right';
          break;
      }

      // Check if spawn point is safe
      if (!this.checkCollision(x, y, -1)) {
        return { x, y, direction };
      }
    }

    // Fallback - just pick a corner
    return { x: 0, y: 0, direction: 'right' };
  }

  private renderPlayer(player: Player): void {
    const trail = player.trail;
    if (trail.length < 1) return;

    const maxLength = this.config.trailLength;

    // Calculate total trail length and find interpolated start
    let totalLength = 0;
    const segments: { length: number; startIdx: number }[] = [];

    // Distance from last trail point to head
    if (trail.length > 0) {
      const lastPoint = trail[trail.length - 1];
      const dx = player.headX - lastPoint.x;
      const dy = player.headY - lastPoint.y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }

    // Calculate segment lengths from head backwards
    for (let i = trail.length - 1; i > 0; i--) {
      const dx = trail[i].x - trail[i - 1].x;
      const dy = trail[i].y - trail[i - 1].y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      segments.unshift({ length: segmentLength, startIdx: i - 1 });
      totalLength += segmentLength;
    }

    // Find interpolated start point
    let startX = trail[0].x;
    let startY = trail[0].y;
    let startIndex = 0;

    if (totalLength > maxLength) {
      let excess = totalLength - maxLength;
      let cumulative = 0;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        cumulative += seg.length;

        if (cumulative >= excess) {
          // Interpolate within this segment
          const remaining = cumulative - excess;
          const ratio = remaining / seg.length;
          const p0 = trail[seg.startIdx];
          const p1 = trail[seg.startIdx + 1];
          startX = p1.x - (p1.x - p0.x) * ratio;
          startY = p1.y - (p1.y - p0.y) * ratio;
          startIndex = seg.startIdx + 1;
          break;
        }
      }
    }

    // Build SVG path string with interpolated start
    let d = `M ${startX} ${startY}`;
    for (let i = startIndex; i < trail.length; i++) {
      if (i === startIndex && startX === trail[i].x && startY === trail[i].y) {
        continue; // Skip if start point matches this trail point
      }
      d += ` L ${trail[i].x} ${trail[i].y}`;
    }

    // Add current head position if different from last trail point
    const lastTrail = trail[trail.length - 1];
    if (player.headX !== lastTrail.x || player.headY !== lastTrail.y) {
      d += ` L ${player.headX} ${player.headY}`;
    }

    player.path.setAttribute('d', d);

    // Update head position
    player.head.setAttribute('cx', String(player.headX));
    player.head.setAttribute('cy', String(player.headY));
  }

  private cleanup(): void {
    this.stop();
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];

    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}

export function initGridPulse(): () => void {
  const manager = new TronGameManager();
  return manager.init();
}
