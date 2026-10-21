import Phaser from 'phaser';

const WIDTH = 600;
const HEIGHT = 1000;

// Paleta estilo Dota 2: metal escuro + ouro
const GOLD = 0xc9a24d;
const GOLD_LIGHT = 0xf0d58a;
const GOLD_DARK = 0x6e5524;

type Point = { x: number; y: number };
type TowerKind = 'basic' | 'rapid' | 'sniper';
type SkillKind =
  'explosion' | 'repair' | 'strike' | 'aura' | 'clones' | 'lightning';
type Gear = 'weapon' | 'armor' | 'relic';
type AuraBoost = { dmg: number; spd: number; rank: number } | null;

const ENTRY: Point = { x: 300, y: 165 };
const MERGE: Point = { x: 300, y: 755 };
const EXIT: Point = { x: 300, y: 800 };

const LEFT_PATH: Point[] = [
  ENTRY,
  { x: 220, y: 185 },
  { x: 110, y: 185 },
  { x: 110, y: 235 },
  { x: 250, y: 235 },
  { x: 250, y: 285 },
  { x: 90, y: 285 },
  { x: 90, y: 335 },
  { x: 250, y: 335 },
  { x: 250, y: 385 },
  { x: 90, y: 385 },
  { x: 90, y: 435 },
  { x: 250, y: 435 },
  { x: 250, y: 485 },
  { x: 90, y: 485 },
  { x: 90, y: 535 },
  { x: 250, y: 535 },
  { x: 250, y: 585 },
  { x: 90, y: 585 },
  { x: 90, y: 635 },
  { x: 250, y: 635 },
  { x: 250, y: 685 },
  { x: 110, y: 685 },
  { x: 110, y: 715 },
  { x: 250, y: 715 },
  MERGE,
  EXIT,
];

const RIGHT_PATH = LEFT_PATH.map(p => ({
  x: WIDTH - p.x,
  y: p.y,
}));

const ALL_PATHS = [LEFT_PATH, RIGHT_PATH];

const TOWER_STATS: Record<TowerKind, {
  name: string;
  range: number;
  damage: number;
  fireRate: number;
  color: number;
  cost: number;
  description: string;
}> = {
  basic: {
    name: 'GUARDIÃ',
    range: 100,
    damage: 2,
    fireRate: 650,
    color: 0x4d91c5,
    cost: 80,
    description: 'Ataque equilibrado',
  },
  rapid: {
    name: 'BESTEIRA',
    range: 100,
    damage: 1,
    fireRate: 250,
    color: 0x63ad72,
    cost: 110,
    description: 'Ataque rápido',
  },
  sniper: {
    name: 'ARCANA',
    range: 330,
    damage: 7,
    fireRate: 1200,
    color: 0xa67ce0,
    cost: 150,
    description: 'Longo alcance',
  },
};

const SKILL_INFO: Record<SkillKind, {
  name: string;
  description: string;
  mana: number;
}> = {
  explosion: {
    name: 'EXPLOSÃO',
    description: 'Dano em área ao redor do herói.',
    mana: 35,
  },
  repair: {
    name: 'REPARO',
    description: 'Recupera vida da fortaleza.',
    mana: 40,
  },
  strike: {
    name: 'GOLPE HEROICO',
    description: 'Dano alto em um inimigo.',
    mana: 20,
  },
  aura: {
    name: 'AURA',
    description: 'Passiva fixa: reforça só as torres da especialidade deste herói.',
    mana: 0,
  },
  clones: {
    name: 'CLONES',
    description: 'Cria 2 clones e acelera o herói.',
    mana: 30,
  },
  lightning: {
    name: 'RAIOS',
    description: 'Raios encadeados em vários inimigos.',
    mana: 30,
  },
};

// O "Golpe Heroico" é o último poder (ultimate) e muda para cada herói.
const STRIKE_INFO: Record<'guardiao' | 'patrulheiro' | 'arcanista' | 'fused', {
  name: string;
  description: string;
  mana: number;
}> = {
  guardiao: {
    name: 'GOLPE TITÂNICO',
    description: 'Esmaga o chão: onda de choque gigante, dano altíssimo e atordoa.',
    mana: 60,
  },
  patrulheiro: {
    name: 'CHUVA DE FLECHAS',
    description: 'Dezenas de flechas luminosas despencam sobre o grupo.',
    mana: 60,
  },
  arcanista: {
    name: 'METEORO ARCANO',
    description: 'Meteoro colossal cai com raios e explode em área, lentificando.',
    mana: 65,
  },
  fused: {
    name: 'JUÍZO FINAL',
    description: 'Golpe + flechas + meteoro de uma vez. Ainda cura a base.',
    mana: 90,
  },
};

function freshSkills(): Record<SkillKind, number> {
  return {
    explosion: 0,
    repair: 0,
    strike: 0,
    aura: 0,
    clones: 0,
    lightning: 0,
  };
}

type HeroKind = 'guardiao' | 'patrulheiro' | 'arcanista';
type EnemyKind =
  'comum' | 'couracado' | 'agil' | 'antimagia' | 'pesado' | 'espectral';
type Tier = 'normal' | 'elite' | 'boss';
type AllyKind = 'dog' | 'human' | 'drone';
type SpawnSpec = { kind: EnemyKind; tier: Tier; route?: 'left' | 'right' };

const HERO_ORDER: HeroKind[] = ['guardiao', 'patrulheiro', 'arcanista'];

const HERO_STATS: Record<HeroKind, {
  name: string;
  title: string;
  desc: string;
  specialty: TowerKind;
  skill: SkillKind;
  gear: [string, string, string];
  damage: number;
  range: number;
  attackRate: number;
  speed: number;
  blockRadius: number;
  manaBonus: number;
  armor: number;
  cape: number;
  auraName: string;
  auraDesc: string;
}> = {
  guardiao: {
    name: 'GUARDIÃO',
    title: 'Defesa e resistência',
    desc: 'Herói equilibrado, com a maior área de bloqueio. Protege a fortaleza.',
    specialty: 'basic',
    skill: 'explosion',
    gear: ['Espada', 'Armadura', 'Brasão'],
    damage: 3,
    range: 100,
    attackRate: 650,
    speed: 205,
    blockRadius: 30,
    manaBonus: 0,
    armor: 0x3f6f9a,
    cape: 0x8a2a2a,
    auraName: 'Aura do Guardião',
    auraDesc: 'Passiva: só as torres GUARDIÃ ficam mais fortes.',
  },
  patrulheiro: {
    name: 'PATRULHEIRO',
    title: 'Velocidade e precisão',
    desc: 'Herói ágil, de ataques rápidos e fácil de reposicionar pelo campo.',
    specialty: 'rapid',
    skill: 'clones',
    gear: ['Arco', 'Couraça de Couro', 'Aljava'],
    damage: 2,
    range: 150,
    attackRate: 380,
    speed: 275,
    blockRadius: 22,
    manaBonus: 0,
    armor: 0x3d7a4a,
    cape: 0x2d4a2a,
    auraName: 'Aura do Patrulheiro',
    auraDesc: 'Passiva: só as torres BESTEIRA ficam mais fortes.',
  },
  arcanista: {
    name: 'ARCANISTA',
    title: 'Poder mágico',
    desc: 'Herói de magia e ataques de alto impacto, com mais mana.',
    specialty: 'sniper',
    skill: 'lightning',
    gear: ['Cajado', 'Manto Arcano', 'Grimório'],
    damage: 5,
    range: 135,
    attackRate: 900,
    speed: 225,
    blockRadius: 22,
    manaBonus: 30,
    armor: 0x5b3f8f,
    cape: 0x3b2a66,
    auraName: 'Aura do Arcanista',
    auraDesc: 'Passiva: só as torres ARCANA ficam mais fortes.',
  },
};

const ENEMY_TYPES: Record<EnemyKind, {
  name: string;
  short: string;
  unlock: number;
  hp: number;
  speed: number;
  reward: number;
  size: number;
  resist: Record<TowerKind, number>;
}> = {
  comum: {
    name: 'COMUM', short: 'COM', unlock: 1,
    hp: 1, speed: 1, reward: 1, size: 1,
    resist: { basic: 1, rapid: 1, sniper: 1 },
  },
  couracado: {
    name: 'COURAÇADO', short: 'COU', unlock: 6,
    hp: 1.5, speed: 0.95, reward: 1.2, size: 1.05,
    resist: { basic: 1, rapid: 0.4, sniper: 1 },
  },
  agil: {
    name: 'ÁGIL', short: 'AGI', unlock: 11,
    hp: 0.7, speed: 1.55, reward: 1.1, size: 0.88,
    resist: { basic: 1, rapid: 1, sniper: 0.5 },
  },
  antimagia: {
    name: 'ANTIMAGIA', short: 'AMG', unlock: 21,
    hp: 1.2, speed: 1, reward: 1.3, size: 1,
    resist: { basic: 1, rapid: 1, sniper: 0.3 },
  },
  pesado: {
    name: 'BLINDADO PESADO', short: 'PES', unlock: 31,
    hp: 2.2, speed: 0.7, reward: 1.5, size: 1.15,
    resist: { basic: 0.7, rapid: 0.25, sniper: 1 },
  },
  espectral: {
    name: 'ESPECTRAL', short: 'ESP', unlock: 41,
    hp: 1, speed: 1.1, reward: 1.3, size: 1,
    resist: { basic: 0.5, rapid: 1, sniper: 1 },
  },
};

const MAX_WAVES = 100;
const BOSS_WAVES = [30, 60, 90];
const ELITE_WAVES = [
  5, 10, 15, 20, 25, 35, 40, 45, 50, 55, 65, 70, 75, 80, 85, 95,
];


const GEAR_SLOTS: Gear[] = ['weapon', 'armor', 'relic'];
const GEAR_TIERS = ['Ferro', 'Aço', 'Prata', 'Ouro', 'Lendário'];
const GEAR_BASE_COST: Record<Gear, number> = { weapon: 150, armor: 120, relic: 100 };
const GEAR_EFFECT: Record<Gear, string> = {
  weapon: '+2 dano e +4 alcance por nível',
  armor: '+8 velocidade e +3 bloqueio por nível',
  relic: '+10 mana máxima e +1,5 regeneração por nível',
};

function freshEquip(): Record<HeroKind, Record<Gear, number>> {
  return {
    guardiao: { weapon: 0, armor: 0, relic: 0 },
    patrulheiro: { weapon: 0, armor: 0, relic: 0 },
    arcanista: { weapon: 0, armor: 0, relic: 0 },
  };
}

// PIX: chave que recebe os pagamentos. O jogo gera o código "Pix Copia e
// Cola" (BR Code) com o valor do pacote. O jogo não consegue confirmar que o
// pagamento chegou; para creditar moedas automaticamente seria preciso um
// servidor ligado ao seu banco ou provedor de pagamento.
const PIX_KEY = 'flavioassahi@gmail.com';
const PIX_NAME = 'FLAVIO ASSAHI';
const PIX_CITY = 'SAO PAULO';

const PIX_PACKS = [
  { label: 'R$ 5,00', value: 5, coins: 500 },
  { label: 'R$ 10,00', value: 10, coins: 1200 },
  { label: 'R$ 25,00', value: 25, coins: 3500 },
];

function pixField(id: string, value: string): string {
  return id + String(value.length).padStart(2, '0') + value;
}

function pixCrc(payload: string): string {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;

    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000)
        ? ((crc << 1) ^ 0x1021) & 0xffff
        : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildPixPayload(amount: number): string {
  const account =
    pixField('00', 'br.gov.bcb.pix') + pixField('01', PIX_KEY);

  const base =
    pixField('00', '01') +
    pixField('26', account) +
    pixField('52', '0000') +
    pixField('53', '986') +
    pixField('54', amount.toFixed(2)) +
    pixField('58', 'BR') +
    pixField('59', PIX_NAME) +
    pixField('60', PIX_CITY) +
    pixField('62', pixField('05', '***')) +
    '6304';

  return base + pixCrc(base);
}

type Clone = {
  visual: Phaser.GameObjects.Container;
  legs: Phaser.GameObjects.Rectangle[];
  x: number;
  y: number;
  cd: number;
  slot: number;
};

type Companion = {
  kind: HeroKind;
  visual: Phaser.GameObjects.Container;
  legs: Phaser.GameObjects.Rectangle[];
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  cd: number;
  slot: number;
};

type TechSnap = {
  coins: number;
  xp: number;
  heroLevel: number;
  skillPoints: number;
  skills: Record<SkillKind, number>;
  equip: Record<HeroKind, Record<Gear, number>>;
  wave: number;
  baseHP: number;
  maxBaseHP: number;
  heroDeaths: number;
  extraMana: number;
  stock: Record<TowerKind, number>;
  heroKind: HeroKind;
  companionKinds: HeroKind[];
};

const SUPREME_COINS = 999999999;
const SUPREME_DAMAGE = 99999;

const WORLD_INFO: Record<number, { name: string; short: string; cost: number }> = {
  1: { name: 'MUNDO 1 · PRIMITIVO', short: 'M1', cost: 0 },
  2: { name: 'MUNDO 2 · GRÉCIA ANTIGA', short: 'M2', cost: 20000 },
  3: { name: 'MUNDO 3 · TECNOLÓGICO', short: 'M3', cost: 150000 },
};

const SUPREME_WORLD_COST = 240000;

// Cenário nos céus (escolha do Mundo Tecnológico no nível 90).
const SKY_COLORS = {
  bgCss: '#2f6cb8',
  g1: 0x5aa6ee,
  g2: 0xc4e4ff,
  patches: [0x8cc4f6, 0xb4dcff, 0xe8f4ff, 0x7ab8f0],
  clear1: 0xffffff,
  clear2: 0xfff0b0,
  ring: 0xfff0b0,
  vignette: 0x1a3a7a,
};

const SKY_ROAD: RoadPalette = {
  shadow: 0x5a7aa8, neon: 0xffe08a, c1: 0xd8c58a, c2: 0xe8d9a0, c3: 0xf3e6b4,
  c4: 0xfff3c8, c5: 0xffffff, c5a: 0.5,
  stoneA: 0xffe08a, stoneB: 0xffffff, curb: 0xffd060, curbShadow: 0x7a5a1a,
};

const ENEMY_HP_MULT = 10;
const ENEMY_SPEED_MULT = 5;
const ROAD_HALF = 26;

type EnemyFamily = 'beast' | 'soldier' | 'robot';

// Velocidade gradual dos monstros, por onda.
function waveSpeedFactor(w: number): number {
  if (w <= 10) return 0.6;
  if (w <= 20) return 0.8;
  if (w <= 30) return 1;
  if (w <= 40) return 0.6;
  if (w <= 50) return 0.8;
  return 1;
}

type Zone = {
  x: number;
  y: number;
  r: number;
  kind: 'fire' | 'ice';
  until: number;
  dps: number;
};

const HERO_HP: Record<HeroKind, number> = {
  guardiao: 260,
  patrulheiro: 170,
  arcanista: 150,
};

function towerMaxHp(level: number): number {
  return 400 + 250 * (level - 1);
}

type WorldTheme = 'primitive' | 'greece' | 'tech' | 'real';

type RoadPalette = {
  shadow: number;
  neon?: number;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  c5a: number;
  stoneA: number;
  stoneB: number;
  curb: number;
  curbShadow: number;
};

const THEMES: Record<WorldTheme, {
  bgCss: string;
  g1: number;
  g2: number;
  patches: number[];
  clear1: number;
  clear2: number;
  ring: number;
  vignette: number;
  road: RoadPalette;
  portalGlow: number;
  portalRim: number;
  portalRim2: number;
  portalHole: number;
  portalLine: number;
  portalSwirl1: number;
  portalSwirl2: number;
  gateLabel: string;
  fortLabel: string;
}> = {
  primitive: {
    bgCss: '#080c09',
    g1: 0x2a3f2c, g2: 0x1b2d21,
    patches: [0x3a5a36, 0x2f4a2e, 0x456b3a, 0x253b27],
    clear1: 0x4a6a3e, clear2: 0x9ab86a, ring: 0xe8d28a, vignette: 0x04080a,
    road: {
      shadow: 0x0c0905, c1: 0x5a4d39, c2: 0x3a3226, c3: 0x85734f,
      c4: 0x9d8a62, c5: 0xb7a37a, c5a: 0.55,
      stoneA: 0x6b5b3f, stoneB: 0xc9b588, curb: 0x857957, curbShadow: 0x1e1a13,
    },
    portalGlow: 0x3aa0d0, portalRim: GOLD_DARK, portalRim2: GOLD,
    portalHole: 0x0b2a3c, portalLine: 0x8fe3ff,
    portalSwirl1: 0x1b6a92, portalSwirl2: 0x58bde0,
    gateLabel: 'PORTAL DE ENTRADA', fortLabel: 'FORTALEZA',
  },
  greece: {
    bgCss: '#14120a',
    g1: 0x8a8f5a, g2: 0x5f6e45,
    patches: [0xa8a070, 0x6f7d4a, 0x93945c, 0x7a8650],
    clear1: 0xd8d2bc, clear2: 0xf2ecd8, ring: 0xc9a24a, vignette: 0x120e04,
    road: {
      shadow: 0x1a1810, c1: 0x8c8470, c2: 0xa39b84, c3: 0xcdc5aa,
      c4: 0xe0d9c0, c5: 0xf3eddc, c5a: 0.5,
      stoneA: 0xa39b84, stoneB: 0xf1ebd8, curb: 0xb08a3a, curbShadow: 0x3a2e10,
    },
    portalGlow: 0xffe08a, portalRim: 0xb08a3a, portalRim2: 0xf0d58a,
    portalHole: 0x2a1f0a, portalLine: 0xffe9a8,
    portalSwirl1: 0xb8832a, portalSwirl2: 0xf0c860,
    gateLabel: 'PORTAL DO OLIMPO', fortLabel: 'TEMPLO',
  },
  tech: {
    bgCss: '#04070d',
    g1: 0x0e1828, g2: 0x070b16,
    patches: [0x12243a, 0x0c1a2c, 0x16304a, 0x0a1424],
    clear1: 0x14304a, clear2: 0x3af0ff, ring: 0x3af0ff, vignette: 0x000308,
    road: {
      shadow: 0x02040a, neon: 0x3af0ff, c1: 0x0f2433, c2: 0x14303f, c3: 0x1b3d50,
      c4: 0x234b61, c5: 0x2a6e8c, c5a: 0.4,
      stoneA: 0x3af0ff, stoneB: 0xff4ad8, curb: 0x3af0ff, curbShadow: 0x02040a,
    },
    portalGlow: 0x40ffe0, portalRim: 0x3af0ff, portalRim2: 0xff4ad8,
    portalHole: 0x021a1c, portalLine: 0x7ffff0,
    portalSwirl1: 0x0a7a78, portalSwirl2: 0x30e8d0,
    gateLabel: 'PORTAL QUÂNTICO', fortLabel: 'CENTRAL',
  },
  real: {
    bgCss: '#0a0b0d',
    g1: 0x3b3f44, g2: 0x2a2d31,
    patches: [0x474b51, 0x32353a, 0x52565c, 0x2a2d31],
    clear1: 0x55595f, clear2: 0x8d9298, ring: 0xe0c040, vignette: 0x050506,
    road: {
      shadow: 0x050505, c1: 0x2a2c2f, c2: 0x34373b, c3: 0x3c4045,
      c4: 0x41454a, c5: 0x4a4e54, c5a: 0.3,
      stoneA: 0x24272b, stoneB: 0x5a5f66, curb: 0x9aa0a6, curbShadow: 0x15171a,
    },
    portalGlow: 0xdfe6ea, portalRim: 0x8a8f95, portalRim2: 0xe0c040,
    portalHole: 0x15171a, portalLine: 0xcfd5d8,
    portalSwirl1: 0x40444a, portalSwirl2: 0x7b838a,
    gateLabel: 'ENTRADA', fortLabel: 'QUARTEL',
  },
};

const ALLY_CFG: Record<AllyKind, {
  speed: number;
  range: number;
  rate: number;
  leash: number;
  color: number;
  base: number;
  perLevel: number;
}> = {
  dog: { speed: 210, range: 20, rate: 650, leash: 200, color: 0xffd28a, base: 2, perLevel: 0.33 },
  human: { speed: 125, range: 24, rate: 900, leash: 180, color: 0xdfe6e9, base: 5, perLevel: 0.5 },
  drone: { speed: 175, range: 110, rate: 750, leash: 230, color: 0x50e0ff, base: 4, perLevel: 0.33 },
};

type Ally = {
  kind: AllyKind;
  visual: Phaser.GameObjects.Container;
  legs: Phaser.GameObjects.Rectangle[];
  x: number;
  y: number;
  cooldown: number;
  slot: number;
};

type Enemy = {
  body: Phaser.GameObjects.Arc;
  visual: Phaser.GameObjects.Container;
  healthBar: Phaser.GameObjects.Graphics;
  path: Point[];
  segment: number;
  speed: number;
  hp: number;
  maxHp: number;
  reward: number;
  alive: boolean;
  strong: boolean;
  waveId: number;
  phase: number;
  kind: EnemyKind;
  tier: Tier;
  size: number;
  xp: number;
  resist: Record<TowerKind, number>;
  slowUntil: number;
  flashUntil: number;
  dps: number;
  blockedMs: number;
  ghostUntil: number;
  burnUntil: number;
  burnDps: number;
  stunUntil: number;
  tint: number;
};

type Blocker = {
  x: number;
  y: number;
  r: number;
  tower?: Tower;
  hero?: boolean;
  soft?: boolean;
};

type Tower = {
  body: Phaser.GameObjects.Arc;
  visual: Phaser.GameObjects.Container;
  level: number;
  cooldown: number;
  range: number;
  kind: TowerKind;
  damage: number;
  fireRate: number;
  cost: number;
  totalInvested: number;
  auraUntil: number;
  hp: number;
  maxHp: number;
  hitAt: number;
  streak: number;
  lastShotAt: number;
};

type WaveState = {
  queue: SpawnSpec[];
  spawningFinished: boolean;
};

class BaseScene extends Phaser.Scene {
  protected gameOver = false;

  // Destroi o objeto e cancela os tweens dele (e dos filhos), para que
  // animações infinitas não fiquem acumulando em objetos já removidos.
  protected killVisual(o: Phaser.GameObjects.GameObject) {
    if (o instanceof Phaser.GameObjects.Container) {
      for (const child of [...o.list]) this.killVisual(child);
    }

    this.tweens.killTweensOf(o);
    o.destroy();
  }

  // ==================================================
  // UTILIDADES VISUAIS
  // ==================================================

  protected lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 255;
    const ag = (a >> 8) & 255;
    const ab = a & 255;
    const br = (b >> 16) & 255;
    const bg = (b >> 8) & 255;
    const bb = b & 255;

    return (
      (Math.round(ar + (br - ar) * t) << 16) |
      (Math.round(ag + (bg - ag) * t) << 8) |
      Math.round(ab + (bb - ab) * t)
    );
  }

  protected fillVGradient(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    c1: number,
    c2: number,
    alpha = 1,
    step = 2,
  ) {
    for (let i = 0; i < h; i += step) {
      g.fillStyle(this.lerpColor(c1, c2, i / h), alpha);
      g.fillRect(x, y + i, w, Math.min(step, h - i));
    }
  }

  protected drawGem(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    s: number,
    color: number,
  ) {
    g.fillStyle(color, 1);
    g.fillTriangle(cx - s, cy, cx, cy - s, cx + s, cy);
    g.fillStyle(this.lerpColor(color, 0x000000, 0.45), 1);
    g.fillTriangle(cx - s, cy, cx, cy + s, cx + s, cy);
  }

  protected drawPanelFrame(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    r = 6,
  ) {
    g.fillStyle(0x000000, 0.55);
    g.fillRoundedRect(x + 2, y + 3, w, h, r);

    this.fillVGradient(g, x, y, w, h, 0x181c21, 0x0a0c0e, 0.98, 3);

    g.fillStyle(0xffffff, 0.04);
    g.fillRect(x + 4, y + 4, w - 8, Math.min(16, h / 3));

    g.lineStyle(2, GOLD_DARK, 1);
    g.strokeRoundedRect(x, y, w, h, r);

    g.lineStyle(1, GOLD, 0.85);
    g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, Math.max(1, r - 2));

    this.drawGem(g, x + 3, y + 3, 4, GOLD_LIGHT);
    this.drawGem(g, x + w - 3, y + 3, 4, GOLD_LIGHT);
    this.drawGem(g, x + 3, y + h - 3, 4, GOLD);
    this.drawGem(g, x + w - 3, y + h - 3, 4, GOLD);
  }

  protected drawBarPlate(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    g.fillStyle(0x030405, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, GOLD_DARK, 1);
    g.strokeRect(x, y, w, h);
    g.lineStyle(1, GOLD, 0.5);
    g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  }

  protected drawBar(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    ratio: number,
    c1: number,
    c2: number,
    segments: number,
  ) {
    const r = Phaser.Math.Clamp(ratio, 0, 1);

    g.fillStyle(0x0a0d10, 1);
    g.fillRect(x, y, w, h);

    const fw = w * r;

    if (fw > 0) {
      this.fillVGradient(g, x, y, fw, h, c1, c2, 1, 2);
      g.fillStyle(0xffffff, 0.2);
      g.fillRect(x, y, fw, 2);
    }

    if (segments > 1) {
      g.lineStyle(1, 0x000000, 0.5);

      for (let s = 1; s < segments; s++) {
        const sx = x + (w * s) / segments;
        g.lineBetween(sx, y, sx, y + h);
      }
    }
  }

  protected fitText(text: Phaser.GameObjects.Text, maxWidth: number) {
    text.setScale(1);

    if (text.width > maxWidth) {
      text.setScale(maxWidth / text.width);
    }
  }

  protected floatText(
    x: number,
    y: number,
    label: string,
    color = '#ffd966',
    size = 12,
  ) {
    const t = this.add.text(x, y, label, {
      fontFamily: 'Georgia, serif',
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(16);

    this.tweens.add({
      targets: t,
      y: y - 26,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  protected makeButton(
    x: number,
    y: number,
    label: string,
    color: string,
    action: () => void,
    fontSize = 11,
    width = 150,
    height = 24,
    allowWhenOver = false,
  ): Phaser.GameObjects.Container {
    const base = Phaser.Display.Color.HexStringToColor(color).color;

    const c = this.add.container(x + width / 2, y + height / 2).setDepth(21);
    const g = this.add.graphics();

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Georgia, serif',
      fontSize: `${fontSize}px`,
      color: '#f6e9c4',
      fontStyle: 'bold',
      stroke: '#0a0a0a',
      strokeThickness: 3,
    }).setOrigin(0.5);

    c.add([g, text]);
    c.setSize(width, height);
    c.setData('text', text);
    c.setData('width', width);

    this.fitText(text, width - 10);

    const draw = (state: 'idle' | 'hover' | 'down') => {
      g.clear();

      const topC = this.lerpColor(
        base, 0xffffff,
        state === 'down' ? 0.05 : state === 'hover' ? 0.38 : 0.24,
      );

      const botC = this.lerpColor(
        base, 0x000000, state === 'down' ? 0.55 : 0.4,
      );

      g.fillStyle(0x000000, 0.5);
      g.fillRoundedRect(-width / 2 + 1, -height / 2 + 2, width, height, 4);

      this.fillVGradient(
        g, -width / 2 + 2, -height / 2 + 2, width - 4, height - 4,
        topC, botC, 1, 2,
      );

      g.fillStyle(0xffffff, 0.14);
      g.fillRect(-width / 2 + 3, -height / 2 + 3, width - 6, 2);

      g.lineStyle(2, 0x0a0a0a, 1);
      g.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);

      g.lineStyle(1, state === 'hover' ? GOLD_LIGHT : GOLD, 1);
      g.strokeRoundedRect(
        -width / 2 + 1.5, -height / 2 + 1.5, width - 3, height - 3, 3,
      );
    };

    draw('idle');

    c.setInteractive({ useHandCursor: true });

    c.on('pointerdown', () => {
      if (this.gameOver && !allowWhenOver) return;
      draw('down');
      action();
    });

    c.on('pointerup', () => {
      if (c.active) draw('hover');
    });

    c.on('pointerover', () => {
      if (c.active) draw('hover');
    });

    c.on('pointerout', () => {
      if (c.active) draw('idle');
    });

    return c;
  }

  protected setButtonLabel(button: Phaser.GameObjects.Container, label: string) {
    const text = button.getData('text') as Phaser.GameObjects.Text;
    const width = button.getData('width') as number;

    if (text.text === label) return;

    text.setText(label);
    this.fitText(text, width - 10);
  }

  protected createTowerVisual(
    x: number,
    y: number,
    kind: TowerKind,
    theme: WorldTheme = 'primitive',
  ): Phaser.GameObjects.Container {
    const color = TOWER_STATS[kind].color;
    const c = this.add.container(x, y).setDepth(4);

    const shadow = this.add.ellipse(3, 8, 50, 25, 0x0a0f0b, 0.6);

    const glow = this.add.circle(0, 3, 27, color, 0.16)
      .setBlendMode(Phaser.BlendModes.ADD);

    c.add([shadow, glow]);

    this.tweens.add({
      targets: glow,
      alpha: 0.32,
      scale: 1.12,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (theme === 'primitive') {
      this.towerPrimitive(c, kind, color);
    } else {
      this.towerThemed(c, kind, theme, color);
    }

    const levelText = this.add.text(15, 13, 'I', {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#f0d58a',
      fontStyle: 'bold',
      backgroundColor: '#0b0d10',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5);

    c.add(levelText);
    c.setData('levelText', levelText);
    c.setData('towerColor', color);

    return c;
  }

  protected towerPrimitive(
    c: Phaser.GameObjects.Container,
    kind: TowerKind,
    color: number,
  ) {
    const base = this.add.circle(0, 4, 22, 0x4a4a3d)
      .setStrokeStyle(3, 0x15191a);

    const stoneRing = this.add.circle(0, 2, 18, 0x8a7c60)
      .setStrokeStyle(2, 0xd0c29a);

    const runeRing = this.add.circle(0, 2, 14, 0x2a3027)
      .setStrokeStyle(2, color);

    const innerRing = this.add.circle(0, 2, 10, 0x40483b)
      .setStrokeStyle(1, 0xb2a17b);

    c.add([base, stoneRing, runeRing, innerRing]);

    if (kind === 'basic') {
      const body = this.add.rectangle(0, -8, 21, 24, 0x496f88)
        .setStrokeStyle(2, 0xc9c4a6);
      const battlement = this.add.rectangle(0, -21, 27, 7, 0x8d9b9b)
        .setStrokeStyle(2, 0x36464b);
      const slit = this.add.rectangle(0, -9, 7, 14, 0x172d37);
      const arrow = this.add.triangle(
        0, -18, -5, 7, 5, 7, 0, -8, 0xe4d5a4,
      );
      const sideL = this.add.rectangle(-13, -9, 5, 15, 0x7f8b88)
        .setStrokeStyle(1, 0x36464b);
      const sideR = this.add.rectangle(13, -9, 5, 15, 0x7f8b88)
        .setStrokeStyle(1, 0x36464b);
      const pole = this.add.rectangle(0, -31, 2, 12, 0xd0c29a);
      const flag = this.add.triangle(
        6, -33, 0, 0, 10, 4, 0, 8, color,
      ).setStrokeStyle(1, 0x15191a);

      c.add([body, sideL, sideR, battlement, slit, arrow, pole, flag]);

      this.tweens.add({
        targets: flag,
        scaleX: 0.8,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    } else if (kind === 'rapid') {
      const frame = this.add.rectangle(0, -8, 23, 23, 0x4a7650)
        .setStrokeStyle(2, 0xc3c39a);
      const hub = this.add.circle(0, 0, 8, 0x253a2a)
        .setStrokeStyle(2, 0xb3c5a0);
      const blade1 = this.add.rectangle(0, 0, 5, 24, 0xd7d7b9)
        .setStrokeStyle(1, 0x52634c);
      const blade2 = this.add.rectangle(0, 0, 24, 5, 0xd7d7b9)
        .setStrokeStyle(1, 0x52634c);
      const pin = this.add.circle(0, 0, 3, 0xe3d7ac);

      const spin = this.add.container(0, -8, [blade1, blade2, hub, pin]);

      c.add([frame, spin]);

      this.tweens.add({
        targets: spin,
        angle: 360,
        duration: 1400,
        repeat: -1,
      });
    } else {
      const pillar = this.add.rectangle(0, -7, 22, 24, 0x574778)
        .setStrokeStyle(2, 0xc9b7ed);
      const rune = this.add.circle(0, -7, 5, 0x3a2e54)
        .setStrokeStyle(2, 0xb69be8);
      const crystalBase = this.add.triangle(
        0, -20, -12, 10, 12, 10, 0, -12, 0x8768b8,
      ).setStrokeStyle(2, 0xd6c8fa);

      const crystal = this.add.rectangle(0, 0, 11, 11, 0xc8a6ff).setScale(1, 1.4).setAngle(45)
        .setStrokeStyle(2, 0xf1e3ff);
      const crystalGlow = this.add.circle(0, 0, 11, 0xe6d7ff, 0.35)
        .setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add.circle(0, 0, 5, 0xffffff, 0.85);

      const floating = this.add.container(0, -26, [
        crystalGlow, crystal, core,
      ]);

      c.add([pillar, rune, crystalBase, floating]);

      this.tweens.add({
        targets: floating,
        y: -30,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  protected towerThemed(
    c: Phaser.GameObjects.Container,
    kind: TowerKind,
    theme: WorldTheme,
    color: number,
  ) {
    if (theme === 'greece') {
      const step1 = this.add.rectangle(0, 8, 46, 12, 0xcfc7ad)
        .setStrokeStyle(2, 0x7a7258);
      const step2 = this.add.rectangle(0, 3, 38, 9, 0xece6d2)
        .setStrokeStyle(2, 0x8a826a);
      const meander = this.add.rectangle(0, 3, 30, 3, 0x2f5f9a);

      c.add([step1, step2, meander]);

      if (kind === 'basic') {
        const shaft = this.add.rectangle(0, -12, 16, 26, 0xece6d2)
          .setStrokeStyle(2, 0x8a826a);
        const flute1 = this.add.rectangle(-3, -12, 1, 24, 0xb8b096);
        const flute2 = this.add.rectangle(3, -12, 1, 24, 0xb8b096);
        const capital = this.add.rectangle(0, -27, 26, 6, 0xf6f0de)
          .setStrokeStyle(2, 0x8a826a);
        const volL = this.add.circle(-11, -24, 3, 0xcfc7ad);
        const volR = this.add.circle(11, -24, 3, 0xcfc7ad);
        const shield = this.add.circle(0, -12, 9, 0xb08a3a)
          .setStrokeStyle(2, 0x6a4e1a);
        const emblem = this.add.star(0, -12, 5, 2, 5, color);
        const crest = this.add.triangle(0, -36, -6, 7, 6, 7, 0, -7, 0xb02a2a)
          .setStrokeStyle(1, 0x4a1010);
        const spear = this.add.rectangle(15, -22, 2, 32, 0x6a4e1a);
        const tip = this.add.triangle(15, -40, -3, 6, 3, 6, 0, -6, 0xd8d8d8);

        c.add([shaft, flute1, flute2, capital, volL, volR, shield, emblem, spear, tip, crest]);
      } else if (kind === 'rapid') {
        const frame = this.add.rectangle(0, -8, 26, 10, 0x7a5a30)
          .setStrokeStyle(2, 0x3a2a14);
        const post = this.add.rectangle(0, -2, 8, 16, 0x5a4020)
          .setStrokeStyle(1, 0x3a2a14);
        const armL = this.add.rectangle(-12, -14, 4, 22, 0x6a4a28)
          .setRotation(-0.35);
        const armR = this.add.rectangle(12, -14, 4, 22, 0x6a4a28)
          .setRotation(0.35);
        const wheelRing = this.add.circle(0, 0, 11, 0x000000, 0)
          .setStrokeStyle(3, 0xb08a3a);
        const s1 = this.add.rectangle(0, 0, 3, 22, 0xb08a3a);
        const s2 = this.add.rectangle(0, 0, 22, 3, 0xb08a3a);
        const hub = this.add.circle(0, 0, 3, 0xe8c04a);
        const spin = this.add.container(0, -12, [wheelRing, s1, s2, hub]);
        const bolt = this.add.rectangle(0, -24, 2, 12, 0xd8d8d8);
        const boltTip = this.add.triangle(0, -31, -3, 5, 3, 5, 0, -5, 0xd8d8d8);

        c.add([post, frame, armL, armR, spin, bolt, boltTip]);

        this.tweens.add({
          targets: spin,
          angle: 360,
          duration: 1200,
          repeat: -1,
        });
      } else {
        const leg1 = this.add.rectangle(-9, -4, 3, 22, 0xb08a3a).setRotation(0.35);
        const leg2 = this.add.rectangle(9, -4, 3, 22, 0xb08a3a).setRotation(-0.35);
        const leg3 = this.add.rectangle(0, -4, 3, 22, 0x8a6a2a);
        const bowl = this.add.ellipse(0, -16, 22, 9, 0xb08a3a)
          .setStrokeStyle(2, 0x6a4e1a);
        const laurelL = this.add.ellipse(-11, -14, 6, 3, 0x4a8a48).setRotation(-0.6);
        const laurelR = this.add.ellipse(11, -14, 6, 3, 0x4a8a48).setRotation(0.6);
        const flameGlow = this.add.circle(0, 0, 12, color, 0.35)
          .setBlendMode(Phaser.BlendModes.ADD);
        const flame = this.add.triangle(0, 0, -6, 8, 6, 8, 0, -9, 0xe6d7ff)
          .setStrokeStyle(1, 0xffffff);
        const floating = this.add.container(0, -28, [flameGlow, flame]);

        c.add([leg1, leg2, leg3, bowl, laurelL, laurelR, floating]);

        this.tweens.add({
          targets: floating,
          y: -32,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      return;
    }

    if (theme === 'tech') {
      const plate = this.add.circle(0, 4, 21, 0x0a1822)
        .setStrokeStyle(2, 0x3af0ff, 0.9);
      const plate2 = this.add.circle(0, 3, 15, 0x14303f)
        .setStrokeStyle(1, 0xff4ad8, 0.8);

      c.add([plate, plate2]);

      if (kind === 'basic') {
        const body = this.add.rectangle(0, -7, 24, 20, 0x3a5068)
          .setStrokeStyle(2, 0x9ad8ff);
        const panel = this.add.rectangle(0, -3, 16, 4, 0x14202c);
        const led = this.add.rectangle(-6, -3, 3, 2, 0x3af0ff);
        const dome = this.add.circle(0, -17, 10, 0x4a6680)
          .setStrokeStyle(2, 0x9ad8ff);
        const barrel = this.add.rectangle(14, -17, 20, 5, 0x2a3846)
          .setStrokeStyle(1, 0x9ad8ff);
        const muzzle = this.add.circle(25, -17, 3, color, 0.95);
        const antenna = this.add.rectangle(-8, -30, 1.5, 12, 0x9ad8ff);
        const beacon = this.add.circle(-8, -36, 2, 0xff4ad8);

        c.add([body, panel, led, barrel, muzzle, dome, antenna, beacon]);

        this.tweens.add({
          targets: beacon,
          alpha: 0.2,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      } else if (kind === 'rapid') {
        const housing = this.add.rectangle(0, -4, 24, 18, 0x2a4a50)
          .setStrokeStyle(2, 0x7ffff0);
        const b1 = this.add.rectangle(0, 0, 4, 28, 0x9ad8ff)
          .setStrokeStyle(1, 0x14202c);
        const b2 = this.add.rectangle(0, 0, 4, 28, 0x9ad8ff)
          .setStrokeStyle(1, 0x14202c).setRotation(Math.PI / 3);
        const b3 = this.add.rectangle(0, 0, 4, 28, 0x9ad8ff)
          .setStrokeStyle(1, 0x14202c).setRotation(-Math.PI / 3);
        const hub = this.add.circle(0, 0, 5, 0x14202c)
          .setStrokeStyle(2, 0x3af0ff);
        const glow = this.add.circle(0, 0, 12, color, 0.3)
          .setBlendMode(Phaser.BlendModes.ADD);
        const spin = this.add.container(0, -14, [glow, b1, b2, b3, hub]);

        c.add([housing, spin]);

        this.tweens.add({
          targets: spin,
          angle: 360,
          duration: 650,
          repeat: -1,
        });
      } else {
        const pillar = this.add.rectangle(0, -5, 14, 20, 0x2a2a48)
          .setStrokeStyle(2, 0xff4ad8);
        const ring1 = this.add.ellipse(0, 0, 30, 10, 0x000000, 0)
          .setStrokeStyle(1.5, 0x3af0ff, 0.9);
        const ring2 = this.add.ellipse(0, 0, 22, 18, 0x000000, 0)
          .setStrokeStyle(1.5, 0xff4ad8, 0.8);
        const cube = this.add.rectangle(0, 0, 11, 11, 0x9affff, 0.85)
          .setAngle(45)
          .setStrokeStyle(2, 0xffffff);
        const glow = this.add.circle(0, 0, 12, 0x3af0ff, 0.35)
          .setBlendMode(Phaser.BlendModes.ADD);
        const floating = this.add.container(0, -26, [glow, ring1, ring2, cube]);

        c.add([pillar, floating]);

        this.tweens.add({
          targets: floating,
          y: -30,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        this.tweens.add({
          targets: cube,
          angle: 405,
          duration: 2400,
          repeat: -1,
        });
      }

      return;
    }

    // theme === 'real'
    const slab = this.add.rectangle(0, 6, 46, 24, 0x777b80)
      .setStrokeStyle(2, 0x3a3d40);
    const hazardL = this.add.rectangle(-20, 14, 6, 6, 0xe0c040);
    const hazardR = this.add.rectangle(20, 14, 6, 6, 0xe0c040);
    const bag1 = this.add.ellipse(-12, 16, 16, 8, 0xb59a68)
      .setStrokeStyle(1, 0x6a5a38);
    const bag2 = this.add.ellipse(0, 17, 16, 8, 0xc4aa78)
      .setStrokeStyle(1, 0x6a5a38);
    const bag3 = this.add.ellipse(12, 16, 16, 8, 0xb59a68)
      .setStrokeStyle(1, 0x6a5a38);

    c.add([slab, hazardL, hazardR]);

    if (kind === 'basic') {
      const box = this.add.rectangle(0, -7, 28, 22, 0x8a8e92)
        .setStrokeStyle(2, 0x3a3d40);
      const slit = this.add.rectangle(0, -9, 18, 4, 0x14161a);
      const roof = this.add.rectangle(0, -20, 32, 5, 0x5a5e62)
        .setStrokeStyle(1, 0x2a2d30);
      const pole = this.add.rectangle(10, -32, 2, 14, 0xc0c4c8);
      const flag = this.add.triangle(17, -35, 0, 0, 10, 4, 0, 8, color)
        .setStrokeStyle(1, 0x15191a);

      c.add([box, slit, roof, pole, flag, bag1, bag2, bag3]);

      this.tweens.add({
        targets: flag,
        scaleX: 0.8,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    } else if (kind === 'rapid') {
      const tripod1 = this.add.rectangle(-6, -2, 2, 14, 0x2a2c2e).setRotation(0.4);
      const tripod2 = this.add.rectangle(6, -2, 2, 14, 0x2a2c2e).setRotation(-0.4);
      const receiver = this.add.rectangle(0, -12, 14, 9, 0x3a3d40)
        .setStrokeStyle(1, 0x15171a);
      const barrel = this.add.rectangle(14, -12, 18, 4, 0x2a2c2e)
        .setStrokeStyle(1, 0x15171a);
      const mag = this.add.rectangle(-2, -5, 6, 8, 0x4a4e52);
      const shield = this.add.rectangle(20, -10, 3, 14, 0x6a6e72)
        .setStrokeStyle(1, 0x2a2d30);
      const flash = this.add.circle(25, -12, 4, color, 0.7)
        .setBlendMode(Phaser.BlendModes.ADD);

      c.add([tripod1, tripod2, receiver, mag, barrel, shield, flash, bag1, bag2, bag3]);

      this.tweens.add({
        targets: barrel,
        x: 12,
        duration: 90,
        yoyo: true,
        repeat: -1,
      });

      this.tweens.add({
        targets: flash,
        alpha: 0.1,
        duration: 90,
        yoyo: true,
        repeat: -1,
      });
    } else {
      const mast = this.add.rectangle(0, -6, 6, 26, 0x6a6e72)
        .setStrokeStyle(1, 0x2a2d30);
      const dish = this.add.ellipse(0, 0, 30, 12, 0xcfd5d8)
        .setStrokeStyle(2, 0x6a6e72);
      const dishInner = this.add.ellipse(0, 0, 20, 7, 0x9aa2a8);
      const feed = this.add.rectangle(0, -9, 2, 12, 0x3a3d40);
      const feedTip = this.add.circle(0, -15, 2.5, color);
      const rotor = this.add.container(0, -20, [dish, dishInner, feed, feedTip]);
      const light = this.add.circle(0, -34, 2.5, 0xff3a3a);

      bag2.destroy();
      c.add([mast, rotor, light, bag1, bag3]);

      this.tweens.add({
        targets: rotor,
        angle: 25,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: light,
        alpha: 0.15,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  protected addHeroDetail(c: Phaser.GameObjects.Container, kind: HeroKind) {
    const st = HERO_STATS[kind];
    const steel = 0x8a949a;
    const add = (o: Phaser.GameObjects.GameObject) => c.add(o);

    // gorjal, cota de malha, rebites e fivela
    add(this.add.ellipse(0, -11, 17, 6, steel).setStrokeStyle(1, GOLD_DARK));

    for (let i = -3; i <= 3; i++) {
      add(this.add.circle(i * 3, 8, 1.4, 0xb0bbbd));
    }

    for (const [rx, ry] of [[-8, -8], [8, -8], [-8, 1], [8, 1]]) {
      add(this.add.circle(rx, ry, 1.2, GOLD_LIGHT));
    }

    add(this.add.rectangle(0, 5, 5, 4, GOLD_LIGHT).setStrokeStyle(1, 0x4a3a1a));

    // manoplas, braçadeiras e joelheiras
    add(this.add.rectangle(-14, 3, 5, 7, steel).setStrokeStyle(1, GOLD_DARK));
    add(this.add.rectangle(14, 3, 5, 7, steel).setStrokeStyle(1, GOLD_DARK));
    add(this.add.rectangle(-6, 10, 6, 4, 0x9aa4aa).setStrokeStyle(1, GOLD_DARK));
    add(this.add.rectangle(6, 10, 6, 4, 0x9aa4aa).setStrokeStyle(1, GOLD_DARK));

    // tabardo com detalhe dourado
    add(this.add.rectangle(0, 4, 7, 12, st.cape, 0.9).setStrokeStyle(1, GOLD_DARK));
    add(this.add.rectangle(0, 4, 1.5, 11, GOLD_LIGHT));

    if (kind === 'guardiao') {
      add(this.add.rectangle(-7, -17, 3, 7, steel).setStrokeStyle(1, GOLD_DARK));
      add(this.add.rectangle(7, -17, 3, 7, steel).setStrokeStyle(1, GOLD_DARK));
      add(this.add.rectangle(0, -27, 2, 10, 0xc3ccd2));

      for (const [sx, sy] of [[-14, -10], [-14, 4], [-19, -3], [-9, -3]]) {
        add(this.add.circle(sx, sy, 1.2, GOLD_LIGHT));
      }

      add(this.add.circle(13, 3, 1.6, 0xff4a4a).setStrokeStyle(1, GOLD_LIGHT));
    } else if (kind === 'patrulheiro') {
      add(
        this.add.rectangle(0, -3, 3, 26, 0x5a3a1c)
          .setStrokeStyle(1, 0x2a1c10)
          .setRotation(0.55),
      );

      for (const [px, py] of [[-5, -9], [0, -3], [5, 3]]) {
        add(this.add.circle(px, py, 2.2, 0x6a4a2a).setStrokeStyle(1, 0x2a1c10));
      }

      add(this.add.triangle(0, -11, -7, 0, 7, 0, 0, 7, 0x3d7a4a).setStrokeStyle(1, 0x14261a));
      add(this.add.rectangle(-14, 3, 5, 3, 0x5a3a1c));
      add(this.add.rectangle(6, -30, 2, 8, 0xe8e0c8).setRotation(0.5));
      add(this.add.rectangle(-7, 15, 12, 2, 0x5a3a1c));
      add(this.add.rectangle(7, 15, 12, 2, 0x5a3a1c));
    } else {
      add(this.add.rectangle(0, 13, 24, 3, GOLD).setStrokeStyle(1, GOLD_DARK));
      add(this.add.star(-5, 1, 4, 1, 3, 0xc8a6ff));
      add(this.add.star(5, 5, 4, 1, 3, 0xc8a6ff));
      add(this.add.rectangle(0, 2, 24, 3, 0x7a55c0, 0.9));

      add(
        this.add.rectangle(-14, 6, 8, 10, 0x4a2f7a)
          .setStrokeStyle(1, GOLD)
          .setRotation(-0.2),
      );

      add(this.add.circle(-14, 6, 2, 0xe6d7ff, 0.9));
      add(this.add.ellipse(15, -23, 17, 5, 0x000000, 0).setStrokeStyle(1, 0xe6d7ff, 0.9));
    }
  }

  protected addGearLook(
    c: Phaser.GameObjects.Container,
    kind: HeroKind,
    eq: Record<Gear, number>,
    torso: Phaser.GameObjects.Rectangle,
  ) {
    const st = HERO_STATS[kind];
    const w = eq.weapon;
    const a = eq.armor;
    const r = eq.relic;
    const tiers = [0x9aa3a8, 0xc3ccd2, 0xd9dde8, 0xe9c36a, 0xff9a3a];

    if (a > 0) {
      const tone = tiers[a - 1];
      const bulk = this.add.rectangle(0, -3, 22 + a * 3, 21 + a * 1.5, st.armor)
        .setStrokeStyle(2, tone);
      c.addAt(bulk, c.getIndex(torso));

      const pr = 6 + a * 0.9;
      const off = 11 + a * 0.8;

      c.add(this.add.circle(-off, -10, pr, tone).setStrokeStyle(2, GOLD_DARK));
      c.add(this.add.circle(off, -10, pr, tone).setStrokeStyle(2, GOLD_DARK));

      if (a >= 3) {
        c.add(this.add.triangle(-off, -10 - pr, -3, 6, 3, 6, 0, -6, tone));
        c.add(this.add.triangle(off, -10 - pr, -3, 6, 3, 6, 0, -6, tone));
      }

      if (a >= 5) {
        c.add(
          this.add.rectangle(0, -3, 12, 19, GOLD_LIGHT, 0.85)
            .setStrokeStyle(1, GOLD_DARK),
        );
      }
    }

    if (w > 0) {
      const tone = tiers[w - 1];

      c.add(
        this.add.circle(17, -12, 5 + w * 2, tone, 0.26)
          .setBlendMode(Phaser.BlendModes.ADD),
      );

      c.add(
        this.add.rectangle(18, -17, 2 + w * 0.7, 6 + w * 3, tone)
          .setStrokeStyle(1, 0x20262a)
          .setRotation(-0.4),
      );

      if (w >= 4) {
        c.add(this.add.star(24, -26, 4, 1.5, 4, 0xffffff, 0.9));
        c.add(this.add.star(11, -28, 4, 1, 3, 0xfff0a0, 0.9));
      }
    }

    if (r > 0) {
      const gems = Math.min(r, 5);

      for (let i = 0; i < gems; i++) {
        const ang = Math.PI + (Math.PI * (i + 1)) / (gems + 1);
        const gx = Math.cos(ang) * 17;
        const gy = -26 + Math.sin(ang) * 9;

        c.add(
          this.add.circle(gx, gy, 5, 0x8fd0ff, 0.3)
            .setBlendMode(Phaser.BlendModes.ADD),
        );
        c.add(
          this.add.rectangle(gx, gy, 5, 5, 0xbfe6ff)
            .setAngle(45)
            .setStrokeStyle(1, 0xffffff),
        );
      }
    }
  }

  protected createHeroVisual(
    kind: HeroKind,
    x: number,
    y: number,
    eq?: Record<Gear, number>,
  ): Phaser.GameObjects.Container {
    const st = HERO_STATS[kind];
    const c = this.add.container(x, y);

    const aura = this.add.ellipse(0, 14, 54, 24, GOLD_LIGHT, 0.16)
      .setStrokeStyle(2, GOLD_LIGHT, 0.7);

    this.tweens.add({
      targets: aura,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const shadow = this.add.ellipse(0, 14, 38, 18, 0x152018, 0.55);

    const cape = this.add.triangle(
      0, 6, -13, -11, 13, -11, 0, 20, st.cape,
    ).setStrokeStyle(2, 0x1a0a0a);

    const legs = this.add.rectangle(0, 8, 17, 15, 0x303c45)
      .setStrokeStyle(2, 0x18242a);

    const leftBoot = this.add.rectangle(-7, 15, 10, 6, 0x20262a)
      .setStrokeStyle(1, GOLD);

    const rightBoot = this.add.rectangle(7, 15, 10, 6, 0x20262a)
      .setStrokeStyle(1, GOLD);

    leftBoot.setData('by', 15);
    rightBoot.setData('by', 15);

    const torso = this.add.rectangle(0, -3, 22, 21, st.armor)
      .setStrokeStyle(2, GOLD);

    const chest = this.add.rectangle(0, -3, 9, 17, 0x9caaad)
      .setStrokeStyle(1, GOLD_LIGHT);

    const belt = this.add.rectangle(0, 5, 22, 4, 0x60472e)
      .setStrokeStyle(1, GOLD);

    const shoulderL = this.add.circle(-10, -9, 6, 0xb0bbbd)
      .setStrokeStyle(2, GOLD_DARK);

    const shoulderR = this.add.circle(10, -9, 6, 0xb0bbbd)
      .setStrokeStyle(2, GOLD_DARK);

    const head = this.add.circle(0, -19, 9, 0xc3a47e)
      .setStrokeStyle(2, 0x4a3b2d);

    c.add([
      aura, shadow, cape, legs, leftBoot, rightBoot,
      torso, chest, belt, shoulderL, shoulderR, head,
    ]);

    if (kind === 'guardiao') {
      const helmet = this.add.triangle(
        0, -24, -11, 6, 11, 6, 0, -9, 0xaab6b8,
      ).setStrokeStyle(2, GOLD_DARK);

      const crest = this.add.triangle(
        0, -33, -3, 6, 3, 6, 0, -6, 0xc83a32,
      );

      const visor = this.add.rectangle(0, -19, 12, 3, 0x27363c);

      const sword = this.add.rectangle(15, -6, 4, 25, 0xe6ebe4)
        .setStrokeStyle(1, 0x65737b)
        .setRotation(-0.4);

      const grip = this.add.rectangle(13, 3, 8, 3, GOLD)
        .setRotation(-0.4);

      const shield = this.add.ellipse(-14, -3, 12, 19, st.armor)
        .setStrokeStyle(2, GOLD_LIGHT)
        .setRotation(-0.2);

      const mark = this.add.star(-14, -3, 4, 2, 5, GOLD_LIGHT);

      c.add([helmet, crest, visor, sword, grip, shield, mark]);
    } else if (kind === 'patrulheiro') {
      const hood = this.add.triangle(
        0, -25, -12, 7, 12, 7, 0, -12, 0x2d5a34,
      ).setStrokeStyle(2, 0x14261a);

      const mask = this.add.rectangle(0, -17, 12, 4, 0x1b2a1d);

      const quiver = this.add.rectangle(-9, -6, 5, 18, 0x6a4a2a)
        .setStrokeStyle(1, 0x2a1c10)
        .setRotation(0.3);

      const feather = this.add.rectangle(-12, -16, 2, 5, 0xe8e0c8)
        .setRotation(0.3);

      const bow = this.add.graphics();
      bow.lineStyle(3, 0x8b5a2b, 1);
      bow.beginPath();
      bow.arc(14, -4, 15, -1.1, 1.1);
      bow.strokePath();
      bow.lineStyle(1, 0xe8e0c8, 1);
      bow.lineBetween(
        14 + Math.cos(-1.1) * 15, -4 + Math.sin(-1.1) * 15,
        14 + Math.cos(1.1) * 15, -4 + Math.sin(1.1) * 15,
      );

      const arrow = this.add.rectangle(18, -4, 18, 2, 0xe0d8b8);

      c.add([quiver, feather, hood, mask, bow, arrow]);
    } else {
      const hat = this.add.triangle(
        0, -30, -12, 8, 12, 8, 0, -16, 0x4a2f7a,
      ).setStrokeStyle(2, GOLD);

      const brim = this.add.ellipse(0, -23, 26, 6, 0x3a2560)
        .setStrokeStyle(1, GOLD);

      const staff = this.add.rectangle(15, -4, 3, 34, 0x6a4a2a)
        .setStrokeStyle(1, 0x2a1c10);

      const orbGlow = this.add.circle(15, -23, 10, 0xc8a6ff, 0.4)
        .setBlendMode(Phaser.BlendModes.ADD);

      const orb = this.add.circle(15, -23, 5, 0xe6d7ff)
        .setStrokeStyle(1, 0xffffff);

      this.tweens.add({
        targets: orbGlow,
        alpha: 0.12,
        scale: 1.3,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });

      c.add([staff, orbGlow, orb, hat, brim]);
    }

    this.addHeroDetail(c, kind);

    if (eq) this.addGearLook(c, kind, eq, torso);

    c.setData('legs', [leftBoot, rightBoot]);
    return c;
  }
}

class GameScene extends BaseScene {
  private hero!: Phaser.GameObjects.Arc;
  private heroVisual!: Phaser.GameObjects.Container;
  private heroLabel!: Phaser.GameObjects.Text;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private activeWaves = new Map<number, WaveState>();

  private coins = 200;
  private xp = 0;
  private heroLevel = 1;
  private wave = 0;
  private baseHP = 100;

  private maxMana = 100;
  private mana = 100;
  private manaRegen = 8;

  private heroAttackCooldown = 0;
  private heroAttackRate = 650;
  private heroRange = 115;
  private heroDamage = 3;

  private buildMode = false;
  private pendingBuild: { x: number; y: number } | null = null;
  private towerMenuOpen = false;

  private selectedTowerKind: TowerKind = 'basic';
  private selectedTower: Tower | null = null;
  private nextRoute: 'left' | 'right' = 'left';

  private skillPoints = 0;
  private skillLevels: Record<SkillKind, number> = freshSkills();

  private shieldUntil = 0;

  private heroKind: HeroKind = 'guardiao';
  private heroSpeed = 205;
  private heroLegs: Phaser.GameObjects.Rectangle[] = [];
  private unlockedHeroes: HeroKind[] = ['guardiao'];
  private companions: Companion[] = [];
  private fused = false;
  private techSnap: TechSnap | null = null;
  private stashTowers: Tower[] = [];
  private stashAllies: Ally[] = [];
  private transToken = 0;
  private skipGateWave = 0;
  private gatePrompt = false;
  private selectorObjs: Phaser.GameObjects.GameObject[] = [];
  private selectorRects: { x: number; y: number; w: number; h: number; kind: HeroKind }[] = [];
  private frameCount = 0;
  private spawnSeq = 0;
  private zones: Zone[] = [];
  private fxLayer!: Phaser.GameObjects.Graphics;
  private heroHp = 200;
  private heroMaxHp = 200;
  private heroDead = false;
  private heroDeaths = 0;
  private heroHitAt = 0;
  private heroInvulnUntil = 0;
  private worldObjs: Phaser.GameObjects.GameObject[] = [];
  private extraMana = 0;
  private maxBaseHP = 100;
  private stock: Record<TowerKind, number> = { basic: 0, rapid: 0, sniper: 0 };
  private allies: Ally[] = [];

  private worldLevel = 1;
  private finalChoice: 'tech' | 'real' | null = null;
  private modalOpen = false;
  private modalObjects: Phaser.GameObjects.GameObject[] = [];
  private modalBody?: Phaser.GameObjects.Text;
  private worldOverlay!: Phaser.GameObjects.Rectangle;
  private auraGraphics!: Phaser.GameObjects.Graphics;
  private equip: Record<HeroKind, Record<Gear, number>> = freshEquip();
  private clones: Clone[] = [];
  private cloneUntil = 0;
  private tracers: {
    x1: number; y1: number; x2: number; y2: number; ttl: number;
    color?: number; w?: number; life?: number;
  }[] = [];
  private tracerLayer!: Phaser.GameObjects.Graphics;
  private panelNote?: Phaser.GameObjects.Text;
  private previewFor = -1;
  private previewText = '';
  private healthLayer!: Phaser.GameObjects.Graphics;

  private coinText!: Phaser.GameObjects.Text;
  private baseText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private manaText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private buildInfoText!: Phaser.GameObjects.Text;
  private buildExitText!: Phaser.GameObjects.Text;
  private barGraphics!: Phaser.GameObjects.Graphics;

  protected buildButton!: Phaser.GameObjects.Container;
  private heroButton!: Phaser.GameObjects.Container;
  protected waveButton!: Phaser.GameObjects.Container;

  private rangeGraphics!: Phaser.GameObjects.Graphics;
  private buildPreview!: Phaser.GameObjects.Graphics;

  private contextObjects: Phaser.GameObjects.GameObject[] = [];
  protected contextPanel?: Phaser.GameObjects.Graphics;
  protected contextTitle?: Phaser.GameObjects.Text;

  private joystickPointer: number | null = null;
  private joystickX = 0;
  private joystickY = 0;
  private joystickCenter = { x: 86, y: 892 };

  protected joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private joystickShine!: Phaser.GameObjects.Arc;

  constructor() {
    super('GameScene');
  }

  init(data: {
    heroKind?: HeroKind;
    stock?: Record<TowerKind, number>;
    extras?: { base: number; mana: number; skill: number };
    coins?: number;
  }) {
    const hk = data?.heroKind ?? 'guardiao';
    const ex = data?.extras ?? { base: 0, mana: 0, skill: 0 };

    this.enemies = [];
    this.towers = [];
    this.allies = [];
    this.clones = [];
    this.cloneUntil = 0;
    this.companions = [];
    this.fused = false;
    this.techSnap = null;
    this.skipGateWave = 0;
    this.selectorObjs = [];
    this.selectorRects = [];
    this.stashTowers = [];
    this.stashAllies = [];
    this.transToken++;
    this.tracers = [];
    this.zones = [];
    this.spawnSeq = 0;
    this.equip = freshEquip();
    this.panelNote = undefined;
    this.activeWaves = new Map();
    this.contextObjects = [];
    this.modalObjects = [];
    this.contextPanel = undefined;
    this.contextTitle = undefined;
    this.modalBody = undefined;

    this.gameOver = false;
    this.modalOpen = false;
    this.buildMode = false;
    this.pendingBuild = null;
    this.towerMenuOpen = false;
    this.selectedTower = null;
    this.selectedTowerKind = 'basic';
    this.nextRoute = 'left';

    this.coins = data?.coins ?? 200;
    this.stock = data?.stock
      ? { ...data.stock }
      : { basic: 0, rapid: 0, sniper: 0 };

    this.xp = 0;
    this.heroLevel = 1;
    this.wave = 0;
    this.skillPoints = ex.skill;
    this.skillLevels = freshSkills();
    this.heroDead = false;
    this.heroDeaths = 0;
    this.heroHitAt = 0;
    this.heroInvulnUntil = 0;
    this.heroMaxHp = 0;
    this.shieldUntil = 0;

    this.heroKind = hk;
    this.unlockedHeroes = [hk];
    this.extraMana = ex.mana;
    this.maxBaseHP = 100 + ex.base * 20;
    this.baseHP = this.maxBaseHP;
    this.heroAttackCooldown = 0;

    this.worldLevel = 1;
    this.finalChoice = null;
    this.previewFor = -1;

    this.joystickPointer = null;
    this.joystickX = 0;
    this.joystickY = 0;

    this.applyHeroStats();
    this.heroHp = this.heroMaxHp;
    this.mana = this.maxMana;
  }

  create() {
    this.drawWorld();
    this.createHero();
    this.createInterface();
    this.createWorldOverlay();
    this.healthLayer = this.add.graphics().setDepth(8);
    this.tracerLayer = this.add.graphics().setDepth(12);
    this.fxLayer = this.add.graphics().setDepth(9);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.keys = {
      w: this.input.keyboard!.addKey('W'),
      a: this.input.keyboard!.addKey('A'),
      s: this.input.keyboard!.addKey('S'),
      d: this.input.keyboard!.addKey('D'),
    };

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver || this.modalOpen) return;

      // Seletor de heróis, ao lado esquerdo da fortaleza.
      const picked = this.selectorRects.find(r =>
        pointer.x >= r.x && pointer.x <= r.x + r.w &&
        pointer.y >= r.y && pointer.y <= r.y + r.h,
      );

      if (picked) {
        // Escolhe o herói e já abre as habilidades dele.
        if (picked.kind !== this.heroKind) this.swapHero(picked.kind);

        this.openHeroMenu();
        return;
      }

      // Os controles da interface e o joystick não constroem torres.
      if (pointer.y < 150 || pointer.y >= 825) return;

      if (this.buildMode) {
        // Botão X / SAIR no canto superior direito.
        if (pointer.x >= 490 && pointer.y < 200) {
          this.exitBuild('Construção encerrada.');
          return;
        }

        this.askBuild(pointer.x, pointer.y);
        return;
      }

      this.selectElementAt(pointer.x, pointer.y);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.buildMode && !this.pendingBuild && pointer.y >= 150 && pointer.y < 825) {
        this.updateBuildPreview(pointer.x, pointer.y);
      }

      if (this.joystickPointer === pointer.id && pointer.isDown) {
        this.updateJoystick(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointer === pointer.id) {
        this.joystickPointer = null;
        this.joystickX = 0;
        this.joystickY = 0;

        this.moveKnob(this.joystickCenter.x, this.joystickCenter.y);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > 825 && pointer.x < 170) {
        this.joystickPointer = pointer.id;
        this.updateJoystick(pointer.x, pointer.y);
      }
    });

    this.showMessage(
      'Bem-vindo, comandante! Construa torres e inicie a primeira onda.',
    );
    this.refreshInterface();
  }

  // ==================================================
  // CENÁRIO
  // ==================================================

  private bake(g: Phaser.GameObjects.Graphics, key: string, depth: number) {
    if (this.textures.exists(key)) this.textures.remove(key);

    g.generateTexture(key, WIDTH, HEIGHT);
    g.destroy();

    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(depth);
  }

  private worldTheme(): WorldTheme {
    if (this.finalChoice === 'real') return 'real';
    if (this.worldLevel === 3) return 'tech';
    if (this.worldLevel === 2) return 'greece';
    return 'primitive';
  }

  private drawWorld() {
    const before = new Set<Phaser.GameObjects.GameObject>(this.children.list);

    this.paintWorld(this.worldTheme());

    // Guarda tudo o que o cenário criou, para poder trocar de mundo.
    this.worldObjs = this.children.list.filter(
      (o: Phaser.GameObjects.GameObject) => !before.has(o),
    );
  }

  private redrawWorld() {
    for (const o of this.worldObjs) this.killVisual(o);

    this.worldObjs = [];
    this.drawWorld();
    this.rebuildTowerLooks();
  }

  private rebuildTowerLooks() {
    const theme = this.worldTheme();

    for (const t of this.towers) {
      const x = t.body.x;
      const y = t.body.y;

      this.killVisual(t.visual);

      const v = this.createTowerVisual(x, y, t.kind, theme);
      v.setScale(1 + (t.level - 1) * 0.055);

      const lt = v.getData('levelText') as Phaser.GameObjects.Text | undefined;
      if (lt) lt.setText(['I', 'II', 'III', 'IV', 'V'][t.level - 1]);

      if (t.level >= 5) {
        v.add(
          this.add.circle(0, 2, 25, 0xffd54a, 0.12)
            .setStrokeStyle(3, GOLD_LIGHT, 0.95),
        );
      }

      t.visual = v;
    }
  }

  private paintWorld(theme: WorldTheme) {
    const sky = theme === 'tech' && this.finalChoice === 'tech';
    const T = sky ? { ...THEMES.tech, ...SKY_COLORS } : THEMES[theme];

    this.cameras.main.setBackgroundColor(T.bgCss);

    const g = this.add.graphics();

    // Terreno base com gradiente
    this.fillVGradient(g, 0, 150, WIDTH, 675, T.g1, T.g2, 1, 5);

    // Manchas de terreno
    for (let i = 0; i < 80; i++) {
      const x = (i * 137 + 41) % WIDTH;
      const y = 150 + ((i * 89 + 17) % 675);
      const rw = 40 + ((i * 13) % 70);
      const rh = 22 + ((i * 7) % 40);

      g.fillStyle(T.patches[i % 4], 0.33);
      g.fillEllipse(x, y, rw, rh);
    }

    // Clareira central
    g.fillStyle(T.clear1, 0.3);
    g.fillEllipse(300, 470, 550, 600);

    g.fillStyle(T.clear2, 0.1);
    g.fillEllipse(300, 470, 390, 510);

    // Círculo central
    g.lineStyle(2, T.ring, 0.12);
    g.strokeCircle(300, 470, 210);
    g.lineStyle(1, T.ring, 0.1);
    g.strokeCircle(300, 470, 180);

    for (let a = 0; a < 360; a += 20) {
      const rad = Phaser.Math.DegToRad(a);
      g.lineStyle(2, T.ring, 0.12);
      g.lineBetween(
        300 + Math.cos(rad) * 196,
        470 + Math.sin(rad) * 196,
        300 + Math.cos(rad) * 210,
        470 + Math.sin(rad) * 210,
      );
    }

    if (sky) this.paintSkyGround(g);
    else this.paintGround(g, theme);

    for (const path of ALL_PATHS) {
      this.drawRoad(g, path, theme);
    }

    if (!sky) this.paintDecor(g, theme);

    const pads = [
      { x: 35, y: 285 }, { x: 35, y: 465 }, { x: 35, y: 645 },
      { x: 565, y: 285 }, { x: 565, y: 465 }, { x: 565, y: 645 },
      { x: 300, y: 285 }, { x: 300, y: 405 },
      { x: 300, y: 525 }, { x: 300, y: 645 },
    ];

    for (const p of pads) this.drawStonePad(g, p.x, p.y, theme);

    // Cenário estático vira uma imagem única (muito mais leve)
    this.bake(g, 'world_bg', 0);

    this.drawPortal(theme);
    this.drawFortress(theme);

    this.drawTorch(262, 160, theme);
    this.drawTorch(338, 160, theme);
    this.drawTorch(244, 800, theme);
    this.drawTorch(356, 800, theme);

    this.paintAmbient(theme);

    // Vinheta escura
    const v = this.add.graphics().setDepth(3);

    for (let i = 0; i < 12; i++) {
      const inset = i * 7 + 4;

      v.lineStyle(8, T.vignette, 0.5 * Math.pow(1 - i / 12, 2));
      v.strokeRect(
        inset, 150 + inset, WIDTH - inset * 2, 675 - inset * 2,
      );
    }
  }

  // Céus: nuvens, brilhos e raios dourados no lugar do chão.
  private paintSkyGround(g: Phaser.GameObjects.Graphics) {
    for (let i = 0; i < 7; i++) {
      const cx = 300 + (i - 3) * 130;

      g.fillStyle(0xfff0b0, 0.07);
      g.fillTriangle(300, 150, cx - 45, 825, cx + 45, 825);
    }

    for (let i = 0; i < 140; i++) {
      const x = 8 + ((i * 97 + 23) % 584);
      const y = 155 + ((i * 71 + 11) % 660);

      if (this.isNearPath(x, y, 30)) continue;

      g.fillStyle(0xffffff, 0.3 + (i % 4) * 0.12);
      g.fillCircle(x, y, 1 + (i % 3) * 0.6);
    }

    for (let i = 0; i < 36; i++) {
      const x = (i * 151 + 37) % WIDTH;
      const y = 170 + ((i * 113 + 29) % 640);

      if (this.isNearPath(x, y, 50)) continue;

      g.fillStyle(0x8fb4e0, 0.3);
      g.fillEllipse(x, y + 12, 90, 16);

      for (let k = 0; k < 4; k++) {
        g.fillStyle(0xffffff, 0.6);
        g.fillEllipse(x + k * 18 - 27, y + (k % 2) * 6, 46, 24);
      }
    }
  }

  // Detalhes do chão de cada mundo
  private paintGround(g: Phaser.GameObjects.Graphics, theme: WorldTheme) {
    for (let i = 0; i < 280; i++) {
      const x = 8 + ((i * 97 + 23) % 584);
      const y = 155 + ((i * 71 + 11) % 660);

      if (this.isNearPath(x, y, 32)) continue;

      if (theme === 'primitive') {
        if (i % 4 === 0) {
          g.lineStyle(1, 0x8fb06a, 0.55);
          g.lineBetween(x, y, x - 2, y - 5);
          g.lineBetween(x, y, x + 1, y - 6);
          g.lineBetween(x, y, x + 3, y - 4);
        } else if (i % 11 === 0) {
          g.fillStyle(i % 2 ? 0xe8d28a : 0xb98cff, 0.8);
          g.fillCircle(x, y, 1.6);
        } else {
          g.fillStyle(i % 2 ? 0x1f3223 : 0x6f9456, 0.5);
          g.fillCircle(x, y, 1 + (i % 3));
        }
      } else if (theme === 'greece') {
        if (i % 6 === 0) {
          g.fillStyle(0xf4efe0, 0.85);
          g.fillCircle(x, y, 1.8);
          g.fillStyle(0xe8c04a, 0.9);
          g.fillCircle(x, y, 0.8);
        } else if (i % 9 === 0) {
          g.lineStyle(1, 0x5f7a3a, 0.7);
          g.lineBetween(x, y, x - 2, y - 6);
          g.lineBetween(x, y, x + 2, y - 5);
        } else {
          g.fillStyle(i % 2 ? 0xb8ae88 : 0x6f7d4a, 0.45);
          g.fillCircle(x, y, 1 + (i % 3));
        }
      } else if (theme === 'tech') {
        if (i % 5 === 0) {
          g.fillStyle(0x3af0ff, 0.5);
          g.fillCircle(x, y, 1.6);
          g.lineStyle(1, 0x3af0ff, 0.22);
          g.lineBetween(x, y, x + ((i % 3) + 1) * 12, y);
          g.lineBetween(x + ((i % 3) + 1) * 12, y, x + ((i % 3) + 1) * 12, y + 10);
        } else if (i % 7 === 0) {
          g.fillStyle(0xff4ad8, 0.4);
          g.fillRect(x, y, 3, 3);
        }
      } else {
        if (i % 5 === 0) {
          g.lineStyle(1, 0x15171a, 0.5);
          g.lineBetween(x, y, x + 8, y + 3);
          g.lineBetween(x + 8, y + 3, x + 12, y + 9);
        } else {
          g.fillStyle(i % 2 ? 0x24272b : 0x6a7077, 0.4);
          g.fillCircle(x, y, 1 + (i % 2));
        }
      }
    }

    if (theme === 'tech') {
      g.lineStyle(1, 0x3af0ff, 0.07);

      for (let x = 0; x <= WIDTH; x += 30) g.lineBetween(x, 150, x, 825);
      for (let y = 150; y <= 825; y += 30) g.lineBetween(0, y, WIDTH, y);
    }

    if (theme === 'greece') {
      // Mosaico de meandro ao redor da clareira
      g.lineStyle(2, 0xc9a24a, 0.22);
      g.strokeCircle(300, 470, 222);

      for (let a = 0; a < 360; a += 10) {
        const rad = Phaser.Math.DegToRad(a);
        const cx = 300 + Math.cos(rad) * 228;
        const cy = 470 + Math.sin(rad) * 228;

        g.fillStyle(0x2f5f9a, 0.2);
        g.fillRect(cx - 3, cy - 3, 6, 6);
      }
    }

    if (theme === 'real') {
      // Faixas e calçadas
      g.fillStyle(0x8d9298, 0.35);
      g.fillRect(0, 150, 14, 675);
      g.fillRect(WIDTH - 14, 150, 14, 675);

      g.lineStyle(2, 0xe0c040, 0.25);
      g.strokeCircle(300, 470, 222);
    }
  }

  // Decoração (árvores, colunas, torres, prédios...) de cada mundo
  private paintDecor(g: Phaser.GameObjects.Graphics, theme: WorldTheme) {
    const rocks: Point[] = [
      { x: 160, y: 205 }, { x: 440, y: 205 },
      { x: 28, y: 480 }, { x: 572, y: 480 },
      { x: 165, y: 760 }, { x: 435, y: 760 },
      { x: 300, y: 215 }, { x: 300, y: 350 },
    ];

    const trees: Point[] = [
      { x: 24, y: 205 }, { x: 48, y: 255 },
      { x: 25, y: 355 }, { x: 40, y: 410 },
      { x: 28, y: 535 }, { x: 48, y: 590 },
      { x: 30, y: 700 }, { x: 68, y: 755 },
      { x: 576, y: 205 }, { x: 550, y: 255 },
      { x: 575, y: 355 }, { x: 560, y: 410 },
      { x: 572, y: 535 }, { x: 552, y: 590 },
      { x: 570, y: 700 }, { x: 532, y: 755 },
      { x: 145, y: 165 }, { x: 455, y: 165 },
    ];

    rocks.forEach((p, i) => {
      const s = 7 + (i % 3) * 3;

      if (theme === 'primitive') this.drawRock(g, p.x, p.y, s);
      else if (theme === 'greece') this.drawMarbleBlock(g, p.x, p.y, s);
      else if (theme === 'tech') this.drawCrate(g, p.x, p.y, s);
      else this.drawCone(g, p.x, p.y, s);
    });

    trees.forEach((p, i) => {
      const s = 14 + (i % 4) * 3;

      if (theme === 'primitive') this.drawTree(g, p.x, p.y, s, i);
      else if (theme === 'greece') {
        if (i % 3 === 0) this.drawCypress(g, p.x, p.y, s);
        else this.drawColumn(g, p.x, p.y, s * 0.8, i % 4 === 1);
      } else if (theme === 'tech') this.drawPylon(g, p.x, p.y, s);
      else if (i % 3 === 0) this.drawTree(g, p.x, p.y, s * 0.8, i);
      else if (i % 3 === 1) this.drawBuilding(g, p.x, p.y, s, i);
      else this.drawLamp(g, p.x, p.y);
    });
  }

  private paintAmbient(theme: WorldTheme) {
    if (theme === 'real') return;

    const count = theme === 'primitive' ? 16 : 10;
    const color = theme === 'primitive' ? 0xe9ff9a
      : theme === 'greece' ? 0xffe08a : 0x3af0ff;

    for (let i = 0; i < count; i++) {
      const fx = 20 + ((i * 53) % 560);
      const fy = 190 + ((i * 97) % 600);

      const fly = this.add.circle(fx, fy, 2, color, 0.8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(15);

      this.tweens.add({
        targets: fly,
        x: fx + Phaser.Math.Between(-30, 30),
        y: theme === 'tech' ? fy - 50 : fy + Phaser.Math.Between(-30, 30),
        alpha: 0.1,
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 1500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private drawRoad(
    g: Phaser.GameObjects.Graphics,
    path: Point[],
    theme: WorldTheme,
  ) {
    const R = theme === 'tech' && this.finalChoice === 'tech'
      ? SKY_ROAD
      : THEMES[theme].road;

    const line = (color: number, width: number, alpha = 1) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      g.moveTo(path[0].x, path[0].y);

      for (let i = 1; i < path.length; i++) {
        g.lineTo(path[i].x, path[i].y);
      }

      g.strokePath();
    };

    line(R.shadow, 56, 0.55);
    if (R.neon) line(R.neon, 54, 0.55);
    line(R.c1, 51);
    line(R.c2, 45);
    line(R.c3, 41);
    line(R.c4, 33);
    line(R.c5, 20, R.c5a);

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const distance = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);

      if (distance === 0) continue;

      const nx = -(b.y - a.y) / distance;
      const ny = (b.x - a.x) / distance;

      // Detalhes do piso
      for (let d = 6; d < distance; d += 9) {
        const t = d / distance;
        const cx = Phaser.Math.Linear(a.x, b.x, t);
        const cy = Phaser.Math.Linear(a.y, b.y, t);
        const h = (Math.floor(d) * 7 + i * 13) % 11;
        const off = (h - 5) * 3.2;

        g.fillStyle(h % 2 ? R.stoneA : R.stoneB, 0.35 + (h % 3) * 0.1);
        g.fillRoundedRect(cx + nx * off - 3, cy + ny * off - 2, 6, 4, 1);
      }

      // Bordas
      for (let d = 4; d < distance; d += 16) {
        const t = d / distance;
        const cx = Phaser.Math.Linear(a.x, b.x, t);
        const cy = Phaser.Math.Linear(a.y, b.y, t);

        for (const side of [-1, 1]) {
          g.fillStyle(R.curbShadow, 0.7);
          g.fillCircle(cx + nx * 23 * side + 1, cy + ny * 23 * side + 1, 3);
          g.fillStyle(R.curb, 0.85);
          g.fillCircle(cx + nx * 23 * side, cy + ny * 23 * side, 2.5);
        }
      }

      if (theme === 'real') {
        // Faixa central tracejada
        for (let d = 0; d < distance; d += 22) {
          const t0 = d / distance;
          const t1 = Math.min(distance, d + 11) / distance;

          g.lineStyle(2.5, 0xe0c040, 0.85);
          g.lineBetween(
            Phaser.Math.Linear(a.x, b.x, t0), Phaser.Math.Linear(a.y, b.y, t0),
            Phaser.Math.Linear(a.x, b.x, t1), Phaser.Math.Linear(a.y, b.y, t1),
          );
        }

        for (const side of [-1, 1]) {
          g.lineStyle(2, 0xdadde0, 0.55);
          g.lineBetween(
            a.x + nx * 19 * side, a.y + ny * 19 * side,
            b.x + nx * 19 * side, b.y + ny * 19 * side,
          );
        }
      }

      if (theme === 'tech') {
        for (const side of [-1, 1]) {
          g.lineStyle(1.5, 0x3af0ff, 0.6);
          g.lineBetween(
            a.x + nx * 19 * side, a.y + ny * 19 * side,
            b.x + nx * 19 * side, b.y + ny * 19 * side,
          );
        }
      }

      if (theme === 'greece') {
        // Juntas das lajes de mármore
        for (let d = 14; d < distance; d += 28) {
          const t = d / distance;
          const cx = Phaser.Math.Linear(a.x, b.x, t);
          const cy = Phaser.Math.Linear(a.y, b.y, t);

          g.lineStyle(1, 0x8c8470, 0.55);
          g.lineBetween(
            cx + nx * 20, cy + ny * 20, cx - nx * 20, cy - ny * 20,
          );
        }
      }
    }
  }

  private drawRock(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
  ) {
    g.fillStyle(0x0c120d, 0.45);
    g.fillEllipse(x + 2, y + s * 0.7, s * 2.2, s * 0.7);

    const pts: Phaser.Types.Math.Vector2Like[] = [
      { x: x - s, y: y + s * 0.5 },
      { x: x - s * 0.7, y: y - s * 0.5 },
      { x: x - s * 0.1, y: y - s * 0.9 },
      { x: x + s * 0.8, y: y - s * 0.4 },
      { x: x + s, y: y + s * 0.5 },
    ];

    g.fillStyle(0x5c6258, 1);
    g.fillPoints(pts, true);

    g.fillStyle(0x8b9285, 1);
    g.fillTriangle(
      x - s * 0.7, y - s * 0.5,
      x - s * 0.1, y - s * 0.9,
      x + s * 0.2, y - s * 0.2,
    );

    g.lineStyle(1, 0x20241f, 1);
    g.strokePoints(pts, true);
  }

  private drawMarbleBlock(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
  ) {
    g.fillStyle(0x1a1810, 0.4);
    g.fillEllipse(x + 2, y + s * 0.7, s * 2.4, s * 0.7);

    g.fillStyle(0xcfc7ad, 1);
    g.fillRect(x - s, y - s * 0.4, s * 2, s * 0.9);
    g.fillStyle(0xf1ebd8, 1);
    g.fillRect(x - s, y - s * 0.4, s * 2, s * 0.3);
    g.lineStyle(1, 0x7a7258, 1);
    g.strokeRect(x - s, y - s * 0.4, s * 2, s * 0.9);
    g.lineBetween(x - s * 0.2, y - s * 0.4, x - s * 0.2, y + s * 0.5);
  }

  private drawCrate(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
  ) {
    g.fillStyle(0x02060a, 0.5);
    g.fillEllipse(x + 2, y + s * 0.7, s * 2.4, s * 0.7);

    g.fillStyle(0x16222e, 1);
    g.fillRect(x - s, y - s * 0.7, s * 2, s * 1.4);
    g.lineStyle(1.5, 0x3af0ff, 0.9);
    g.strokeRect(x - s, y - s * 0.7, s * 2, s * 1.4);
    g.lineBetween(x - s, y, x + s, y);
    g.fillStyle(0x3af0ff, 0.9);
    g.fillCircle(x - s * 0.6, y - s * 0.35, 1.5);
    g.fillStyle(0xff4ad8, 0.9);
    g.fillCircle(x - s * 0.6, y + s * 0.35, 1.5);
  }

  private drawCone(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
  ) {
    g.fillStyle(0x0a0a0a, 0.5);
    g.fillEllipse(x + 2, y + s * 0.6, s * 1.8, s * 0.6);

    g.fillStyle(0x2a2c2f, 1);
    g.fillRect(x - s * 0.8, y + s * 0.3, s * 1.6, s * 0.35);

    g.fillStyle(0xff7a1a, 1);
    g.fillTriangle(x - s * 0.6, y + s * 0.35, x + s * 0.6, y + s * 0.35, x, y - s);

    g.fillStyle(0xf4f4f4, 1);
    g.fillTriangle(
      x - s * 0.36, y - s * 0.2, x + s * 0.36, y - s * 0.2, x, y - s * 0.62,
    );
  }

  private drawTree(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
    variant: number,
  ) {
    g.fillStyle(0x0c120d, 0.5);
    g.fillEllipse(x + 5, y + s * 0.6, s * 2.1, s * 0.7);

    g.fillStyle(0x3a2a1a, 1);
    g.fillRect(x - s * 0.14, y, s * 0.28, s * 0.85);
    g.fillStyle(0x6a4e30, 1);
    g.fillRect(x - s * 0.14, y, s * 0.1, s * 0.85);

    const colors = variant % 2
      ? [0x1f3523, 0x35582f, 0x5b8040]
      : [0x233a24, 0x40623a, 0x7a9b4f];

    g.fillStyle(0x0f1c12, 1);
    g.fillCircle(x, y - s * 0.15, s * 0.8);

    g.fillStyle(colors[0], 1);
    g.fillCircle(x, y - s * 0.15, s * 0.7);

    g.fillStyle(colors[1], 1);
    g.fillCircle(x - s * 0.2, y - s * 0.3, s * 0.46);

    g.fillStyle(colors[2], 0.9);
    g.fillCircle(x + s * 0.18, y - s * 0.4, s * 0.27);

    g.fillStyle(0xd7f0a0, 0.25);
    g.fillCircle(x - s * 0.05, y - s * 0.5, s * 0.12);
  }

  private drawCypress(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
  ) {
    g.fillStyle(0x1a1810, 0.45);
    g.fillEllipse(x + 4, y + s * 0.6, s * 1.6, s * 0.6);

    g.fillStyle(0x4a3a22, 1);
    g.fillRect(x - 1.5, y, 3, s * 0.6);

    g.fillStyle(0x16341f, 1);
    g.fillEllipse(x, y - s * 0.7, s * 0.95, s * 2.4);
    g.fillStyle(0x24562e, 1);
    g.fillEllipse(x - s * 0.1, y - s * 0.8, s * 0.6, s * 2);
    g.fillStyle(0x4a8a48, 0.8);
    g.fillEllipse(x - s * 0.2, y - s * 1.1, s * 0.25, s * 1.1);
  }

  private drawColumn(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
    broken: boolean,
  ) {
    g.fillStyle(0x1a1810, 0.45);
    g.fillEllipse(x + 4, y + s * 0.4, s * 2.2, s * 0.7);

    const h = broken ? s * 1.1 : s * 2.4;

    // base
    g.fillStyle(0xcfc7ad, 1);
    g.fillRect(x - s * 0.62, y - s * 0.18, s * 1.24, s * 0.34);
    g.lineStyle(1, 0x7a7258, 1);
    g.strokeRect(x - s * 0.62, y - s * 0.18, s * 1.24, s * 0.34);

    // fuste
    g.fillStyle(0xece6d2, 1);
    g.fillRect(x - s * 0.4, y - h, s * 0.8, h);
    g.fillStyle(0xb8b096, 0.55);
    g.fillRect(x + s * 0.1, y - h, s * 0.3, h);

    g.lineStyle(1, 0xa89f84, 0.9);

    for (const k of [-0.2, 0, 0.2]) {
      g.lineBetween(x + s * k, y - h, x + s * k, y - s * 0.18);
    }

    if (!broken) {
      // capitel
      g.fillStyle(0xf6f0de, 1);
      g.fillRect(x - s * 0.62, y - h - s * 0.24, s * 1.24, s * 0.26);
      g.fillStyle(0xcfc7ad, 1);
      g.fillCircle(x - s * 0.45, y - h - s * 0.05, s * 0.14);
      g.fillCircle(x + s * 0.45, y - h - s * 0.05, s * 0.14);
      g.lineStyle(1, 0x7a7258, 1);
      g.strokeRect(x - s * 0.62, y - h - s * 0.24, s * 1.24, s * 0.26);
    } else {
      g.fillStyle(0xece6d2, 1);
      g.fillTriangle(
        x - s * 0.4, y - h, x - s * 0.05, y - h - s * 0.35, x + s * 0.1, y - h,
      );
      g.fillStyle(0xcfc7ad, 1);
      g.fillRect(x + s * 0.5, y, s * 0.5, s * 0.25);
      g.fillRect(x - s, y + s * 0.05, s * 0.4, s * 0.22);
    }
  }

  private drawPylon(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
  ) {
    g.fillStyle(0x02060a, 0.55);
    g.fillEllipse(x + 4, y + s * 0.5, s * 1.8, s * 0.6);

    g.fillStyle(0x1c2a38, 1);
    g.fillTriangle(x - s * 0.6, y + s * 0.4, x + s * 0.6, y + s * 0.4, x, y - s * 1.8);
    g.lineStyle(1.5, 0x3af0ff, 0.85);
    g.strokeTriangle(x - s * 0.6, y + s * 0.4, x + s * 0.6, y + s * 0.4, x, y - s * 1.8);

    g.lineStyle(1, 0x3af0ff, 0.6);
    for (let k = 0; k < 4; k++) {
      const yy = y - s * (0.2 + k * 0.4);
      const w = s * (0.5 - k * 0.1);
      g.lineBetween(x - w, yy, x + w, yy);
    }

    g.fillStyle(0xff4ad8, 0.35);
    g.fillCircle(x, y - s * 1.8, s * 0.55);
    g.fillStyle(0xff4ad8, 1);
    g.fillCircle(x, y - s * 1.8, s * 0.22);
  }

  private drawBuilding(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
    variant: number,
  ) {
    const w = s * 2.2;
    const h = s * 2.6;

    g.fillStyle(0x0a0a0a, 0.5);
    g.fillEllipse(x + 6, y + s * 0.5, w * 1.1, s * 0.7);

    g.fillStyle(variant % 2 ? 0x5b6068 : 0x6b5a50, 1);
    g.fillRect(x - w / 2, y - h, w, h + s * 0.4);
    g.fillStyle(0x3a3d42, 1);
    g.fillRect(x - w / 2 - 2, y - h - 4, w + 4, 5);
    g.lineStyle(1, 0x1a1c1f, 1);
    g.strokeRect(x - w / 2, y - h, w, h + s * 0.4);

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        const lit = (r * 2 + c + variant) % 3 !== 0;

        g.fillStyle(lit ? 0xf0d078 : 0x20262c, 1);
        g.fillRect(x - w / 2 + 4 + c * (w / 2 - 2), y - h + 6 + r * (s * 0.8), w / 2 - 8, s * 0.5);
      }
    }
  }

  private drawLamp(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0x0a0a0a, 0.45);
    g.fillEllipse(x + 3, y + 6, 14, 5);

    g.fillStyle(0x3a3d42, 1);
    g.fillRect(x - 1.5, y - 34, 3, 40);
    g.fillRect(x - 1.5, y - 34, 12, 3);

    g.fillStyle(0xfff0b0, 0.25);
    g.fillCircle(x + 10, y - 31, 14);
    g.fillStyle(0xfff0b0, 1);
    g.fillRect(x + 7, y - 33, 7, 4);
  }

  private drawStonePad(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    theme: WorldTheme,
  ) {
    g.fillStyle(0x0a100c, 0.5);
    g.fillEllipse(x + 3, y + 6, 50, 30);

    if (theme === 'greece') {
      g.fillStyle(0x8a826a, 1);
      g.fillCircle(x, y, 24);
      g.fillStyle(0xe9e3cf, 1);
      g.fillCircle(x, y, 21);
      g.lineStyle(2, 0xb08a3a, 1);
      g.strokeCircle(x, y, 18);

      for (let a = 0; a < 360; a += 30) {
        const rad = Phaser.Math.DegToRad(a);
        g.fillStyle(0x2f5f9a, 1);
        g.fillRect(x + Math.cos(rad) * 15 - 2, y + Math.sin(rad) * 15 - 2, 4, 4);
      }

      g.fillStyle(0xcfc7ad, 1);
      g.fillCircle(x, y, 11);
      g.fillStyle(0xb08a3a, 1);
      g.fillCircle(x, y, 4);
      return;
    }

    if (theme === 'tech') {
      const hex = (r: number) => {
        const pts: Phaser.Types.Math.Vector2Like[] = [];

        for (let k = 0; k < 6; k++) {
          const a = Phaser.Math.DegToRad(k * 60 + 30);
          pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
        }

        return pts;
      };

      g.fillStyle(0x0a1822, 1);
      g.fillPoints(hex(24), true);
      g.lineStyle(2, 0x3af0ff, 0.9);
      g.strokePoints(hex(22), true);
      g.fillStyle(0x12303f, 1);
      g.fillPoints(hex(16), true);
      g.lineStyle(1, 0xff4ad8, 0.8);
      g.strokePoints(hex(12), true);
      g.fillStyle(0x3af0ff, 0.8);
      g.fillCircle(x, y, 3);
      return;
    }

    if (theme === 'real') {
      g.fillStyle(0x3a3d40, 1);
      g.fillRect(x - 24, y - 20, 48, 40);
      g.fillStyle(0x8a8f95, 1);
      g.fillRect(x - 21, y - 17, 42, 34);

      for (const [cx, cy] of [[-21, -17], [15, -17], [-21, 11], [15, 11]]) {
        g.fillStyle(0xe0c040, 1);
        g.fillRect(x + cx, y + cy, 6, 6);
        g.fillStyle(0x1a1a1a, 1);
        g.fillTriangle(x + cx, y + cy, x + cx + 6, y + cy, x + cx, y + cy + 6);
      }

      g.lineStyle(2, 0xf2f2f2, 0.8);
      g.strokeCircle(x, y, 10);
      g.fillStyle(0xf2f2f2, 0.8);
      g.fillCircle(x, y, 2.5);
      return;
    }

    g.fillStyle(0x2c2e26, 1);
    g.fillCircle(x, y, 24);

    g.fillStyle(0x7d745b, 1);
    g.fillCircle(x, y, 21);

    g.lineStyle(2, 0xc6b78b, 1);
    g.strokeCircle(x, y, 18);

    g.fillStyle(0x3b3d33, 1);
    g.fillCircle(x, y, 14);

    // Runas brilhantes
    g.lineStyle(1.5, 0x7fe0e6, 0.75);
    g.strokeCircle(x, y, 11);

    for (let a = 0; a < 360; a += 45) {
      const rad = Phaser.Math.DegToRad(a);

      g.lineBetween(
        x + Math.cos(rad) * 8, y + Math.sin(rad) * 8,
        x + Math.cos(rad) * 11, y + Math.sin(rad) * 11,
      );
    }

    g.fillStyle(0x9ff0f5, 0.55);
    g.fillCircle(x, y, 3);
  }

  private drawTorch(x: number, y: number, theme: WorldTheme) {
    const post = this.add.graphics().setDepth(2);

    post.fillStyle(0x0a100c, 0.45);
    post.fillEllipse(x + 2, y + 10, 14, 6);

    if (theme === 'tech' || theme === 'real') {
      const neon = theme === 'tech';
      const col = neon ? 0x3af0ff : 0xfff0b0;

      post.fillStyle(neon ? 0x1c2a38 : 0x3a3d42, 1);
      post.fillRect(x - 2, y - 18, 4, 28);
      post.fillRect(x - 6, y - 20, 12, 4);

      const glow = this.add.circle(x, y - 22, 22, col, 0.18)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3);

      this.add.rectangle(x, y - 22, 10, 4, col).setDepth(3);

      this.tweens.add({
        targets: glow,
        alpha: 0.08,
        duration: 900,
        yoyo: true,
        repeat: -1,
      });

      return;
    }

    if (theme === 'greece') {
      // Braseiro de bronze
      post.fillStyle(0x8a6a2a, 1);
      post.fillRect(x - 2, y - 4, 4, 14);
      post.fillStyle(0xb08a3a, 1);
      post.fillTriangle(x - 8, y - 12, x + 8, y - 12, x, y - 2);
      post.lineStyle(1, 0x4a3a12, 1);
      post.strokeTriangle(x - 8, y - 12, x + 8, y - 12, x, y - 2);
    } else {
      post.fillStyle(0x3b2d1c, 1);
      post.fillRect(x - 2, y - 6, 4, 16);

      post.fillStyle(0x7a6a48, 1);
      post.fillRect(x - 5, y - 9, 10, 4);
    }

    const glow = this.add.circle(x, y - 14, 26, 0xff9a3c, 0.16)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);

    const flame = this.add.ellipse(x, y - 15, 8, 13, 0xff8a2a, 0.95)
      .setDepth(3);

    const core = this.add.ellipse(x, y - 13, 4, 8, 0xffe08a, 1)
      .setDepth(3);

    this.tweens.add({
      targets: [flame, core],
      scaleY: 1.25,
      scaleX: 0.85,
      duration: Phaser.Math.Between(140, 230),
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: glow,
      alpha: 0.08,
      scale: 1.15,
      duration: Phaser.Math.Between(300, 480),
      yoyo: true,
      repeat: -1,
    });
  }

  private drawPortal(theme: WorldTheme) {
    const T = THEMES[theme];
    const px = 300;
    const py = 165;

    const aura = this.add.circle(px, py, 46, T.portalGlow, 0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2);

    this.tweens.add({
      targets: aura,
      scale: 1.2,
      alpha: 0.08,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const frame = this.add.graphics().setDepth(2);

    frame.fillStyle(0x0a100c, 0.5);
    frame.fillEllipse(px + 2, py + 8, 76, 40);

    if (theme === 'greece') {
      for (const cx of [px - 46, px + 46]) {
        frame.fillStyle(0xece6d2, 1);
        frame.fillRect(cx - 5, py - 26, 10, 44);
        frame.fillStyle(0xf6f0de, 1);
        frame.fillRect(cx - 8, py - 30, 16, 6);
        frame.fillRect(cx - 8, py + 16, 16, 5);
        frame.lineStyle(1, 0x7a7258, 1);
        frame.strokeRect(cx - 5, py - 26, 10, 44);
      }
    } else if (theme === 'tech') {
      for (const cx of [px - 46, px + 46]) {
        frame.fillStyle(0x1c2a38, 1);
        frame.fillRect(cx - 6, py - 22, 12, 40);
        frame.lineStyle(1.5, 0x3af0ff, 0.9);
        frame.strokeRect(cx - 6, py - 22, 12, 40);
        frame.fillStyle(0xff4ad8, 1);
        frame.fillCircle(cx, py - 26, 3);
      }
    } else if (theme === 'real') {
      for (const cx of [px - 46, px + 46]) {
        for (let k = 0; k < 4; k++) {
          frame.fillStyle(k % 2 ? 0x1a1a1a : 0xe0c040, 1);
          frame.fillRect(cx - 6, py - 20 + k * 10, 12, 10);
        }
      }
    }

    frame.fillStyle(theme === 'tech' ? 0x14202c : 0x23282a, 1);
    frame.fillCircle(px, py, 32);
    frame.lineStyle(3, T.portalRim, 1);
    frame.strokeCircle(px, py, 32);
    frame.lineStyle(1, T.portalRim2, 1);
    frame.strokeCircle(px, py, 29);

    for (let i = 0; i < 8; i++) {
      const rad = Phaser.Math.DegToRad(i * 45);

      frame.fillStyle(0x6c7068, 1);
      frame.fillCircle(
        px + Math.cos(rad) * 29, py + Math.sin(rad) * 29, 4,
      );
      frame.fillStyle(0x9aa095, 1);
      frame.fillCircle(
        px + Math.cos(rad) * 29 - 1, py + Math.sin(rad) * 29 - 1, 1.5,
      );
    }

    this.add.circle(px, py, 24, T.portalHole)
      .setStrokeStyle(2, T.portalLine)
      .setDepth(2);

    // Anel giratório
    const runes = this.add.container(px, py).setDepth(2);
    const rg = this.add.graphics();

    rg.lineStyle(1.5, T.portalLine, 0.85);
    rg.strokeCircle(0, 0, 21);

    for (let i = 0; i < 12; i++) {
      const rad = Phaser.Math.DegToRad(i * 30);

      rg.lineBetween(
        Math.cos(rad) * 17, Math.sin(rad) * 17,
        Math.cos(rad) * 21, Math.sin(rad) * 21,
      );
    }

    runes.add(rg);

    this.tweens.add({
      targets: runes,
      angle: 360,
      duration: 9000,
      repeat: -1,
    });

    // Redemoinho interno
    const swirl = this.add.container(px, py).setDepth(2);
    const sg = this.add.graphics();

    sg.fillStyle(T.portalSwirl1, 0.9);
    sg.fillCircle(0, 0, 15);
    sg.fillStyle(T.portalSwirl2, 0.85);
    sg.fillCircle(0, 0, 10);

    sg.lineStyle(2, 0xffffff, 0.9);
    sg.beginPath();
    sg.arc(0, 0, 12, 0, Math.PI * 1.1);
    sg.strokePath();

    sg.lineStyle(2, 0xffffff, 0.7);
    sg.beginPath();
    sg.arc(0, 0, 7, Math.PI, Math.PI * 2.1);
    sg.strokePath();

    swirl.add(sg);

    this.tweens.add({
      targets: swirl,
      angle: -360,
      duration: 3200,
      repeat: -1,
    });

    this.add.circle(px, py, 4, 0xf0ffff, 0.95).setDepth(2);

    this.add.text(px, 128, T.gateLabel, {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#f0d58a',
      fontStyle: 'bold',
      backgroundColor: '#0b0d10c8',
      padding: { x: 6, y: 2 },
      stroke: '#0b0d10',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(2);
  }

  private drawFortress(theme: WorldTheme) {
    const g = this.add.graphics().setDepth(2);

    g.fillStyle(0x0a100c, 0.55);
    g.fillEllipse(300, 826, 130, 22);

    if (theme === 'greece') {
      // Templo de mármore
      for (let k = 0; k < 3; k++) {
        g.fillStyle(k % 2 ? 0xcfc7ad : 0xe3dcc6, 1);
        g.fillRect(246 - k * 4, 818 - k * 4, 108 + k * 8, 6);
      }

      g.fillStyle(0x1a1208, 1);
      g.fillRect(286, 786, 28, 34);

      for (const cx of [254, 270, 330, 346]) {
        g.fillStyle(0xece6d2, 1);
        g.fillRect(cx - 5, 772, 10, 46);
        g.fillStyle(0xb8b096, 0.55);
        g.fillRect(cx + 1, 772, 4, 46);
        g.fillStyle(0xf6f0de, 1);
        g.fillRect(cx - 8, 767, 16, 6);
        g.lineStyle(1, 0x7a7258, 1);
        g.strokeRect(cx - 5, 772, 10, 46);
      }

      g.fillStyle(0xf1ebd8, 1);
      g.fillRect(246, 758, 108, 9);
      g.lineStyle(2, 0x7a7258, 1);
      g.strokeRect(246, 758, 108, 9);

      g.fillStyle(0xe3dcc6, 1);
      g.fillTriangle(242, 758, 358, 758, 300, 730);
      g.fillStyle(0x2f5f9a, 1);
      g.fillTriangle(256, 756, 344, 756, 300, 737);
      g.lineStyle(2, 0x7a7258, 1);
      g.strokeTriangle(242, 758, 358, 758, 300, 730);

      this.drawGem(g, 300, 746, 4, 0xe8c04a);
    } else if (theme === 'tech') {
      // Bunker futurista
      this.fillVGradient(g, 252, 770, 96, 54, 0x2a3a4a, 0x0e1822, 1, 3);
      g.lineStyle(2, 0x3af0ff, 0.9);
      g.strokeRect(252, 770, 96, 54);

      for (const tx of [240, 340]) {
        this.fillVGradient(g, tx, 750, 20, 74, 0x34485c, 0x101c28, 1, 3);
        g.lineStyle(2, 0x3af0ff, 0.9);
        g.strokeRect(tx, 750, 20, 74);

        g.fillStyle(0xff4ad8, 0.9);
        g.fillRect(tx + 6, 764, 8, 4);
        g.fillStyle(0x3af0ff, 0.9);
        g.fillRect(tx + 6, 776, 8, 4);
        g.fillRect(tx + 6, 788, 8, 4);

        g.lineStyle(2, 0x3af0ff, 1);
        g.lineBetween(tx + 10, 750, tx + 10, 728);
        g.fillStyle(0xff4ad8, 1);
        g.fillCircle(tx + 10, 727, 3);
      }

      g.fillStyle(0x02060a, 1);
      g.fillRect(288, 790, 24, 34);
      g.lineStyle(2, 0x3af0ff, 1);
      g.strokeRect(288, 790, 24, 34);
      g.lineBetween(300, 790, 300, 824);

      g.fillStyle(0x3af0ff, 0.12);
      g.fillCircle(300, 800, 62);
      g.lineStyle(1.5, 0x3af0ff, 0.45);
      g.strokeCircle(300, 800, 62);
    } else if (theme === 'real') {
      // Edifício de concreto com sacos de areia
      this.fillVGradient(g, 252, 764, 96, 60, 0x8a8f95, 0x50555a, 1, 3);
      g.lineStyle(2, 0x2a2d30, 1);
      g.strokeRect(252, 764, 96, 60);

      g.fillStyle(0x3a3d42, 1);
      g.fillRect(248, 758, 104, 8);

      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          g.fillStyle((r + c) % 3 === 0 ? 0xf0d078 : 0x20262c, 1);
          g.fillRect(260 + c * 22, 774 + r * 14, 14, 9);
        }
      }

      g.fillStyle(0x1a1c1f, 1);
      g.fillRect(288, 798, 24, 26);

      for (let k = 0; k < 7; k++) {
        g.fillStyle(k % 2 ? 0xb59a68 : 0xc4aa78, 1);
        g.fillEllipse(246 + k * 18, 826, 18, 10);
        g.lineStyle(1, 0x6a5a38, 1);
        g.strokeEllipse(246 + k * 18, 826, 18, 10);
      }

      g.lineStyle(2, 0xc0c4c8, 1);
      g.lineBetween(300, 758, 300, 730);
      g.fillStyle(0xa8322e, 1);
      g.fillRect(300, 730, 20, 12);
    } else {
      // Muralha principal
      this.fillVGradient(g, 258, 778, 84, 46, 0x6a6e63, 0x383c36, 1, 2);

      g.lineStyle(1, 0x20241f, 0.6);

      for (let row = 0; row < 5; row++) {
        g.lineBetween(258, 786 + row * 9, 342, 786 + row * 9);
      }

      // Ameias
      for (let i = 0; i < 7; i++) {
        g.fillStyle(0x7d8177, 1);
        g.fillRect(258 + i * 12, 771, 7, 8);
        g.lineStyle(1, 0x20241f, 1);
        g.strokeRect(258 + i * 12, 771, 7, 8);
      }

      // Torres laterais
      for (const tx of [250, 328]) {
        this.fillVGradient(g, tx, 762, 22, 62, 0x7a7e72, 0x3a3e38, 1, 2);

        g.lineStyle(2, 0x20241f, 1);
        g.strokeRect(tx, 762, 22, 62);

        g.fillStyle(0xffc860, 0.95);
        g.fillRect(tx + 8, 776, 6, 10);
        g.lineStyle(1, 0x20241f, 1);
        g.strokeRect(tx + 8, 776, 6, 10);

        g.fillStyle(0x8a2a28, 1);
        g.fillTriangle(tx - 4, 764, tx + 11, 742, tx + 26, 764);
        g.fillStyle(0xb8423a, 1);
        g.fillTriangle(tx - 4, 764, tx + 11, 742, tx + 11, 764);
        g.lineStyle(2, 0x2a0e0d, 1);
        g.strokeTriangle(tx - 4, 764, tx + 11, 742, tx + 26, 764);

        this.drawGem(g, tx + 11, 740, 3, GOLD_LIGHT);
      }

      // Portão em arco
      g.fillStyle(0x0d0905, 1);
      g.fillRect(290, 796, 20, 28);
      g.fillCircle(300, 796, 10);

      g.lineStyle(2, GOLD, 1);
      g.beginPath();
      g.arc(300, 796, 10, Math.PI, 0);
      g.strokePath();
      g.lineBetween(290, 796, 290, 824);
      g.lineBetween(310, 796, 310, 824);

      g.lineStyle(1, 0x5a4a2a, 1);

      for (let i = 0; i < 4; i++) {
        g.lineBetween(293 + i * 5, 790, 293 + i * 5, 824);
      }
    }

    if (theme === 'primitive' || theme === 'greece') {
      // Estandarte
      const banner = this.add.triangle(
        300, theme === 'greece' ? 722 : 760, 0, 0, 22, 0, 11, 18, 0xa8322e,
      ).setStrokeStyle(2, GOLD).setDepth(2);

      this.tweens.add({
        targets: banner,
        scaleX: 0.88,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.add.text(300, 706, THEMES[theme].fortLabel, {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#f0d58a',
      fontStyle: 'bold',
      backgroundColor: '#0b0d10c8',
      padding: { x: 6, y: 2 },
      stroke: '#0b0d10',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(2);
  }

  // ==================================================
  // HERÓI
  // ==================================================

  private createHero() {
    this.hero = this.add.circle(300, 220, 18, 0x000000, 0)
      .setStrokeStyle(0, 0x000000, 0)
      .setDepth(6);

    this.heroVisual = this.buildActiveVisual(300, 220);

    this.heroLegs = this.heroVisual.getData('legs') as Phaser.GameObjects.Rectangle[];

    this.heroLabel = this.add.text(
      300, 185,
      `${this.heroTitle()} · Nv. ${this.heroLevel}`,
      {
        fontFamily: 'Georgia, serif',
        fontSize: '10px',
        color: '#f0d58a',
        fontStyle: 'bold',
        backgroundColor: '#0b0d10d0',
        padding: { x: 5, y: 2 },
        stroke: '#0b0d10',
        strokeThickness: 2,
      },
    ).setOrigin(0.5).setDepth(8);
  }

  private heroTitle(): string {
    if (this.fused) return this.finalChoice === 'tech' ? 'DEUS SUPREMO' : 'HERÓI FUNDIDO';

    return HERO_STATS[this.heroKind].name;
  }

  private buildActiveVisual(x: number, y: number): Phaser.GameObjects.Container {
    const v = this.createHeroVisual(
      this.heroKind, x, y, this.equip[this.heroKind],
    ).setDepth(7);

    if (this.fused) {
      const glow = this.add.circle(0, -2, 34, 0xfff0a0, 0.18)
        .setStrokeStyle(2, 0xffe08a, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD);

      v.addAt(glow, 0);

      this.tweens.add({
        targets: glow,
        scale: 1.25,
        alpha: 0.5,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });

      [0xe2574c, 0x7dff9a, 0xb08cff].forEach((col, i) => {
        const orb = this.add.circle((i - 1) * 16, i === 1 ? -50 : -44, 5, col, 1)
          .setStrokeStyle(1, 0xffffff, 0.9);

        v.add(orb);

        this.tweens.add({
          targets: orb,
          y: orb.y - 5,
          duration: 500 + i * 120,
          yoyo: true,
          repeat: -1,
        });
      });

      v.add(this.add.rectangle(0, -36, 22, 5, GOLD_LIGHT, 1).setStrokeStyle(1, 0x000000, 1));

      if (this.finalChoice === 'tech') {
        // Deus supremo: asas e halo divino.
        for (const sgn of [-1, 1]) {
          const wing = this.add.triangle(
            sgn * 20, -10, 0, 0, sgn * 30, -22, sgn * 24, 16, 0xffffff, 0.9,
          ).setStrokeStyle(1, 0xffe08a, 1);

          v.addAt(wing, 0);
          this.tweens.add({
            targets: wing, scaleY: 1.18, duration: 450, yoyo: true, repeat: -1,
          });
        }

        const halo = this.add.ellipse(0, -46, 26, 8, 0xfff0a0, 0.2)
          .setStrokeStyle(2, 0xfff0a0, 1)
          .setBlendMode(Phaser.BlendModes.ADD);

        v.add(halo);
      }
    }

    return v;
  }

  private createEnemyVisual(
    x: number,
    y: number,
    strong: boolean,
    family: EnemyFamily = 'beast',
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(5);
    const add = (o: Phaser.GameObjects.GameObject) => c.add(o);

    add(
      this.add.ellipse(0, 13, strong ? 52 : 36, strong ? 14 : 10, 0x0a0f0b, 0.55),
    );

    if (family === 'beast' && !strong) {
      // ---------- LOBO ----------
      const fur = 0x7a7a82;
      const dark = 0x2a2a30;

      add(this.add.ellipse(-19, -4, 18, 6, 0x6a6a72).setRotation(-0.6).setStrokeStyle(1, dark));
      add(this.add.ellipse(-22, -9, 8, 4, 0xcfcfd6).setRotation(-0.6));

      for (const lx of [-13, -6, 6, 12]) {
        add(this.add.rectangle(lx, 10, 4, 11, 0x55555c).setStrokeStyle(1, dark));
        add(this.add.rectangle(lx, 15, 6, 3, 0x2a2a30));
      }

      add(this.add.ellipse(0, 0, 38, 19, fur).setStrokeStyle(2, dark));
      add(this.add.ellipse(-4, -4, 24, 8, 0x9a9aa2, 0.85));
      add(this.add.ellipse(11, 3, 13, 12, 0x8e8e96));

      for (const sx of [-10, -4, 2, 8]) {
        add(this.add.triangle(sx, -10, -3, 4, 3, 4, 0, -5, 0x4a4a52));
      }

      add(this.add.rectangle(-2, -1, 1.5, 9, dark).setRotation(0.4));
      add(this.add.rectangle(-8, 2, 1.5, 7, dark).setRotation(0.4));

      add(this.add.ellipse(16, -8, 17, 15, fur).setStrokeStyle(2, dark));
      add(this.add.ellipse(25, -4, 12, 8, 0x6a6a72).setStrokeStyle(1, dark));
      add(this.add.circle(30, -5, 2, 0x111111));
      add(this.add.triangle(12, -18, -4, 5, 4, 5, 0, -6, 0x5a5a62).setStrokeStyle(1, dark));
      add(this.add.triangle(19, -17, -4, 5, 4, 5, 0, -6, 0x5a5a62).setStrokeStyle(1, dark));
      add(this.add.circle(20, -10, 2.4, 0xff4a2a));
      add(this.add.circle(20, -10, 5, 0xff4a2a, 0.35));
      add(this.add.triangle(27, -0.5, -1.6, -2, 1.6, -2, 0, 3, 0xffffff));
      add(this.add.triangle(23, -0.5, -1.6, -2, 1.6, -2, 0, 3, 0xffffff));
      add(this.add.rectangle(24, -2, 8, 1.2, 0x2a1a1a));
    } else if (family === 'beast') {
      // ---------- URSO ----------
      const fur = 0x6a4428;
      const dark = 0x2a1a0e;

      add(this.add.ellipse(-24, -2, 10, 10, 0x5a3820).setStrokeStyle(2, dark));
      add(this.add.ellipse(-16, 13, 15, 20, 0x4a2e1a).setStrokeStyle(2, dark));
      add(this.add.ellipse(0, 0, 54, 36, fur).setStrokeStyle(3, dark));
      add(this.add.ellipse(6, -9, 30, 22, 0x7a5030));
      add(this.add.ellipse(-6, 4, 26, 14, 0x5a3820, 0.8));

      for (const sx of [-16, -8, 0, 8, 16]) {
        add(this.add.triangle(sx, -17, -4, 5, 4, 5, 0, -7, 0x4a2e1a));
      }

      add(this.add.rectangle(-4, 0, 2, 14, dark).setRotation(0.35));
      add(this.add.rectangle(-10, 3, 2, 10, dark).setRotation(0.35));

      add(this.add.ellipse(15, 11, 14, 19, 0x5a3820).setStrokeStyle(2, dark));

      for (const cx of [10, 15, 20]) {
        add(this.add.triangle(cx, 22, -2, -4, 2, -4, 0, 4, 0xe8dcb8).setStrokeStyle(1, 0x6a5a3a));
      }

      add(this.add.ellipse(25, -8, 24, 22, 0x7a5030).setStrokeStyle(3, dark));
      add(this.add.circle(18, -20, 5, 0x5a3820).setStrokeStyle(2, dark));
      add(this.add.circle(30, -20, 5, 0x5a3820).setStrokeStyle(2, dark));
      add(this.add.circle(18, -20, 2.2, 0xc08a6a));
      add(this.add.circle(30, -20, 2.2, 0xc08a6a));
      add(this.add.ellipse(35, -4, 13, 10, 0xb08a5a).setStrokeStyle(2, dark));
      add(this.add.circle(40, -6, 2.8, 0x111111));
      add(this.add.circle(28, -12, 2.6, 0xff3a2a));
      add(this.add.circle(28, -12, 6, 0xff3a2a, 0.35));
      add(this.add.rectangle(35, -0.5, 10, 1.6, 0x2a1010));
      add(this.add.triangle(33, 2, -2, -2, 2, -2, 0, 4, 0xffffff));
      add(this.add.triangle(38, 2, -2, -2, 2, -2, 0, 4, 0xffffff));
      add(this.add.rectangle(24, -16, 2, 7, 0x2a1a0e).setRotation(0.5));
    } else if (family === 'soldier' && !strong) {
      // ---------- HOPLITA ----------
      const bronze = 0xb08a3a;
      const dark = 0x4a3a12;

      add(this.add.triangle(-6, 2, -8, -10, 6, -10, -2, 12, 0xa82a2a).setStrokeStyle(1, 0x4a1010));

      for (const lx of [-4, 5]) {
        add(this.add.rectangle(lx, 11, 6, 8, 0xd8a878).setStrokeStyle(1, 0x6a4a28));
        add(this.add.rectangle(lx, 14, 7, 6, bronze).setStrokeStyle(1, dark));
      }

      add(this.add.rectangle(0, 4, 17, 15, 0xa82a2a).setStrokeStyle(2, 0x4a1010));
      add(this.add.rectangle(0, 10, 17, 2, 0xe8c04a));
      add(this.add.rectangle(0, -3, 16, 13, bronze).setStrokeStyle(2, dark));
      add(this.add.rectangle(0, -3, 2, 11, 0x8a6a2a));
      add(this.add.rectangle(0, 3, 16, 2, 0x6a4e1a));
      add(this.add.circle(-6, -8, 4, bronze).setStrokeStyle(1, dark));
      add(this.add.circle(6, -8, 4, bronze).setStrokeStyle(1, dark));

      add(this.add.circle(0, -15, 7, 0xd8a878).setStrokeStyle(1, 0x6a4a28));
      add(this.add.ellipse(0, -18, 18, 13, bronze).setStrokeStyle(2, dark));
      add(this.add.rectangle(-7, -13, 3, 7, bronze).setStrokeStyle(1, dark));
      add(this.add.rectangle(7, -13, 3, 7, bronze).setStrokeStyle(1, dark));
      add(this.add.rectangle(4, -15, 2, 8, bronze));
      add(this.add.rectangle(3, -15, 5, 1.6, 0x14100a));
      add(this.add.circle(4, -15, 1.2, 0xffe08a));
      add(this.add.rectangle(0, -26, 4, 6, 0xb02a2a));
      add(this.add.ellipse(0, -27, 22, 6, 0xb02a2a).setStrokeStyle(1, 0x4a1010));

      add(this.add.rectangle(15, -8, 2, 40, 0x6a4e1a).setRotation(0.12));
      add(this.add.triangle(18.5, -29, -3, 6, 3, 6, 0, -7, 0xdcdcdc).setStrokeStyle(1, 0x6a6a6a));
      add(this.add.rectangle(9, 6, 2, 11, 0xd8d8d8).setRotation(-0.3));

      add(this.add.circle(-10, -1, 11, bronze).setStrokeStyle(2, dark));
      add(this.add.circle(-10, -1, 8, 0x2f5f9a).setStrokeStyle(1, 0xe8c04a));
      add(this.add.star(-10, -1, 5, 2, 4.5, 0xe8c04a));
    } else if (family === 'soldier') {
      // ---------- ESPARTANO PESADO ----------
      const bronze = 0xb08a3a;
      const dark = 0x4a3a12;

      add(this.add.triangle(-12, 4, -14, -14, 10, -14, -4, 18, 0xa82a2a).setStrokeStyle(2, 0x4a1010));
      add(this.add.triangle(-12, 8, -10, -6, 8, -6, -2, 14, 0xc23a3a));

      for (const lx of [-8, 8]) {
        add(this.add.rectangle(lx, 14, 10, 11, 0xd8a878).setStrokeStyle(1, 0x6a4a28));
        add(this.add.rectangle(lx, 18, 12, 9, bronze).setStrokeStyle(2, dark));
      }

      add(this.add.rectangle(0, 5, 26, 20, 0xa82a2a).setStrokeStyle(2, 0x4a1010));

      for (let k = -2; k <= 2; k++) {
        add(this.add.rectangle(k * 5, 12, 3, 8, 0xe8c04a));
      }

      add(this.add.rectangle(0, -5, 28, 20, bronze).setStrokeStyle(3, dark));
      add(this.add.rectangle(0, -5, 3, 18, 0x8a6a2a));

      for (const [mx, my] of [[-8, -9], [8, -9], [-8, 0], [8, 0]]) {
        add(this.add.circle(mx, my, 1.4, 0xf0d58a));
      }

      add(this.add.rectangle(0, 6, 28, 3, 0x6a4e1a).setStrokeStyle(1, dark));
      add(this.add.circle(0, 6, 3, 0xe8c04a));
      add(this.add.circle(-16, -12, 8, bronze).setStrokeStyle(2, dark));
      add(this.add.circle(16, -12, 8, bronze).setStrokeStyle(2, dark));
      add(this.add.triangle(-16, -21, -3, 5, 3, 5, 0, -6, 0xd8d8d8));
      add(this.add.triangle(16, -21, -3, 5, 3, 5, 0, -6, 0xd8d8d8));

      add(this.add.circle(0, -22, 9, 0xd8a878).setStrokeStyle(2, 0x6a4a28));
      add(this.add.ellipse(0, -26, 24, 17, bronze).setStrokeStyle(3, dark));
      add(this.add.rectangle(-9, -20, 4, 10, bronze).setStrokeStyle(1, dark));
      add(this.add.rectangle(9, -20, 4, 10, bronze).setStrokeStyle(1, dark));
      add(this.add.rectangle(5, -22, 3, 11, bronze));
      add(this.add.rectangle(3, -22, 8, 2, 0x14100a));
      add(this.add.circle(6, -22, 1.5, 0xff8a3a));
      add(this.add.ellipse(0, -37, 30, 10, 0xb02a2a).setStrokeStyle(2, 0x4a1010));
      add(this.add.rectangle(0, -34, 5, 8, 0x8a2020));
      add(this.add.ellipse(0, -40, 18, 5, 0xd03a3a));

      add(this.add.rectangle(24, -4, 3.5, 34, 0xe0e0e0).setStrokeStyle(1, 0x6a6a6a).setRotation(-0.1));
      add(this.add.rectangle(24, 12, 12, 3, bronze).setStrokeStyle(1, dark));
      add(this.add.circle(24, 16, 2.4, 0xe8c04a));

      add(this.add.rectangle(-22, 0, 17, 30, 0x2f5f9a).setStrokeStyle(3, 0xe8c04a));
      add(this.add.rectangle(-22, 0, 3, 28, 0xe8c04a));
      add(this.add.star(-22, -3, 5, 3, 7, 0xe8c04a));
      add(this.add.rectangle(-22, -14, 15, 2, 0xe8c04a));
      add(this.add.rectangle(-22, 14, 15, 2, 0xe8c04a));
    } else if (family === 'robot' && !strong) {
      // ---------- ROBÔ PEQUENO ----------
      const steel = 0x4a6680;
      const edge = 0x9ad8ff;

      add(this.add.rectangle(0, 13, 28, 7, 0x2a3846).setStrokeStyle(2, edge));

      for (const wx of [-10, 0, 10]) {
        add(this.add.circle(wx, 13, 4, 0x3a5068).setStrokeStyle(1, edge));
        add(this.add.circle(wx, 13, 1.4, 0x14202c));
      }

      add(this.add.rectangle(0, 1, 23, 19, steel).setStrokeStyle(2, edge));
      add(this.add.rectangle(0, 3, 15, 7, 0x14202c).setStrokeStyle(1, 0x3af0ff));
      add(this.add.rectangle(-4, 3, 3, 3, 0x3af0ff));
      add(this.add.rectangle(1, 3, 3, 3, 0xff4ad8));
      add(this.add.rectangle(6, 3, 3, 3, 0xffd54a));
      add(this.add.rectangle(0, -6, 23, 2, 0xffd54a));

      for (const [rx, ry] of [[-9, -7], [9, -7], [-9, 8], [9, 8]]) {
        add(this.add.circle(rx, ry, 1.2, 0xc8e8ff));
      }

      add(this.add.rectangle(-15, 2, 6, 15, 0x3a5068).setStrokeStyle(1, edge));
      add(this.add.triangle(-15, 12, -3, -2, 3, -2, 0, 4, 0xc8e8ff));
      add(this.add.rectangle(18, 1, 12, 6, 0x2a3846).setStrokeStyle(1, edge));
      add(this.add.circle(25, 1, 3, 0x3af0ff, 0.9));
      add(this.add.circle(25, 1, 6, 0x3af0ff, 0.3));

      add(this.add.rectangle(0, -15, 18, 13, 0x5a7690).setStrokeStyle(2, edge));
      add(this.add.rectangle(2, -15, 13, 6, 0x14202c).setStrokeStyle(1, 0x3af0ff));
      add(this.add.circle(6, -15, 2.6, 0x3af0ff));
      add(this.add.circle(6, -15, 6, 0x3af0ff, 0.35));
      add(this.add.rectangle(-5, -26, 1.6, 9, edge));
      add(this.add.circle(-5, -31, 2.4, 0xff4ad8));
      add(this.add.rectangle(6, -24, 5, 2, 0x2a3846));
    } else {
      // ---------- MECA PESADO ----------
      const steel = 0x3a5068;
      const edge = 0x9ad8ff;

      for (const lx of [-11, 11]) {
        add(this.add.rectangle(lx, 12, 11, 14, 0x2a3846).setStrokeStyle(2, edge));
        add(this.add.circle(lx, 8, 5, 0x4a6680).setStrokeStyle(1, edge));
        add(this.add.rectangle(lx, 21, 16, 6, 0x1c2a38).setStrokeStyle(2, edge));
      }

      add(this.add.rectangle(0, -2, 36, 30, steel).setStrokeStyle(3, edge));
      add(this.add.rectangle(0, -2, 22, 18, 0x14202c).setStrokeStyle(2, 0x3af0ff));
      add(this.add.circle(0, -2, 8, 0x3af0ff, 0.9).setStrokeStyle(2, 0xffffff));
      add(this.add.circle(0, -2, 15, 0x3af0ff, 0.25));

      for (let k = -2; k <= 2; k++) {
        add(this.add.rectangle(k * 6, 11, 4, 6, k % 2 ? 0xffd54a : 0x1a1a1a));
      }

      for (const [rx, ry] of [[-14, -12], [14, -12], [-14, 8], [14, 8]]) {
        add(this.add.circle(rx, ry, 1.6, 0xc8e8ff));
      }

      add(this.add.rectangle(-14, -20, 5, 10, 0x2a3846).setStrokeStyle(1, edge));
      add(this.add.rectangle(-14, -27, 7, 4, 0x6a6e72));
      add(this.add.circle(-14, -31, 3, 0xff4ad8, 0.6));

      add(this.add.rectangle(-24, -4, 10, 18, 0x4a6680).setStrokeStyle(2, edge));
      add(this.add.triangle(-24, 10, -4, -2, 4, -2, 0, 6, 0xc8e8ff));
      add(this.add.rectangle(26, -6, 16, 9, 0x2a3846).setStrokeStyle(2, edge));
      add(this.add.rectangle(36, -6, 10, 5, 0x1c2a38).setStrokeStyle(1, edge));
      add(this.add.circle(41, -6, 4, 0x3af0ff, 0.9));
      add(this.add.circle(41, -6, 8, 0x3af0ff, 0.3));

      add(this.add.rectangle(0, -22, 20, 13, 0x4a6680).setStrokeStyle(2, edge));
      add(this.add.rectangle(2, -22, 15, 6, 0x14202c).setStrokeStyle(1, 0x3af0ff));
      add(this.add.circle(7, -22, 3, 0xff4a4a));
      add(this.add.circle(7, -22, 7, 0xff4a4a, 0.35));
      add(this.add.rectangle(-6, -33, 1.8, 11, edge));
      add(this.add.rectangle(6, -33, 1.8, 9, edge));
      add(this.add.circle(-6, -39, 2.6, 0xff4ad8));
      add(this.add.circle(6, -37, 2.2, 0x3af0ff));
    }

    return c;
  }

  private enemyFamily(): EnemyFamily {
    const theme = this.worldTheme();

    if (theme === 'primitive') return 'beast';
    if (theme === 'greece') return 'soldier';
    if (theme === 'tech') return 'robot';

    // Mundo real: mistura dos três.
    this.spawnSeq++;

    const mix: EnemyFamily[] = ['beast', 'soldier', 'robot'];
    return mix[this.spawnSeq % 3];
  }

  // ==================================================
  // INTERFACE PRINCIPAL
  // ==================================================

  private createInterface() {
    const ui = this.add.graphics().setDepth(20);

    // ---------- HUD SUPERIOR ----------
    this.fillVGradient(ui, 0, 0, WIDTH, 150, 0x15191e, 0x07090b, 1, 3);
    this.fillVGradient(ui, 0, 0, WIDTH, 36, 0x3a2d17, 0x17110a, 1, 2);

    ui.fillStyle(GOLD_DARK, 1);
    ui.fillRect(0, 36, WIDTH, 3);
    ui.fillStyle(GOLD, 1);
    ui.fillRect(0, 36, WIDTH, 1);

    ui.fillStyle(GOLD_DARK, 1);
    ui.fillRect(0, 147, WIDTH, 3);
    ui.fillStyle(GOLD, 1);
    ui.fillRect(0, 147, WIDTH, 1);

    // Plaqueta da onda
    this.drawBarPlate(ui, 470, 5, 122, 26);
    this.drawGem(ui, 478, 18, 3, GOLD_LIGHT);
    this.drawGem(ui, 584, 18, 3, GOLD_LIGHT);

    // Placas dos recursos
    this.drawBarPlate(ui, 8, 44, 112, 20);
    this.drawBarPlate(ui, 128, 44, 232, 20);
    this.drawBarPlate(ui, 368, 44, 224, 20);
    this.drawBarPlate(ui, 8, 70, 290, 20);
    this.drawBarPlate(ui, 306, 70, 244, 20);

    // Moeda
    ui.fillStyle(0x7a5a14, 1);
    ui.fillCircle(22, 54, 8);
    ui.fillStyle(0xf2c94c, 1);
    ui.fillCircle(22, 54, 6.5);
    ui.lineStyle(1, 0x7a5a14, 1);
    ui.strokeCircle(22, 54, 4);
    ui.fillStyle(0xfff0a0, 0.8);
    ui.fillCircle(20, 52, 1.8);

    // Emblema de nível do herói
    ui.fillStyle(GOLD_DARK, 1);
    ui.fillCircle(572, 80, 17);
    ui.fillStyle(0x16100a, 1);
    ui.fillCircle(572, 80, 14);
    ui.lineStyle(2, GOLD, 1);
    ui.strokeCircle(572, 80, 14);
    this.drawGem(ui, 572, 62, 3, GOLD_LIGHT);
    this.bake(ui, 'ui_top', 20);

    this.add.text(14, 1, 'TOWERCRAFT', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#f0d58a',
      fontStyle: 'bold',
      stroke: '#1a1006',
      strokeThickness: 4,
    }).setDepth(21);

    this.add.text(16, 26, 'ASSAHI GAME STUDIOS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '8px',
      color: '#b39a62',
      letterSpacing: 2,
    }).setDepth(21);

    this.waveText = this.add.text(531, 18, 'ONDA 0', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#f0d58a',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(22);

    this.coinText = this.add.text(36, 54, '0', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#ffe08a',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(22);

    const barStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    };

    this.baseText = this.add.text(244, 54, '', barStyle)
      .setOrigin(0.5).setDepth(22);

    this.enemyText = this.add.text(480, 54, '', {
      ...barStyle,
      color: '#e8d9b0',
    }).setOrigin(0.5).setDepth(22);

    this.manaText = this.add.text(153, 80, '', barStyle)
      .setOrigin(0.5).setDepth(22);

    this.xpText = this.add.text(428, 80, '', barStyle)
      .setOrigin(0.5).setDepth(22);

    this.levelText = this.add.text(572, 80, '1', {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#f0d58a',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(22);

    this.barGraphics = this.add.graphics().setDepth(21);

    this.buildButton = this.makeButton(
      8, 104, 'TORRES  +', '#2d5a80',
      () => this.toggleTowerMenu(), 12, 188, 36,
    );

    this.heroButton = this.makeButton(
      206, 104, 'LOJA', '#5e4482',
      () => this.openHeroPanel(), 11, 188, 36,
    );

    this.waveButton = this.makeButton(
      404, 104, 'INICIAR ONDAS  +', '#8a3a2c',
      () => this.startWave(), 12, 188, 36,
    );

    this.buildInfoText = this.add.text(12, 158, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#fff1cc',
      backgroundColor: '#0b0d10e8',
      padding: { x: 8, y: 6 },
      stroke: '#0b0d10',
      strokeThickness: 2,
    }).setDepth(19).setVisible(false);

    this.buildExitText = this.add.text(588, 158, '  X  SAIR  ', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#a33a30',
      padding: { x: 6, y: 6 },
    }).setOrigin(1, 0).setDepth(19).setVisible(false);

    // ESC também encerra a construção.
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.buildMode) this.exitBuild('Construção encerrada.');
    });

    // ---------- HUD INFERIOR ----------
    const bar = this.add.graphics().setDepth(18);

    this.fillVGradient(bar, 0, 825, WIDTH, 175, 0x15191e, 0x07090a, 1, 3);

    bar.fillStyle(GOLD_DARK, 1);
    bar.fillRect(0, 825, WIDTH, 3);
    bar.fillStyle(GOLD, 1);
    bar.fillRect(0, 825, WIDTH, 1);

    // Placa do joystick
    this.drawPanelFrame(bar, 6, 836, 160, 158);

    // Painel de registro (visível quando nenhum menu está aberto)
    this.drawPanelFrame(bar, 175, 837, 415, 150, 8);
    this.fillVGradient(bar, 180, 841, 405, 22, 0x3a2e18, 0x1a150b, 1, 2);
    bar.lineStyle(1, GOLD, 0.8);
    bar.lineBetween(180, 863, 585, 863);
    this.bake(bar, 'ui_bottom', 18);

    this.add.text(190, 845, 'REGISTRO DE BATALHA', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#f0d58a',
      fontStyle: 'bold',
    }).setDepth(19);

    this.messageText = this.add.text(190, 874, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#efe6cc',
      wordWrap: { width: 385 },
      lineSpacing: 4,
    }).setDepth(19);

    this.rangeGraphics = this.add.graphics().setDepth(4);
    this.buildPreview = this.add.graphics().setDepth(14).setVisible(false);

    // Joystick ornamentado
    const jc = this.joystickCenter;
    const decor = this.add.graphics().setDepth(19);

    decor.lineStyle(2, GOLD_DARK, 1);
    decor.strokeCircle(jc.x, jc.y, 57);
    decor.lineStyle(1, GOLD, 0.8);
    decor.strokeCircle(jc.x, jc.y, 54);

    for (let a = 0; a < 360; a += 15) {
      const rad = Phaser.Math.DegToRad(a);

      decor.lineStyle(1, GOLD, 0.6);
      decor.lineBetween(
        jc.x + Math.cos(rad) * 51, jc.y + Math.sin(rad) * 51,
        jc.x + Math.cos(rad) * 54, jc.y + Math.sin(rad) * 54,
      );
    }

    this.drawGem(decor, jc.x, jc.y - 56, 4, GOLD_LIGHT);
    this.drawGem(decor, jc.x, jc.y + 56, 4, GOLD);
    this.drawGem(decor, jc.x - 56, jc.y, 4, GOLD);
    this.drawGem(decor, jc.x + 56, jc.y, 4, GOLD);

    this.joystickBase = this.add.circle(
      jc.x, jc.y, 46, 0x0c0f12, 0.92,
    ).setStrokeStyle(3, GOLD).setDepth(20);

    this.joystickKnob = this.add.circle(
      jc.x, jc.y, 22, 0x6f8f62, 0.98,
    ).setStrokeStyle(3, GOLD_LIGHT).setDepth(21);

    this.joystickShine = this.add.circle(
      jc.x - 6, jc.y - 7, 8, 0xffffff, 0.3,
    ).setDepth(22);

    this.add.text(jc.x, 966, 'MOVER', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#f0d58a',
      fontStyle: 'bold',
      stroke: '#0b0d10',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21);
  }

  private showMessage(message: string) {
    this.messageText.setText(message);
  }

  // ==================================================
  // MENUS CONTEXTUAIS
  // ==================================================

  private clearContextMenu() {
    for (const object of this.contextObjects) {
      if (object.active) object.destroy();
    }

    this.contextObjects = [];
    this.contextPanel = undefined;
    this.contextTitle = undefined;
  }

  private addContextButton(
    x: number,
    y: number,
    label: string,
    color: string,
    action: () => void,
    width = 185,
    height = 24,
  ) {
    const button = this.makeButton(
      x, y, label, color, action, 10, width, height,
    );

    button.setDepth(32);
    this.contextObjects.push(button);
    return button;
  }

  private openContextPanel(title: string, height: number) {
    this.clearContextMenu();

    const panel = this.add.graphics().setDepth(29);

    this.drawPanelFrame(panel, 175, 837, 415, height, 8);
    this.fillVGradient(panel, 180, 841, 405, 22, 0x3a2e18, 0x1a150b, 1, 2);
    panel.lineStyle(1, GOLD, 0.8);
    panel.lineBetween(180, 863, 585, 863);

    this.contextPanel = panel;
    this.contextObjects.push(panel);

    const heading = this.add.text(190, 845, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#f0d58a',
      fontStyle: 'bold',
    }).setDepth(33);

    this.contextTitle = heading;
    this.contextObjects.push(heading);

    const close = this.makeButton(
      548, 843, 'X', '#7a352c',
      () => this.closeContextMenu(), 10, 32, 17,
    );

    close.setDepth(34);
    this.contextObjects.push(close);
  }

  private closeContextMenu() {
    this.clearContextMenu();
    this.pendingBuild = null;
    this.towerMenuOpen = false;
  }

  private toggleTowerMenu() {
    if (this.finalChoice === 'tech') {
      this.showMessage('No Mundo Tecnológico os heróis dispensam torres.');
      return;
    }

    if (this.towerMenuOpen) {
      this.closeContextMenu();
      return;
    }

    this.cancelBuild();
    this.selectedTower = null;
    this.rangeGraphics.clear();
    this.towerMenuOpen = true;

    this.openContextPanel('ESCOLHA UMA TORRE PARA CONSTRUIR', 150);

    const kinds: TowerKind[] = ['basic', 'rapid', 'sniper'];
    const xs = [187, 316, 450];
    const widths = [120, 125, 125];
    const colors = ['#2d5a80', '#2f6140', '#63457f'];

    kinds.forEach((k, i) => {
      const st = TOWER_STATS[k];
      const label = this.stock[k] > 0
        ? `${st.name} · x${this.stock[k]}`
        : `${st.name} · ${st.cost}`;

      this.addContextButton(
        xs[i], 876, label, colors[i],
        () => this.beginBuild(k), widths[i], 30,
      );
    });

    const help = this.add.text(
      188, 918,
      'Escolha uma torre e toque em um espaço livre do mapa.',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#d9d0b7',
        wordWrap: { width: 380 },
      },
    ).setDepth(33);

    this.contextObjects.push(help);
  }

  private drawSkillGlyph(g: Phaser.GameObjects.Graphics, skill: SkillKind) {
    if (skill === 'explosion') {
      const pts: Phaser.Types.Math.Vector2Like[] = [];

      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? 6 : 13;
        const a = (Math.PI * 2 * i) / 16 - Math.PI / 2;
        pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }

      g.fillStyle(0xffa23a, 1);
      g.fillPoints(pts, true);
      g.fillStyle(0xfff0a0, 1);
      g.fillCircle(0, 0, 4);
    } else if (skill === 'repair') {
      g.fillStyle(0x0c2b16, 1);
      g.fillRect(-5, -12, 10, 24);
      g.fillRect(-12, -5, 24, 10);
      g.fillStyle(0x6fe08f, 1);
      g.fillRect(-3, -10, 6, 20);
      g.fillRect(-10, -3, 20, 6);
    } else if (skill === 'strike') {
      g.lineStyle(5, 0x4a5258, 1);
      g.lineBetween(-8, 8, 10, -10);
      g.lineStyle(3, 0xe8eef2, 1);
      g.lineBetween(-8, 8, 10, -10);
      g.lineStyle(3, GOLD, 1);
      g.lineBetween(-8, -2, 2, 8);
      g.lineStyle(3, 0x8b5a2b, 1);
      g.lineBetween(-9, 9, -13, 13);
    } else if (skill === 'aura') {
      g.lineStyle(3, GOLD_LIGHT, 1);
      g.strokeCircle(0, 0, 11);
      g.lineStyle(1, GOLD_LIGHT, 0.8);
      g.strokeCircle(0, 0, 14);
      g.fillStyle(GOLD_LIGHT, 1);
      g.fillCircle(0, 0, 4);

      for (let a = 0; a < 360; a += 45) {
        const rad = Phaser.Math.DegToRad(a);
        g.lineBetween(
          Math.cos(rad) * 6, Math.sin(rad) * 6,
          Math.cos(rad) * 10, Math.sin(rad) * 10,
        );
      }
    } else if (skill === 'clones') {
      for (const dx of [-6, 6]) {
        g.fillStyle(0x9fe8ff, 1);
        g.fillCircle(dx, -6, 4);
        g.fillRect(dx - 4, -2, 8, 11);
        g.fillStyle(0x2a6a7a, 1);
        g.fillRect(dx - 4, 9, 3, 5);
        g.fillRect(dx + 1, 9, 3, 5);
      }
    } else {
      const pts: Phaser.Types.Math.Vector2Like[] = [
        { x: -3, y: -14 }, { x: 7, y: -14 }, { x: 1, y: -4 },
        { x: 8, y: -4 }, { x: -6, y: 14 }, { x: -1, y: 1 },
        { x: -8, y: 1 },
      ];

      g.fillStyle(0xd7c2ff, 1);
      g.fillPoints(pts, true);
      g.lineStyle(2, 0x8a62ff, 1);
      g.strokePoints(pts, true);
    }
  }

  private makeSkillIcon(
    cx: number,
    cy: number,
    skill: SkillKind,
    rank: number,
    action: () => void,
  ): Phaser.GameObjects.Container {
    const size = 34;

    const bgColors: Record<SkillKind, number> = {
      explosion: 0x5a2a12,
      repair: 0x174a2a,
      strike: 0x4a3a12,
      aura: 0x5a4510,
      clones: 0x17484a,
      lightning: 0x3a2a66,
    };

    const c = this.add.container(cx, cy).setDepth(33);
    const g = this.add.graphics();

    g.fillStyle(0x000000, 0.6);
    g.fillRect(-size / 2 + 1, -size / 2 + 2, size, size);

    this.fillVGradient(
      g, -size / 2, -size / 2, size, size,
      this.lerpColor(bgColors[skill], 0xffffff, 0.2),
      bgColors[skill], 1, 2,
    );

    this.drawSkillGlyph(g, skill);

    if (rank === 0) {
      g.fillStyle(0x000000, 0.55);
      g.fillRect(-size / 2, -size / 2, size, size);
    }

    g.lineStyle(2, 0x0a0a0a, 1);
    g.strokeRect(-size / 2, -size / 2, size, size);
    g.lineStyle(1, rank > 0 ? GOLD_LIGHT : 0x6a6250, 1);
    g.strokeRect(-size / 2 + 1.5, -size / 2 + 1.5, size - 3, size - 3);

    c.add(g);
    c.setSize(size, size);
    c.setInteractive({ useHandCursor: true });

    c.on('pointerdown', () => {
      if (this.gameOver) return;
      action();
    });

    return c;
  }

  private openHeroMenu() {
    if (this.gameOver) return;

    if (this.heroDead) {
      this.openReviveModal();
      return;
    }

    this.cancelBuild();
    this.selectedTower = null;
    this.rangeGraphics.clear();
    this.towerMenuOpen = false;

    this.openContextPanel(
      `${this.heroTitle()} · NÍVEL ${this.heroLevel} · PONTOS: ${this.skillPoints}`,
      150,
    );

    const skills = this.heroSkills();

    const xPositions = [187, 286, 385, 484];

    skills.forEach((skill, i) => {
      const x = xPositions[i];
      const info = this.skillMeta(skill);
      const rank = this.rankOf(skill);
      const rawRank = this.skillLevels[this.rankKey(skill)];

      this.contextObjects.push(
        this.makeSkillIcon(x + 17, 886, skill, skill === 'aura' ? 1 : rank, () => this.useSkill(skill)),
      );

      const name = this.add.text(
        x + 40, 868, info.name.replace(' ', '\n'),
        {
          fontFamily: 'Georgia, serif',
          fontSize: '9px',
          color: '#f0d58a',
          fontStyle: 'bold',
          wordWrap: { width: 56 },
        },
      ).setDepth(33);

      this.contextObjects.push(name);

      const pips = this.add.graphics().setDepth(33);

      for (let p = 0; p < 5; p++) {
        pips.fillStyle(p < rawRank ? GOLD_LIGHT : 0x23262a, 1);
        pips.fillRect(x + 40 + p * 10, 893, 8, 5);
        pips.lineStyle(1, 0x000000, 1);
        pips.strokeRect(x + 40 + p * 10, 893, 8, 5);
      }

      this.contextObjects.push(pips);

      const canUpgrade =
        this.skillPoints > 0 &&
        rawRank < 5 &&
        this.heroLevel >= (rawRank + 2);

      this.addContextButton(
        x, 906,
        canUpgrade ? 'MELHORAR  +' : 'SEM MELHORIA',
        canUpgrade ? '#7a5a29' : '#2b302b',
        () => this.upgradeSkill(skill),
        96, 20,
      );

      const description = this.add.text(
        x, 930,
        `${info.mana > 0 ? info.mana + ' mana' : 'PASSIVA'}\n${info.description}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '8px',
          color: '#e0dac8',
          wordWrap: { width: 93 },
          lineSpacing: 2,
        },
      ).setDepth(33);

      this.contextObjects.push(description);
    });

    const note = this.add.text(
      188, 971,
      '* A melhoria consome 1 ponto de habilidade obtido ao subir de nível.',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '8px',
        color: '#d6c59b',
      },
    ).setDepth(33);

    this.contextObjects.push(note);
  }

  // Os pontos de habilidade são compartilhados por todos os heróis:
  // trocar de herói NUNCA exige melhorar de novo. O poder único (explosão,
  // clones ou raios) usa a mesma pontuação em qualquer herói.
  private rankKey(skill: SkillKind): SkillKind {
    return skill === 'clones' || skill === 'lightning' ? 'explosion' : skill;
  }

  private rankOf(skill: SkillKind): number {
    const raw = this.skillLevels[this.rankKey(skill)];

    if (this.finalChoice === 'tech' && skill !== 'aura') return 5;

    if (this.fused && skill !== 'aura') return Math.min(5, raw + 1);

    return raw;
  }

  private skillMeta(skill: SkillKind): { name: string; description: string; mana: number } {
    if (skill === 'strike') {
      return this.fused ? STRIKE_INFO.fused : STRIKE_INFO[this.heroKind];
    }

    if (skill === 'aura') {
      return {
        name: 'AURA',
        description: this.fused
          ? 'Passiva: reforça TODAS as torres (x1,5).'
          : `Passiva: reforça só as torres ${TOWER_STATS[HERO_STATS[this.heroKind].specialty].name}.`,
        mana: 0,
      };
    }

    return SKILL_INFO[skill];
  }

  private powerMult(): number {
    return (this.fused ? 1.5 : 1) * (this.finalChoice === 'tech' ? 200 : 1);
  }

  private upgradeSkill(rawSkill: SkillKind) {
    const skill = this.rankKey(rawSkill);
    const rank = this.skillLevels[skill];

    if (rank >= 5) {
      this.showMessage('Esta habilidade já atingiu o nível máximo.');
      return;
    }

    if (this.skillPoints < 1) {
      this.showMessage('Você precisa evoluir de nível para ganhar um ponto de habilidade.');
      return;
    }

    if (this.heroLevel < rank + 2) {
      this.showMessage(`Essa melhoria requer herói no nível ${rank + 2}.`);
      return;
    }

    this.skillPoints--;
    this.skillLevels[skill]++;

    this.showMessage(
      `${this.skillMeta(rawSkill).name} melhorada para o nível ${this.skillLevels[skill]}.`,
    );

    this.openHeroMenu();
    this.refreshInterface();
  }

  private openTowerMenu(tower: Tower) {
    this.cancelBuild();
    this.towerMenuOpen = false;
    this.selectedTower = tower;
    this.drawSelectedRange();

    this.openContextPanel(
      `${TOWER_STATS[tower.kind].name} · NÍVEL ${tower.level}`,
      150,
    );

    const sellValue = Math.floor(tower.totalInvested * 0.7);
    const upgradeCost = 60 * tower.level;

    const info = this.add.text(
      188, 870,
      `Dano: ${tower.damage}  |  Alcance: ${Math.round(tower.range)}  |  Intervalo: ${Math.round(tower.fireRate)} ms\n` +
      `Vida: ${Math.ceil(tower.hp)}/${tower.maxHp}  |  Investido: ${tower.totalInvested} moedas`,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#e6dfcd',
        lineSpacing: 5,
      },
    ).setDepth(33);

    this.contextObjects.push(info);

    this.addContextButton(
      188, 912,
      tower.level >= 5 ? 'NÍVEL MÁXIMO' : `MELHORAR · ${upgradeCost}`,
      tower.level >= 5 ? '#2b302b' : '#69502e',
      () => this.upgradeTower(tower),
      185, 28,
    );

    this.addContextButton(
      382, 912,
      `VENDER · +${sellValue}`,
      '#813c30',
      () => this.sellTower(tower),
      190, 28,
    );

    const hint = this.add.text(
      188, 950,
      `${this.towerPowerText(tower)}\nA venda devolve 70% do valor investido.`,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        color: '#d8c9a5',
      },
    ).setDepth(33);

    this.contextObjects.push(hint);
  }

  private selectElementAt(x: number, y: number) {
    // Tocar no herói abre o menu de habilidades (embaixo).
    if (
      Phaser.Math.Distance.Between(x, y, this.hero.x, this.hero.y) < 30
    ) {
      this.openHeroMenu();
      return;
    }

    let nearest: Tower | null = null;
    let closest = 38;

    for (const tower of this.towers) {
      const distance = Phaser.Math.Distance.Between(
        x, y, tower.body.x, tower.body.y,
      );

      if (distance < closest) {
        closest = distance;
        nearest = tower;
      }
    }

    if (nearest) {
      this.openTowerMenu(nearest);
      return;
    }

    this.closeContextMenu();
    this.selectedTower = null;
    this.rangeGraphics.clear();
  }

  // ==================================================
  // CONSTRUÇÃO E ESPAÇO PARA TORRES
  // ==================================================

  private beginBuild(kind: TowerKind) {
    if (this.gameOver) return;

    if (this.finalChoice === 'tech') {
      this.showMessage('No Mundo Tecnológico os heróis dispensam torres.');
      return;
    }

    this.closeContextMenu();
    this.selectedTowerKind = kind;
    this.buildMode = true;
    this.selectedTower = null;
    this.rangeGraphics.clear();

    const stats = TOWER_STATS[kind];

    this.buildInfoText.setText(
      `${stats.name} | Dano ${stats.damage} | Alcance ${stats.range} | ${stats.cost} moedas\n` +
      'Verde = posição válida. Toque no terreno para construir.',
    );

    this.buildInfoText.setVisible(true);
    this.buildExitText.setVisible(true);
    this.buildPreview.setVisible(true);

    const pointer = this.input.activePointer;
    this.updateBuildPreview(pointer.x, pointer.y);

    this.showMessage(
      `Posicione a ${stats.name}. Você pode construir várias torres Arcanas.`,
    );

    this.refreshInterface();
  }

  private cancelBuild() {
    this.buildMode = false;
    this.pendingBuild = null;
    this.buildPreview.clear();
    this.buildPreview.setVisible(false);
    this.buildInfoText.setVisible(false);
    this.buildExitText.setVisible(false);
  }

  // Sai do modo de construção: some a sombra e não constrói mais.
  private exitBuild(msg?: string) {
    this.cancelBuild();
    this.closeContextMenu();
    this.refreshInterface();

    if (msg) this.showMessage(msg);
  }

  private updateBuildPreview(x: number, y: number) {
    if (!this.buildMode) return;

    const stats = TOWER_STATS[this.selectedTowerKind];
    const valid = this.isValidBuildLocation(x, y, this.selectedTowerKind);

    this.buildPreview.clear();

    this.buildPreview.fillStyle(valid ? 0x73e39a : 0xf16e65, 0.10);
    this.buildPreview.fillCircle(x, y, stats.range);

    this.buildPreview.lineStyle(2, valid ? 0x8bffad : 0xff776b, 0.9);
    this.buildPreview.strokeCircle(x, y, stats.range);

    this.buildPreview.fillStyle(valid ? 0x73e39a : 0xf16e65, 0.22);
    this.buildPreview.fillCircle(x, y, 23);

    this.buildPreview.lineStyle(2, valid ? 0x9effba : 0xff968d, 1);
    this.buildPreview.strokeCircle(x, y, 23);

    for (let a = 0; a < 360; a += 30) {
      const rad = Phaser.Math.DegToRad(a);
      const inner = stats.range - 5;
      const outer = stats.range + 2;

      this.buildPreview.lineStyle(
        2, valid ? 0xa8f6bd : 0xffa09a, 0.65,
      );

      this.buildPreview.beginPath();
      this.buildPreview.moveTo(
        x + Math.cos(rad) * inner,
        y + Math.sin(rad) * inner,
      );
      this.buildPreview.lineTo(
        x + Math.cos(rad) * outer,
        y + Math.sin(rad) * outer,
      );
      this.buildPreview.strokePath();
    }

    this.buildPreview.setDepth(14);
  }

  private isValidBuildLocation(
    x: number,
    y: number,
    kind: TowerKind,
  ): boolean {
    const stats = TOWER_STATS[kind];

    if (this.coins < stats.cost && this.stock[kind] <= 0) return false;

    // Área de construção ampliada.
    if (x < 22 || x > WIDTH - 22) return false;
    if (y < 175 || y > 780) return false;

    // Pode construir no caminho, mas não em cima da entrada dos monstros.
    if (Phaser.Math.Distance.Between(x, y, ENTRY.x, ENTRY.y) < 60) return false;

    // Espaçamento menor entre torres, sem impedir várias Arcanas.
    return !this.towers.some(t =>
      Phaser.Math.Distance.Between(
        x, y, t.body.x, t.body.y,
      ) < 36,
    );
  }

  // Toque no mapa: fixa a sombra no local e pergunta antes de construir.
  private askBuild(x: number, y: number) {
    if (!this.buildMode) return;

    const kind = this.selectedTowerKind;
    const stats = TOWER_STATS[kind];

    if (this.coins < stats.cost && this.stock[kind] <= 0) {
      this.exitBuild('Moedas insuficientes para construir esta torre.');
      return;
    }

    if (!this.isValidBuildLocation(x, y, kind)) {
      this.exitBuild(
        'Local inválido: construção encerrada. Escolha a torre de novo para construir.',
      );
      return;
    }

    this.pendingBuild = { x, y };
    this.updateBuildPreview(x, y);

    this.openContextPanel(`CONSTRUIR ${stats.name} NESTE LOCAL?`, 80);
    // openContextPanel limpa o menu, mas não deve perder o local escolhido.
    this.pendingBuild = { x, y };

    const price = this.stock[kind] > 0 ? 'do estoque' : `${stats.cost} moedas`;

    this.addContextButton(
      187, 876, `CONSTRUIR · ${price}`, '#2f6140',
      () => {
        const p = this.pendingBuild;
        if (p) this.placeTower(p.x, p.y);
      },
      200, 30,
    );

    this.addContextButton(
      398, 876, 'CANCELAR', '#7a352c',
      () => this.exitBuild('Construção cancelada.'),
      150, 30,
    );
  }

  private placeTower(x: number, y: number) {
    if (!this.buildMode) return;

    const kind = this.selectedTowerKind;
    const stats = TOWER_STATS[kind];

    if (this.coins < stats.cost && this.stock[kind] <= 0) {
      this.showMessage('Moedas insuficientes para construir esta torre.');
      return;
    }

    if (!this.isValidBuildLocation(x, y, kind)) {
      this.showMessage(
        'Local inválido: perto demais de outra torre ou da entrada dos monstros.',
      );
      this.updateBuildPreview(x, y);
      return;
    }

    const visual = this.createTowerVisual(x, y, kind, this.worldTheme());
    const body = this.add.circle(x, y, 18, 0x000000, 0)
      .setStrokeStyle(0, 0x000000, 0);

    const tower: Tower = {
      body,
      visual,
      level: 1,
      cooldown: 0,
      range: stats.range,
      kind,
      damage: stats.damage,
      fireRate: stats.fireRate,
      cost: stats.cost,
      totalInvested: stats.cost,
      auraUntil: 0,
      hp: towerMaxHp(1),
      maxHp: towerMaxHp(1),
      hitAt: 0,
      streak: 0,
      lastShotAt: 0,
    };

    this.towers.push(tower);

    if (this.stock[kind] > 0) {
      this.stock[kind]--;
    } else {
      this.coins -= stats.cost;
    }

    // Efeito de construção
    const ring = this.add.circle(x, y, 10, stats.color, 0.5)
      .setStrokeStyle(3, GOLD_LIGHT, 0.9)
      .setDepth(13);

    this.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 450,
      onComplete: () => ring.destroy(),
    });

    // Continua em modo de construção: a sombra segue o dedo para a próxima.
    this.closeContextMenu();

    const canAgain = this.coins >= stats.cost || this.stock[kind] > 0;

    if (canAgain) {
      const pointer = this.input.activePointer;
      this.updateBuildPreview(pointer.x, pointer.y);

      this.showMessage(
        `${stats.name} construída! Toque em outro local para construir mais, ou em X SAIR / ESC para encerrar.`,
      );
    } else {
      this.cancelBuild();
      this.showMessage(`${stats.name} construída! Moedas acabaram.`);
    }

    this.refreshInterface();
  }

  private upgradeTower(tower: Tower | null = this.selectedTower) {
    if (this.gameOver) return;

    if (!tower || !this.towers.includes(tower)) {
      this.showMessage('Selecione uma torre para melhorá-la.');
      return;
    }

    if (tower.level >= 5) {
      this.showMessage('Esta torre já atingiu o nível máximo.');
      return;
    }

    const cost = 60 * tower.level;

    if (this.coins < cost) {
      this.showMessage(`Você precisa de ${cost} moedas para melhorar.`);
      return;
    }

    this.coins -= cost;
    tower.totalInvested += cost;
    tower.level++;

    tower.range += tower.kind === 'sniper' ? 25 : 20;
    tower.damage += tower.kind === 'rapid' ? 1 : 2;
    tower.fireRate = Math.max(120, tower.fireRate * 0.92);

    tower.visual.setScale(1 + (tower.level - 1) * 0.055);
    tower.maxHp = towerMaxHp(tower.level);
    tower.hp = Math.min(tower.maxHp, tower.hp + 250);

    if (tower.level === 5) {
      const crown = this.add.circle(0, 2, 25, 0xffd54a, 0.12)
        .setStrokeStyle(3, GOLD_LIGHT, 0.95);

      tower.visual.add(crown);

      this.floatText(
        tower.body.x, tower.body.y - 52, 'PODER MÁXIMO!', '#ffe08a', 12,
      );
    }

    const levelText = tower.visual.getData(
      'levelText',
    ) as Phaser.GameObjects.Text;

    if (levelText) {
      levelText.setText(['I', 'II', 'III', 'IV', 'V'][tower.level - 1]);
    }

    const ring = this.add.circle(
      tower.body.x, tower.body.y, 12, GOLD_LIGHT, 0.35,
    ).setStrokeStyle(2, GOLD_LIGHT, 1).setDepth(13);

    this.tweens.add({
      targets: ring,
      scale: 3.2,
      alpha: 0,
      duration: 420,
      onComplete: () => ring.destroy(),
    });

    this.floatText(
      tower.body.x, tower.body.y - 34, 'MELHORADA!', '#f0d58a', 11,
    );

    this.showMessage(
      `Torre melhorada para o nível ${tower.level}!`,
    );

    this.openTowerMenu(tower);
    this.refreshInterface();
  }

  private sellTower(tower: Tower) {
    if (!this.towers.includes(tower)) return;

    const refund = Math.floor(tower.totalInvested * 0.7);

    this.coins += refund;
    this.floatText(
      tower.body.x, tower.body.y - 20, `+${refund}`, '#ffd54a', 14,
    );

        tower.body.destroy();
    this.killVisual(tower.visual);

    this.towers = this.towers.filter(t => t !== tower);

    this.selectedTower = null;
    this.rangeGraphics.clear();
    this.closeContextMenu();

    this.showMessage(
      `Torre vendida por ${refund} moedas. Foram devolvidos 70% do investimento.`,
    );

    this.refreshInterface();
  }

  // ==================================================
  // ONDAS E INIMIGOS
  // ==================================================

  private startWave() {
    if (this.gameOver || this.modalOpen) return;

    const next = this.wave + 1;

    if (next > MAX_WAVES) {
      this.showMessage('Todas as 100 ondas já foram iniciadas.');
      return;
    }

    // Portões de mundo: pode melhorar o mundo ou continuar no atual
    // (com monstros mais rápidos) até juntar moedas.
    const up = this.nextUpgrade();

    // A pergunta volta a cada onda, até o jogador conseguir pagar.
    if (up !== null && next >= this.gateWave(up) && this.skipGateWave !== next) {
      this.openUpgrade(up, true);
      return;
    }

    this.closeContextMenu();
    this.wave = next;

    const waveId = next;
    const queue = this.buildWave(waveId);

    this.activeWaves.set(waveId, { queue, spawningFinished: false });
    this.showMessage(this.waveAnnouncement(waveId, queue));

    const spawnNext = () => {
      if (this.gameOver) return;

      const state = this.activeWaves.get(waveId);
      if (!state) return;

      const spec = state.queue.shift();

      if (!spec) {
        state.spawningFinished = true;
        return;
      }

      this.spawnEnemy(waveId, spec);
      this.time.delayedCall(500, spawnNext);
    };

    spawnNext();
    this.refreshInterface();
  }

  private spawnEnemy(waveId: number, spec: SpawnSpec) {
    const type = ENEMY_TYPES[spec.kind];
    const tier = spec.tier;
    const strong = tier !== 'normal' || waveId % 3 === 0;

    let route = spec.route;

    if (!route) {
      route = this.nextRoute;
      this.nextRoute = route === 'left' ? 'right' : 'left';
    }

    const path = route === 'left' ? LEFT_PATH : RIGHT_PATH;
    const start = path[0];

    const tierSize = tier === 'boss' ? 1.9 : tier === 'elite' ? 1.35 : 1;
    const size = tierSize * type.size;
    const hpTier = tier === 'boss' ? 30 : tier === 'elite' ? 7 : 1;
    const rewardTier = tier === 'boss' ? 30 : tier === 'elite' ? 8 : 1;

    let hp = (3 + waveId * 0.9)
      * (strong && tier === 'normal' ? 1.6 : 1)
      * type.hp * hpTier;

    if (this.finalChoice === 'real') hp *= 2;
    hp = Math.max(
      2,
      Math.round(hp * (this.finalChoice === 'tech' ? 1 : ENEMY_HP_MULT)),
    );

    let reward = (strong ? 36 : 20)
      * (1 + waveId * 0.035) * type.reward * rewardTier;

    if (this.finalChoice === 'tech') reward *= 10;
    reward = Math.max(1, Math.round(reward));

    const speed = (strong ? 40 : 55 + Math.min(waveId, 20))
      * ENEMY_SPEED_MULT
      * waveSpeedFactor(waveId)
      * this.overdueSpeed(waveId)
      * type.speed
      * (tier === 'boss' ? 0.75 : tier === 'elite' ? 0.9 : 1);

    const body = this.add.circle(
      start.x, start.y, (strong ? 19 : 14) * size, 0x000000, 0,
    ).setStrokeStyle(0, 0x000000, 0).setDepth(5);

    const visual = this.getEnemyVisual(
      spec.kind, tier, strong, start.x, start.y, this.enemyFamily(),
    );
    visual.setScale(size);

    const healthBar = this.healthLayer;

    const enemy: Enemy = {
      body,
      visual,
      healthBar,
      path,
      segment: 0,
      speed,
      hp,
      maxHp: hp,
      reward,
      alive: true,
      strong,
      waveId,
      phase: Math.random() * Math.PI * 2,
      kind: spec.kind,
      tier,
      size,
      xp: tier === 'boss' ? 200 : tier === 'elite' ? 50 : 10,
      resist: type.resist,
      slowUntil: 0,
      flashUntil: 0,
      dps: (tier === 'boss' ? 120 : tier === 'elite' ? 55 : strong ? 28 : 14)
        * (1 + waveId * 0.04),
      blockedMs: 0,
      ghostUntil: 0,
      burnUntil: 0,
      burnDps: 0,
      stunUntil: 0,
      tint: 0,
    };

    this.enemies.push(enemy);
  }

  // Cada tipo de inimigo é desenhado uma única vez e vira uma textura.
  // Depois, cada monstro é só uma imagem (muito mais leve que ~20 objetos).
  private getEnemyVisual(
    kind: EnemyKind,
    tier: Tier,
    strong: boolean,
    x: number,
    y: number,
    family: EnemyFamily,
  ): Phaser.GameObjects.Container {
    const key = `en_${family}_${kind}_${tier}_${strong ? 1 : 0}`;

    if (!this.textures.exists(key)) {
      const full = this.createEnemyVisual(0, 0, strong, family);
      this.decorateEnemy(full, kind, tier);

      try {
        const rt = this.make.renderTexture(
          { x: 0, y: 0, width: 128, height: 128 }, false,
        );

        rt.draw(full, 64, 64);
        rt.saveTexture(key);
        rt.destroy();
        this.killVisual(full);
      } catch {
        // Se não for possível gerar a textura, usa o desenho completo.
        full.setPosition(x, y);
        return full;
      }
    }

    const c = this.add.container(x, y).setDepth(5);
    c.add(this.add.image(0, 0, key));

    if (kind === 'espectral') c.setAlpha(0.72);

    return c;
  }

  private drawEnemyHealth(enemy: Enemy, crowded: boolean) {
    const g = this.healthLayer;
    if (!enemy.alive) return;

    const tier = enemy.tier;

    // Caminho rápido para inimigos comuns: barra simples, só se ferido.
    if (tier === 'normal') {
      if (enemy.hp >= enemy.maxHp && crowded) return;

      const w = enemy.strong ? 40 : 30;
      const bx = enemy.body.x - w / 2;
      const by = enemy.body.y - (enemy.strong ? 43 : 35) * enemy.size;
      const r = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1);

      g.fillStyle(0x000000, 0.85);
      g.fillRect(bx - 1, by - 1, w + 2, 7);
      g.fillStyle(r > 0.5 ? 0x71d065 : r > 0.25 ? 0xe8bc48 : 0xe0523f, 1);
      g.fillRect(bx, by, w * r, 5);
      return;
    }

    const width = tier === 'boss' ? 100 : tier === 'elite' ? 56 : (enemy.strong ? 40 : 30);
    const height = tier === 'boss' ? 8 : tier === 'elite' ? 6 : 5;
    const x = enemy.body.x - width / 2;
    const y = enemy.body.y
      - (enemy.strong ? 43 : 35) * enemy.size
      - (tier === 'boss' ? 6 : 0);
    const ratio = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1);

    g.fillStyle(0x000000, 0.9);
    g.fillRect(x - 1, y - 1, width + 2, height + 2);

    const fill =
      ratio > 0.5 ? 0x71d065 : ratio > 0.25 ? 0xe8bc48 : 0xe0523f;

    g.fillStyle(fill, 1);
    g.fillRect(x, y, width * ratio, height);

    g.fillStyle(0xffffff, 0.25);
    g.fillRect(x, y, width * ratio, 1);

    const segments = tier === 'boss' ? 10 : tier === 'elite' ? 8 : (enemy.strong ? 6 : 4);
    g.lineStyle(1, 0x000000, 0.7);

    for (let i = 1; i < segments; i++) {
      const sx = x + (width * i) / segments;
      g.lineBetween(sx, y, sx, y + height);
    }

    const border = tier === 'boss' ? 0xff5a45 : GOLD_LIGHT;
    g.lineStyle(2, border, 1);
    g.strokeRect(x - 1, y - 1, width + 2, height + 2);

    this.drawGem(g, x - 3, y + height / 2, 3, border);
    this.drawGem(g, x + width + 3, y + height / 2, 3, border);
  }

  private updateEnemies(delta: number) {
    this.healthLayer.clear();

    const blockers: Blocker[] = [];

    if (!this.heroDead) {
      blockers.push({
        x: this.hero.x, y: this.hero.y, r: this.heroBlockRadius(), hero: true,
      });
    }

    for (const t of this.towers) {
      blockers.push({ x: t.body.x, y: t.body.y, r: 20, tower: t });
    }

    for (const a of this.allies) {
      blockers.push({ x: a.x, y: a.y, r: 13, soft: true });
    }

    for (const c of this.clones) {
      blockers.push({ x: c.x, y: c.y, r: 13, soft: true });
    }

    for (const c of this.companions) {
      blockers.push({ x: c.x, y: c.y, r: 14, soft: true });
    }

    this.frameCount++;
    const list = this.enemies;
    const crowded = list.length > 30;
    const nowMs = this.time.now;

    this.fxLayer.clear();
    this.updateZones(nowMs);

    for (let idx = 0; idx < list.length; idx++) {
      const enemy = list[idx];
      if (!enemy.alive) continue;

      // Fogo: dano contínuo por cerca de 2 segundos.
      if (enemy.burnUntil > nowMs) {
        this.damageEnemy(enemy, enemy.burnDps * delta / 1000, true);
        if (!enemy.alive) continue;
      }

      const target = enemy.path[enemy.segment + 1];

      if (!target) {
        const damage = enemy.tier === 'boss' ? 6 : enemy.tier === 'elite' ? 3 : 1;
        this.removeEnemy(enemy);

        if (this.shieldUntil > this.time.now) {
          this.showMessage('O Escudo Místico protegeu a fortaleza!');
        } else {
          this.baseHP -= damage;
          this.cameras.main.shake(120, 0.004);
          this.showMessage(`Um inimigo alcançou a base! -${damage} vida. Sem recompensa por ele.`);
        }

        if (this.baseHP <= 0) {
          this.baseHP = 0;
          this.endGame();
          return;
        }

        continue;
      }

      const prevX = enemy.body.x;
      const prevY = enemy.body.y;
      const dx = target.x - enemy.body.x;
      const dy = target.y - enemy.body.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const slow = enemy.slowUntil > nowMs ? 0.5 : 1;
      const stunned = enemy.stunUntil > nowMs;
      const step = stunned ? 0 : enemy.speed * slow * delta / 1000;
      const angle = Math.atan2(dy, dx);

      if (distance <= step || distance < 1) {
        enemy.body.setPosition(target.x, target.y);
        enemy.segment++;
      } else {
        enemy.body.x += Math.cos(angle) * step;
        enemy.body.y += Math.sin(angle) * step;
        enemy.visual.setData('facing', Math.cos(angle) < 0 ? -1 : 1);
      }

      // Bloqueio físico: torres e herói fecham a estrada; aliados e clones
      // só empurram. Os monstros contornam enquanto houver espaço.
      const vx = Math.cos(angle);
      const vy = Math.sin(angle);
      const enemyRadius = (enemy.strong ? 16 : 12) * enemy.size;
      let hit: Blocker | null = null;

      for (const b of blockers) {
        if (b.soft && nowMs < enemy.ghostUntil) continue;

        const rx = enemy.body.x - b.x;
        const ry = enemy.body.y - b.y;
        const minD = b.r + enemyRadius;

        if (rx * rx + ry * ry >= minD * minD) continue;

        const d = Math.sqrt(rx * rx + ry * ry) || 0.01;

        const nx = rx / d;
        const ny = ry / d;

        let tx = -ny;
        let ty = nx;

        if (tx * vx + ty * vy < 0) {
          tx = -tx;
          ty = -ty;
        }

        enemy.body.x += nx * (minD - d) * 0.6 + tx * step * 0.9;
        enemy.body.y += ny * (minD - d) * 0.6 + ty * step * 0.9;

        if (!hit || (hit.soft && !b.soft)) hit = b;
      }

      this.clampToRoad(enemy);

      // Sem passagem: se o monstro está travado, ataca o que o bloqueia.
      const moved = Math.hypot(enemy.body.x - prevX, enemy.body.y - prevY);

      if (hit && moved < step * 0.35) {
        enemy.blockedMs += delta;

        if (hit.soft) {
          if (enemy.blockedMs > 700) {
            enemy.ghostUntil = nowMs + 1500;
            enemy.blockedMs = 0;
          }
        } else if (enemy.blockedMs > 400) {
          const dmg = enemy.dps * delta / 1000;

          if (hit.tower) this.hurtTower(hit.tower, dmg);
          else if (hit.hero) this.hurtHero(dmg);
        }
      } else if (enemy.blockedMs > 0) {
        enemy.blockedMs = Math.max(0, enemy.blockedMs - delta * 2);
      }

      enemy.visual.setPosition(enemy.body.x, enemy.body.y);

      // Com muitos inimigos, a animação é atualizada em quadros alternados.
      if (!crowded || ((idx + this.frameCount) & 1) === 0) {
        const facing = (enemy.visual.getData('facing') as number) || 1;
        const t = nowMs / 110 + enemy.phase;

        enemy.visual.setScale(
          facing * enemy.size,
          enemy.size * (1 + Math.sin(t) * 0.05),
        );

        const legs = enemy.visual.getData('legs') as Phaser.GameObjects.Rectangle[] | undefined;
        if (legs) this.animateLegs(legs, t * 1.5, true);
        else enemy.visual.y = enemy.body.y + Math.sin(t * 1.5) * 1.6;
      }

      const want = enemy.slowUntil > nowMs
        ? 0x9fd8ff
        : enemy.burnUntil > nowMs ? 0xffa060 : 0;

      if (want !== enemy.tint) this.setEnemyTint(enemy, want);

      if (
        enemy.burnUntil > nowMs ||
        enemy.slowUntil > nowMs ||
        stunned
      ) {
        this.drawEnemyStatus(enemy, nowMs, stunned);
      }

      this.drawEnemyHealth(enemy, crowded);
    }

    this.drawUnitBars();
  }

  private setEnemyTint(enemy: Enemy, color: number) {
    enemy.tint = color;

    const img = enemy.visual.list[0];

    if (img instanceof Phaser.GameObjects.Image) {
      if (color) img.setTint(color);
      else img.clearTint();
    }
  }

  private drawEnemyStatus(enemy: Enemy, now: number, stunned: boolean) {
    const g = this.fxLayer;
    const x = enemy.body.x;
    const y = enemy.body.y;
    const sz = enemy.size;

    if (enemy.burnUntil > now) {
      for (let k = 0; k < 3; k++) {
        const fx = x + (k - 1) * 8 * sz;
        const fy = y - (4 + (k % 2) * 6) * sz;
        const h = (9 + 5 * Math.sin(now / 80 + k * 2)) * sz;

        g.fillStyle(0xff6a1a, 0.85);
        g.fillTriangle(fx - 4 * sz, fy, fx + 4 * sz, fy, fx, fy - h);
        g.fillStyle(0xffd060, 0.9);
        g.fillTriangle(fx - 2 * sz, fy, fx + 2 * sz, fy, fx, fy - h * 0.6);
      }
    }

    if (enemy.slowUntil > now) {
      g.fillStyle(0xbfe6ff, 0.28);
      g.fillEllipse(x, y + 12 * sz, 38 * sz, 13 * sz);
      g.lineStyle(1.5, 0xffffff, 0.7);
      g.strokeEllipse(x, y + 12 * sz, 38 * sz, 13 * sz);

      for (const k of [-1, 1]) {
        g.fillStyle(0xe6f6ff, 0.9);
        g.fillTriangle(
          x + k * 14 * sz - 3, y + 12 * sz,
          x + k * 14 * sz + 3, y + 12 * sz,
          x + k * 14 * sz, y + 1 * sz,
        );
      }
    }

    if (stunned) {
      const hy = y - 38 * sz;

      for (let k = 0; k < 3; k++) {
        const a = now / 140 + k * 2.1;
        const sx = x + Math.cos(a) * 12 * sz;
        const sy = hy + Math.sin(a) * 4 * sz;

        g.fillStyle(0xffe45a, 1);
        g.fillCircle(sx, sy, 2.6);
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(sx, sy, 1.1);
      }
    }
  }

  private addZone(
    kind: 'fire' | 'ice',
    x: number,
    y: number,
    r: number,
    now: number,
    dps: number,
  ) {
    const near = this.zones.find(z =>
      z.kind === kind && z.until > now &&
      Phaser.Math.Distance.Between(z.x, z.y, x, y) < r * 0.6,
    );

    if (near) {
      near.until = now + 2000;
      near.dps = Math.max(near.dps, dps);
      return;
    }

    if (this.zones.length >= 40) return;

    this.zones.push({ x, y, r, kind, until: now + 2000, dps });
  }

  private updateZones(now: number) {
    if (!this.zones.length) return;

    this.zones = this.zones.filter(z => z.until > now);

    const g = this.fxLayer;

    for (const z of this.zones) {
      const f = Math.min(1, (z.until - now) / 700);

      if (z.kind === 'fire') {
        g.fillStyle(0xff5a10, 0.22 * f);
        g.fillEllipse(z.x, z.y + 4, z.r * 2, z.r * 1.2);

        for (let k = 0; k < 5; k++) {
          const a = k * 1.3 + z.x;
          const fx = z.x + Math.cos(a) * z.r * 0.6;
          const fy = z.y + 4 + Math.sin(a) * z.r * 0.3;
          const h = 8 + 6 * Math.sin(now / 90 + k * 2);

          g.fillStyle(0xff8a2a, 0.75 * f);
          g.fillTriangle(fx - 4, fy, fx + 4, fy, fx, fy - h);
          g.fillStyle(0xffe08a, 0.8 * f);
          g.fillTriangle(fx - 2, fy, fx + 2, fy, fx, fy - h * 0.55);
        }
      } else {
        g.fillStyle(0xbfe6ff, 0.28 * f);
        g.fillEllipse(z.x, z.y + 4, z.r * 2, z.r * 1.2);
        g.lineStyle(1.5, 0xffffff, 0.6 * f);
        g.strokeEllipse(z.x, z.y + 4, z.r * 2, z.r * 1.2);

        for (let k = 0; k < 5; k++) {
          const a = k * 1.3 + z.y;
          const fx = z.x + Math.cos(a) * z.r * 0.6;
          const fy = z.y + 4 + Math.sin(a) * z.r * 0.3;

          g.fillStyle(0xe6f6ff, 0.85 * f);
          g.fillTriangle(fx - 3, fy, fx + 3, fy, fx, fy - 10);
        }
      }

      const r2 = z.r * z.r;

      for (const e of this.enemies) {
        if (!e.alive) continue;

        const dx = e.body.x - z.x;
        const dy = e.body.y - z.y;

        if (dx * dx + dy * dy > r2) continue;

        if (z.kind === 'fire') {
          e.burnUntil = now + 2000;
          e.burnDps = Math.max(e.burnDps, z.dps * e.resist.basic);
        } else {
          e.slowUntil = Math.max(e.slowUntil, now + 600);
        }
      }
    }
  }

  private stunEnemy(enemy: Enemy, now: number) {
    enemy.stunUntil = now + (enemy.tier === 'boss' ? 500 : 1000);
  }

  private clampToRoad(enemy: Enemy) {
    const a = enemy.path[enemy.segment];
    const b = enemy.path[enemy.segment + 1];
    if (!a || !b) return;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return;

    const t = Phaser.Math.Clamp(
      ((enemy.body.x - a.x) * dx + (enemy.body.y - a.y) * dy) / len2,
      0, 1,
    );

    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const ex = enemy.body.x - px;
    const ey = enemy.body.y - py;
    const d = Math.sqrt(ex * ex + ey * ey);

    if (d > ROAD_HALF) {
      enemy.body.x = px + (ex / d) * ROAD_HALF;
      enemy.body.y = py + (ey / d) * ROAD_HALF;
    }
  }

  private hurtTower(tower: Tower, dmg: number) {
    tower.hp -= dmg;
    tower.hitAt = this.time.now;

    if (tower.hp > 0) return;

    this.floatText(
      tower.body.x, tower.body.y - 30, 'TORRE DESTRUÍDA!', '#ff8a7a', 12,
    );

    tower.body.destroy();
    this.killVisual(tower.visual);
    this.towers = this.towers.filter(t => t !== tower);

    if (this.selectedTower === tower) {
      this.selectedTower = null;
      this.rangeGraphics.clear();
      this.closeContextMenu();
    }

    this.showMessage('Uma torre foi destruída pelos monstros!');
  }

  private hurtHero(dmg: number) {
    const now = this.time.now;

    if (this.finalChoice === 'tech') return;
    if (this.heroDead || now < this.heroInvulnUntil) return;

    this.heroHp -= dmg;
    this.heroHitAt = now;

    if (this.heroHp <= 0) this.killHero();
  }

  private killHero() {
    this.heroHp = 0;
    this.heroDead = true;
    this.heroDeaths++;
    this.cloneUntil = 0;

    this.heroVisual.setVisible(false);
    this.heroLabel.setVisible(false);

    this.floatText(this.hero.x, this.hero.y - 40, 'HERÓI CAIU!', '#ff8a7a', 14);
    this.showMessage('O herói foi derrotado! Revivê-lo custa moedas.');
    this.openReviveModal();
  }

  private reviveCost(): number {
    return 1000 * this.heroDeaths;
  }

  private openReviveModal() {
    const cost = this.reviveCost();

    const body =
      'Seu herói foi derrotado e está fora da batalha: sem ataques, sem habilidades e sem bloquear o caminho.\n\n' +
      `Reviver custa ${cost} moedas (a cada morte o preço sobe 1000).\n` +
      `Você tem ${this.coins} moedas.`;

    this.openModal('HERÓI DERROTADO', body, [
      {
        label: `REVIVER · ${cost}`,
        color: '#8a6a22',
        action: () => {
          if (this.coins < cost) {
            this.modalBody?.setText(body + '\n\nMOEDAS INSUFICIENTES!').setColor('#ff9a8a');
            return;
          }

          this.reviveHero();
        },
      },
      { label: 'AGORA NÃO', color: '#3a4046', action: () => this.closeModal() },
    ]);
  }

  private reviveHero() {
    if (!this.heroDead) return;

    const cost = this.reviveCost();
    if (this.coins < cost) return;

    this.coins -= cost;
    this.heroDead = false;
    this.heroHp = this.heroMaxHp;
    this.heroInvulnUntil = this.time.now + 3000;

    this.hero.setPosition(300, 700);
    this.heroVisual.setPosition(300, 700).setVisible(true);
    this.heroLabel.setPosition(300, 658).setVisible(true);

    const ring = this.add.circle(300, 700, 20, 0xfff0a0, 0.3)
      .setStrokeStyle(3, GOLD_LIGHT, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);

    this.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 600,
      onComplete: () => ring.destroy(),
    });

    this.closeModal();
    this.showMessage('O herói voltou à batalha!');
    this.refreshInterface();
  }

  private drawUnitBars() {
    const g = this.healthLayer;

    const bar = (x: number, y: number, w: number, ratio: number, color: number) => {
      g.fillStyle(0x000000, 0.85);
      g.fillRect(x - w / 2 - 1, y - 1, w + 2, 7);
      g.fillStyle(color, 1);
      g.fillRect(x - w / 2, y, w * Phaser.Math.Clamp(ratio, 0, 1), 5);
    };

    for (const t of this.towers) {
      if (t.hp >= t.maxHp) continue;
      bar(t.body.x, t.body.y - 42, 38, t.hp / t.maxHp, 0xe8a23a);
    }

    if (!this.heroDead && this.heroHp < this.heroMaxHp) {
      bar(this.hero.x, this.hero.y - 54, 46, this.heroHp / this.heroMaxHp, 0x4ad0ff);
    }
  }

  private removeEnemy(enemy: Enemy) {
    enemy.alive = false;
    enemy.body.destroy();
    this.killVisual(enemy.visual);

    this.enemies = this.enemies.filter(e => e !== enemy);
  }

  private damageEnemy(enemy: Enemy, damage: number, quiet = false) {
    if (!enemy.alive) return;

    enemy.hp -= damage;

    if (damage >= 25 && !quiet) {
      this.floatText(
        enemy.body.x, enemy.body.y - 26, `${Math.round(damage)}`,
        '#ff9a80', 11,
      );
    }

    const nowT = this.time.now;

    if (!quiet && nowT > enemy.flashUntil && this.enemies.length < 40) {
      enemy.flashUntil = nowT + 200;

      this.tweens.add({
        targets: enemy.visual,
        alpha: 0.55,
        duration: 55,
        yoyo: true,
      });
    }

    if (enemy.hp > 0) return;

    const distance = Phaser.Math.Distance.Between(
      this.hero.x, this.hero.y,
      enemy.body.x, enemy.body.y,
    );

    const heroGetsXP = distance <= this.heroRange;
    const x = enemy.body.x;
    const y = enemy.body.y;
    const reward = enemy.reward;
    const xpValue = enemy.xp;

    this.removeEnemy(enemy);
    this.coins += reward;

    // Bounty de ouro estilo Dota
    if (enemy.tier !== 'normal') {
      this.floatText(x, y - 22, `+${reward}`, '#ffd54a', 13);
    }

    const crowd = this.enemies.length;

    if (crowd < 60) {
      const burst = this.add.circle(x, y, 8, 0xe9c36a, 0.75)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(10);

      this.tweens.add({
        targets: burst,
        alpha: 0,
        scale: 2.4,
        duration: 220,
        onComplete: () => burst.destroy(),
      });
    }

    for (let i = 0; i < (crowd < 25 ? 3 : 0); i++) {
      const spark = this.add.circle(x, y, 2, 0xffe08a, 1).setDepth(10);
      const a = (Math.PI * 2 * i) / 3;

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(a) * 20,
        y: y + Math.sin(a) * 20,
        alpha: 0,
        duration: 300,
        onComplete: () => spark.destroy(),
      });
    }

    if (heroGetsXP) this.gainXP(xpValue);
  }

  private checkCompletedWaves() {
    for (const [waveId, state] of this.activeWaves) {
      if (!state.spawningFinished) continue;

      const remaining = this.enemies.some(
        enemy => enemy.alive && enemy.waveId === waveId,
      );

      if (remaining) continue;

      this.activeWaves.delete(waveId);
      this.showMessage(`Onda ${waveId} concluída!`);

      if (waveId === MAX_WAVES) {
        this.victory();
        return;
      }
    }
  }

  // ==================================================
  // TORRES E ATAQUES
  // ==================================================

  private updateTowers(delta: number) {
    const now = this.time.now;
    const boosts: Record<TowerKind, AuraBoost> = {
      basic: this.auraFor('basic'),
      rapid: this.auraFor('rapid'),
      sniper: this.auraFor('sniper'),
    };

    for (const tower of this.towers) {
      if (tower.hp < tower.maxHp && now - tower.hitAt > 4000) {
        tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * 0.02 * delta / 1000);
      }

      tower.cooldown -= delta;
      if (tower.cooldown > 0) continue;

      let target: Enemy | undefined;
      let closest = tower.range;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;

        const distance = Phaser.Math.Distance.Between(
          tower.body.x, tower.body.y,
          enemy.body.x, enemy.body.y,
        );

        if (distance <= closest) {
          closest = distance;
          target = enemy;
        }
      }

      if (!target) continue;

      const boost = boosts[tower.kind];
      let rate = tower.fireRate / (boost ? boost.spd : 1);

      // Besteira nível 5: modo metralhadora
      let stunNow = false;

      if (tower.kind === 'rapid' && tower.level >= 5) {
        rate *= 0.4;

        // Após 2 segundos atirando sem parar, atordoa o alvo por 1 segundo.
        if (now - tower.lastShotAt > 700) tower.streak = 0;
        tower.lastShotAt = now;
        tower.streak += rate;

        if (tower.streak >= 2000) {
          tower.streak = 0;
          stunNow = true;
        }
      }

      tower.cooldown = rate;
      this.fireProjectile(tower, target);

      let raw = tower.damage * tower.level;
      if (boost) raw *= boost.dmg;
      if (this.finalChoice === 'tech') raw *= 1.3;

      const tx = target.body.x;
      const ty = target.body.y;

      this.damageEnemy(target, raw * target.resist[tower.kind]);

      if (stunNow && target.alive) this.stunEnemy(target, now);

      if (tower.level >= 5) {
        if (tower.kind === 'basic') {
          this.fireballBlast(tx, ty, raw * 0.6, target);
        } else if (tower.kind === 'sniper') {
          this.slowArea(tx, ty, now);
        }
      }
    }
  }

  private fireProjectile(tower: Tower, target: Enemy) {
    const color = TOWER_STATS[tower.kind].color;
    const sniper = tower.kind === 'sniper';

    const sx = tower.body.x;
    const sy = tower.body.y - 10;
    const tx = target.body.x;
    const ty = target.body.y - 4;

    // Metralhadora: traço leve em vez de um objeto por tiro
    if (tower.kind === 'rapid' && tower.level >= 5) {
      this.tracers.push({
        x1: sx, y1: sy, x2: tx, y2: ty, ttl: 110, life: 110, w: 2.5, color: 0xffe08a,
      });
      return;
    }

    // Rastro das torres de área (nível 5)
    const fireball = tower.kind === 'basic' && tower.level >= 5;
    const frost = sniper && tower.level >= 5;

    if (fireball) {
      this.tracers.push({
        x1: sx, y1: sy, x2: tx, y2: ty, ttl: 260, life: 260, w: 5, color: 0xff7a1a,
      });
    } else if (frost) {
      this.tracers.push({
        x1: sx, y1: sy, x2: tx, y2: ty, ttl: 300, life: 300, w: 3.5, color: 0x9fd8ff,
      });
    }

    const projectile = this.add.circle(
      sx, sy, sniper ? 5 : fireball ? 6 : 3,
      fireball ? 0xff8a2a : color,
    ).setStrokeStyle(1, 0xf4e8c8).setDepth(12);

    this.tweens.add({
      targets: projectile,
      x: tx,
      y: ty,
      duration: sniper ? 180 : 120,
      onComplete: () => {
        projectile.destroy();

        if (!sniper) return;

        const impact = this.add.circle(tx, ty, 4, color, 0.6)
          .setStrokeStyle(2, 0xffffff, 0.8)
          .setDepth(12);

        this.tweens.add({
          targets: impact,
          scale: 3,
          alpha: 0,
          duration: 180,
          onComplete: () => impact.destroy(),
        });
      },
    });

    if (sniper) {
      const flash = this.add.circle(
        tower.body.x, tower.body.y - 22, 9, color, 0.45,
      ).setBlendMode(Phaser.BlendModes.ADD).setDepth(11);

      this.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 1.7,
        duration: 180,
        onComplete: () => flash.destroy(),
      });
    }
  }

  private drawSelectedRange() {
    this.rangeGraphics.clear();

    if (!this.selectedTower || !this.towers.includes(this.selectedTower)) {
      return;
    }

    const tower = this.selectedTower;
    const g = this.rangeGraphics;

    g.fillStyle(0xe9d9a6, 0.07);
    g.fillCircle(tower.body.x, tower.body.y, tower.range);

    g.lineStyle(2, 0xffe3a0, 0.6);
    g.strokeCircle(tower.body.x, tower.body.y, tower.range);

    for (let a = 0; a < 360; a += 15) {
      const rad = Phaser.Math.DegToRad(a);

      g.lineStyle(2, 0xffe3a0, 0.5);
      g.lineBetween(
        tower.body.x + Math.cos(rad) * (tower.range - 5),
        tower.body.y + Math.sin(rad) * (tower.range - 5),
        tower.body.x + Math.cos(rad) * (tower.range + 2),
        tower.body.y + Math.sin(rad) * (tower.range + 2),
      );
    }

    g.lineStyle(2, 0xffe3a0, 0.75);
    g.strokeCircle(tower.body.x, tower.body.y, 22);
  }

  // ==================================================
  // HERÓI E MOVIMENTAÇÃO
  // ==================================================

  private moveKnob(x: number, y: number) {
    this.joystickKnob.setPosition(x, y);
    this.joystickShine.setPosition(x - 6, y - 7);
  }

  private updateJoystick(x: number, y: number) {
    const dx = x - this.joystickCenter.x;
    const dy = y - this.joystickCenter.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const radius = 35;
    const scale = Math.min(length, radius) / length;

    this.moveKnob(
      this.joystickCenter.x + dx * scale,
      this.joystickCenter.y + dy * scale,
    );

    this.joystickX = dx * scale / radius;
    this.joystickY = dy * scale / radius;
  }

  private moveHero(delta: number) {
    if (this.heroDead) return;

    let dx = this.joystickX;
    let dy = this.joystickY;

    if (this.cursors.left.isDown || this.keys.a.isDown) dx = -1;
    if (this.cursors.right.isDown || this.keys.d.isDown) dx = 1;
    if (this.cursors.up.isDown || this.keys.w.isDown) dy = -1;
    if (this.cursors.down.isDown || this.keys.s.isDown) dy = 1;

    if (dx === 0 && dy === 0) {
      this.animateLegs(this.heroLegs, 0, false);
      return;
    }

    const length = Math.sqrt(dx * dx + dy * dy);
    const speed = this.heroSpeed * (this.time.now < this.cloneUntil ? 1.4 : 1) * delta / 1000;

    this.hero.x = Phaser.Math.Clamp(
      this.hero.x + dx / length * speed, 18, WIDTH - 18,
    );

    this.hero.y = Phaser.Math.Clamp(
      this.hero.y + dy / length * speed, 175, 815,
    );

    this.heroVisual.setPosition(this.hero.x, this.hero.y);
    this.heroLabel.setPosition(this.hero.x, this.hero.y - 42);
    this.animateLegs(this.heroLegs, this.time.now / 70, true);

    if (dx !== 0) {
      this.heroVisual.setScale(dx < 0 ? -1 : 1, 1);
    }
  }

  private updateHeroCombat(delta: number) {
    if (this.heroDead) return;

    if (
      this.heroHp < this.heroMaxHp &&
      this.time.now - this.heroHitAt > 5000
    ) {
      this.heroHp = Math.min(
        this.heroMaxHp, this.heroHp + this.heroMaxHp * 0.015 * delta / 1000,
      );
    }

    this.heroAttackCooldown -= delta;
    if (this.heroAttackCooldown > 0) return;

    let target: Enemy | undefined;
    let closest = this.heroRange;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      const distance = Phaser.Math.Distance.Between(
        this.hero.x, this.hero.y,
        enemy.body.x, enemy.body.y,
      );

      if (distance <= closest) {
        closest = distance;
        target = enemy;
      }
    }

    if (target) {
      this.heroAttackCooldown = this.heroAttackRate * (this.time.now < this.cloneUntil ? 0.7 : 1);
      this.fireHeroProjectile(target);
      this.hitTarget(target, this.heroDamage, this.hero.x, this.hero.y);

      this.tweens.add({
        targets: this.heroVisual,
        angle: this.heroVisual.scaleX < 0 ? -8 : 8,
        duration: 75,
        yoyo: true,
      });
    }
  }

  private fireHeroProjectile(target: Enemy) {
    const projectile = this.add.rectangle(
      this.hero.x, this.hero.y - 7, 4, 15, 0xf0dd9f,
    ).setRotation(-0.4).setDepth(12);

    const glow = this.add.circle(
      this.hero.x, this.hero.y - 7, 8, GOLD_LIGHT, 0.4,
    ).setBlendMode(Phaser.BlendModes.ADD).setDepth(11);

    this.tweens.add({
      targets: [projectile, glow],
      x: target.body.x,
      y: target.body.y,
      duration: 130,
      onComplete: () => {
        projectile.destroy();
        glow.destroy();
      },
    });
  }

  private gainXP(amount: number) {
    this.xp += amount;

    while (this.xp >= this.heroLevel * 50) {
      this.xp -= this.heroLevel * 50;
      this.heroLevel++;
      this.skillPoints++;

      this.heroDamage++;
      this.heroRange += 5;
      this.maxMana += 5;
      this.applyHeroHp();
      this.mana = Math.min(this.maxMana, this.mana + 5);

      this.showMessage(
        `Herói evoluiu para o nível ${this.heroLevel}! Você ganhou 1 ponto de habilidade.`,
      );

      this.floatText(
        this.hero.x, this.hero.y - 58, 'NÍVEL ACIMA!', '#fff0a0', 14,
      );

      this.onHeroLevel(this.heroLevel);

      const levelEffect = this.add.circle(
        this.hero.x, this.hero.y, 28, 0xe9d38b, 0.28,
      ).setStrokeStyle(3, GOLD_LIGHT, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(9);

      this.tweens.add({
        targets: levelEffect,
        alpha: 0,
        scale: 2.6,
        duration: 500,
        onComplete: () => levelEffect.destroy(),
      });
    }

    this.heroLabel.setText(`${this.heroTitle()} · Nv. ${this.heroLevel}`);
  }

  // ==================================================
  // QUATRO HABILIDADES
  // ==================================================

  private useSkill(skill: SkillKind) {
    if (this.gameOver) return;

    if (this.heroDead) {
      this.showMessage('O herói está caído. Reviva-o para usar habilidades.');
      return;
    }

    const info = this.skillMeta(skill);

    if (skill === 'aura') {
      const names = this.fused
        ? 'todas as torres'
        : this.presentHeroes()
          .map(h => TOWER_STATS[HERO_STATS[h].specialty].name)
          .join(' e ');

      this.showMessage(
        `AURA é passiva e já está ativa (Nv.${this.skillLevels.aura}) em: ${names}.`,
      );
      return;
    }

    const rank = this.rankOf(skill);

    if (rank === 0) {
      this.showMessage(
        `Desbloqueie ${info.name} melhorando-a com um ponto de habilidade.`,
      );
      return;
    }

    // Sem tempo de recarga: o único limite é a mana.
    const cost = this.finalChoice === 'tech'
      ? 0
      : Math.max(5, info.mana - (rank - 1) * 3);

    if (this.mana < cost) {
      this.showMessage('Mana insuficiente para esta habilidade.');
      return;
    }

    switch (skill) {
      case 'explosion':
        this.useExplosion(cost, rank);
        break;
      case 'repair':
        this.useRepair(cost, rank);
        break;
      case 'strike':
        this.useHeroStrike(cost, rank);
        break;
      case 'clones':
        this.useClones(cost, rank);
        break;
      case 'lightning':
        this.useLightning(cost, rank);
        break;
      default:
        break;
    }

    this.refreshInterface();
  }

  private useExplosion(cost = 35, rank = 1) {
    if (this.mana < cost) {
      this.showMessage('Mana insuficiente para usar Explosão.');
      return;
    }

    this.mana -= cost;
    const radius = (95 + rank * 6) * (this.finalChoice === 'tech' ? 3 : 1);
    const damage = Math.round(
      (3 + Math.floor(this.heroLevel * 0.8) + rank * 2) * this.powerMult(),
    );
    let hitCount = 0;

    for (const enemy of [...this.enemies]) {
      if (!enemy.alive) continue;

      const distance = Phaser.Math.Distance.Between(
        this.hero.x, this.hero.y,
        enemy.body.x, enemy.body.y,
      );

      if (distance <= radius) {
        this.damageEnemy(enemy, damage);
        hitCount++;
      }
    }

    const effect = this.add.circle(
      this.hero.x, this.hero.y, radius, 0xff9d45, 0.2,
    ).setStrokeStyle(4, 0xffd16b, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);

    this.tweens.add({
      targets: effect,
      alpha: 0,
      scale: 1.2,
      duration: 380,
      onComplete: () => effect.destroy(),
    });

    this.cameras.main.shake(120, 0.003);

    this.showMessage(
      hitCount
        ? `Explosão! ${hitCount} inimigo(s) atingido(s).`
        : 'Explosão utilizada, mas nenhum inimigo estava no raio.',
    );
  }

  private useRepair(cost = 40, rank = 1) {
    if (this.mana < cost) {
      this.showMessage('Mana insuficiente para Reparar.');
      return;
    }

    if (this.baseHP >= this.maxBaseHP) {
      this.showMessage('A base já está com a vida máxima.');
      return;
    }

    this.mana -= cost;
    this.baseHP = Math.min(this.maxBaseHP, this.baseHP + 5 * (3 + rank));

    this.floatText(300, 740, `+${5 * (3 + rank)} VIDA`, '#7dff9a', 14);

    this.showMessage(
      `Reparo utilizado! A base recuperou até ${5 * (3 + rank)} pontos de vida.`,
    );
  }

  // ---------- GOLPE HEROICO: o poder final, único de cada herói ----------

  private ultDamage(rank: number): number {
    return (40 + this.heroLevel * 8 + rank * 25)
      * (this.finalChoice === 'tech' ? 200 : 1);
  }

  // Ponto com mais inimigos juntos (alvo das chuvas e do meteoro).
  private densestPoint(radius: number): { x: number; y: number } {
    let best: { x: number; y: number; n: number } | null = null;

    for (const a of this.enemies) {
      if (!a.alive) continue;

      let n = 0;

      for (const b of this.enemies) {
        if (
          b.alive &&
          Phaser.Math.Distance.Between(a.body.x, a.body.y, b.body.x, b.body.y) <= radius
        ) n++;
      }

      if (!best || n > best.n) best = { x: a.body.x, y: a.body.y, n };
    }

    return best ? { x: best.x, y: best.y } : { x: this.hero.x, y: this.hero.y };
  }

  private useHeroStrike(cost: number, rank: number) {
    if (this.mana < cost) return;

    if (!this.enemies.some(e => e.alive)) {
      this.showMessage('Não há inimigos em campo para o golpe final.');
      return;
    }

    this.mana -= cost;

    const dmg = this.ultDamage(rank);

    if (this.fused) {
      this.ultSlam(dmg, rank);
      this.time.delayedCall(450, () => { if (!this.gameOver) this.ultArrows(dmg, rank); });
      this.time.delayedCall(1300, () => { if (!this.gameOver) this.ultMeteor(dmg, rank); });

      this.baseHP = Math.min(this.maxBaseHP, this.baseHP + 5 * (3 + rank));
      this.floatText(this.hero.x, this.hero.y - 70, 'JUÍZO FINAL!', '#fff0a0', 18);
      this.showMessage('JUÍZO FINAL! Os três poderes se unem.');
      return;
    }

    if (this.heroKind === 'guardiao') {
      this.ultSlam(dmg, rank);
      this.floatText(this.hero.x, this.hero.y - 70, 'GOLPE TITÂNICO!', '#ffd16b', 16);
    } else if (this.heroKind === 'patrulheiro') {
      this.ultArrows(dmg, rank);
      this.floatText(this.hero.x, this.hero.y - 70, 'CHUVA DE FLECHAS!', '#b8ff9a', 16);
    } else {
      this.ultMeteor(dmg, rank);
      this.floatText(this.hero.x, this.hero.y - 70, 'METEORO ARCANO!', '#d0b0ff', 16);
    }
  }

  // Guardião: esmaga o chão com uma onda de choque dourada.
  private ultSlam(dmg: number, rank: number) {
    const cx = this.hero.x;
    const cy = this.hero.y;
    const radius = 150 + rank * 12;
    const now = this.time.now;

    this.cameras.main.flash(200, 255, 235, 170);
    this.cameras.main.shake(420, 0.014);

    const core = this.add.circle(cx, cy, 30, 0xffffff, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(14);

    this.tweens.add({
      targets: core,
      scale: radius / 30 * 0.7,
      alpha: 0,
      duration: 320,
      onComplete: () => core.destroy(),
    });

    const beam = this.add.rectangle(cx, cy - 260, 80, 520, 0xfff2b0, 0.6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(14);

    this.tweens.add({
      targets: beam,
      scaleX: 0,
      alpha: 0,
      duration: 420,
      onComplete: () => beam.destroy(),
    });

    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(cx, cy, 20, 0xffd16b, 0.16)
        .setStrokeStyle(6 - i * 2, i === 0 ? 0xffffff : 0xffc04a, 0.95)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(13);

      this.tweens.add({
        targets: ring,
        scale: radius / 20 * (1 + i * 0.12),
        alpha: 0,
        duration: 560,
        delay: i * 110,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }

    // rachaduras no chão
    const cracks = this.add.graphics().setDepth(4);

    for (let k = 0; k < 11; k++) {
      const ang = (k / 11) * Math.PI * 2 + Math.random() * 0.4;
      const len = radius * (0.55 + Math.random() * 0.4);
      let px = cx;
      let py = cy;

      for (let seg = 1; seg <= 5; seg++) {
        const a2 = ang + (Math.random() - 0.5) * 0.5;
        const nx = cx + Math.cos(a2) * len * seg / 5;
        const ny = cy + Math.sin(a2) * len * seg / 5 * 0.7;

        cracks.lineStyle(5, 0xffc04a, 0.35);
        cracks.lineBetween(px, py, nx, ny);
        cracks.lineStyle(2, 0x120c06, 0.95);
        cracks.lineBetween(px, py, nx, ny);

        px = nx;
        py = ny;
      }
    }

    this.tweens.add({
      targets: cracks,
      alpha: 0,
      delay: 700,
      duration: 700,
      onComplete: () => cracks.destroy(),
    });

    // pedras voando
    for (let k = 0; k < 16; k++) {
      const rock = this.add.rectangle(
        cx, cy, 5 + Math.random() * 6, 5 + Math.random() * 6, 0x6b5a3a, 1,
      ).setDepth(15).setRotation(Math.random() * 3);

      this.tweens.add({
        targets: rock,
        x: cx + Phaser.Math.Between(-radius, radius),
        y: cy - Phaser.Math.Between(40, 140),
        alpha: 0,
        rotation: rock.rotation + Phaser.Math.Between(-6, 6),
        duration: 650,
        ease: 'Quad.easeOut',
        onComplete: () => rock.destroy(),
      });
    }

    let hits = 0;

    for (const e of [...this.enemies]) {
      if (!e.alive) continue;

      if (Phaser.Math.Distance.Between(cx, cy, e.body.x, e.body.y) <= radius) {
        this.damageEnemy(e, dmg);
        hits++;

        if (e.alive) {
          e.stunUntil = Math.max(e.stunUntil, now + (e.tier === 'boss' ? 700 : 1500));
        }
      }
    }

    if (!this.fused) this.showMessage(`GOLPE TITÂNICO! ${hits} inimigo(s) esmagado(s).`);
  }

  // Patrulheiro: chuva de flechas luminosas sobre o maior grupo.
  private ultArrows(dmg: number, rank: number) {
    const c = this.densestPoint(120);
    const spread = 130 + rank * 8;
    const count = 20 + rank * 2;

    this.cameras.main.flash(160, 190, 255, 170);

    const mark = this.add.circle(c.x, c.y, spread, 0x9aff7a, 0.1)
      .setStrokeStyle(3, 0xd8ffc0, 0.9)
      .setDepth(3);

    this.tweens.add({
      targets: mark,
      alpha: 0,
      duration: count * 55 + 400,
      onComplete: () => mark.destroy(),
    });

    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 55, () => {
        if (this.gameOver) return;

        const ix = c.x + Phaser.Math.Between(-spread, spread);
        const iy = c.y + Phaser.Math.Between(-Math.round(spread * 0.7), Math.round(spread * 0.7));

        const arrow = this.add.rectangle(ix - 20, iy - 360, 4, 38, 0xe8ffd0, 1)
          .setRotation(0.05)
          .setDepth(14);

        const trail = this.add.rectangle(ix - 20, iy - 360, 9, 90, 0x7dff7a, 0.35)
          .setRotation(0.05)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(13);

        this.tweens.add({
          targets: [arrow, trail],
          x: ix,
          y: iy,
          duration: 260,
          ease: 'Quad.easeIn',
          onComplete: () => {
            arrow.destroy();
            trail.destroy();

            const burst = this.add.circle(ix, iy, 10, 0xb8ff9a, 0.7)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setDepth(13);

            this.tweens.add({
              targets: burst,
              scale: 4,
              alpha: 0,
              duration: 220,
              onComplete: () => burst.destroy(),
            });

            for (const e of [...this.enemies]) {
              if (!e.alive) continue;

              if (Phaser.Math.Distance.Between(ix, iy, e.body.x, e.body.y) <= 50) {
                this.damageEnemy(e, Math.max(1, Math.round(dmg * 0.35)));
              }
            }
          },
        });
      });
    }

    if (!this.fused) this.showMessage('CHUVA DE FLECHAS! O céu se enche de luz.');
  }

  // Arcanista: meteoro colossal com raios, explosão e lentidão.
  private ultMeteor(dmg: number, rank: number) {
    const c = this.densestPoint(150);
    const radius = 140 + rank * 10;

    const warn = this.add.circle(c.x, c.y, radius, 0x9a6bff, 0.12)
      .setStrokeStyle(3, 0xd0b0ff, 0.9)
      .setDepth(3);

    this.tweens.add({
      targets: warn,
      alpha: 0.4,
      duration: 160,
      yoyo: true,
      repeat: 3,
    });

    const sx = c.x + 120;
    const sy = c.y - 520;

    const meteor = this.add.circle(sx, sy, 26, 0xc59bff, 1)
      .setStrokeStyle(5, 0xffffff, 1)
      .setDepth(15);

    const glow = this.add.circle(sx, sy, 54, 0x7a4bff, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(14);

    const tail = this.add.rectangle(sx + 18, sy - 78, 20, 170, 0xb48cff, 0.5)
      .setRotation(Math.atan2(120, 520))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(14);

    this.tweens.add({
      targets: [meteor, glow],
      x: c.x,
      y: c.y,
      duration: 700,
      ease: 'Quad.easeIn',
    });

    this.tweens.add({
      targets: tail,
      x: c.x + 18,
      y: c.y - 78,
      duration: 700,
      ease: 'Quad.easeIn',
      onComplete: () => {
        meteor.destroy();
        glow.destroy();
        tail.destroy();
        warn.destroy();

        if (this.gameOver) return;

        const now = this.time.now;

        this.cameras.main.flash(320, 190, 150, 255);
        this.cameras.main.shake(520, 0.016);

        const core = this.add.circle(c.x, c.y, 40, 0xffffff, 0.95)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(16);

        this.tweens.add({
          targets: core,
          scale: radius / 40 * 0.8,
          alpha: 0,
          duration: 380,
          onComplete: () => core.destroy(),
        });

        for (let i = 0; i < 3; i++) {
          const ring = this.add.circle(c.x, c.y, 20, 0x9a6bff, 0.18)
            .setStrokeStyle(6 - i * 2, i === 0 ? 0xffffff : 0xb48cff, 0.95)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(13);

          this.tweens.add({
            targets: ring,
            scale: radius / 20 * (1 + i * 0.12),
            alpha: 0,
            duration: 620,
            delay: i * 100,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy(),
          });
        }

        const inRange = this.enemies.filter(e =>
          e.alive &&
          Phaser.Math.Distance.Between(c.x, c.y, e.body.x, e.body.y) <= radius,
        );

        inRange.slice(0, 7).forEach(e => {
          this.drawBolt(
            c.x + Phaser.Math.Between(-30, 30), c.y - 420,
            e.body.x, e.body.y - 6,
          );
        });

        for (const e of inRange) {
          if (!e.alive) continue;

          this.damageEnemy(e, Math.round(dmg * 1.3));

          if (e.alive) e.slowUntil = Math.max(e.slowUntil, now + 2500);
        }

        this.addZone('ice', c.x, c.y, 70, now, 0);

        if (!this.fused) {
          this.showMessage(`METEORO ARCANO! ${inRange.length} inimigo(s) atingido(s).`);
        }
      },
    });
  }

  private regenerateMana(delta: number) {
    this.mana = Math.min(
      this.maxMana,
      this.mana + this.manaRegen * delta / 1000,
    );
  }

  // ==================================================
  // TERRENO E INTERFACE
  // ==================================================

  private isNearPath(x: number, y: number, threshold: number): boolean {
    for (const path of ALL_PATHS) {
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;

        if (len2 === 0) continue;

        const t = Phaser.Math.Clamp(
          ((x - a.x) * dx + (y - a.y) * dy) / len2,
          0, 1,
        );

        const px = a.x + t * dx;
        const py = a.y + t * dy;

        if (
          Phaser.Math.Distance.Between(x, y, px, py) < threshold
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private drawBars() {
    const g = this.barGraphics;
    g.clear();

    const shield = this.shieldUntil > this.time.now;

    this.drawBar(
      g, 130, 46, 228, 16,
      this.baseHP / this.maxBaseHP,
      shield ? 0x86d8ff : 0xe2574c,
      shield ? 0x1f5f8f : 0x7a1d18,
      10,
    );

    this.drawBar(
      g, 10, 72, 286, 16,
      this.mana / this.maxMana,
      0x4aa8ff, 0x1b3f9a, 10,
    );

    this.drawBar(
      g, 308, 72, 240, 16,
      this.xp / (this.heroLevel * 50),
      0xd9a8ff, 0x6a35a8, 0,
    );
  }

  private refreshInterface() {
    const now = this.time.now;
    const shield = this.shieldUntil > now;

    this.coinText.setText(this.finalChoice === 'tech' ? '∞' : `${this.coins}`);

    this.baseText.setText(
      `FORTALEZA  ${this.baseHP} / ${this.maxBaseHP}${shield ? '  ·  ESCUDO' : ''}`,
    );

    const worldLabel = this.finalChoice === 'real'
      ? 'REAL'
      : WORLD_INFO[this.worldLevel].short;

    const waveLabel = `${worldLabel} · ONDA ${this.wave}/${MAX_WAVES}`;

    if (this.waveText.text !== waveLabel) {
      this.waveText.setText(waveLabel);
      this.fitText(this.waveText, 112);
    }

    const nextWave = this.wave + 1;

    if (this.previewFor !== nextWave) {
      this.previewFor = nextWave;
      this.previewText = this.waveSummary(nextWave);
    }

    const enemyLabel = `${this.enemies.length} INIM.  |  ${this.previewText}`;

    if (this.enemyText.text !== enemyLabel) {
      this.enemyText.setText(enemyLabel);
      this.fitText(this.enemyText, 212);
    }

    this.manaText.setText(
      `MANA  ${Math.floor(this.mana)} / ${this.maxMana}`,
    );

    this.xpText.setText(`XP  ${this.xp} / ${this.heroLevel * 50}`);
    this.levelText.setText(`${this.heroLevel}`);

    this.setButtonLabel(this.heroButton, 'LOJA');

    this.drawBars();
  }

  // ==================================================
  // ONDAS ESPECIAIS, MUNDOS, AURA, ALIADOS
  // ==================================================

  private hash(a: number, b: number): number {
    const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return Math.abs(v) % 1;
  }

  private buildWave(w: number): SpawnSpec[] {
    const unlocked = (Object.keys(ENEMY_TYPES) as EnemyKind[])
      .filter(k => ENEMY_TYPES[k].unlock <= w);

    const specials = unlocked.filter(k => k !== 'comum');
    const isBoss = BOSS_WAVES.includes(w) || w === MAX_WAVES;
    const isElite = ELITE_WAVES.includes(w);
    const special = isBoss || isElite;

    let n = Math.min(7 + Math.floor(w * 1.3), 75);
    if (special) n = Math.floor(n * 0.5);

    const chance = specials.length ? Math.min(0.75, 0.2 + w * 0.006) : 0;
    const list: SpawnSpec[] = [];

    for (let i = 0; i < n; i++) {
      let kind: EnemyKind = 'comum';

      if (specials.length && this.hash(Math.floor(i / 4), w) < chance) {
        kind = specials[(Math.floor(i / 4) + w) % specials.length];
      }

      list.push({ kind, tier: 'normal' });
    }

    if (special) {
      const eliteKind = unlocked[Math.floor(w / 5) % unlocked.length];
      const eliteCount = w === MAX_WAVES ? 4 : 2;
      const elites: SpawnSpec[] = [];

      for (let i = 0; i < eliteCount; i++) {
        elites.push({
          kind: eliteKind,
          tier: 'elite',
          route: i % 2 === 0 ? 'left' : 'right',
        });
      }

      list.splice(Math.floor(list.length * 0.4), 0, ...elites);

      if (isBoss) {
        const bossKind = unlocked[Math.floor(w / 10) % unlocked.length];
        list.push({ kind: bossKind, tier: 'boss', route: 'left' });
      }
    }

    return list;
  }

  private waveSummary(w: number): string {
    if (w > MAX_WAVES) return 'CAMPANHA CONCLUÍDA';

    const list = this.buildWave(w);
    const counts: Partial<Record<EnemyKind, number>> = {};
    let elite = 0;
    let boss = 0;

    for (const spec of list) {
      if (spec.tier === 'elite') elite++;
      else if (spec.tier === 'boss') boss++;
      else counts[spec.kind] = (counts[spec.kind] || 0) + 1;
    }

    const parts = (Object.keys(counts) as EnemyKind[])
      .map(k => `${ENEMY_TYPES[k].short}·${counts[k]}`);

    if (elite) parts.push(`ELITE·${elite}`);
    if (boss) parts.push(`CHEFE·${boss}`);

    return `PRÓX.${w}: ${parts.join(' ')}`;
  }

  private waveAnnouncement(waveId: number, queue: SpawnSpec[]): string {
    let text = `Onda ${waveId} iniciada: ${queue.length} inimigos.`;
    const kinds: EnemyKind[] = [];
    let elite = 0;
    let boss = 0;

    for (const spec of queue) {
      if (spec.tier === 'elite') elite++;
      else if (spec.tier === 'boss') boss++;

      if (spec.kind !== 'comum' && !kinds.includes(spec.kind)) {
        kinds.push(spec.kind);
      }
    }

    if (elite) text += ` ${elite} ELITE(S).`;
    if (boss) text += ' CHEFÃO!';

    for (const k of kinds.slice(0, 2)) {
      const t = ENEMY_TYPES[k];

      text += `\n${t.name}: GUARDIÃ ${Math.round(t.resist.basic * 100)}%`
        + ` · BESTEIRA ${Math.round(t.resist.rapid * 100)}%`
        + ` · ARCANA ${Math.round(t.resist.sniper * 100)}%`;
    }

    return text;
  }

  private decorateEnemy(
    c: Phaser.GameObjects.Container,
    kind: EnemyKind,
    tier: Tier,
  ) {
    if (kind === 'couracado') {
      const plate = this.add.rectangle(0, -1, 18, 14, 0x8f959c)
        .setStrokeStyle(2, 0x3a4046);
      const stud = this.add.circle(0, -1, 2.5, 0xd9dde0);
      c.add([plate, stud]);
    } else if (kind === 'agil') {
      for (let i = 0; i < 3; i++) {
        c.add(this.add.rectangle(-20 - i * 3, -8 + i * 7, 10, 2, 0xcfe8ff, 0.5));
      }
    } else if (kind === 'antimagia') {
      const ring = this.add.circle(0, -2, 22)
        .setStrokeStyle(2, 0xb040ff, 0.85)
        .setBlendMode(Phaser.BlendModes.ADD);
      const sigil = this.add.star(0, -2, 5, 4, 8, 0xd070ff, 0.7);
      c.add([ring, sigil]);
    } else if (kind === 'pesado') {
      const plate = this.add.rectangle(0, 0, 22, 18, 0x59616a)
        .setStrokeStyle(2, 0xb0b6bb);
      const padL = this.add.circle(-14, -10, 7, 0x6d747a)
        .setStrokeStyle(2, 0x2a2f33);
      const padR = this.add.circle(14, -10, 7, 0x6d747a)
        .setStrokeStyle(2, 0x2a2f33);
      c.add([plate, padL, padR]);
    } else if (kind === 'espectral') {
      const ghost = this.add.ellipse(0, -2, 30, 38, 0x80f0ff, 0.28)
        .setBlendMode(Phaser.BlendModes.ADD);
      c.add(ghost);
    }

    if (tier === 'elite') {
      const ring = this.add.ellipse(0, 14, 60, 24, 0xffd54a, 0.22)
        .setStrokeStyle(2, GOLD_LIGHT, 0.9);
      c.addAt(ring, 0);

      for (const cx of [-8, 0, 8]) {
        c.add(this.add.triangle(cx, -36, -3, 6, 3, 6, 0, -6, 0xffd54a));
      }
    } else if (tier === 'boss') {
      const ring = this.add.ellipse(0, 14, 64, 26, 0xff4030, 0.3)
        .setStrokeStyle(3, 0xff6a50, 0.95);
      const glow = this.add.circle(0, -4, 36, 0xff3020, 0.18)
        .setBlendMode(Phaser.BlendModes.ADD);

      c.addAt(glow, 0);
      c.addAt(ring, 0);

      for (const cx of [-14, -7, 0, 7, 14]) {
        c.add(this.add.triangle(cx, -38, -3, 7, 3, 7, 0, -8, 0xff5a3a));
      }

      this.tweens.add({
        targets: glow,
        alpha: 0.05,
        scale: 1.25,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private animateLegs(
    legs: Phaser.GameObjects.Rectangle[],
    t: number,
    moving: boolean,
  ) {
    legs.forEach((leg, i) => {
      const base = (leg.getData('by') as number) ?? leg.y;
      leg.y = base + (moving ? Math.sin(t + i * Math.PI) * 3 : 0);
    });
  }

  // ---------- aura ----------

  private createWorldOverlay() {
    this.worldOverlay = this.add.rectangle(
      300, 487.5, WIDTH, 675, 0x000000, 0,
    ).setDepth(3);

    this.auraGraphics = this.add.graphics().setDepth(5);
    this.applyWorldTheme();
  }

  private applyWorldTheme() {
    if (this.finalChoice === 'real') {
      this.worldOverlay.setFillStyle(0x7a8088, 0.06);
    } else if (this.worldLevel === 2) {
      this.worldOverlay.setFillStyle(0xf0d28a, 0.05);
    } else if (this.finalChoice === 'tech') {
      this.worldOverlay.setFillStyle(0xfff0b0, 0.05);
    } else if (this.worldLevel === 3) {
      this.worldOverlay.setFillStyle(0x3ccfff, 0.04);
    } else {
      this.worldOverlay.setFillStyle(0x000000, 0);
    }
  }

  // Heróis presentes no campo (o ativo + os companheiros).
  private presentHeroes(): HeroKind[] {
    return [this.heroKind, ...this.companions.map(c => c.kind)];
  }

  // Aura passiva e permanente. Cada herói reforça SÓ o tipo de torre dele
  // (Guardião→Guardiã, Patrulheiro→Besteira, Arcanista→Arcana). O herói
  // fundido reforça todas, com bônus x1,5. Funciona desde o início e melhora
  // a cada nível de AURA (compartilhado entre os heróis).
  private auraFor(kind: TowerKind): AuraBoost {
    const mine = this.fused
      || this.presentHeroes().some(h => HERO_STATS[h].specialty === kind);

    if (!mine) return null;

    const rank = this.skillLevels.aura;
    const mult = this.fused ? 1.5 : 1;

    return {
      dmg: 1 + 0.1 * (rank + 1) * mult,
      spd: 1 + 0.08 * (rank + 1) * mult,
      rank,
    };
  }

  private updateAura() {
    const g = this.auraGraphics;
    g.clear();

    if (!this.towers.length) return;

    const pulse = 0.55 + 0.25 * Math.sin(this.time.now / 300);
    const boosts: Record<TowerKind, AuraBoost> = {
      basic: this.auraFor('basic'),
      rapid: this.auraFor('rapid'),
      sniper: this.auraFor('sniper'),
    };

    for (const t of this.towers) {
      if (!boosts[t.kind]) continue;

      g.fillStyle(GOLD_LIGHT, 0.12);
      g.fillEllipse(t.body.x, t.body.y + 14, 58, 24);
      g.lineStyle(2, GOLD_LIGHT, pulse);
      g.strokeEllipse(t.body.x, t.body.y + 14, 58, 24);
    }
  }

  // ---------- heróis ----------

  private applyHeroStats() {
    const st = HERO_STATS[this.heroKind];
    const lvl = this.heroLevel;

    const eq = this.equip[this.heroKind];

    const f = this.fused;

    this.heroDamage = (f ? 12 : st.damage) + (lvl - 1) + eq.weapon * 2;
    this.heroRange = (f ? 160 : st.range) + (lvl - 1) * 5 + eq.weapon * 4;
    this.heroAttackRate = f ? 360 : st.attackRate;
    this.heroSpeed = (f ? 255 : st.speed) + eq.armor * 8;

    this.maxMana = 100 + (f ? 60 : st.manaBonus) + (lvl - 1) * 5
      + this.extraMana * 25 + eq.relic * 10;
    this.manaRegen = 8 + eq.relic * 1.5 + (f ? 4 : 0);
    this.mana = Math.min(this.mana, this.maxMana);

    // Mundo Tecnológico: heróis com poder supremo.
    if (this.finalChoice === 'tech') {
      this.heroDamage = SUPREME_DAMAGE;
      this.heroRange = 440;
      this.heroAttackRate = 140;
      this.heroSpeed = Math.max(this.heroSpeed, 300);
    }

    this.applyHeroHp();
  }

  private applyHeroHp() {
    const eq = this.equip[this.heroKind];
    const baseHp = this.fused
      ? HERO_HP.guardiao + HERO_HP.patrulheiro + HERO_HP.arcanista
      : HERO_HP[this.heroKind];
    const max = baseHp + (this.heroLevel - 1) * 15 + eq.armor * 40;
    const ratio = this.heroMaxHp > 0 ? this.heroHp / this.heroMaxHp : 1;

    this.heroMaxHp = max;

    if (!this.heroDead) {
      this.heroHp = Math.max(1, Math.min(max, ratio * max));
    }
  }

  private makeCompanionVisual(kind: HeroKind, x: number, y: number) {
    const v = this.createHeroVisual(kind, x, y, this.equip[kind]).setDepth(7);

    return v;
  }

  private spawnCompanion(kind: HeroKind) {
    const slot = this.companions.length;
    const x = this.hero.x + (slot === 0 ? -54 : 54);
    const y = Math.min(815, this.hero.y + 24);

    const visual = this.makeCompanionVisual(kind, x, y);

    const label = this.add.text(x, y - 42, HERO_STATS[kind].name, {
      fontFamily: 'Georgia, serif',
      fontSize: '9px',
      color: '#cfe8d8',
      fontStyle: 'bold',
      backgroundColor: '#0b0d10b0',
      padding: { x: 4, y: 1 },
    }).setOrigin(0.5).setDepth(8);

    this.companions.push({
      kind,
      visual,
      legs: visual.getData('legs') as Phaser.GameObjects.Rectangle[],
      label,
      x,
      y,
      cd: 0,
      slot,
    });

    this.rebuildHeroSelector();

    const ring = this.add.circle(x, y, 18, 0xfff0a0, 0.3)
      .setStrokeStyle(3, GOLD_LIGHT, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);

    this.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 600,
      onComplete: () => ring.destroy(),
    });
  }

  // Companheiros: lutam sozinhos ao lado do herói ativo.
  private updateCompanions(delta: number) {
    if (!this.companions.length) return;

    const now = this.time.now;
    const offsets = [{ x: -54, y: 24 }, { x: 54, y: 24 }];
    const shotColor: Record<HeroKind, number> = {
      guardiao: 0xf0dd9f,
      patrulheiro: 0xb8ff9a,
      arcanista: 0xd09fff,
    };

    for (const c of this.companions) {
      const st = HERO_STATS[c.kind];
      const eq = this.equip[c.kind];
      const supreme = this.finalChoice === 'tech';
      const range = supreme ? 440 : st.range + (this.heroLevel - 1) * 5 + eq.weapon * 4;
      const speed = st.speed + eq.armor * 8;

      let target: Enemy | undefined;
      let best = Infinity;

      for (const e of this.enemies) {
        if (!e.alive) continue;

        if (
          Phaser.Math.Distance.Between(
            e.body.x, e.body.y, this.hero.x, this.hero.y,
          ) > 260
        ) continue;

        const d = Phaser.Math.Distance.Between(c.x, c.y, e.body.x, e.body.y);

        if (d < best) {
          best = d;
          target = e;
        }
      }

      let destX: number;
      let destY: number;
      let stop: number;

      if (target) {
        destX = target.body.x;
        destY = target.body.y;
        stop = range * 0.7;
      } else {
        const o = offsets[c.slot % 2];
        destX = this.hero.x + o.x;
        destY = this.hero.y + o.y;
        stop = 6;
      }

      const dx = destX - c.x;
      const dy = destY - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let moved = false;

      if (dist > 600) {
        c.x = this.hero.x + offsets[c.slot % 2].x;
        c.y = this.hero.y + offsets[c.slot % 2].y;
      } else if (dist > stop) {
        const step = Math.min(speed * delta / 1000, dist - stop);
        c.x += dx / dist * step;
        c.y = Phaser.Math.Clamp(c.y + dy / dist * step, 175, 815);
        moved = true;

        if (Math.abs(dx) > 2) c.visual.setScale(dx < 0 ? -1 : 1, 1);
      }

      c.visual.setPosition(c.x, c.y);
      c.label.setPosition(c.x, c.y - 42);
      this.animateLegs(c.legs, now / 70, moved);

      c.cd -= delta;

      if (target && c.cd <= 0 && best <= range) {
        c.cd = supreme ? 140 : st.attackRate;

        const shot = this.add.rectangle(c.x, c.y - 7, 4, 15, shotColor[c.kind])
          .setRotation(-0.4)
          .setDepth(12);

        this.tweens.add({
          targets: shot,
          x: target.body.x,
          y: target.body.y,
          duration: 130,
          onComplete: () => shot.destroy(),
        });

        this.hitTarget(
          target,
          supreme
            ? SUPREME_DAMAGE
            : Math.max(1, Math.round((st.damage + (this.heroLevel - 1) + eq.weapon * 2) * 0.8)),
          c.x,
          c.y,
        );
      }
    }
  }

  // Seletor de heróis: botões à esquerda da fortaleza.
  private rebuildHeroSelector() {
    for (const o of this.selectorObjs) {
      if (o.active) this.killVisual(o);
    }

    this.selectorObjs = [];
    this.selectorRects = [];

    if (this.fused || !this.companions.length) return;

    this.presentHeroes().forEach((k, i) => {
      const x = 8 + i * 54;
      const y = 762;
      const w = 50;
      const h = 58;
      const active = k === this.heroKind;

      const bg = this.add.graphics().setDepth(20);
      bg.fillStyle(0x0b0d10, 0.85);
      bg.fillRoundedRect(x, y, w, h, 6);
      bg.lineStyle(active ? 3 : 1, active ? GOLD_LIGHT : 0x6a6250, 1);
      bg.strokeRoundedRect(x, y, w, h, 6);

      const v = this.createHeroVisual(k, x + w / 2, y + 30, this.equip[k])
        .setScale(0.8)
        .setDepth(21);

      const name = this.add.text(x + w / 2, y + h - 7, HERO_STATS[k].name.slice(0, 5), {
        fontFamily: 'Georgia, serif',
        fontSize: '8px',
        color: active ? '#f0d58a' : '#a8a08a',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(22);

      this.selectorObjs.push(bg, v, name);
      this.selectorRects.push({ x, y, w, h, kind: k });
    });
  }

  // Assume o controle de um dos heróis em campo (os outros seguem lutando).
  private swapHero(kind: HeroKind) {
    const comp = this.companions.find(c => c.kind === kind);

    if (!comp || this.fused || kind === this.heroKind) return;

    if (this.heroDead) {
      this.showMessage('Reviva o herói antes de trocar de controle.');
      return;
    }

    const old = this.heroKind;
    const hx = this.hero.x;
    const hy = this.hero.y;

    this.hero.setPosition(comp.x, comp.y);
    comp.x = hx;
    comp.y = hy;

    this.killVisual(this.heroVisual);
    this.heroKind = kind;
    this.heroVisual = this.buildActiveVisual(this.hero.x, this.hero.y);
    this.heroLegs = this.heroVisual.getData('legs') as Phaser.GameObjects.Rectangle[];

    this.killVisual(comp.visual);
    comp.kind = old;
    comp.visual = this.makeCompanionVisual(old, comp.x, comp.y);
    comp.legs = comp.visual.getData('legs') as Phaser.GameObjects.Rectangle[];
    comp.label.setText(HERO_STATS[old].name).setPosition(comp.x, comp.y - 42);
    this.restyleAllies();

    this.applyHeroStats();
    this.heroLabel
      .setText(`${this.heroTitle()} · Nv. ${this.heroLevel}`)
      .setPosition(this.hero.x, this.hero.y - 42);

    const ring = this.add.circle(this.hero.x, this.hero.y, 18, 0xfff0a0, 0.3)
      .setStrokeStyle(3, GOLD_LIGHT, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);

    this.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 500,
      onComplete: () => ring.destroy(),
    });

    this.closeContextMenu();
    this.rebuildHeroSelector();
    this.showMessage(`Você controla o ${HERO_STATS[kind].name}. Toque nele para usar as habilidades.`);
    this.refreshInterface();
  }

  // ---------- fusão (Mundo Real) ----------

  private canFuse(): boolean {
    return this.finalChoice !== null && !this.fused && this.companions.length >= 2;
  }

  private openFusionOffer() {
    const god = this.finalChoice === 'tech';

    const body = god
      ? 'Nos céus, seus três heróis podem se fundir em um DEUS SUPREMO.\n\n' +
        'O deus soma as habilidades dos três com poder divino: golpes que varrem o campo, ' +
        'aura radiante, vida e mana enormes e o golpe final JUÍZO FINAL.\n\n' +
        'A fusão é permanente. Você também pode ascender depois, no painel do herói.'
      : 'No Mundo Real, seus três heróis podem se fundir em UM só.\n\n' +
        'O herói fundido soma as habilidades dos três, com poderes mais fortes (x1,5), ' +
        'aura em TODAS as torres, vida e mana maiores e o golpe final JUÍZO FINAL.\n\n' +
        'A fusão é permanente. Você também pode fundir depois, no painel do herói.';

    this.openModal(god ? 'ASCENDER A DEUS SUPREMO?' : 'FUNDIR OS HERÓIS?', body, [
      {
        label: god ? 'ASCENDER AGORA' : 'FUNDIR AGORA',
        color: '#8a6a22',
        action: () => this.fuseHeroes(),
      },
      { label: 'DEPOIS', color: '#3a4046', action: () => this.closeModal() },
    ]);
  }

  private fuseHeroes() {
    if (!this.canFuse()) return;

    if (this.heroDead) {
      this.closeModal();
      this.showMessage('Reviva o herói antes de fundir.');
      return;
    }

    // A fusão herda o melhor armamento dos três (+1, máx. 5).
    for (const slot of GEAR_SLOTS) {
      const top = Math.max(...HERO_ORDER.map(h => this.equip[h][slot]));
      this.equip.guardiao[slot] = Math.min(5, top + 1);
    }

    for (const c of this.companions) {
      this.killVisual(c.visual);
      c.label.destroy();
    }

    this.companions = [];
    this.rebuildHeroSelector();
    this.destroyClones();
    this.fused = true;
    this.heroKind = 'guardiao';

    this.killVisual(this.heroVisual);
    this.heroVisual = this.buildActiveVisual(this.hero.x, this.hero.y);
    this.heroLegs = this.heroVisual.getData('legs') as Phaser.GameObjects.Rectangle[];

    this.applyHeroStats();
    this.heroHp = this.heroMaxHp;
    this.mana = this.maxMana;
    this.heroLabel.setText(`${this.heroTitle()} · Nv. ${this.heroLevel}`);
    this.restyleAllies();

    this.cameras.main.flash(400, 255, 240, 170);
    this.cameras.main.shake(300, 0.008);

    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(this.hero.x, this.hero.y, 16, 0xfff0a0, 0.25)
        .setStrokeStyle(4, [0xe2574c, 0x7dff9a, 0xb08cff][i], 0.95)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(14);

      this.tweens.add({
        targets: ring,
        scale: 7 + i * 1.5,
        alpha: 0,
        duration: 700,
        delay: i * 120,
        onComplete: () => ring.destroy(),
      });
    }

    this.closeModal();
    this.showMessage(
      this.finalChoice === 'tech'
        ? 'Os três heróis ascenderam: nasce o DEUS SUPREMO!'
        : 'Os três heróis se fundiram! Habilidades somadas e melhoradas.',
    );
    this.refreshInterface();
  }

  // ---------- modais ----------

  private closeModal() {
    for (const o of this.modalObjects) {
      if (o.active) this.killVisual(o);
    }

    this.modalObjects = [];
    this.modalBody = undefined;
    this.panelNote = undefined;
    this.modalOpen = false;
  }

  private openModal(
    title: string,
    body: string,
    buttons: { label: string; color: string; action: () => void }[],
  ) {
    this.closeModal();
    this.cancelBuild();
    this.closeContextMenu();
    this.modalOpen = true;

    const dim = this.add.rectangle(300, 500, WIDTH, HEIGHT, 0x000000, 0.65)
      .setDepth(50)
      .setInteractive();

    const panel = this.add.graphics().setDepth(51);
    this.drawPanelFrame(panel, 50, 340, 500, 300, 10);

    const heading = this.add.text(300, 370, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '19px',
      color: '#f0d58a',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(52);

    const text = this.add.text(75, 405, body, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#efe6cc',
      wordWrap: { width: 450 },
      lineSpacing: 5,
    }).setDepth(52);

    this.modalBody = text;
    this.modalObjects.push(dim, panel, heading, text);

    buttons.forEach((b, i) => {
      const btn = this.makeButton(
        70 + i * 240, 580, b.label, b.color, b.action, 11, 220, 36,
      );

      btn.setDepth(53);
      this.modalObjects.push(btn);
    });
  }

  private gateWave(level: number): number {
    return level === 2 ? 30 : level === 3 ? 60 : 91;
  }

  // 2 e 3 = mundos; 4 = mundo supremo (só depois do mundo 3).
  private nextUpgrade(): number | null {
    if (this.worldLevel < 3) return this.worldLevel + 1;

    return this.finalChoice === null ? 4 : null;
  }

  private upgradeAvailable(): boolean {
    const up = this.nextUpgrade();

    return up !== null && this.wave + 1 >= this.gateWave(up);
  }

  // Verdadeiro quando a pergunta veio do botão de iniciar onda.
  private atGate(_level: number): boolean {
    return this.gatePrompt;
  }

  private openUpgrade(level: number, fromStart = false) {
    this.gatePrompt = fromStart;

    if (level === 4) this.openFinalChoice();
    else this.openWorldUnlock(level);
  }

  private continueInWorld() {
    this.skipGateWave = this.wave + 1;
    this.closeModal();
    this.showMessage(
      'Você continua no mundo atual. Os monstros ficam mais rápidos; a pergunta volta na próxima onda.',
    );
    this.startWave();
  }

  // Quanto mais portões ignorados, mais rápidos os monstros.
  private overdueSpeed(waveId: number): number {
    let n = 0;

    if (this.worldLevel < 2 && waveId >= 30) n++;
    if (this.worldLevel < 3 && waveId >= 60) n++;
    if (this.finalChoice === null && waveId >= 91) n++;

    return Math.pow(1.25, n);
  }

  private openWorldUnlock(level: number) {
    const info = WORLD_INFO[level];
    const nextHero = HERO_ORDER.find(h => !this.unlockedHeroes.includes(h));
    const heroName = nextHero ? HERO_STATS[nextHero].name : '—';

    const gate = this.atGate(level);

    const body =
      `Custo: ${info.cost} moedas  (você tem ${this.coins})\n` +
      `Recompensa: ${heroName} entra na batalha (heróis em campo ao mesmo tempo).\n` +
      'Ele luta sozinho; use os botões à esquerda da fortaleza para escolher qual herói controlar.' +
      (gate
        ? '\n\nSe continuar no mundo atual, os monstros ficam mais rápidos até você fazer o upgrade. A pergunta volta a cada onda.'
        : '');

    this.openModal(info.name, body, [
      {
        label: `DESBLOQUEAR · ${info.cost}`,
        color: '#8a6a22',
        action: () => {
          if (this.coins < info.cost) {
            this.modalBody?.setText(body + '\n\nMOEDAS INSUFICIENTES!').setColor('#ff9a8a');
            return;
          }

          this.unlockWorld(level);
        },
      },
      gate
        ? { label: 'CONTINUAR NO MUNDO ATUAL', color: '#3a4046', action: () => this.continueInWorld() }
        : { label: 'AGORA NÃO', color: '#3a4046', action: () => this.closeModal() },
    ]);
  }

  private unlockWorld(level: number) {
    const info = WORLD_INFO[level];

    this.coins -= info.cost;
    this.worldLevel = level;

    const nextHero = HERO_ORDER.find(h => !this.unlockedHeroes.includes(h));
    if (nextHero) {
      this.unlockedHeroes.push(nextHero);
      this.spawnCompanion(nextHero);
    }

    this.closeModal();
    this.restyleAllies();

    const greece = level === 2;

    this.playTransition(
      greece ? 'greece' : 'tech',
      greece
        ? [
          'As muralhas ganham mármore e glória.',
          'Soldados de bronze marcham sob o olhar dos deuses.',
          'Zeus observa. Que a sua defesa seja lendária!',
        ]
        : [
          'Máquinas despertam e o aço substitui a pedra.',
          'Robôs e drones invadem o campo de batalha.',
          'A tecnologia será a sua arma... ou a sua ruína.',
        ],
      () => {
        this.applyWorldTheme();
        this.redrawWorld();
      },
      () => {
        this.showMessage(
          `${info.name} desbloqueado!` +
          (nextHero ? ` ${HERO_STATS[nextHero].name} agora luta ao seu lado.` : '') +
          ' Inicie a onda novamente.',
        );

        this.refreshInterface();
      },
    );
  }

  private openFinalChoice() {
    const gate = this.atGate(4);

    const body =
      `Deseja ascender ao mundo supremo?\n\nVocê tem ${this.coins} moedas.` +
      (gate
        ? '\n\nSe continuar no mundo atual, os monstros ficam mais rápidos até você ascender. A pergunta volta a cada onda.'
        : '');

    this.openModal('O MUNDO SUPREMO', body, [
      {
        label: `ASCENDER · ${SUPREME_WORLD_COST}`,
        color: '#2d6a8a',
        action: () => {
          if (this.coins < SUPREME_WORLD_COST) {
            this.modalBody?.setText(body + '\n\nMOEDAS INSUFICIENTES!').setColor('#ff9a8a');
            return;
          }

          // O histórico guardado é o de antes do pagamento.
          this.chooseFinal('tech');
        },
      },
      gate
        ? { label: 'CONTINUAR NO MUNDO ATUAL', color: '#3a4046', action: () => this.continueInWorld() }
        : { label: 'AGORA NÃO', color: '#3a4046', action: () => this.closeModal() },
    ]);
  }

  private chooseFinal(choice: 'tech' | 'real') {
    this.closeModal();

    if (choice === 'tech') this.enterSupreme();

    this.finalChoice = choice;

    if (choice === 'real') {
      // O Mundo Real traz mais ajuda: aliados extras de todos os tipos.
      this.spawnAllies('dog');
      this.spawnAllies('human');
      this.spawnAllies('drone');
    } else {
      this.applyHeroStats();
      this.mana = this.maxMana;
    }

    this.playTransition(
      choice === 'tech' ? 'sky' : 'real',
      choice === 'tech'
        ? [
          'O poder supremo desperta e você ascende aos céus.',
          'As torres desaparecem. Os aliados se recolhem.',
          'Só restam os heróis, e nada pode detê-los.',
        ]
        : [
          'Sem fantasia: apenas o mundo como ele é.',
          'Aliados de todos os mundos lutam ao seu lado.',
          'Os monstros são fortes. A coragem é a sua arma.',
        ],
      () => {
        this.applyWorldTheme();
        this.redrawWorld();
      },
      () => {
        this.showMessage('Mundo escolhido. Inicie a onda 91.');

        if (this.canFuse()) this.openFusionOffer();
      },
    );
  }

  // ---------- poderes dos heróis e das torres ----------

  private heroSkills(): SkillKind[] {
    if (this.fused) return ['explosion', 'clones', 'lightning', 'strike'];

    // O Golpe Heroico (ultimate) é sempre o último.
    return [HERO_STATS[this.heroKind].skill, 'repair', 'aura', 'strike'];
  }

  private heroBlockRadius(): number {
    return (this.fused ? 36 : HERO_STATS[this.heroKind].blockRadius)
      + this.equip[this.heroKind].armor * 3;
  }

  private towerPowerText(t: Tower): string {
    const on = t.level >= 5;

    if (t.kind === 'basic') {
      return on
        ? 'PODER NV.5: bolas de fogo em área; deixam fogo no chão e incendeiam 2 s.'
        : 'Nv.5 libera: bolas de fogo em área.';
    }

    if (t.kind === 'rapid') {
      return on
        ? 'PODER NV.5: metralhadora; após 2 s atirando, atordoa o alvo por 1 s.'
        : 'Nv.5 libera: modo metralhadora.';
    }

    return on
      ? 'PODER NV.5: gelo em área, 50% mais lentos por 2 s; deixa o chão congelado.'
      : 'Nv.5 libera: lentidão em área.';
  }

  private fireballBlast(x: number, y: number, raw: number, main: Enemy) {
    const now = this.time.now;

    for (const e of this.enemies) {
      if (!e.alive) continue;

      if (Phaser.Math.Distance.Between(e.body.x, e.body.y, x, y) > 58) continue;

      if (e !== main) this.damageEnemy(e, raw * e.resist.basic);

      // Pegam fogo por cerca de 2 segundos.
      if (e.alive) {
        e.burnUntil = now + 2000;
        e.burnDps = Math.max(e.burnDps, raw * 0.35 * e.resist.basic);
      }
    }

    this.addZone('fire', x, y, 48, now, raw * 0.35);

    const blast = this.add.circle(x, y, 12, 0xff8a2a, 0.55)
      .setStrokeStyle(3, 0xffd16b, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);

    this.tweens.add({
      targets: blast,
      scale: 4.8,
      alpha: 0,
      duration: 280,
      onComplete: () => blast.destroy(),
    });
  }

  private slowArea(x: number, y: number, now: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue;

      if (Phaser.Math.Distance.Between(e.body.x, e.body.y, x, y) <= 78) {
        // Meio congelados: 50% mais lentos por 2 segundos.
        e.slowUntil = now + 2000;
      }
    }

    this.addZone('ice', x, y, 62, now, 0);

    const ring = this.add.circle(x, y, 10, 0x6ab0ff, 0.2)
      .setStrokeStyle(3, 0x9fd0ff, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);

    this.tweens.add({
      targets: ring,
      scale: 7.8,
      alpha: 0,
      duration: 400,
      onComplete: () => ring.destroy(),
    });
  }

  private drawTracers(delta: number) {
    const g = this.tracerLayer;
    g.clear();

    if (!this.tracers.length) return;

    for (const t of this.tracers) {
      g.lineStyle(
        t.w ?? 2, t.color ?? 0xfff0a0, Math.max(0, t.ttl / (t.life ?? 70)),
      );
      g.lineBetween(t.x1, t.y1, t.x2, t.y2);
      t.ttl -= delta;
    }

    this.tracers = this.tracers.filter(t => t.ttl > 0);
  }

  private drawBolt(x1: number, y1: number, x2: number, y2: number) {
    const g = this.add.graphics().setDepth(14);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];

    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const off = (Math.random() - 0.5) * 18;

      pts.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off });
    }

    pts.push({ x: x2, y: y2 });

    const draw = (width: number, color: number, alpha: number) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);

      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);

      g.strokePath();
    };

    draw(6, 0x9a7bff, 0.55);
    draw(2, 0xffffff, 1);

    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 240,
      onComplete: () => g.destroy(),
    });
  }

  private useLightning(cost: number, rank: number) {
    const range = 190 + rank * 10;
    const count = 3 + rank;
    const damage = Math.round(
      (4 + Math.floor(this.heroLevel * 0.9) + rank * 2) * this.powerMult(),
    );

    const targets = this.enemies
      .filter(e => e.alive && Phaser.Math.Distance.Between(
        this.hero.x, this.hero.y, e.body.x, e.body.y,
      ) <= range)
      .sort((a, b) =>
        Phaser.Math.Distance.Between(this.hero.x, this.hero.y, a.body.x, a.body.y) -
        Phaser.Math.Distance.Between(this.hero.x, this.hero.y, b.body.x, b.body.y),
      )
      .slice(0, count);

    if (!targets.length) {
      this.showMessage('Nenhum inimigo ao alcance dos Raios.');
      return;
    }

    this.mana -= cost;

    let fx = this.hero.x;
    let fy = this.hero.y - 10;

    for (const t of targets) {
      const tx = t.body.x;
      const ty = t.body.y - 6;

      this.drawBolt(fx, fy, tx, ty);
      this.damageEnemy(t, damage);

      fx = tx;
      fy = ty;
    }

    this.showMessage(`Raios! ${targets.length} inimigo(s) atingido(s).`);
  }

  private destroyClones() {
    for (const c of this.clones) this.killVisual(c.visual);
    this.clones = [];
  }

  private useClones(cost: number, rank: number) {
    this.mana -= cost;
    this.destroyClones();

    const duration = 8000 + rank * 1500;
    this.cloneUntil = this.time.now + duration;

    for (let i = 0; i < 2; i++) {
      const visual = this.createHeroVisual('patrulheiro', this.hero.x, this.hero.y, this.equip.patrulheiro)
        .setDepth(7)
        .setAlpha(0.7);

      visual.addAt(
        this.add.circle(0, 0, 24, 0x50e0ff, 0.2)
          .setBlendMode(Phaser.BlendModes.ADD),
        0,
      );

      this.clones.push({
        visual,
        legs: visual.getData('legs') as Phaser.GameObjects.Rectangle[],
        x: this.hero.x,
        y: this.hero.y,
        cd: 0,
        slot: i,
      });
    }

    this.floatText(this.hero.x, this.hero.y - 58, 'CLONES!', '#9fe8ff', 13);
    this.showMessage(
      `Clones invocados por ${(duration / 1000).toFixed(1)}s. Velocidade e ataque aumentados.`,
    );
  }

  private updateClones(delta: number) {
    if (!this.clones.length) return;

    const now = this.time.now;

    if (now > this.cloneUntil) {
      this.destroyClones();
      return;
    }

    const offsets = [{ x: -38, y: 12 }, { x: 38, y: 12 }];

    for (const c of this.clones) {
      const dest = offsets[c.slot];
      const tx = this.hero.x + dest.x;
      const ty = this.hero.y + dest.y;
      const dx = tx - c.x;
      const dy = ty - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let moved = false;

      if (dist > 4) {
        const step = Math.min(this.heroSpeed * 1.6 * delta / 1000, dist);
        c.x += dx / dist * step;
        c.y += dy / dist * step;
        moved = true;

        if (Math.abs(dx) > 2) c.visual.setScale(dx < 0 ? -1 : 1, 1);
      }

      c.visual.setPosition(c.x, c.y);
      this.animateLegs(c.legs, now / 70, moved);

      c.cd -= delta;
      if (c.cd > 0) continue;

      let target: Enemy | undefined;
      let best = this.heroRange;

      for (const e of this.enemies) {
        if (!e.alive) continue;

        const d = Phaser.Math.Distance.Between(c.x, c.y, e.body.x, e.body.y);

        if (d <= best) {
          best = d;
          target = e;
        }
      }

      if (target) {
        c.cd = this.heroAttackRate * 0.7;

        const projectile = this.add.rectangle(c.x, c.y - 7, 4, 15, 0x9fe8ff)
          .setRotation(-0.4)
          .setDepth(12);

        this.tweens.add({
          targets: projectile,
          x: target.body.x,
          y: target.body.y,
          duration: 130,
          onComplete: () => projectile.destroy(),
        });

        this.damageEnemy(target, Math.max(1, Math.round(this.heroDamage * 0.7)));
      }
    }
  }

  // ---------- painel do herói, armamento e PIX ----------

  private gearCost(slot: Gear, level: number): number {
    return GEAR_BASE_COST[slot] * (level + 1);
  }

  private refreshHeroLook() {
    const flip = this.heroVisual.scaleX < 0 ? -1 : 1;

    this.killVisual(this.heroVisual);
    this.heroVisual = this.buildActiveVisual(this.hero.x, this.hero.y);
    this.heroVisual.setScale(flip, 1);
    this.heroVisual.setVisible(!this.heroDead);
    this.heroLegs = this.heroVisual.getData('legs') as Phaser.GameObjects.Rectangle[];
    this.rebuildHeroSelector();
  }

  private buyGear(slot: Gear) {
    const eq = this.equip[this.heroKind];
    const level = eq[slot];

    if (level >= 5) return;

    const cost = this.gearCost(slot, level);

    if (this.coins < cost) {
      this.panelNote?.setText(
        'Moedas insuficientes. Derrote inimigos ou compre moedas com PIX.',
      );
      return;
    }

    this.coins -= cost;
    eq[slot]++;
    this.applyHeroStats();
    this.refreshHeroLook();

    if (slot === 'relic') {
      this.mana = Math.min(this.maxMana, this.mana + 10);
    }

    this.showMessage(
      `${HERO_STATS[this.heroKind].gear[GEAR_SLOTS.indexOf(slot)]} melhorado para o nível ${eq[slot]}.`,
    );

    this.openHeroPanel();
    this.refreshInterface();
  }

  private openHeroPanel() {
    if (this.gameOver) return;

    this.closeModal();
    this.cancelBuild();
    this.closeContextMenu();
    this.selectedTower = null;
    this.rangeGraphics.clear();
    this.modalOpen = true;

    const kind = this.heroKind;
    const st = HERO_STATS[kind];
    const eq = this.equip[kind];

    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.modalObjects.push(o);
      return o;
    };

    const label = (
      x: number, y: number, text: string, size: number, color: string,
      bold = false,
    ) => keep(
      this.add.text(x, y, text, {
        fontFamily: bold ? 'Georgia, serif' : 'Arial, sans-serif',
        fontSize: `${size}px`,
        color,
        fontStyle: bold ? 'bold' : 'normal',
      }).setDepth(52),
    );

    keep(
      this.add.rectangle(300, 500, WIDTH, HEIGHT, 0x000000, 0.7)
        .setDepth(50)
        .setInteractive(),
    );

    const panel = keep(this.add.graphics().setDepth(51));
    this.drawPanelFrame(panel, 20, 60, 560, 880, 10);

    keep(
      this.add.text(300, 88, `${this.heroTitle()}  ·  NÍVEL ${this.heroLevel}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#f0d58a',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(52),
    );

    // visual do herói
    panel.fillStyle(0x1d2a22, 1);
    panel.fillEllipse(115, 262, 130, 28);
    panel.lineStyle(1, GOLD, 0.6);
    panel.strokeEllipse(115, 262, 130, 28);

    keep(
      (this.fused
        ? this.buildActiveVisual(115, 215)
        : this.createHeroVisual(kind, 115, 215, eq)
      ).setScale(3).setDepth(52),
    );

    // atributos
    const rows: [string, string][] = [
      ['DANO', `${this.heroDamage}`],
      ['ALCANCE', `${Math.round(this.heroRange)}`],
      ['VELOCIDADE', `${Math.round(this.heroSpeed)}`],
      ['ATAQUE', `${(1000 / this.heroAttackRate).toFixed(1)}/s`],
      ['MANA', `${this.maxMana}  (+${this.manaRegen.toFixed(1)}/s)`],
      ['BLOQUEIO', `${this.heroBlockRadius()}`],
    ];

    rows.forEach(([name, value], i) => {
      label(230, 126 + i * 24, name, 12, '#c9a24d', true);
      label(350, 126 + i * 24, value, 13, '#efe6cc');
    });

    const aura = this.auraFor(st.specialty);

    label(
      40, 280,
      aura
        ? (this.fused
          ? `Aura Fundida Nv.${aura.rank}: +${Math.round(aura.dmg * 100 - 100)}% dano e +${Math.round(aura.spd * 100 - 100)}% velocidade em TODAS as torres.`
          : `${st.auraName} Nv.${aura.rank}: +${Math.round(aura.dmg * 100 - 100)}% dano e +${Math.round(aura.spd * 100 - 100)}% velocidade só nas torres ${TOWER_STATS[st.specialty].name}.`)
        : '',
      11, '#e6dfcd',
    ).setWordWrapWidth(520);

    // armamento
    label(40, 318, 'ARMAMENTO', 13, '#f0d58a', true);
    panel.lineStyle(1, GOLD, 0.6);
    panel.lineBetween(40, 338, 560, 338);

    GEAR_SLOTS.forEach((slot, i) => {
      const y = 348 + i * 92;
      const level = eq[slot];

      panel.fillStyle(0x0d1114, 0.9);
      panel.fillRect(36, y, 528, 82);
      panel.lineStyle(1, GOLD_DARK, 1);
      panel.strokeRect(36, y, 528, 82);

      label(
        50, y + 8,
        `${st.gear[i]}  ·  ${level === 0 ? 'Sem melhoria' : GEAR_TIERS[level - 1]}`,
        14, '#f0d58a', true,
      );

      label(50, y + 32, GEAR_EFFECT[slot], 11, '#d9d0b7');

      for (let p = 0; p < 5; p++) {
        panel.fillStyle(p < level ? GOLD_LIGHT : 0x23262a, 1);
        panel.fillRect(50 + p * 18, y + 58, 14, 8);
        panel.lineStyle(1, 0x000000, 1);
        panel.strokeRect(50 + p * 18, y + 58, 14, 8);
      }

      const maxed = level >= 5;
      const btn = this.makeButton(
        384, y + 22, maxed ? 'NÍVEL MÁXIMO' : `MELHORAR · ${this.gearCost(slot, level)}`,
        maxed ? '#2b302b' : '#8a6a22',
        () => this.buyGear(slot),
        11, 164, 38,
      );

      btn.setDepth(53);
      keep(btn);
    });

    // moedas e PIX
    label(40, 636, `MOEDAS: ${this.coins}`, 16, '#ffe08a', true);

    const pix = this.makeButton(
      40, 664, 'COMPRAR MOEDAS COM PIX', '#1f7a5a',
      () => this.openPixShop(), 13, 520, 40,
    );

    pix.setDepth(53);
    keep(pix);

    const skills = this.makeButton(
      40, 718, 'HABILIDADES', '#5e4482',
      () => {
        this.closeModal();
        this.openHeroMenu();
      },
      12, 255, 40,
    );

    skills.setDepth(53);
    keep(skills);

    const close = this.makeButton(
      305, 718, 'FECHAR', '#3a4046',
      () => this.closeModal(), 12, 255, 40,
    );

    close.setDepth(53);
    keep(close);

    if (this.companions.length) {
      label(
        40, 772,
        `Heróis em campo: ${this.presentHeroes().map(h => HERO_STATS[h].name).join(', ')}. Escolha quem controlar nos botões à esquerda da fortaleza.`,
        12, '#cfe8d8',
      ).setWordWrapWidth(520);
    } else if (this.fused) {
      label(40, 776, 'Os três heróis estão fundidos em um só.', 11, '#f0d58a');
    } else {
      label(40, 776, 'Mundo 2 libera o 2º herói em campo; Mundo 3 libera o 3º.', 11, '#b39a62');
    }

    if (this.upgradeAvailable()) {
      const up = this.nextUpgrade() as number;
      const cost = up === 4 ? SUPREME_WORLD_COST : WORLD_INFO[up].cost;
      const ub = this.makeButton(
        40, 804,
        up === 4 ? `ASCENDER AO MUNDO SUPREMO · ${cost}` : `MELHORAR O MUNDO · ${cost}`,
        '#2d6a8a',
        () => this.openUpgrade(up),
        12, 520, 30,
      );

      ub.setDepth(53);
      keep(ub);
    }

    if (this.canFuse()) {
      const fb = this.makeButton(
        40, 804, this.finalChoice === 'tech' ? 'ASCENDER A DEUS SUPREMO' : 'FUNDIR OS 3 HERÓIS', '#8a5a1a',
        () => this.openFusionOffer(), 12, 520, 30,
      );

      fb.setDepth(53);
      keep(fb);
    }

    label(
      40, 840,
      `Vida: ${Math.ceil(this.heroHp)}/${this.heroMaxHp}   ·   Pontos: ${this.skillPoints}   ·   XP ${this.xp} / ${this.heroLevel * 50}`,
      12, '#d9d0b7',
    );

    this.panelNote = label(40, 862, '', 12, '#ff9a8a');

    if (this.heroDead) {
      const rv = this.makeButton(
        40, 884, `REVIVER HERÓI · ${this.reviveCost()}`, '#8a3a2c',
        () => {
          if (this.coins < this.reviveCost()) {
            this.panelNote?.setText('Moedas insuficientes para reviver.');
            return;
          }

          this.reviveHero();
        },
        13, 520, 40,
      );

      rv.setDepth(53);
      keep(rv);
    }
  }

  private openPixShop() {
    this.closeModal();
    this.modalOpen = true;

    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.modalObjects.push(o);
      return o;
    };

    keep(
      this.add.rectangle(300, 500, WIDTH, HEIGHT, 0x000000, 0.75)
        .setDepth(50)
        .setInteractive(),
    );

    const panel = keep(this.add.graphics().setDepth(51));
    this.drawPanelFrame(panel, 50, 290, 500, 470, 10);

    keep(
      this.add.text(300, 322, 'COMPRAR MOEDAS · PIX', {
        fontFamily: 'Georgia, serif',
        fontSize: '19px',
        color: '#f0d58a',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(52),
    );

    keep(
      this.add.text(75, 352, 'Escolha um pacote. O jogo gera o código PIX Copia e Cola com o valor; pague no app do seu banco.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#efe6cc',
        wordWrap: { width: 450 },
        lineSpacing: 4,
      }).setDepth(52),
    );

    const note = keep(
      this.add.text(75, 568, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#9fe3b0',
        wordWrap: { width: 450 },
        lineSpacing: 4,
      }).setDepth(52),
    );

    PIX_PACKS.forEach((pack, i) => {
      const b = this.makeButton(
        75, 412 + i * 52, `${pack.coins} MOEDAS  ·  ${pack.label}`, '#1f7a5a',
        () => {
          const payload = buildPixPayload(pack.value);

          const show = (copied: boolean) => {
            note.setColor(copied ? '#9fe3b0' : '#ffd9a0');
            note.setText(
              `${copied ? 'Código PIX copiado!' : 'Não foi possível copiar automaticamente.'}\n` +
              `${payload}\n\n` +
              'No app do seu banco: PIX > Pix Copia e Cola.',
            );
          };

          if (navigator.clipboard) {
            navigator.clipboard.writeText(payload).then(
              () => show(true),
              () => show(false),
            );
          } else {
            show(false);
          }
        },
        13, 450, 40,
      );

      b.setDepth(53);
      keep(b);
    });

    const back = this.makeButton(
      75, 705, 'VOLTAR', '#3a4046',
      () => this.openHeroPanel(), 12, 450, 40,
    );

    back.setDepth(53);
    keep(back);
  }

  // ---------- transições de mundo (≈10 s) ----------

  private playTransition(
    kind: 'greece' | 'tech' | 'real' | 'sky',
    lines: string[],
    onMid: () => void,
    onEnd: () => void,
  ) {
    this.transToken++;
    const token = this.transToken;

    this.cancelBuild();
    this.closeContextMenu();
    this.modalOpen = true;

    const D = 90;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      objs.push(o);
      return o;
    };
    const alive = () => token === this.transToken && !this.gameOver;

    const cfg = {
      greece: {
        top: 0x1a1230, bot: 0xe0a850, accent: '#ffe08a', accentN: 0xffe08a,
        title: 'GRÉCIA ANTIGA', sub: 'O Olimpo observa os mortais',
      },
      tech: {
        top: 0x020a1a, bot: 0x0a4a6a, accent: '#6fe3ff', accentN: 0x3ccfff,
        title: 'ERA TECNOLÓGICA', sub: 'O futuro chegou',
      },
      real: {
        top: 0x10131c, bot: 0x8a8f98, accent: '#ffffff', accentN: 0xffffff,
        title: 'MUNDO REAL', sub: 'Sem magia. Sem fantasia.',
      },
      sky: {
        top: 0x0b2a6a, bot: 0xffe9a8, accent: '#fff3b0', accentN: 0xfff0a0,
        title: 'OS CÉUS', sub: 'Além do alcance dos mortais',
      },
    }[kind];

    const bg = keep(this.add.graphics().setDepth(D).setAlpha(0));
    this.fillVGradient(bg, 0, 0, WIDTH, HEIGHT, cfg.top, cfg.bot, 1, 20);

    this.tweens.add({ targets: bg, alpha: 1, duration: 800 });

    const blocker = keep(
      this.add.rectangle(300, 500, WIDTH, HEIGHT, 0x000000, 0.01)
        .setDepth(D + 20)
        .setInteractive(),
    );

    // ----- motivos de cada mundo -----
    const L = (c: number) => this.lerpColor(c, 0xffffff, 0.0);

    if (kind === 'greece') {
      for (let i = 0; i < 6; i++) {
        const ray = keep(
          this.add.rectangle(300, 260, 16, 1100, 0xfff0b0, 0.1)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(D + 1)
            .setAngle(i * 30),
        );

        this.tweens.add({ targets: ray, angle: ray.angle + 50, duration: 10000 });
      }

      for (let i = 0; i < 7; i++) {
        const col = keep(this.add.container(36 + i * 88, 1120).setDepth(D + 2));
        col.add([
          this.add.rectangle(0, -210, 34, 420, 0xf2e6c8).setStrokeStyle(2, 0x8a6a22),
          this.add.rectangle(0, -424, 50, 12, 0xe6d6a6).setStrokeStyle(2, 0x8a6a22),
          this.add.rectangle(0, 0, 54, 12, 0xe6d6a6).setStrokeStyle(2, 0x8a6a22),
        ]);

        this.tweens.add({
          targets: col,
          y: 930,
          delay: 500 + i * 220,
          duration: 1500,
          ease: 'Back.easeOut',
        });
      }

      this.time.addEvent({
        delay: 110,
        repeat: 70,
        callback: () => {
          if (!alive()) return;

          const leaf = this.add.ellipse(
            Phaser.Math.Between(0, WIDTH), -10, 10, 5, 0x7ac36a,
          ).setDepth(D + 3).setRotation(Math.random() * 3);

          objs.push(leaf);

          this.tweens.add({
            targets: leaf,
            y: 1020,
            x: leaf.x + Phaser.Math.Between(-90, 90),
            rotation: leaf.rotation + 6,
            duration: Phaser.Math.Between(2200, 3400),
            onComplete: () => leaf.destroy(),
          });
        },
      });
    } else if (kind === 'tech') {
      const grid = keep(this.add.container(0, 0).setDepth(D + 1));
      const gg = this.add.graphics();

      gg.lineStyle(1, cfg.accentN, 0.22);

      for (let x = 0; x <= WIDTH; x += 50) gg.lineBetween(x, 0, x, HEIGHT + 50);
      for (let y = -50; y <= HEIGHT + 50; y += 50) gg.lineBetween(0, y, WIDTH, y);

      grid.add(gg);

      this.tweens.add({ targets: grid, y: 50, duration: 900, repeat: -1 });

      const scan = keep(
        this.add.rectangle(300, 0, WIDTH, 8, cfg.accentN, 0.45)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(D + 3),
      );

      this.tweens.add({
        targets: scan, y: 1000, duration: 2400, yoyo: true, repeat: -1,
      });

      this.time.addEvent({
        delay: 60,
        repeat: 150,
        callback: () => {
          if (!alive()) return;

          const ch = this.add.text(
            Phaser.Math.Between(0, WIDTH), -14,
            ['0', '1', '0', '1', 'λ', 'Ω', '#'][Phaser.Math.Between(0, 6)],
            { fontFamily: 'monospace', fontSize: '15px', color: cfg.accent },
          ).setDepth(D + 2).setAlpha(0.8);

          objs.push(ch);

          this.tweens.add({
            targets: ch,
            y: 1020,
            duration: Phaser.Math.Between(1800, 2800),
            onComplete: () => ch.destroy(),
          });
        },
      });
    } else if (kind === 'sky') {
      for (let i = 0; i < 8; i++) {
        const ray = keep(
          this.add.rectangle(300, 1000, 18, 1300, 0xfff6c0, 0.12)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setOrigin(0.5, 1)
            .setDepth(D + 1)
            .setAngle(-70 + i * 20),
        );

        this.tweens.add({ targets: ray, alpha: 0.28, duration: 900, yoyo: true, repeat: -1, delay: i * 120 });
      }

      const halo = keep(
        this.add.circle(300, 430, 90, 0xffffff, 0.2)
          .setStrokeStyle(3, 0xfff0a0, 0.8)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(D + 1),
      );

      this.tweens.add({ targets: halo, scale: 2.4, alpha: 0, duration: 1600, repeat: -1 });

      // nuvens despencando = sensação de subir aos céus
      this.time.addEvent({
        delay: 80,
        repeat: 110,
        callback: () => {
          if (!alive()) return;

          const w = Phaser.Math.Between(110, 240);
          const cloud = this.add.ellipse(
            Phaser.Math.Between(0, WIDTH), -80, w, w * 0.32, 0xffffff,
            Phaser.Math.FloatBetween(0.35, 0.7),
          ).setDepth(D + 2);

          objs.push(cloud);

          this.tweens.add({
            targets: cloud,
            y: 1080,
            duration: Phaser.Math.Between(1400, 2400),
            onComplete: () => cloud.destroy(),
          });
        },
      });

      this.time.addEvent({
        delay: 90,
        repeat: 100,
        callback: () => {
          if (!alive()) return;

          const spark = this.add.circle(
            Phaser.Math.Between(0, WIDTH), 1020, Phaser.Math.Between(2, 4), 0xfff0a0, 0.9,
          ).setBlendMode(Phaser.BlendModes.ADD).setDepth(D + 3);

          objs.push(spark);

          this.tweens.add({
            targets: spark,
            y: -20,
            duration: Phaser.Math.Between(1600, 2800),
            onComplete: () => spark.destroy(),
          });
        },
      });
    } else {
      const glow = keep(
        this.add.circle(300, 1250, 230, 0xfff0c0, 0.25)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(D + 1),
      );
      const sun = keep(this.add.circle(300, 1250, 120, 0xffe9b0, 0.95).setDepth(D + 1));

      this.tweens.add({ targets: [glow, sun], y: 640, duration: 5500, ease: 'Sine.easeOut' });

      for (let i = 0; i < 3; i++) {
        const cloud = keep(
          this.add.ellipse(-100 + i * 260, 200 + i * 120, 190, 46, 0xffffff, 0.25)
            .setDepth(D + 2),
        );

        this.tweens.add({
          targets: cloud, x: cloud.x + 800, duration: 9000, ease: 'Linear',
        });
      }

      for (let i = 0; i < 16; i++) {
        const h = 140 + ((i * 97) % 280);
        const b = keep(
          this.add.rectangle(20 + i * 38, 1300, 36, h, 0x0b0e15)
            .setOrigin(0.5, 1)
            .setStrokeStyle(1, 0x2a3040)
            .setDepth(D + 3),
        );

        this.tweens.add({
          targets: b, y: 1000, delay: 700 + i * 90, duration: 1300, ease: 'Cubic.easeOut',
        });
      }
    }

    // ----- título e história -----
    const title = keep(
      this.add.text(300, 330, cfg.title, {
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        color: cfg.accent,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 7,
      }).setOrigin(0.5).setDepth(D + 10).setAlpha(0).setScale(1.6),
    );

    const sub = keep(
      this.add.text(300, 392, cfg.sub, {
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        fontStyle: 'italic',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(D + 10).setAlpha(0),
    );

    this.time.delayedCall(1500, () => {
      if (!alive()) return;

      this.cameras.main.flash(350, 255, 255, 255);
      this.tweens.add({
        targets: title, alpha: 1, scale: 1, duration: 700, ease: 'Back.easeOut',
      });

      for (let i = 0; i < 3; i++) {
        const ring = this.add.circle(300, 330, 20, cfg.accentN, 0.1)
          .setStrokeStyle(4, cfg.accentN, 0.9)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(D + 9);

        objs.push(ring);

        this.tweens.add({
          targets: ring, scale: 18 + i * 3, alpha: 0, duration: 1400, delay: i * 200,
          onComplete: () => ring.destroy(),
        });
      }
    });

    this.time.delayedCall(2400, () => {
      if (alive()) this.tweens.add({ targets: sub, alpha: 1, duration: 800 });
    });

    lines.forEach((text, i) => {
      const t = keep(
        this.add.text(300, 560 + i * 56, text, {
          fontFamily: 'Georgia, serif',
          fontSize: '17px',
          color: '#fff6dc',
          align: 'center',
          wordWrap: { width: 500 },
          stroke: '#000000',
          strokeThickness: 4,
        }).setOrigin(0.5).setDepth(D + 10).setAlpha(0),
      );

      this.time.delayedCall(4200 + i * 1700, () => {
        if (alive()) this.tweens.add({ targets: t, alpha: 1, y: t.y - 8, duration: 700 });
      });
    });

    const skipHint = keep(
      this.add.text(300, 960, 'toque para pular', {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#d8d8d8',
      }).setOrigin(0.5).setDepth(D + 11).setAlpha(0),
    );

    // ----- controle da linha do tempo -----
    let midDone = false;
    let done = false;

    const mid = () => {
      if (midDone) return;
      midDone = true;
      onMid();
    };

    const finish = () => {
      if (done) return;
      done = true;
      mid();

      this.tweens.add({
        targets: objs.filter(o => o.active),
        alpha: 0,
        duration: 600,
        onComplete: () => {
          for (const o of objs) {
            if (o.active) this.killVisual(o);
          }

          this.modalOpen = false;
          onEnd();
        },
      });
    };

    this.time.delayedCall(4000, () => {
      if (!alive()) return;
      this.cameras.main.flash(500, 255, 255, 255);
      mid();
    });

    this.time.delayedCall(3000, () => {
      if (!alive() || done) return;
      this.tweens.add({ targets: skipHint, alpha: 0.8, duration: 500 });
      blocker.on('pointerdown', finish);
    });

    this.time.delayedCall(9400, () => {
      if (alive()) finish();
    });

    void L;
  }

  // ---------- Mundo Tecnológico: poder supremo ----------

  private enterSupreme() {
    this.techSnap = {
      coins: this.coins,
      xp: this.xp,
      heroLevel: this.heroLevel,
      skillPoints: this.skillPoints,
      skills: { ...this.skillLevels },
      equip: {
        guardiao: { ...this.equip.guardiao },
        patrulheiro: { ...this.equip.patrulheiro },
        arcanista: { ...this.equip.arcanista },
      },
      wave: this.wave,
      baseHP: this.baseHP,
      maxBaseHP: this.maxBaseHP,
      heroDeaths: this.heroDeaths,
      extraMana: this.extraMana,
      stock: { ...this.stock },
      heroKind: this.heroKind,
      companionKinds: this.companions.map(c => c.kind),
    };

    // As torres e os aliados somem (guardados para o caso de voltar).
    this.stashTowers = this.towers;
    this.towers = [];

    for (const t of this.stashTowers) t.visual.setVisible(false);

    this.stashAllies = this.allies;
    this.allies = [];

    for (const a of this.stashAllies) a.visual.setVisible(false);

    this.selectedTower = null;
    this.rangeGraphics.clear();
    this.destroyClones();
    this.cloneUntil = 0;
  }

  private supremeTick() {
    if (this.finalChoice !== 'tech') return;

    this.coins = Math.max(this.coins, SUPREME_COINS);
    this.mana = this.maxMana;

    if (!this.heroDead) this.heroHp = this.heroMaxHp;
  }

  // Ataque comum: no modo supremo cada tiro varre um grupo inteiro.
  private hitTarget(target: Enemy, dmg: number, fx: number, fy: number) {
    if (this.finalChoice !== 'tech') {
      this.damageEnemy(target, dmg);
      return;
    }

    const tx = target.body.x;
    const ty = target.body.y;

    this.drawBolt(fx, fy - 8, tx, ty - 6);

    for (const e of [...this.enemies]) {
      if (!e.alive) continue;

      if (Phaser.Math.Distance.Between(e.body.x, e.body.y, tx, ty) <= (this.fused ? 230 : 130)) {
        this.damageEnemy(e, dmg);
      }
    }
  }

  private returnToReal() {
    const snap = this.techSnap;

    if (!snap) return;

    this.closeModal();
    this.techSnap = null;

    // Histórico do nível 90 de volta, exatamente como estava.
    this.coins = snap.coins;
    this.xp = snap.xp;
    this.heroLevel = snap.heroLevel;
    this.skillPoints = snap.skillPoints;
    this.skillLevels = { ...snap.skills };
    this.equip = {
      guardiao: { ...snap.equip.guardiao },
      patrulheiro: { ...snap.equip.patrulheiro },
      arcanista: { ...snap.equip.arcanista },
    };
    this.wave = snap.wave;
    this.baseHP = snap.baseHP;
    this.maxBaseHP = snap.maxBaseHP;
    this.heroDeaths = snap.heroDeaths;
    this.extraMana = snap.extraMana;
    this.stock = { ...snap.stock };

    for (const e of [...this.enemies]) {
      this.killVisual(e.visual);
      e.body.destroy();
    }

    this.enemies = [];
    this.activeWaves = new Map();
    this.zones = [];
    this.destroyClones();
    this.cloneUntil = 0;

    this.towers = this.stashTowers;
    this.stashTowers = [];

    for (const t of this.towers) t.visual.setVisible(true);

    this.allies = this.stashAllies;
    this.stashAllies = [];

    for (const a of this.allies) a.visual.setVisible(true);

    this.finalChoice = 'real';
    this.heroDead = false;

    // O deus supremo volta a ser os três heróis.
    if (this.fused) {
      this.fused = false;
      this.heroKind = snap.heroKind;

      for (const c of this.companions) {
        this.killVisual(c.visual);
        c.label.destroy();
      }

      this.companions = [];

      for (const k of snap.companionKinds) this.spawnCompanion(k);
    }

    this.rebuildHeroSelector();

    this.applyHeroStats();
    this.heroHp = this.heroMaxHp;
    this.mana = this.maxMana;
    this.refreshHeroLook();

    for (const c of this.companions) {
      this.killVisual(c.visual);
      c.visual = this.makeCompanionVisual(c.kind, c.x, c.y);
      c.legs = c.visual.getData('legs') as Phaser.GameObjects.Rectangle[];
    }

    this.heroLabel.setText(`${this.heroTitle()} · Nv. ${this.heroLevel}`);

    // Ajuda extra do Mundo Real.
    this.spawnAllies('dog');
    this.spawnAllies('human');
    this.spawnAllies('drone');
    this.restyleAllies();

    this.playTransition(
      'real',
      [
        'O tempo retrocede... de volta à onda 90.',
        'Tudo volta exatamente como estava antes da sua escolha.',
        'Agora, o Mundo Real.',
      ],
      () => {
        this.applyWorldTheme();
        this.redrawWorld();
      },
      () => {
        this.showMessage('Mundo Real! Você voltou à onda 90. Inicie a onda 91.');
        this.refreshInterface();
        if (this.canFuse()) this.openFusionOffer();
      },
    );
  }

  private restyleAllies() {
    for (const a of this.allies) {
      const flip = a.visual.scaleX < 0 ? -1 : 1;

      this.killVisual(a.visual);

      a.visual = this.createAllyVisual(a.kind)
        .setDepth(a.kind === 'drone' ? 9 : 6)
        .setPosition(a.x, a.y)
        .setScale(flip, 1);

      a.legs = (a.visual.getData('legs') as Phaser.GameObjects.Rectangle[]) || [];
    }
  }

  // ---------- aliados ----------

  private onHeroLevel(level: number) {
    if (level === 6) {
      this.spawnAllies('dog');
      this.showMessage('Nível 6! Dois cães aliados foram invocados.');
    } else if (level === 16) {
      this.spawnAllies('human');
      this.showMessage('Nível 16! Dois aliados humanos foram invocados.');
    } else if (level === 26) {
      this.spawnAllies('drone');
      this.showMessage('Nível 26! Dois drones foram invocados.');
    }
  }

  private spawnAllies(kind: AllyKind) {
    if (this.finalChoice === 'tech') return;

    for (let i = 0; i < 2; i++) {
      const visual = this.createAllyVisual(kind)
        .setDepth(kind === 'drone' ? 9 : 6);

      const x = this.hero.x + (i ? 30 : -30);
      const y = this.hero.y + 20;

      visual.setPosition(x, y);

      this.allies.push({
        kind,
        visual,
        legs: (visual.getData('legs') as Phaser.GameObjects.Rectangle[]) || [],
        x,
        y,
        cooldown: 0,
        slot: i,
      });
    }
  }

  // Os pets assumem o visual do herói que está no comando.
  private createAllyVisual(kind: AllyKind): Phaser.GameObjects.Container {
    const owner: HeroKind | 'fused' = this.fused ? 'fused' : this.heroKind;
    const pal = {
      guardiao: { main: 0x4d6b9a, dark: 0x2b3f5e, accent: 0xe0c040, glow: 0x7ab8ff },
      patrulheiro: { main: 0x3d7a4a, dark: 0x23472b, accent: 0xb8ff9a, glow: 0x7dff9a },
      arcanista: { main: 0x6b4a9f, dark: 0x3b2a66, accent: 0xd09fff, glow: 0xb08cff },
      fused: { main: 0xe8d9a0, dark: 0x8a6a22, accent: 0xffffff, glow: 0xfff0a0 },
    }[owner];

    const c = this.add.container(0, 0);
    const legs: Phaser.GameObjects.Rectangle[] = [];

    if (kind === 'dog') {
      const fur = owner === 'arcanista' ? 0x7a5aa8
        : owner === 'patrulheiro' ? 0x6f8a52
          : owner === 'fused' ? 0xf0dca0 : 0x9a7448;
      const furDark = this.lerpColor(fur, 0x000000, 0.35);

      const shadow = this.add.ellipse(0, 8, 26, 8, 0x0a0f0b, 0.5);
      const tail = this.add.rectangle(-13, -3, 8, 3, furDark).setRotation(-0.6);
      const body = this.add.ellipse(0, 0, 24, 12, fur).setStrokeStyle(1, 0x2a2018);
      const head = this.add.circle(12, -4, 6, this.lerpColor(fur, 0xffffff, 0.12))
        .setStrokeStyle(1, 0x2a2018);
      const ear = this.add.triangle(13, -10, -3, 4, 3, 4, 0, -4, furDark);
      const snout = this.add.rectangle(17, -3, 5, 4, furDark);
      const eye = this.add.circle(14, -5, 1.3, owner === 'arcanista' || owner === 'fused' ? pal.accent : 0x000000);

      for (const lx of [-8, -3, 4, 9]) {
        const leg = this.add.rectangle(lx, 6, 3, 6, furDark);
        leg.setData('by', 6);
        legs.push(leg);
      }

      c.add([shadow, tail, ...legs, body, head, ear, snout, eye]);

      if (owner === 'guardiao' || owner === 'fused') {
        c.add([
          this.add.rectangle(-1, -2, 16, 9, pal.main).setStrokeStyle(1, pal.accent),
          this.add.rectangle(7, -7, 4, 4, pal.accent),
          this.add.rectangle(11, -9, 7, 3, pal.dark).setStrokeStyle(1, pal.accent),
        ]);
      }

      if (owner === 'patrulheiro' || owner === 'fused') {
        c.add([
          this.add.triangle(8, 0, -3, -3, 3, -3, 0, 5, pal.accent),
          this.add.rectangle(-4, -8, 3, 10, 0x5a3e22).setRotation(0.4),
          this.add.rectangle(-4, -14, 3, 3, pal.accent),
        ]);
      }

      if (owner === 'arcanista' || owner === 'fused') {
        const rune = this.add.circle(-2, -3, 4, pal.glow, 0.7)
          .setBlendMode(Phaser.BlendModes.ADD);
        const halo = this.add.circle(0, 0, 17, pal.glow, 0.16)
          .setBlendMode(Phaser.BlendModes.ADD);

        c.addAt(halo, 0);
        c.add(rune);
        this.tweens.add({ targets: rune, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
      }
    } else if (kind === 'human') {
      const shadow = this.add.ellipse(0, 12, 22, 8, 0x0a0f0b, 0.5);
      const leftLeg = this.add.rectangle(-4, 9, 5, 9, pal.dark);
      const rightLeg = this.add.rectangle(4, 9, 5, 9, pal.dark);
      leftLeg.setData('by', 9);
      rightLeg.setData('by', 9);
      legs.push(leftLeg, rightLeg);

      c.add([shadow, leftLeg, rightLeg]);

      if (owner === 'guardiao') {
        c.add([
          this.add.rectangle(0, -2, 15, 16, pal.main).setStrokeStyle(1, pal.accent),
          this.add.circle(0, -13, 6, 0xc3a47e).setStrokeStyle(1, 0x4a3b2d),
          this.add.rectangle(0, -17, 13, 6, 0x9aa6aa).setStrokeStyle(1, 0x333333),
          this.add.rectangle(0, -23, 3, 6, 0xc83a3a),
          this.add.rectangle(11, -3, 3, 17, 0xdfe6e9).setRotation(-0.3),
          this.add.rectangle(-10, -1, 9, 15, pal.dark).setStrokeStyle(2, pal.accent),
        ]);
      } else if (owner === 'patrulheiro') {
        c.add([
          this.add.rectangle(0, -2, 13, 15, pal.main).setStrokeStyle(1, pal.dark),
          this.add.circle(0, -13, 6, 0xc3a47e).setStrokeStyle(1, 0x4a3b2d),
          this.add.triangle(0, -17, -8, 5, 8, 5, 0, -8, pal.dark),
          this.add.ellipse(-11, -3, 7, 20, 0x000000, 0).setStrokeStyle(2, 0x8a6a3a),
          this.add.rectangle(-11, -3, 1, 20, 0xdfe6e9),
          this.add.rectangle(7, -6, 4, 12, 0x5a3e22).setRotation(0.2),
        ]);
      } else if (owner === 'arcanista') {
        const orb = this.add.circle(11, -19, 4, pal.glow, 0.95)
          .setBlendMode(Phaser.BlendModes.ADD);

        c.add([
          this.add.triangle(0, 0, -9, 10, 9, 10, 0, -14, pal.main).setStrokeStyle(1, pal.accent),
          this.add.circle(0, -13, 6, 0xc3a47e).setStrokeStyle(1, 0x4a3b2d),
          this.add.triangle(0, -22, -8, 8, 8, 8, 0, -12, pal.dark).setStrokeStyle(1, pal.accent),
          this.add.rectangle(11, -6, 2, 24, 0x6a4a2a),
          orb,
        ]);
        this.tweens.add({ targets: orb, scale: 1.6, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });
      } else {
        const orb = this.add.circle(0, -27, 4, pal.accent, 1)
          .setBlendMode(Phaser.BlendModes.ADD);

        c.add([
          this.add.rectangle(0, -2, 16, 16, pal.main).setStrokeStyle(2, pal.dark),
          this.add.circle(0, -13, 6, 0xc3a47e).setStrokeStyle(1, 0x4a3b2d),
          this.add.rectangle(0, -18, 14, 4, pal.accent).setStrokeStyle(1, pal.dark),
          this.add.rectangle(11, -3, 3, 17, 0xffffff).setRotation(-0.3),
          orb,
        ]);
        this.tweens.add({ targets: orb, y: -31, duration: 500, yoyo: true, repeat: -1 });
      }
    } else {
      const glow = this.add.circle(0, 0, 17, pal.glow, 0.25)
        .setBlendMode(Phaser.BlendModes.ADD);

      c.add(glow);

      if (owner === 'guardiao') {
        c.add([
          this.add.ellipse(0, 0, 18, 11, 0x8a949c).setStrokeStyle(2, pal.glow),
          this.add.rectangle(7, 0, 5, 14, pal.accent).setStrokeStyle(1, 0x000000),
          this.add.circle(0, 1, 3, 0x3a8aff),
        ]);
      } else if (owner === 'patrulheiro') {
        c.add([
          this.add.ellipse(0, 0, 16, 9, pal.main).setStrokeStyle(2, pal.accent),
          this.add.rectangle(10, -2, 8, 2, pal.accent),
          this.add.rectangle(10, 3, 8, 2, pal.accent),
          this.add.circle(0, 1, 3, 0xff4040),
          this.add.circle(0, 1, 1, 0xffffff),
        ]);
      } else if (owner === 'arcanista') {
        const gem = this.add.rectangle(0, 0, 13, 13, pal.main, 0.95)
          .setRotation(Math.PI / 4)
          .setStrokeStyle(2, pal.accent);
        const runes = this.add.container(0, 0, [
          this.add.circle(14, 0, 2.5, pal.accent),
          this.add.circle(-14, 0, 2.5, pal.accent),
        ]);

        c.add([gem, runes, this.add.circle(0, 0, 3, 0xffffff, 0.9)]);
        this.tweens.add({ targets: runes, angle: 360, duration: 1400, repeat: -1 });
      } else {
        const orbs = this.add.container(0, 0, [
          this.add.circle(14, 0, 3, 0xe2574c),
          this.add.circle(-7, 12, 3, 0x7dff9a),
          this.add.circle(-7, -12, 3, 0xb08cff),
        ]);

        c.add([
          this.add.circle(0, 0, 8, pal.main).setStrokeStyle(2, pal.dark),
          orbs,
          this.add.circle(0, 0, 3, 0xffffff),
        ]);
        this.tweens.add({ targets: orbs, angle: 360, duration: 1800, repeat: -1 });
      }

      const rotor = this.add.container(0, -8, [
        this.add.rectangle(0, 0, 22, 2, 0xcfd8dc),
        this.add.rectangle(0, 0, 2, 22, 0xcfd8dc, 0.5),
      ]);

      this.tweens.add({ targets: rotor, angle: 360, duration: 220, repeat: -1 });
      c.add(rotor);
    }

    c.setData('legs', legs);
    return c;
  }

  private updateAllies(delta: number) {
    const t = this.time.now;
    const slots: Record<AllyKind, { x: number; y: number }[]> = {
      dog: [{ x: -34, y: 26 }, { x: 34, y: 26 }],
      human: [{ x: -44, y: -8 }, { x: 44, y: -8 }],
      drone: [{ x: -26, y: -48 }, { x: 26, y: -48 }],
    };

    for (const a of this.allies) {
      const cfg = ALLY_CFG[a.kind];

      let target: Enemy | undefined;
      let best = Infinity;

      for (const e of this.enemies) {
        if (!e.alive) continue;

        const fromHero = Phaser.Math.Distance.Between(
          e.body.x, e.body.y, this.hero.x, this.hero.y,
        );

        if (fromHero > cfg.leash) continue;

        const d = Phaser.Math.Distance.Between(e.body.x, e.body.y, a.x, a.y);

        if (d < best) {
          best = d;
          target = e;
        }
      }

      let destX: number;
      let destY: number;
      let stop: number;

      if (target) {
        destX = target.body.x;
        destY = target.body.y;
        stop = cfg.range - 4;
      } else {
        const slot = slots[a.kind][a.slot];
        destX = this.hero.x + slot.x;
        destY = this.hero.y + slot.y;
        stop = 4;
      }

      const ddx = destX - a.x;
      const ddy = destY - a.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      let moved = false;

      if (dist > stop) {
        const step = Math.min(cfg.speed * delta / 1000, dist - stop);
        a.x += ddx / dist * step;
        a.y += ddy / dist * step;
        moved = true;

        if (Math.abs(ddx) > 2) a.visual.setScale(ddx < 0 ? -1 : 1, 1);
      }

      a.x = Phaser.Math.Clamp(a.x, 10, WIDTH - 10);
      a.y = Phaser.Math.Clamp(a.y, 175, 815);

      a.visual.setPosition(
        a.x,
        a.kind === 'drone' ? a.y - 16 + Math.sin(t / 200 + a.slot) * 3 : a.y,
      );

      this.animateLegs(a.legs, t / (a.kind === 'dog' ? 55 : 80), moved);

      a.cooldown -= delta;

      if (target && a.cooldown <= 0 && best <= cfg.range + 6) {
        a.cooldown = cfg.rate;

        const dmg = (cfg.base + Math.floor(this.heroLevel * cfg.perLevel))
          * (this.finalChoice === 'real' ? 1.5 : 1);
        const tx = target.body.x;
        const ty = target.body.y;

        if (a.kind === 'drone') {
          for (const e of this.enemies) {
            if (!e.alive) continue;

            if (Phaser.Math.Distance.Between(e.body.x, e.body.y, tx, ty) <= 42) {
              this.damageEnemy(e, dmg);
            }
          }
        } else {
          this.damageEnemy(target, dmg);
        }

        const fx = this.add.circle(tx, ty, 6, cfg.color, 0.7)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(13);

        this.tweens.add({
          targets: fx,
          scale: a.kind === 'drone' ? 4 : 2.2,
          alpha: 0,
          duration: 200,
          onComplete: () => fx.destroy(),
        });
      }
    }
  }

  // ==================================================
  // LOOP DO JOGO
  // ==================================================

  update(_time: number, delta: number) {
    if (this.gameOver) return;

    this.supremeTick();
    this.moveHero(delta);
    this.regenerateMana(delta);
    this.updateEnemies(delta);

    if (this.gameOver) return;

    this.updateTowers(delta);
    this.updateAllies(delta);
    this.updateClones(delta);
    this.updateCompanions(delta);
    this.drawTracers(delta);
    this.updateAura();
    this.updateHeroCombat(delta);
    this.checkCompletedWaves();
    this.drawSelectedRange();
    this.refreshInterface();
  }

  private showEndPanel(title: string, color: string, text: string) {
    this.gameOver = true;
    this.cancelBuild();
    this.closeContextMenu();
    this.closeModal();

    this.add.rectangle(300, 500, WIDTH, HEIGHT, 0x000000, 0.6)
      .setDepth(39);

    const panel = this.add.graphics().setDepth(40);
    this.drawPanelFrame(panel, 45, 380, 510, 250, 10);

    this.add.text(300, 440, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '38px',
      color,
      fontStyle: 'bold',
      stroke: '#1a0605',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(41);

    this.add.text(300, 505, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#f0d58a',
      align: 'center',
      lineSpacing: 7,
    }).setOrigin(0.5).setDepth(41);

    const back = this.makeButton(
      150, 560, 'VOLTAR AO EMPÓRIO', '#8a3a2c',
      () => this.scene.start('ShopScene'),
      13, 300, 40, true,
    );

    back.setDepth(42);
  }

  private endGame() {
    this.showMessage('FIM DE JOGO!');

    this.showEndPanel(
      'DERROTA',
      '#e8574c',
      'A fortaleza foi derrotada.\nVolte ao empório e monte uma nova estratégia.',
    );
  }

  private victory() {
    if (this.finalChoice === 'tech' && this.techSnap) {
      this.openModal(
        'VITÓRIA NO MUNDO TECNOLÓGICO',
        'Você concluiu a onda 100 com poder supremo.\n\n' +
        'Quer experimentar o MUNDO REAL? Você volta à onda 90 com exatamente o ' +
        'mesmo histórico de antes da escolha (nível, moedas, torres, aliados e ' +
        'armamento), sem custo.',
        [
          {
            label: 'EXPERIMENTAR O MUNDO REAL',
            color: '#6a4a3a',
            action: () => this.returnToReal(),
          },
          {
            label: 'FINALIZAR',
            color: '#3a4046',
            action: () => {
              this.closeModal();
              this.showEndPanel(
                'VITÓRIA',
                '#f0d58a',
                'Você defendeu a fortaleza até a onda 100!\nA campanha foi concluída.',
              );
            },
          },
        ],
      );

      return;
    }

    this.showEndPanel(
      'VITÓRIA',
      '#f0d58a',
      'Você defendeu a fortaleza até a onda 100!\nA campanha foi concluída.',
    );
  }
}

// ==================================================
// TELA DE ABERTURA
// ==================================================

class TitleScene extends BaseScene {
  private starting = false;

  constructor() {
    super('TitleScene');
  }

  init() {
    this.starting = false;
    this.gameOver = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#05060c');
    this.cameras.main.fadeIn(700, 0, 0, 0);

    const g = this.add.graphics();

    // ---------- céu ----------
    this.fillVGradient(g, 0, 0, WIDTH, 420, 0x0a0c24, 0x3a2a5a, 1, 8);
    this.fillVGradient(g, 0, 420, WIDTH, 220, 0x3a2a5a, 0x7a4a5a, 1, 6);
    this.fillVGradient(g, 0, 640, WIDTH, 360, 0x1a1a22, 0x050607, 1, 8);

    // estrelas
    for (let i = 0; i < 90; i++) {
      const x = (i * 137 + 29) % WIDTH;
      const y = (i * 61 + 13) % 520;
      const r = 0.6 + (i % 3) * 0.5;

      g.fillStyle(0xffffff, 0.35 + (i % 4) * 0.15);
      g.fillCircle(x, y, r);
    }

    for (let i = 0; i < 22; i++) {
      const star = this.add.circle(
        (i * 211 + 60) % WIDTH, (i * 97 + 40) % 440, 1.6, 0xfff4cc, 0.9,
      ).setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: star,
        alpha: 0.1,
        duration: Phaser.Math.Between(700, 1800),
        delay: Phaser.Math.Between(0, 1200),
        yoyo: true,
        repeat: -1,
      });
    }

    // lua
    const moonGlow = this.add.circle(455, 215, 92, 0xcfd8ff, 0.12)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: moonGlow,
      scale: 1.12,
      alpha: 0.06,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    g.fillStyle(0xe8ecff, 1);
    g.fillCircle(455, 215, 46);
    g.fillStyle(0xc4cbe8, 1);
    g.fillCircle(441, 205, 9);
    g.fillCircle(466, 228, 6);
    g.fillCircle(470, 197, 4);

    // ---------- montanhas ----------
    const ridge = (base: number, color: number, amp: number, seed: number) => {
      const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: 1000 }];

      for (let x = 0; x <= WIDTH; x += 20) {
        const h = Math.sin(x * 0.012 + seed) * amp + Math.sin(x * 0.037 + seed * 2) * amp * 0.5;
        pts.push({ x, y: base + h });
      }

      pts.push({ x: WIDTH, y: 1000 });

      g.fillStyle(color, 1);
      g.fillPoints(pts, true);
    };

    ridge(600, 0x2a2440, 46, 1);
    ridge(660, 0x1c1a2e, 38, 3);
    ridge(720, 0x12121c, 30, 5);

    // ---------- portal distante ----------
    const portal = this.add.circle(300, 575, 70, 0x3aa0d0, 0.22)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: portal,
      scale: 1.25,
      alpha: 0.08,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    g.lineStyle(3, GOLD_DARK, 1);
    g.strokeCircle(300, 575, 30);
    g.fillStyle(0x0b2a3c, 1);
    g.fillCircle(300, 575, 26);
    g.fillStyle(0x58bde0, 0.85);
    g.fillCircle(300, 575, 16);
    g.fillStyle(0xf0ffff, 0.95);
    g.fillCircle(300, 575, 5);

    const runes = this.add.container(300, 575);
    const rg = this.add.graphics();

    rg.lineStyle(1.5, 0x8fe3ff, 0.9);
    rg.strokeCircle(0, 0, 36);

    for (let i = 0; i < 12; i++) {
      const rad = Phaser.Math.DegToRad(i * 30);

      rg.lineBetween(
        Math.cos(rad) * 32, Math.sin(rad) * 32,
        Math.cos(rad) * 36, Math.sin(rad) * 36,
      );
    }

    runes.add(rg);

    this.tweens.add({ targets: runes, angle: 360, duration: 9000, repeat: -1 });

    // ---------- fortaleza e torres (silhuetas) ----------
    const sil = 0x090a10;
    const lit = 0xffc860;

    g.fillStyle(sil, 1);
    g.fillRect(222, 740, 156, 100);

    for (let i = 0; i < 9; i++) {
      g.fillRect(222 + i * 18, 728, 11, 14);
    }

    for (const tx of [204, 356]) {
      g.fillRect(tx, 700, 40, 140);
      g.fillTriangle(tx - 6, 702, tx + 20, 660, tx + 46, 702);

      for (let i = 0; i < 5; i++) {
        g.fillRect(tx - 2 + i * 10, 692, 6, 10);
      }

      g.fillStyle(lit, 0.95);
      g.fillRect(tx + 16, 726, 8, 14);
      g.fillRect(tx + 16, 764, 8, 14);
      g.fillStyle(sil, 1);
    }

    g.fillStyle(lit, 0.9);
    g.fillRect(262, 772, 12, 18);
    g.fillRect(326, 772, 12, 18);
    g.fillStyle(0x15100a, 1);
    g.fillRect(288, 790, 24, 50);
    g.fillCircle(300, 790, 12);

    // torres de defesa ao redor
    const defenseTower = (x: number, y: number, s: number) => {
      g.fillStyle(sil, 1);
      g.fillRect(x - 9 * s, y - 30 * s, 18 * s, 34 * s);
      g.fillRect(x - 12 * s, y - 38 * s, 24 * s, 9 * s);

      for (let i = 0; i < 3; i++) {
        g.fillRect(x - 12 * s + i * 9 * s, y - 45 * s, 6 * s, 8 * s);
      }

      g.fillStyle(0x6ab0ff, 0.9);
      g.fillCircle(x, y - 16 * s, 3 * s);
    };

    defenseTower(60, 800, 1.5);
    defenseTower(540, 800, 1.5);
    defenseTower(140, 780, 1.1);
    defenseTower(460, 780, 1.1);

    // chão
    this.fillVGradient(g, 0, 830, WIDTH, 170, 0x14120e, 0x050505, 1, 5);
    g.fillStyle(0x1e1a12, 1);
    g.fillRect(0, 828, WIDTH, 3);

    // ---------- tochas ----------
    for (const tx of [178, 422]) {
      g.fillStyle(0x2a1d10, 1);
      g.fillRect(tx - 2, 800, 4, 36);

      const glow = this.add.circle(tx, 792, 34, 0xff9a3c, 0.2)
        .setBlendMode(Phaser.BlendModes.ADD);
      const flame = this.add.ellipse(tx, 793, 9, 15, 0xff8a2a, 0.95);
      const core = this.add.ellipse(tx, 795, 4, 9, 0xffe08a, 1);

      this.tweens.add({
        targets: [flame, core],
        scaleY: 1.3,
        scaleX: 0.85,
        duration: Phaser.Math.Between(150, 240),
        yoyo: true,
        repeat: -1,
      });

      this.tweens.add({
        targets: glow,
        alpha: 0.08,
        duration: Phaser.Math.Between(300, 480),
        yoyo: true,
        repeat: -1,
      });
    }

    // brasas subindo
    for (let i = 0; i < 24; i++) {
      const ex = 20 + ((i * 83) % 560);
      const ember = this.add.circle(ex, 900, 1.6 + (i % 3) * 0.5, 0xffa040, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: ember,
        y: 520 + (i % 5) * 40,
        x: ex + Phaser.Math.Between(-40, 40),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        delay: Phaser.Math.Between(0, 4000),
        repeat: -1,
      });
    }

    // ---------- heróis ----------
    const stand = [
      { kind: 'patrulheiro' as HeroKind, x: 118, y: 792 },
      { kind: 'guardiao' as HeroKind, x: 300, y: 806 },
      { kind: 'arcanista' as HeroKind, x: 482, y: 792 },
    ];

    stand.forEach((h, i) => {
      const v = this.createHeroVisual(h.kind, h.x, h.y)
        .setScale(h.kind === 'guardiao' ? 3.1 : 2.6)
        .setDepth(6);

      this.tweens.add({
        targets: v,
        y: h.y - 4,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        delay: i * 250,
        ease: 'Sine.easeInOut',
      });
    });

    // ---------- estúdio ----------
    const studio = this.add.text(300, 44, 'ASSAHI GAMES STUDIO', {
      fontFamily: 'Georgia, serif',
      fontSize: '17px',
      color: '#f0d58a',
      fontStyle: 'bold',
      letterSpacing: 5,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    const presents = this.add.text(300, 68, 'apresenta', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#b9d6c0',
      fontStyle: 'italic',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({ targets: [studio, presents], alpha: 1, duration: 900, delay: 300 });

    // ---------- título ----------
    const logo = this.add.text(300, 150, 'TOWERCRAFT', {
      fontFamily: 'Georgia, serif',
      fontSize: '70px',
      color: '#ffd97a',
      fontStyle: 'bold',
      stroke: '#3a2208',
      strokeThickness: 12,
    }).setOrigin(0.5).setDepth(10).setScale(0.6).setAlpha(0);

    const logoGlow = this.add.text(300, 150, 'TOWERCRAFT', {
      fontFamily: 'Georgia, serif',
      fontSize: '70px',
      color: '#ffb23a',
      fontStyle: 'bold',
      stroke: '#ff8a1a',
      strokeThickness: 18,
    }).setOrigin(0.5).setDepth(9).setScale(0.6).setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: [logo, logoGlow],
      scale: 1,
      duration: 900,
      delay: 700,
      ease: 'Back.easeOut',
    });

    this.tweens.add({ targets: logo, alpha: 1, duration: 700, delay: 700 });

    this.tweens.add({
      targets: logoGlow,
      alpha: 0.28,
      duration: 1400,
      delay: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const sub = this.add.text(300, 212, 'TORRES  ·  HERÓIS  ·  MUNDOS', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#b9d6c0',
      fontStyle: 'bold',
      letterSpacing: 4,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({ targets: sub, alpha: 1, duration: 800, delay: 1500 });

    const deco = this.add.graphics().setDepth(10);

    deco.lineStyle(2, GOLD, 1);
    deco.lineBetween(90, 242, 510, 242);
    this.drawGem(deco, 300, 242, 6, GOLD_LIGHT);
    this.drawGem(deco, 90, 242, 4, GOLD);
    this.drawGem(deco, 510, 242, 4, GOLD);

    // ---------- introdução ----------
    const story = [
      'Um portal se abriu nos limites do mundo conhecido.',
      'Cem ondas de monstros marcham rumo à última fortaleza.',
      'Ergam torres. Convoquem heróis. Atravessem eras.',
      'Resistam.',
    ];

    story.forEach((line, i) => {
      const last = i === story.length - 1;

      const t = this.add.text(300, 272 + i * 28, line, {
        fontFamily: 'Georgia, serif',
        fontSize: last ? '20px' : '14px',
        color: last ? '#ffd97a' : '#e6dfcd',
        fontStyle: last ? 'bold' : 'italic',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(10).setAlpha(0);

      this.tweens.add({
        targets: t,
        alpha: 1,
        y: t.y + 4,
        duration: 900,
        delay: 2200 + i * 1500,
      });
    });

    // ---------- iniciar ----------
    const go = this.makeButton(
      130, 408, 'COMEÇAR', '#8a3a2c',
      () => this.begin(), 22, 340, 62,
    );

    go.setDepth(12);

    const hint = this.add.text(300, 494, 'toque para começar', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#ffe9a8',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(12);

    this.tweens.add({
      targets: hint,
      alpha: 0.2,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(300, 975, '© Assahi Games Studio  ·  v1.0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#6a6a72',
    }).setOrigin(0.5).setDepth(12);

    this.input.once('pointerdown', () => this.begin());
    this.input.keyboard?.once('keydown-ENTER', () => this.begin());
    this.input.keyboard?.once('keydown-SPACE', () => this.begin());
  }

  private begin() {
    if (this.starting) return;

    this.starting = true;
    this.cameras.main.fadeOut(450, 0, 0, 0);

    this.time.delayedCall(470, () => this.scene.start('ShopScene'));
  }
}

// ==================================================
// ESCOLHA DO HERÓI (TELA INICIAL)
// ==================================================

const HERO_INTRO: Record<HeroKind, string> = {
  guardiao:
    'Defensor firme da fortaleza. Aguenta muito dano e fecha o caminho dos monstros com o maior bloqueio do jogo. É o herói mais equilibrado.',
  patrulheiro:
    'Arqueiro ágil e preciso. Corre mais que todos, ataca rápido e é fácil de reposicionar no campo. Ideal para quem gosta de agir.',
  arcanista:
    'Mestre das artes arcanas. Tem mais mana e ataques de alto impacto, mas é frágil. Ideal para quem joga com estratégia.',
};

class ShopScene extends BaseScene {
  private selectedHero: HeroKind = 'guardiao';
  private objs: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('ShopScene');
  }

  init() {
    this.selectedHero = 'guardiao';
    this.objs = [];
    this.gameOver = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#050607');

    const bg = this.add.graphics();

    this.fillVGradient(bg, 0, 0, WIDTH, HEIGHT, 0x11161b, 0x050607, 1, 5);
    this.fillVGradient(bg, 0, 0, WIDTH, 50, 0x3a2d17, 0x17110a, 1, 2);

    bg.fillStyle(GOLD_DARK, 1);
    bg.fillRect(0, 50, WIDTH, 3);
    bg.fillStyle(GOLD, 1);
    bg.fillRect(0, 50, WIDTH, 1);

    this.add.text(300, 25, 'ESCOLHA SEU HERÓI', {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: '#f0d58a',
      fontStyle: 'bold',
      stroke: '#1a1006',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.render();
  }

  private render() {
    this.objs.forEach(o => this.killVisual(o));
    this.objs = [];

    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.objs.push(o);
      return o;
    };

    const st = HERO_STATS[this.selectedHero];

    // ---------- palco do herói escolhido ----------
    const stage = keep(this.add.graphics());

    this.drawPanelFrame(stage, 10, 62, 580, 400);
    this.fillVGradient(stage, 18, 70, 564, 384, 0x1b2a33, 0x0b1014, 1, 3);
    this.fillVGradient(stage, 18, 330, 564, 124, 0x2a3a2d, 0x131b16, 1, 3);

    stage.fillStyle(0x0a0f0c, 0.6);
    stage.fillEllipse(304, 400, 300, 56);
    stage.fillStyle(0x6b6a58, 1);
    stage.fillEllipse(300, 394, 290, 52);
    stage.lineStyle(2, GOLD, 1);
    stage.strokeEllipse(300, 394, 290, 52);

    const ring = keep(
      this.add.ellipse(300, 394, 230, 46, GOLD_LIGHT, 0.14)
        .setStrokeStyle(3, GOLD_LIGHT, 0.8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2),
    );

    this.tweens.add({
      targets: ring,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0.55,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    const hero = keep(
      this.createHeroVisual(this.selectedHero, 300, 330)
        .setScale(4.2)
        .setDepth(5),
    );

    (hero.getData('legs') as Phaser.GameObjects.Rectangle[]).forEach((leg, i) => {
      this.tweens.add({
        targets: leg,
        y: leg.y - 3,
        duration: 380,
        yoyo: true,
        repeat: -1,
        delay: i * 380,
      });
    });

    keep(
      this.add.text(300, 92, st.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#f0d58a',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(6),
    );

    keep(
      this.add.text(300, 122, st.title.toUpperCase(), {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#b9d6c0',
        letterSpacing: 2,
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(6),
    );

    // ---------- texto do herói ----------
    const tower = TOWER_STATS[st.specialty].name;

    keep(
      this.add.text(
        300, 474,
        `${HERO_INTRO[this.selectedHero]}\n\n` +
        `PODER ESPECIAL: ${SKILL_INFO[st.skill].name}. ${SKILL_INFO[st.skill].description}\n` +
        `HABILIDADE DE AURA: melhora, de forma permanente, as torres ${tower} (o tipo dele).`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#e6dfcd',
          align: 'center',
          wordWrap: { width: 540 },
          lineSpacing: 3,
        },
      ).setOrigin(0.5, 0),
    );

    // ---------- atributos ----------
    const gb = keep(this.add.graphics());

    const rows: [string, number, string][] = [
      ['DANO', st.damage / 6, `${st.damage}`],
      ['ALCANCE', st.range / 160, `${st.range}`],
      ['VELOCIDADE', st.speed / 280, `${st.speed}`],
      ['ATAQUE', (1000 / st.attackRate) / 2.8, `${(1000 / st.attackRate).toFixed(1)}/s`],
      ['MANA', (100 + st.manaBonus) / 140, `${100 + st.manaBonus}`],
      ['VIDA', HERO_HP[this.selectedHero] / 280, `${HERO_HP[this.selectedHero]}`],
    ];

    rows.forEach(([label, ratio, value], i) => {
      const y = 628 + i * 18;

      keep(
        this.add.text(120, y - 1, label, {
          fontFamily: 'Georgia, serif',
          fontSize: '10px',
          color: '#c9a24d',
          fontStyle: 'bold',
        }),
      );

      gb.lineStyle(1, GOLD_DARK, 1);
      gb.strokeRect(220, y - 1, 200, 12);
      this.drawBar(gb, 221, y, 198, 10, Phaser.Math.Clamp(ratio, 0, 1), 0xe8c466, 0x8a6a22, 0);

      keep(
        this.add.text(430, y - 1, value, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          color: '#efe6cc',
        }),
      );
    });

    // ---------- seletor ----------
    HERO_ORDER.forEach((h, i) => {
      const x = 8 + i * 196;
      const y = 750;
      const on = h === this.selectedHero;

      const card = keep(this.add.graphics());
      this.drawPanelFrame(card, x, y, 188, 130, 6);

      if (on) {
        card.lineStyle(3, GOLD_LIGHT, 1);
        card.strokeRect(x + 2, y + 2, 184, 126);
      }

      keep(
        this.createHeroVisual(h, x + 94, y + 56).setScale(2).setDepth(4),
      );

      keep(
        this.add.text(x + 94, y + 106, HERO_STATS[h].name, {
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          color: on ? '#f0d58a' : '#b8b09a',
          fontStyle: 'bold',
        }).setOrigin(0.5),
      );

      const hit = keep(
        this.add.rectangle(x + 94, y + 65, 188, 130, 0x000000, 0.001)
          .setInteractive({ useHandCursor: true }),
      );

      hit.on('pointerdown', () => {
        if (this.selectedHero === h) return;

        this.selectedHero = h;
        this.render();
      });
    });

    keep(
      this.makeButton(
        20, 910, `COMEÇAR COM ${st.name}`, '#8a3a2c',
        () => this.startBattle(), 16, 560, 44,
      ),
    );

    keep(
      this.add.text(300, 972, 'Os outros heróis são liberados ao desbloquear novos mundos.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#c9b985',
      }).setOrigin(0.5),
    );
  }

  private startBattle() {
    this.scene.start('GameScene', {
      heroKind: this.selectedHero,
      stock: { basic: 0, rapid: 0, sniper: 0 },
      extras: { base: 0, mana: 0, skill: 0 },
      coins: 300,
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'app',
  backgroundColor: '#080c09',
  scene: [TitleScene, ShopScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
