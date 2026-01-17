import { SeededRandom } from './seededRandom';
import type { 
  Tile, 
  TileType, 
  WorldConfig, 
  WorldData,
  DifficultySettings
} from '../types/world.types';
import { DIFFICULTY_SETTINGS } from '../types/world.types';

export class WorldGenerator {
  private random: SeededRandom;
  private readonly config: WorldConfig;
  private readonly worldData: WorldData;

  constructor(worldData: WorldData, config: WorldConfig) {
    this.worldData = worldData;
    this.config = config;
    this.random = new SeededRandom(worldData.seed);
  }

  /**
   * Perlin-like noise for smooth, natural terrain
   */
  private noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    
    const u = this.fade(xf);
    const v = this.fade(yf);
    
    const hash = (x: number, y: number) => {
      const n = Math.sin(x * 12.9898 + y * 78.233 + this.random.next() * 1000) * 43758.5453123;
      return n - Math.floor(n);
    };
    
    const a = hash(X, Y);
    const b = hash(X + 1, Y);
    const c = hash(X, Y + 1);
    const d = hash(X + 1, Y + 1);
    
    const x1 = this.lerp(a, b, u);
    const x2 = this.lerp(c, d, u);
    
    return this.lerp(x1, x2, v);
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  /**
   * Fractal Brownian Motion - creates organic terrain features
   */
  private fbm(x: number, y: number, octaves: number = 6): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }

  /**
   * Generate height map for terrain
   */
  private generateHeightMap(): number[][] {
    const { width, height } = this.config;
    const heightMap: number[][] = [];

    for (let y = 0; y < height; y++) {
      heightMap[y] = [];
      for (let x = 0; x < width; x++) {
        // Multiple noise layers at different scales
        const continentalScale = this.fbm(x / 35, y / 35, 3) * 1.2;
        const regionalScale = this.fbm(x / 18, y / 18, 4) * 0.6;
        const localScale = this.fbm(x / 9, y / 9, 5) * 0.3;
        const microScale = this.fbm(x / 4.5, y / 4.5, 4) * 0.15;
        
        // Combine for rich elevation data
        let elevation = continentalScale + regionalScale + localScale + microScale;
        
        // Normalize to 0-1 range
        elevation = (elevation + 2.25) / 4.5;
        elevation = Math.max(0, Math.min(1, elevation));
        
        if (heightMap[y]) {
          heightMap[y]![x] = elevation;
        }
      }
    }

    return heightMap;
  }

  /**
   * Generate moisture map for varied terrain types
   */
  private generateMoistureMap(): number[][] {
    const { width, height } = this.config;
    const moistureMap: number[][] = [];

    for (let y = 0; y < height; y++) {
      moistureMap[y] = [];
      for (let x = 0; x < width; x++) {
        const moisture = this.fbm(x / 20, y / 20, 4);
        const normalized = (moisture + 1) / 2;
        
        if (moistureMap[y]) {
          moistureMap[y]![x] = normalized;
        }
      }
    }

    return moistureMap;
  }

  /**
   * Convert elevation and moisture to tile type
   */
  private getTerrainType(elevation: number, moisture: number, settings: DifficultySettings): TileType {
    // Threshold calculations
    const waterLevel = settings.waterPercentage;
    const beachLevel = waterLevel + 0.08;
    const stoneLevel = 0.75; // Stone appears at high elevations
    
    // Deep water
    if (elevation < waterLevel) {
      return 'water';
    }
    
    // Beaches - appear near water AND in dry low areas
    if (elevation < beachLevel) {
      return 'sand';
    }
    
    // Sandy deserts - dry areas at mid elevation
    if (moisture < 0.35 && elevation > 0.35 && elevation < 0.65) {
      return 'sand';
    }
    
    // Stone - high elevation rocky areas
    if (elevation > stoneLevel) {
      return 'stone';
    }
    
    // Rocky patches in dry mid-elevation areas
    if (moisture < 0.3 && elevation > 0.55) {
      return 'stone';
    }
    
    // Default to land (grass)
    return 'land';
  }

  /**
   * Create natural terrain from height and moisture maps
   */
  private generateNaturalTerrain(tiles: Tile[][]): void {
    const { width, height } = this.config;
    const settings = DIFFICULTY_SETTINGS[this.worldData.difficulty];
    
    const heightMap = this.generateHeightMap();
    const moistureMap = this.generateMoistureMap();

    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        const elevation = heightMap[y]?.[x] ?? 0.5;
        const moisture = moistureMap[y]?.[x] ?? 0.5;
        
        const tileType = this.getTerrainType(elevation, moisture, settings);
        
        const row = tiles[y];
        if (row) {
          row[x] = { type: tileType, x, y };
        }
      }
    }
  }

  /**
   * Add scattered stone clusters for rocky outcrops
   */
  private addStoneFormations(tiles: Tile[][]): void {
    const { width, height } = this.config;
    const numFormations = this.worldData.difficulty === 'easy' ? 4 : 
                          this.worldData.difficulty === 'medium' ? 6 : 8;

    for (let i = 0; i < numFormations; i++) {
      const centerX = this.random.int(width * 0.15, width * 0.85);
      const centerY = this.random.int(height * 0.15, height * 0.85);
      const radius = this.random.int(2, 5);
      
      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          const dist = Math.sqrt(x * x + y * y);
          if (dist <= radius && this.random.boolean(0.7)) {
            const lx = centerX + x;
            const ly = centerY + y;
            
            if (lx >= 0 && lx < width && ly >= 0 && ly < height) {
              const row = tiles[ly];
              const tile = row?.[lx];
              if (tile && tile.type === 'land') {
                tile.type = 'stone';
              }
            }
          }
        }
      }
    }
  }

  /**
   * Add sandy patches and desert areas
   */
  private addSandyAreas(tiles: Tile[][]): void {
    const { width, height } = this.config;
    const numPatches = this.worldData.difficulty === 'easy' ? 3 : 
                       this.worldData.difficulty === 'medium' ? 5 : 6;

    for (let i = 0; i < numPatches; i++) {
      const centerX = this.random.int(width * 0.2, width * 0.8);
      const centerY = this.random.int(height * 0.2, height * 0.8);
      const radius = this.random.int(3, 6);
      
      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          const dist = Math.sqrt(x * x + y * y);
          if (dist <= radius && this.random.boolean(0.65)) {
            const lx = centerX + x;
            const ly = centerY + y;
            
            if (lx >= 0 && lx < width && ly >= 0 && ly < height) {
              const row = tiles[ly];
              const tile = row?.[lx];
              if (tile && tile.type === 'land') {
                tile.type = 'sand';
              }
            }
          }
        }
      }
    }
  }

  /**
   * Add lakes throughout the map
   */
  private addLakes(tiles: Tile[][]): void {
    const { width, height } = this.config;
    const numLakes = this.worldData.difficulty === 'easy' ? 3 : 
                     this.worldData.difficulty === 'medium' ? 5 : 7;

    for (let i = 0; i < numLakes; i++) {
      const centerX = this.random.int(width * 0.2, width * 0.8);
      const centerY = this.random.int(height * 0.2, height * 0.8);
      const radius = this.random.int(3, 7);
      
      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          const dist = Math.sqrt(x * x + y * y);
          if (dist <= radius) {
            const lx = centerX + x;
            const ly = centerY + y;
            
            if (lx >= 0 && lx < width && ly >= 0 && ly < height) {
              const row = tiles[ly];
              const tile = row?.[lx];
              if (tile && this.random.boolean(0.85)) {
                tile.type = 'water';
              }
            }
          }
        }
      }
    }
  }

  /**
   * Add meandering rivers
   */
  private addRivers(tiles: Tile[][]): void {
    const { width, height } = this.config;
    const numRivers = this.worldData.difficulty === 'easy' ? 2 : 
                      this.worldData.difficulty === 'medium' ? 3 : 4;

    for (let i = 0; i < numRivers; i++) {
      let x: number, y: number;
      const startEdge = this.random.int(0, 4);
      
      if (startEdge === 0) {
        x = this.random.int(0, width);
        y = 0;
      } else if (startEdge === 1) {
        x = this.random.int(0, width);
        y = height - 1;
      } else if (startEdge === 2) {
        x = 0;
        y = this.random.int(0, height);
      } else {
        x = width - 1;
        y = this.random.int(0, height);
      }

      const targetX = width / 2 + this.random.range(-10, 10);
      const targetY = height / 2 + this.random.range(-10, 10);
      
      const riverLength = this.random.int(25, 45);
      let angle = Math.atan2(targetY - y, targetX - x);
      
      for (let step = 0; step < riverLength; step++) {
        angle += this.random.range(-0.35, 0.35);
        
        x += Math.cos(angle) * 0.7;
        y += Math.sin(angle) * 0.7;
        
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        
        if (ix < 0 || ix >= width || iy < 0 || iy >= height) break;
        
        const riverWidth = this.random.int(1, 2);
        for (let dy = -riverWidth; dy <= riverWidth; dy++) {
          for (let dx = -riverWidth; dx <= riverWidth; dx++) {
            const rx = ix + dx;
            const ry = iy + dy;
            
            if (rx >= 0 && rx < width && ry >= 0 && ry < height) {
              const row = tiles[ry];
              const tile = row?.[rx];
              if (tile && this.random.boolean(0.75)) {
                tile.type = 'water';
              }
            }
          }
        }
      }
    }
  }

  /**
   * Create natural beaches around all water
   */
  private createBeaches(tiles: Tile[][]): void {
    const { width, height } = this.config;
    
    for (let y = 1; y < height - 1; y++) {
      const row = tiles[y];
      if (!row) continue;
      
      for (let x = 1; x < width - 1; x++) {
        const tile = row[x];
        if (!tile || tile.type !== 'land') continue;
        
        const neighbors = this.getNeighbors(tiles, x, y);
        const waterCount = neighbors.filter(n => n.type === 'water').length;
        
        // Create beaches near water
        if (waterCount >= 2 && waterCount <= 5) {
          if (this.random.boolean(0.6)) {
            tile.type = 'sand';
          }
        }
      }
    }
  }

  /**
   * Smooth terrain for natural transitions
   */
  private smoothTerrain(tiles: Tile[][]): void {
    const { width, height } = this.config;
    
    for (let y = 1; y < height - 1; y++) {
      const row = tiles[y];
      if (!row) continue;
      
      for (let x = 1; x < width - 1; x++) {
        const currentTile = row[x];
        if (!currentTile) continue;
        
        const neighbors = this.getNeighbors(tiles, x, y);
        const counts: Record<TileType, number> = {
          land: 0, water: 0, stone: 0, sand: 0
        };
        
        for (const n of neighbors) {
          counts[n.type]++;
        }
        
        // Remove isolated single tiles
        if (counts[currentTile.type] <= 2) {
          const sortedTypes = Object.entries(counts).sort((a, b) => b[1] - a[1]);
          const maxType = sortedTypes[0]?.[0] as TileType;
          
          if (maxType && maxType !== 'water') {
            currentTile.type = maxType;
          } else if (sortedTypes[1]) {
            currentTile.type = sortedTypes[1][0] as TileType;
          }
        }
        
        // Smooth water edges slightly
        if (currentTile.type === 'water' && counts.water <= 3 && counts.land >= 5) {
          if (this.random.boolean(0.3)) {
            currentTile.type = 'land';
          }
        }

        // Create transition zones between stone and land
        if (currentTile.type === 'stone' && counts.land >= 5) {
          if (this.random.boolean(0.4)) {
            currentTile.type = 'land';
          }
        }
      }
    }
  }

  /**
   * Ensure spawn area is safe
   */
  private ensureSpawnSafety(tiles: Tile[][]): void {
    const { width, height } = this.config;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    const spawnRadius = 5;
    for (let dy = -spawnRadius; dy <= spawnRadius; dy++) {
      for (let dx = -spawnRadius; dx <= spawnRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= spawnRadius) {
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const row = tiles[y];
            const tile = row?.[x];
            if (tile) {
              if (dist <= 2) {
                tile.type = 'land';
              } else if (dist <= 4) {
                if (tile.type === 'water') {
                  tile.type = this.random.boolean(0.7) ? 'land' : 'sand';
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Ensure land connectivity
   */
  private ensureLandConnectivity(tiles: Tile[][]): void {
    const { width, height } = this.config;
    const visited = new Set<string>();
    const landMasses: { x: number; y: number; size: number }[] = [];

    for (let y = 0; y < height; y++) {
      const row = tiles[y];
      if (!row) continue;
      
      for (let x = 0; x < width; x++) {
        const tile = row[x];
        if (!tile || tile.type === 'water') continue;
        
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        
        const size = this.floodFill(tiles, x, y, visited);
        if (size > 0) {
          landMasses.push({ x, y, size });
        }
      }
    }

    landMasses.sort((a, b) => b.size - a.size);

    if (landMasses.length > 1) {
      const mainLand = landMasses[0];
      if (!mainLand) return;
      
      for (let i = 1; i < landMasses.length; i++) {
        const island = landMasses[i];
        if (!island || island.size < 5) continue;
        
        this.createLandBridge(tiles, mainLand.x, mainLand.y, island.x, island.y);
      }
    }
  }

  private floodFill(tiles: Tile[][], startX: number, startY: number, visited: Set<string>): number {
    const stack: [number, number][] = [[startX, startY]];
    let count = 0;

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      
      const [x, y] = current;
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height) continue;
      
      const row = tiles[y];
      const tile = row?.[x];
      if (!tile || tile.type === 'water') continue;
      
      visited.add(key);
      count++;
      
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    return count;
  }

  private createLandBridge(tiles: Tile[][], x1: number, y1: number, x2: number, y2: number): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(distance);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.floor(x1 + dx * t);
      const y = Math.floor(y1 + dy * t);

      if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
        const row = tiles[y];
        const tile = row?.[x];
        if (tile) {
          tile.type = 'land';
          
          for (let bx = -1; bx <= 1; bx++) {
            for (let by = -1; by <= 1; by++) {
              const nx = x + bx;
              const ny = y + by;
              if (nx >= 0 && nx < this.config.width && ny >= 0 && ny < this.config.height) {
                const bridgeRow = tiles[ny];
                const bridgeTile = bridgeRow?.[nx];
                if (bridgeTile && this.random.boolean(0.6)) {
                  bridgeTile.type = 'land';
                }
              }
            }
          }
        }
      }
    }
  }

  private getNeighbors(tiles: Tile[][], x: number, y: number): Tile[] {
    const neighbors: Tile[] = [];
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < this.config.width && ny >= 0 && ny < this.config.height) {
          const row = tiles[ny];
          const tile = row?.[nx];
          if (tile) neighbors.push(tile);
        }
      }
    }
    
    return neighbors;
  }

  /**
   * Main generation - perfectly balanced terrain
   */
  generate(): Tile[][] {
    const { width, height } = this.config;
    
    if (width <= 0 || height <= 0) {
      throw new Error('Invalid world dimensions');
    }

    const tiles: Tile[][] = [];

    // Phase 1: Natural terrain base (elevation + moisture)
    this.generateNaturalTerrain(tiles);

    // Phase 2: Add stone formations (rocky outcrops)
    this.addStoneFormations(tiles);

    // Phase 3: Add sandy areas (deserts/beaches)
    this.addSandyAreas(tiles);

    // Phase 4: Add water features
    this.addLakes(tiles);
    this.addRivers(tiles);

    // Phase 5: Create beaches around water
    this.createBeaches(tiles);

    // Phase 6: Initial smoothing
    this.smoothTerrain(tiles);
    this.smoothTerrain(tiles);

    // Phase 7: Ensure safe spawn
    this.ensureSpawnSafety(tiles);

    // Phase 8: Connect land masses
    this.ensureLandConnectivity(tiles);

    // Phase 9: Final smoothing
    this.smoothTerrain(tiles);

    return tiles;
  }

  getStatistics(tiles: Tile[][]): Record<TileType, number> {
    const stats: Record<TileType, number> = {
      land: 0, water: 0, stone: 0, sand: 0
    };

    for (const row of tiles) {
      if (!row) continue;
      for (const tile of row) {
        if (tile) stats[tile.type]++;
      }
    }

    return stats;
  }

  getSeed(): string {
    return this.worldData.seed;
  }

  getConfig(): WorldConfig {
    return { ...this.config };
  }
}