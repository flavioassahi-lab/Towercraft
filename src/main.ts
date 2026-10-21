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
    description: 'Passiva: reforça torres próximas.',
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

const SKILL_COOLDOWN: Record<SkillKind, number> = {
  explosion: 8000,
  repair: 10000,
  strike: 3000,
  aura: 0,
  clones: 18000,
  lightning: 7000,
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
    auraDesc: 'Passiva: torres GUARDIÃ próximas ficam mais fortes.',
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
    auraDesc: 'Passiva: torres BESTEIRA próximas ficam mais fortes.',
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
    auraDesc: 'Passiva: torres ARCANA próximas ficam mais fortes.',
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

const AURA_RADIUS = 150;

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

const WORLD_INFO: Record<number, { name: string; short: string; cost: number }> = {
  1: { name: 'MUNDO 1 · PRIMITIVO', short: 'M1', cost: 0 },
  2: { name: 'MUNDO 2 · GRÉCIA ANTIGA', short: 'M2', cost: 1000 },
  3: { name: 'MUNDO 3 · TECNOLÓGICO', short: 'M3', cost: 3000 },
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
  auraRing?: Phaser.GameObjects.Arc;
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
  ): Phaser.GameObjects.Container {
    const color = TOWER_STATS[kind].color;
    const c = this.add.container(x, y).setDepth(4);

    const shadow = this.add.ellipse(3, 8, 50, 25, 0x0a0f0b, 0.6);

    const glow = this.add.circle(0, 3, 27, color, 0.16)
      .setBlendMode(Phaser.BlendModes.ADD);

    const base = this.add.circle(0, 4, 22, 0x4a4a3d)
      .setStrokeStyle(3, 0x15191a);

    const stoneRing = this.add.circle(0, 2, 18, 0x8a7c60)
      .setStrokeStyle(2, 0xd0c29a);

    const runeRing = this.add.circle(0, 2, 14, 0x2a3027)
      .setStrokeStyle(2, color);

    const innerRing = this.add.circle(0, 2, 10, 0x40483b)
      .setStrokeStyle(1, 0xb2a17b);

    c.add([shadow, glow, base, stoneRing, runeRing, innerRing]);

    this.tweens.add({
      targets: glow,
      alpha: 0.32,
      scale: 1.12,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

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

  protected createHeroVisual(
    kind: HeroKind,
    x: number,
    y: number,
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
  private baseHP = 20;

  private maxMana = 100;
  private mana = 100;
  private manaRegen = 8;

  private heroAttackCooldown = 0;
  private heroAttackRate = 650;
  private heroRange = 115;
  private heroDamage = 3;

  private buildMode = false;
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
  private heroSwapReadyAt = 0;
  private extraMana = 0;
  private maxBaseHP = 20;
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
  private skillReadyAt: Partial<Record<SkillKind, number>> = {};
  private tracers: { x1: number; y1: number; x2: number; y2: number; ttl: number }[] = [];
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
    this.skillReadyAt = {};
    this.tracers = [];
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
    this.shieldUntil = 0;

    this.heroKind = hk;
    this.unlockedHeroes = [hk];
    this.heroSwapReadyAt = 0;
    this.extraMana = ex.mana;
    this.maxBaseHP = 20 + ex.base * 4;
    this.baseHP = this.maxBaseHP;
    this.heroAttackCooldown = 0;

    this.worldLevel = 1;
    this.finalChoice = null;
    this.previewFor = -1;

    this.joystickPointer = null;
    this.joystickX = 0;
    this.joystickY = 0;

    this.applyHeroStats();
    this.mana = this.maxMana;
  }

  create() {
    this.drawWorld();
    this.createHero();
    this.createInterface();
    this.createWorldOverlay();
    this.healthLayer = this.add.graphics().setDepth(8);
    this.tracerLayer = this.add.graphics().setDepth(12);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.keys = {
      w: this.input.keyboard!.addKey('W'),
      a: this.input.keyboard!.addKey('A'),
      s: this.input.keyboard!.addKey('S'),
      d: this.input.keyboard!.addKey('D'),
    };

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver || this.modalOpen) return;

      // Os controles da interface e o joystick não constroem torres.
      if (pointer.y < 150 || pointer.y >= 825) return;

      if (this.buildMode) {
        this.placeTower(pointer.x, pointer.y);
        return;
      }

      this.selectElementAt(pointer.x, pointer.y);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.buildMode && pointer.y >= 150 && pointer.y < 825) {
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

  private drawWorld() {
    this.cameras.main.setBackgroundColor('#080c09');

    const g = this.add.graphics();

    // Terreno base com gradiente
    this.fillVGradient(g, 0, 150, WIDTH, 675, 0x2a3f2c, 0x1b2d21, 1, 5);

    // Manchas de vegetação
    const patchColors = [0x3a5a36, 0x2f4a2e, 0x456b3a, 0x253b27];

    for (let i = 0; i < 80; i++) {
      const x = (i * 137 + 41) % WIDTH;
      const y = 150 + ((i * 89 + 17) % 675);
      const rw = 40 + ((i * 13) % 70);
      const rh = 22 + ((i * 7) % 40);

      g.fillStyle(patchColors[i % 4], 0.33);
      g.fillEllipse(x, y, rw, rh);
    }

    // Clareira central
    g.fillStyle(0x4a6a3e, 0.3);
    g.fillEllipse(300, 470, 550, 600);

    g.fillStyle(0x9ab86a, 0.1);
    g.fillEllipse(300, 470, 390, 510);

    // Círculo arcano tênue no centro
    g.lineStyle(2, 0xe8d28a, 0.1);
    g.strokeCircle(300, 470, 210);
    g.lineStyle(1, 0xe8d28a, 0.08);
    g.strokeCircle(300, 470, 180);

    for (let a = 0; a < 360; a += 20) {
      const rad = Phaser.Math.DegToRad(a);
      g.lineStyle(2, 0xe8d28a, 0.1);
      g.lineBetween(
        300 + Math.cos(rad) * 196,
        470 + Math.sin(rad) * 196,
        300 + Math.cos(rad) * 210,
        470 + Math.sin(rad) * 210,
      );
    }

    // Tufos de grama e flores
    for (let i = 0; i < 280; i++) {
      const x = 8 + ((i * 97 + 23) % 584);
      const y = 155 + ((i * 71 + 11) % 660);

      if (this.isNearPath(x, y, 32)) continue;

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
    }

    for (const path of ALL_PATHS) {
      this.drawRoad(g, path);
    }

    // Pedras decorativas
    const rocks: Point[] = [
      { x: 160, y: 205 }, { x: 440, y: 205 },
      { x: 28, y: 480 }, { x: 572, y: 480 },
      { x: 165, y: 760 }, { x: 435, y: 760 },
      { x: 300, y: 215 }, { x: 300, y: 350 },
    ];

    rocks.forEach((p, i) => this.drawRock(g, p.x, p.y, 7 + (i % 3) * 3));

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

    trees.forEach((p, i) =>
      this.drawTree(g, p.x, p.y, 14 + i % 4 * 3, i),
    );

    const pads = [
      { x: 35, y: 285 }, { x: 35, y: 465 }, { x: 35, y: 645 },
      { x: 565, y: 285 }, { x: 565, y: 465 }, { x: 565, y: 645 },
      { x: 300, y: 285 }, { x: 300, y: 405 },
      { x: 300, y: 525 }, { x: 300, y: 645 },
    ];

    for (const p of pads) this.drawStonePad(g, p.x, p.y);

    // Cenário estático vira uma imagem única (muito mais leve)
    this.bake(g, 'world_bg', 0);

    this.drawPortal();
    this.drawFortress();

    // Tochas
    this.drawTorch(262, 160);
    this.drawTorch(338, 160);
    this.drawTorch(244, 800);
    this.drawTorch(356, 800);

    // Vagalumes
    for (let i = 0; i < 16; i++) {
      const fx = 20 + ((i * 53) % 560);
      const fy = 190 + ((i * 97) % 600);

      const fly = this.add.circle(fx, fy, 2, 0xe9ff9a, 0.8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(15);

      this.tweens.add({
        targets: fly,
        x: fx + Phaser.Math.Between(-30, 30),
        y: fy + Phaser.Math.Between(-30, 30),
        alpha: 0.1,
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 1500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Vinheta escura
    const v = this.add.graphics().setDepth(3);

    for (let i = 0; i < 12; i++) {
      const inset = i * 7 + 4;

      v.lineStyle(8, 0x04080a, 0.5 * Math.pow(1 - i / 12, 2));
      v.strokeRect(
        inset, 150 + inset, WIDTH - inset * 2, 675 - inset * 2,
      );
    }
  }

  private drawRoad(g: Phaser.GameObjects.Graphics, path: Point[]) {
    const line = (color: number, width: number, alpha = 1) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      g.moveTo(path[0].x, path[0].y);

      for (let i = 1; i < path.length; i++) {
        g.lineTo(path[i].x, path[i].y);
      }

      g.strokePath();
    };

    line(0x0c0905, 56, 0.55);
    line(0x5a4d39, 51);
    line(0x3a3226, 45);
    line(0x85734f, 41);
    line(0x9d8a62, 33);
    line(0xb7a37a, 20, 0.55);

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const distance = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);

      if (distance === 0) continue;

      const nx = -(b.y - a.y) / distance;
      const ny = (b.x - a.x) / distance;

      // Pedras do calçamento
      for (let d = 6; d < distance; d += 9) {
        const t = d / distance;
        const cx = Phaser.Math.Linear(a.x, b.x, t);
        const cy = Phaser.Math.Linear(a.y, b.y, t);
        const h = (Math.floor(d) * 7 + i * 13) % 11;
        const off = (h - 5) * 3.2;

        g.fillStyle(h % 2 ? 0x6b5b3f : 0xc9b588, 0.35 + (h % 3) * 0.1);
        g.fillRoundedRect(cx + nx * off - 3, cy + ny * off - 2, 6, 4, 1);
      }

      // Pedras de borda
      for (let d = 4; d < distance; d += 16) {
        const t = d / distance;
        const cx = Phaser.Math.Linear(a.x, b.x, t);
        const cy = Phaser.Math.Linear(a.y, b.y, t);

        for (const side of [-1, 1]) {
          g.fillStyle(0x1e1a13, 0.7);
          g.fillCircle(cx + nx * 23 * side + 1, cy + ny * 23 * side + 1, 3);
          g.fillStyle(0x857957, 0.85);
          g.fillCircle(cx + nx * 23 * side, cy + ny * 23 * side, 2.5);
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

  private drawStonePad(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0x0a100c, 0.5);
    g.fillEllipse(x + 3, y + 6, 50, 30);

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

  private drawTorch(x: number, y: number) {
    const post = this.add.graphics().setDepth(2);

    post.fillStyle(0x0a100c, 0.45);
    post.fillEllipse(x + 2, y + 10, 14, 6);

    post.fillStyle(0x3b2d1c, 1);
    post.fillRect(x - 2, y - 6, 4, 16);

    post.fillStyle(0x7a6a48, 1);
    post.fillRect(x - 5, y - 9, 10, 4);

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

  private drawPortal() {
    const px = 300;
    const py = 165;

    const aura = this.add.circle(px, py, 46, 0x3aa0d0, 0.2)
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

    frame.fillStyle(0x23282a, 1);
    frame.fillCircle(px, py, 32);
    frame.lineStyle(3, GOLD_DARK, 1);
    frame.strokeCircle(px, py, 32);
    frame.lineStyle(1, GOLD, 1);
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

    this.add.circle(px, py, 24, 0x0b2a3c)
      .setStrokeStyle(2, 0x6fcff0)
      .setDepth(2);

    // Anel de runas giratório
    const runes = this.add.container(px, py).setDepth(2);
    const rg = this.add.graphics();

    rg.lineStyle(1.5, 0x8fe3ff, 0.85);
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

    sg.fillStyle(0x1b6a92, 0.9);
    sg.fillCircle(0, 0, 15);
    sg.fillStyle(0x58bde0, 0.85);
    sg.fillCircle(0, 0, 10);

    sg.lineStyle(2, 0xdff8ff, 0.9);
    sg.beginPath();
    sg.arc(0, 0, 12, 0, Math.PI * 1.1);
    sg.strokePath();

    sg.lineStyle(2, 0xdff8ff, 0.7);
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

    this.add.text(px, 128, 'PORTAL DE ENTRADA', {
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

  private drawFortress() {
    const g = this.add.graphics().setDepth(2);

    g.fillStyle(0x0a100c, 0.55);
    g.fillEllipse(300, 826, 130, 22);

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

    // Estandarte
    const banner = this.add.triangle(
      300, 760, 0, 0, 22, 0, 11, 18, 0xa8322e,
    ).setStrokeStyle(2, GOLD).setDepth(2);

    this.tweens.add({
      targets: banner,
      scaleX: 0.88,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(300, 730, 'FORTALEZA', {
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

    this.heroVisual = this.createHeroVisual(this.heroKind, 300, 220)
      .setDepth(7);

    this.heroLegs = this.heroVisual.getData('legs') as Phaser.GameObjects.Rectangle[];

    this.heroLabel = this.add.text(
      300, 185,
      `${HERO_STATS[this.heroKind].name} · Nv. ${this.heroLevel}`,
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

  private createEnemyVisual(
    x: number,
    y: number,
    strong: boolean,
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(5);

    const aura = this.add.ellipse(
      0, 12, strong ? 48 : 34, strong ? 19 : 13, 0xc03a2a, 0.3,
    );

    const shadow = this.add.ellipse(
      0, 12, strong ? 38 : 28, 14, 0x1a2119, 0.55,
    );

    if (strong) {
      const cape = this.add.triangle(
        0, 4, -16, -9, 16, -9, 0, 19, 0x71372d,
      ).setStrokeStyle(2, 0x34231f);

      const body = this.add.ellipse(0, 0, 32, 31, 0x754735)
        .setStrokeStyle(3, 0x342c25);

      const armor = this.add.rectangle(0, 0, 22, 22, 0x8e6544)
        .setStrokeStyle(2, 0xc0a16b);

      const belly = this.add.ellipse(0, 4, 12, 14, 0x46372c);

      const head = this.add.ellipse(0, -17, 28, 24, 0x936247)
        .setStrokeStyle(2, 0x392b23);

      const leftHorn = this.add.triangle(
        -11, -29, -6, 7, 6, 7, -4, -9, 0xd5c69b,
      ).setStrokeStyle(1, 0x51412d);

      const rightHorn = this.add.triangle(
        11, -29, -6, 7, 6, 7, 4, -9, 0xd5c69b,
      ).setStrokeStyle(1, 0x51412d);

      const leftEye = this.add.ellipse(-6, -18, 5, 4, 0xff7a3a);
      const rightEye = this.add.ellipse(6, -18, 5, 4, 0xff7a3a);

      const eyeGlowL = this.add.circle(-6, -18, 6, 0xff4a20, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD);
      const eyeGlowR = this.add.circle(6, -18, 6, 0xff4a20, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD);

      const mouth = this.add.rectangle(0, -9, 12, 3, 0x2b1d19);

      const leftArm = this.add.rectangle(-19, -1, 8, 20, 0x754735)
        .setRotation(-0.25);

      const rightArm = this.add.rectangle(19, -1, 8, 20, 0x754735)
        .setRotation(0.25);

      const leftLeg = this.add.rectangle(-8, 13, 9, 12, 0x47382e);
      const rightLeg = this.add.rectangle(8, 13, 9, 12, 0x47382e);

      const club = this.add.rectangle(26, -7, 7, 30, 0x63452d)
        .setRotation(-0.45)
        .setStrokeStyle(2, 0x35271e);

      const clubHead = this.add.circle(32, -19, 8, 0x8a7150)
        .setStrokeStyle(2, 0x4a3628);

      c.add([
        aura, shadow, cape, leftLeg, rightLeg, body, belly, armor,
        leftArm, rightArm, head, leftHorn, rightHorn,
        leftEye, rightEye, eyeGlowL, eyeGlowR, mouth, club, clubHead,
      ]);

      leftLeg.setData('by', leftLeg.y);
      rightLeg.setData('by', rightLeg.y);
      c.setData('legs', [leftLeg, rightLeg]);
    } else {
      const cape = this.add.triangle(
        0, 5, -12, -8, 12, -8, 0, 17, 0x4a5032,
      ).setStrokeStyle(2, 0x2b3224);

      const legs = this.add.rectangle(0, 8, 16, 13, 0x514331)
        .setStrokeStyle(2, 0x30291f);

      const leftLeg = this.add.rectangle(-6, 14, 7, 7, 0x35372a);
      const rightLeg = this.add.rectangle(6, 14, 7, 7, 0x35372a);

      const body = this.add.ellipse(0, -1, 24, 25, 0x667744)
        .setStrokeStyle(2, 0x35442a);

      const armor = this.add.rectangle(0, 0, 16, 13, 0x756344)
        .setStrokeStyle(1, 0xb49b65);

      const head = this.add.ellipse(0, -15, 24, 19, 0x81914e)
        .setStrokeStyle(2, 0x35442a);

      const earL = this.add.triangle(
        -11, -20, 0, 5, 7, -2, -8, -7, 0x8b9b55,
      );

      const earR = this.add.triangle(
        11, -20, 0, 5, -7, -2, 8, -7, 0x8b9b55,
      );

      const eyeL = this.add.circle(-5, -16, 2.5, 0xff8a3a);
      const eyeR = this.add.circle(5, -16, 2.5, 0xff8a3a);

      const eyeGlowL = this.add.circle(-5, -16, 5, 0xff4a20, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD);
      const eyeGlowR = this.add.circle(5, -16, 5, 0xff4a20, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD);

      const nose = this.add.triangle(
        0, -10, -3, -3, 3, -3, 0, 3, 0x4a4b2e,
      );

      const armL = this.add.rectangle(-14, -1, 6, 16, 0x72804a)
        .setRotation(-0.35);

      const armR = this.add.rectangle(14, -1, 6, 16, 0x72804a)
        .setRotation(0.35);

      const dagger = this.add.rectangle(20, -4, 3, 17, 0xb8c2b6)
        .setRotation(-0.5);

      c.add([
        aura, shadow, cape, leftLeg, rightLeg, legs, body, armor, head,
        earL, earR, eyeL, eyeR, eyeGlowL, eyeGlowR, nose,
        armL, armR, dagger,
      ]);

      leftLeg.setData('by', leftLeg.y);
      rightLeg.setData('by', rightLeg.y);
      c.setData('legs', [leftLeg, rightLeg]);
    }

    return c;
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
      206, 104, 'HERÓI', '#5e4482',
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
    this.towerMenuOpen = false;
  }

  private toggleTowerMenu() {
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

    this.cancelBuild();
    this.selectedTower = null;
    this.rangeGraphics.clear();
    this.towerMenuOpen = false;

    this.openContextPanel(
      `${HERO_STATS[this.heroKind].name} · NÍVEL ${this.heroLevel} · PONTOS: ${this.skillPoints}`,
      150,
    );

    const skills = this.heroSkills();

    const xPositions = [187, 286, 385, 484];

    skills.forEach((skill, i) => {
      const x = xPositions[i];
      const info = SKILL_INFO[skill];
      const rank = this.skillLevels[skill];

      this.contextObjects.push(
        this.makeSkillIcon(x + 17, 886, skill, rank, () => this.useSkill(skill)),
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
        pips.fillStyle(p < rank ? GOLD_LIGHT : 0x23262a, 1);
        pips.fillRect(x + 40 + p * 10, 893, 8, 5);
        pips.lineStyle(1, 0x000000, 1);
        pips.strokeRect(x + 40 + p * 10, 893, 8, 5);
      }

      this.contextObjects.push(pips);

      const canUpgrade =
        this.skillPoints > 0 &&
        rank < 5 &&
        this.heroLevel >= (rank + 2);

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

    if (this.unlockedHeroes.length > 1) {
      const others = this.unlockedHeroes.filter(h => h !== this.heroKind);

      others.forEach((h, i) => {
        this.addContextButton(
          188 + i * 200, 966,
          `TROCAR: ${HERO_STATS[h].name}`, '#355a52',
          () => this.swapHero(h), 190, 17,
        );
      });
    } else {
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
  }

  private upgradeSkill(skill: SkillKind) {
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
      `${SKILL_INFO[skill].name} melhorada para o nível ${this.skillLevels[skill]}.`,
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
      `Investido: ${tower.totalInvested} moedas`,
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
    // Tocar no herói abre o menu de habilidades.
    if (
      Phaser.Math.Distance.Between(x, y, this.hero.x, this.hero.y) < 30
    ) {
      this.openHeroPanel();
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
    this.buildPreview.clear();
    this.buildPreview.setVisible(false);
    this.buildInfoText.setVisible(false);
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

    // Mantém os dois caminhos livres.
    if (this.isNearPath(x, y, 34)) return false;

    // Espaçamento menor entre torres, sem impedir várias Arcanas.
    return !this.towers.some(t =>
      Phaser.Math.Distance.Between(
        x, y, t.body.x, t.body.y,
      ) < 36,
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
        'Local inválido. Afaste-se um pouco dos caminhos e das outras torres.',
      );
      this.updateBuildPreview(x, y);
      return;
    }

    const visual = this.createTowerVisual(x, y, kind);
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

    this.cancelBuild();
    this.openTowerMenu(tower);

    this.showMessage(
      `${stats.name} construída! Selecione a torre para melhorar ou vender.`,
    );

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

    if (tower.auraRing) this.killVisual(tower.auraRing);
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

    if (next === 30 && this.worldLevel < 2) {
      this.openWorldUnlock(2);
      return;
    }

    if (next === 60 && this.worldLevel < 3) {
      this.openWorldUnlock(3);
      return;
    }

    if (next === 91 && this.finalChoice === null) {
      this.openFinalChoice();
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

    if (this.finalChoice === 'real') hp *= 1.35;
    hp = Math.max(2, Math.round(hp));

    let reward = (strong ? 18 : 10)
      * (1 + waveId * 0.035) * type.reward * rewardTier;

    if (this.finalChoice === 'real') reward *= 0.8;
    reward = Math.max(1, Math.round(reward));

    const speed = (strong ? 40 : 55 + Math.min(waveId, 20))
      * type.speed
      * (tier === 'boss' ? 0.75 : tier === 'elite' ? 0.9 : 1);

    const body = this.add.circle(
      start.x, start.y, (strong ? 19 : 14) * size, 0x000000, 0,
    ).setStrokeStyle(0, 0x000000, 0).setDepth(5);

    const visual = this.createEnemyVisual(start.x, start.y, strong);
    this.decorateEnemy(visual, spec.kind, tier);
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
    };

    this.enemies.push(enemy);
  }

  private drawEnemyHealth(enemy: Enemy) {
    const g = this.healthLayer;
    if (!enemy.alive) return;

    const tier = enemy.tier;
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

    const border = tier === 'boss' ? 0xff5a45 : tier === 'elite' ? GOLD_LIGHT : GOLD_DARK;
    g.lineStyle(tier === 'normal' ? 1 : 2, border, 1);
    g.strokeRect(x - 1, y - 1, width + 2, height + 2);

    if (tier !== 'normal') {
      this.drawGem(g, x - 3, y + height / 2, 3, border);
      this.drawGem(g, x + width + 3, y + height / 2, 3, border);
    }
  }

  private updateEnemies(delta: number) {
    this.healthLayer.clear();

    const blockers = [
      { x: this.hero.x, y: this.hero.y, r: this.heroBlockRadius() },
      ...this.allies.map(a => ({ x: a.x, y: a.y, r: 13 })),
      ...this.clones.map(c => ({ x: c.x, y: c.y, r: 13 })),
    ];

    for (const enemy of [...this.enemies]) {
      if (!enemy.alive) continue;

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

      const dx = target.x - enemy.body.x;
      const dy = target.y - enemy.body.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const slow = enemy.slowUntil > this.time.now ? 0.55 : 1;
      const step = enemy.speed * slow * delta / 1000;
      const angle = Math.atan2(dy, dx);

      if (distance <= step || distance < 1) {
        enemy.body.setPosition(target.x, target.y);
        enemy.segment++;
      } else {
        enemy.body.x += Math.cos(angle) * step;
        enemy.body.y += Math.sin(angle) * step;
        enemy.visual.setData('facing', Math.cos(angle) < 0 ? -1 : 1);
      }

      // Bloqueio físico: contorna herói e aliados lateralmente
      const vx = Math.cos(angle);
      const vy = Math.sin(angle);
      const enemyRadius = (enemy.strong ? 16 : 12) * enemy.size;

      for (const b of blockers) {
        const rx = enemy.body.x - b.x;
        const ry = enemy.body.y - b.y;
        const minD = b.r + enemyRadius;
        const d = Math.sqrt(rx * rx + ry * ry) || 0.01;

        if (d >= minD) continue;

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
      }

      enemy.visual.setPosition(enemy.body.x, enemy.body.y);

      const facing = (enemy.visual.getData('facing') as number) || 1;
      const t = this.time.now / 110 + enemy.phase;

      enemy.visual.setScale(
        facing * enemy.size,
        enemy.size * (1 + Math.sin(t) * 0.04),
      );

      const legs = enemy.visual.getData('legs') as Phaser.GameObjects.Rectangle[] | undefined;
      if (legs) this.animateLegs(legs, t * 1.5, true);

      this.drawEnemyHealth(enemy);
    }
  }

  private removeEnemy(enemy: Enemy) {
    enemy.alive = false;
    enemy.body.destroy();
    this.killVisual(enemy.visual);

    this.enemies = this.enemies.filter(e => e !== enemy);
  }

  private damageEnemy(enemy: Enemy, damage: number) {
    if (!enemy.alive) return;

    enemy.hp -= damage;

    if (damage >= 25) {
      this.floatText(
        enemy.body.x, enemy.body.y - 26, `${Math.round(damage)}`,
        '#ff9a80', 11,
      );
    }

    this.tweens.add({
      targets: enemy.visual,
      alpha: 0.55,
      duration: 55,
      yoyo: true,
      repeat: 1,
    });

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

    for (let i = 0; i < 3; i++) {
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
    const aura = this.auraStats();

    for (const tower of this.towers) {
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

      const boost = tower.auraRing ? aura : null;
      let rate = tower.fireRate / (boost ? boost.spd : 1);

      // Besteira nível 5: modo metralhadora
      if (tower.kind === 'rapid' && tower.level >= 5) rate *= 0.4;

      tower.cooldown = rate;
      this.fireProjectile(tower, target);

      let raw = tower.damage * tower.level;
      if (boost) raw *= boost.dmg;
      if (this.finalChoice === 'tech') raw *= 1.3;

      const tx = target.body.x;
      const ty = target.body.y;

      this.damageEnemy(target, raw * target.resist[tower.kind]);

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
      this.tracers.push({ x1: sx, y1: sy, x2: tx, y2: ty, ttl: 70 });
      return;
    }

    const projectile = this.add.circle(
      sx, sy, sniper ? 5 : 3, color,
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
      this.damageEnemy(target, this.heroDamage);

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

    this.heroLabel.setText(`${HERO_STATS[this.heroKind].name} · Nv. ${this.heroLevel}`);
  }

  // ==================================================
  // QUATRO HABILIDADES
  // ==================================================

  private useSkill(skill: SkillKind) {
    if (this.gameOver) return;

    const rank = this.skillLevels[skill];
    const info = SKILL_INFO[skill];

    if (rank === 0) {
      this.showMessage(
        `Desbloqueie ${info.name} melhorando-a com um ponto de habilidade.`,
      );
      return;
    }

    if (skill === 'aura') {
      this.showMessage(
        `${info.name} é passiva e já está ativa (Nv.${rank}). Mantenha o herói perto das torres ${TOWER_STATS[HERO_STATS[this.heroKind].specialty].name}.`,
      );
      return;
    }

    const now = this.time.now;
    const ready = this.skillReadyAt[skill] ?? 0;

    if (now < ready) {
      this.showMessage(
        `${info.name} em recarga: ${Math.ceil((ready - now) / 1000)}s.`,
      );
      return;
    }

    const cost = Math.max(5, info.mana - (rank - 1) * 3);

    if (this.mana < cost) {
      this.showMessage('Mana insuficiente para esta habilidade.');
      return;
    }

    const before = this.mana;

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

    // A recarga só começa se a habilidade realmente foi usada.
    if (this.mana < before) {
      this.skillReadyAt[skill] = now + SKILL_COOLDOWN[skill];
    }

    this.refreshInterface();
  }

  private useExplosion(cost = 35, rank = 1) {
    if (this.mana < cost) {
      this.showMessage('Mana insuficiente para usar Explosão.');
      return;
    }

    this.mana -= cost;
    const radius = 95 + rank * 6;
    const damage = 3 + Math.floor(this.heroLevel * 0.8) + rank * 2;
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
    this.baseHP = Math.min(this.maxBaseHP, this.baseHP + 3 + rank);

    this.floatText(300, 740, `+${3 + rank} VIDA`, '#7dff9a', 14);

    this.showMessage(
      `Reparo utilizado! A base recuperou até ${3 + rank} pontos de vida.`,
    );
  }

  private useHeroStrike(cost: number, rank: number) {
    if (this.mana < cost) return;

    let target: Enemy | undefined;
    let closest = this.heroRange + 80;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      const distance = Phaser.Math.Distance.Between(
        this.hero.x, this.hero.y,
        enemy.body.x, enemy.body.y,
      );

      if (distance < closest) {
        closest = distance;
        target = enemy;
      }
    }

    if (!target) {
      this.showMessage('Não há inimigos próximos para o Golpe Heroico.');
      return;
    }

    this.mana -= cost;

    const effect = this.add.circle(
      target.body.x, target.body.y, 22 + rank * 3, 0xffd16b, 0.65,
    ).setBlendMode(Phaser.BlendModes.ADD).setDepth(13);

    this.tweens.add({
      targets: effect,
      alpha: 0,
      scale: 1.8,
      duration: 260,
      onComplete: () => effect.destroy(),
    });

    const slash = this.add.rectangle(
      target.body.x, target.body.y, 4, 46, 0xffffff, 0.95,
    ).setRotation(0.8).setDepth(13);

    this.tweens.add({
      targets: slash,
      scaleY: 0.1,
      alpha: 0,
      duration: 220,
      onComplete: () => slash.destroy(),
    });

    this.damageEnemy(target, 12 + this.heroLevel * 3 + rank * 5);
    this.showMessage('Golpe Heroico executado!');
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
      this.maxBaseHP,
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

    this.coinText.setText(`${this.coins}`);

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

    this.setButtonLabel(this.heroButton, `HERÓI  ·  PAINEL  ·  Nv.${this.heroLevel}`);

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

      this.tweens.add({
        targets: sigil,
        angle: 360,
        duration: 2400,
        repeat: -1,
      });
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
      c.setAlpha(0.72);

      this.tweens.add({
        targets: ghost,
        alpha: 0.08,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
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
      this.worldOverlay.setFillStyle(0x7a8088, 0.18);
    } else if (this.worldLevel === 2) {
      this.worldOverlay.setFillStyle(0xf0d28a, 0.12);
    } else if (this.worldLevel === 3) {
      this.worldOverlay.setFillStyle(0x3ccfff, 0.1);
    } else {
      this.worldOverlay.setFillStyle(0x000000, 0);
    }
  }

  private auraStats(): { radius: number; dmg: number; spd: number } | null {
    const rank = this.skillLevels.aura;
    if (rank <= 0) return null;

    return {
      radius: AURA_RADIUS + (rank - 1) * 10,
      dmg: 1 + 0.12 * rank,
      spd: 1 + 0.1 * rank,
    };
  }

  private updateAura() {
    const g = this.auraGraphics;
    g.clear();

    const aura = this.auraStats();
    const specialty = HERO_STATS[this.heroKind].specialty;
    const now = this.time.now;

    for (const t of this.towers) {
      const on = !!aura && t.kind === specialty &&
        Phaser.Math.Distance.Between(
          t.body.x, t.body.y, this.hero.x, this.hero.y,
        ) <= aura.radius;

      if (on && !t.auraRing) {
        const ring = this.add.circle(t.body.x, t.body.y + 4, 30, GOLD_LIGHT, 0.18)
          .setStrokeStyle(3, GOLD_LIGHT, 0.95)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(3);

        this.tweens.add({
          targets: ring,
          scale: 1.2,
          alpha: 0.5,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });

        t.auraRing = ring;
      } else if (!on && t.auraRing) {
        this.killVisual(t.auraRing);
        t.auraRing = undefined;
      }
    }

    if (aura) {
      g.fillStyle(GOLD_LIGHT, 0.035);
      g.fillCircle(this.hero.x, this.hero.y, aura.radius);
      g.lineStyle(2, GOLD_LIGHT, 0.25 + 0.15 * Math.sin(now / 300));
      g.strokeCircle(this.hero.x, this.hero.y, aura.radius);
    }
  }

  // ---------- heróis ----------

  private applyHeroStats() {
    const st = HERO_STATS[this.heroKind];
    const lvl = this.heroLevel;

    const eq = this.equip[this.heroKind];

    this.heroDamage = st.damage + (lvl - 1) + eq.weapon * 2;
    this.heroRange = st.range + (lvl - 1) * 5 + eq.weapon * 4;
    this.heroAttackRate = st.attackRate;
    this.heroSpeed = st.speed + eq.armor * 8;

    this.maxMana = 100 + st.manaBonus + (lvl - 1) * 5
      + this.extraMana * 25 + eq.relic * 10;
    this.manaRegen = 8 + eq.relic * 1.5;
    this.mana = Math.min(this.mana, this.maxMana);
  }

  private swapHero(kind: HeroKind) {
    if (kind === this.heroKind || !this.unlockedHeroes.includes(kind)) return;

    const now = this.time.now;

    if (now < this.heroSwapReadyAt) {
      this.showMessage(
        `Troca de herói em recarga: ${Math.ceil((this.heroSwapReadyAt - now) / 1000)}s.`,
      );
      return;
    }

    const x = this.hero.x;
    const y = this.hero.y;

    this.killVisual(this.heroVisual);
    this.heroKind = kind;
    this.heroVisual = this.createHeroVisual(kind, x, y).setDepth(7);
    this.heroLegs = this.heroVisual.getData('legs') as Phaser.GameObjects.Rectangle[];

    this.applyHeroStats();
    this.heroLabel.setText(`${HERO_STATS[kind].name} · Nv. ${this.heroLevel}`);

    // Evita abuso: a troca de herói tem recarga de 30s.
    this.heroSwapReadyAt = now + 30000;

    this.closeContextMenu();
    this.showMessage(`${HERO_STATS[kind].name} assumiu o comando. Nível e habilidades mantidos.`);
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

  private openWorldUnlock(level: number) {
    const info = WORLD_INFO[level];
    const nextHero = HERO_ORDER.find(h => !this.unlockedHeroes.includes(h));
    const heroName = nextHero ? HERO_STATS[nextHero].name : '—';

    const body =
      `Para avançar além da onda ${level === 2 ? 29 : 59} é preciso desbloquear este mundo.\n\n` +
      `Custo: ${info.cost} moedas  (você tem ${this.coins})\n` +
      `Recompensa: novo herói disponível — ${heroName}.\n` +
      'Você poderá alternar entre os heróis desbloqueados, mantendo nível e habilidades.';

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
      { label: 'AGORA NÃO', color: '#3a4046', action: () => this.closeModal() },
    ]);
  }

  private unlockWorld(level: number) {
    const info = WORLD_INFO[level];

    this.coins -= info.cost;
    this.worldLevel = level;

    const nextHero = HERO_ORDER.find(h => !this.unlockedHeroes.includes(h));
    if (nextHero) this.unlockedHeroes.push(nextHero);

    this.applyWorldTheme();
    this.closeModal();

    this.showMessage(
      `${info.name} desbloqueado!` +
      (nextHero ? ` ${HERO_STATS[nextHero].name} agora está disponível no menu do herói.` : '') +
      ' Inicie a onda novamente.',
    );

    this.refreshInterface();
  }

  private openFinalChoice() {
    const body =
      'Você chegou à onda 90 com todo o poder do Mundo Tecnológico.\n\n' +
      'MUNDO TECNOLÓGICO: mantém o poder máximo. Torres causam +30% de dano nas ondas 91 a 100. Caminho da recompensa e do domínio.\n\n' +
      'MUNDO REAL: inimigos com +35% de vida e recompensas reduzidas em 20%. Exige estratégia e posicionamento.\n\n' +
      'A escolha é registrada e não será pedida novamente.';

    this.openModal('A ESCOLHA FINAL', body, [
      {
        label: 'MUNDO TECNOLÓGICO',
        color: '#2d6a8a',
        action: () => this.chooseFinal('tech'),
      },
      {
        label: 'MUNDO REAL',
        color: '#6a4a3a',
        action: () => this.chooseFinal('real'),
      },
    ]);
  }

  private chooseFinal(choice: 'tech' | 'real') {
    this.finalChoice = choice;
    this.applyWorldTheme();
    this.closeModal();

    this.showMessage(
      choice === 'tech'
        ? 'Você permaneceu no Mundo Tecnológico: torres +30% de dano. Inicie a onda 91.'
        : 'Você retornou ao Mundo Real: inimigos mais fortes e menos recompensas. Inicie a onda 91.',
    );
  }

  // ---------- poderes dos heróis e das torres ----------

  private heroSkills(): SkillKind[] {
    return [HERO_STATS[this.heroKind].skill, 'repair', 'strike', 'aura'];
  }

  private heroBlockRadius(): number {
    return HERO_STATS[this.heroKind].blockRadius
      + this.equip[this.heroKind].armor * 3;
  }

  private towerPowerText(t: Tower): string {
    const on = t.level >= 5;

    if (t.kind === 'basic') {
      return on
        ? 'PODER NV.5: bolas de fogo em área a cada tiro.'
        : 'Nv.5 libera: bolas de fogo em área.';
    }

    if (t.kind === 'rapid') {
      return on
        ? 'PODER NV.5: metralhadora, cadência muito maior.'
        : 'Nv.5 libera: modo metralhadora.';
    }

    return on
      ? 'PODER NV.5: lentidão em área nos monstros.'
      : 'Nv.5 libera: lentidão em área.';
  }

  private fireballBlast(x: number, y: number, raw: number, main: Enemy) {
    for (const e of [...this.enemies]) {
      if (!e.alive || e === main) continue;

      if (Phaser.Math.Distance.Between(e.body.x, e.body.y, x, y) <= 58) {
        this.damageEnemy(e, raw * e.resist.basic);
      }
    }

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
        e.slowUntil = now + 2500;
      }
    }

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
      g.lineStyle(2, 0xfff0a0, Math.max(0, t.ttl / 70));
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
    const damage = 4 + Math.floor(this.heroLevel * 0.9) + rank * 2;

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
      const visual = this.createHeroVisual('patrulheiro', this.hero.x, this.hero.y)
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
      this.add.text(300, 88, `${st.name}  ·  NÍVEL ${this.heroLevel}`, {
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
      this.createHeroVisual(kind, 115, 215).setScale(3).setDepth(52),
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

    const aura = this.auraStats();

    label(
      40, 280,
      aura
        ? `${st.auraName} Nv.${this.skillLevels.aura}: +${Math.round(aura.dmg * 100 - 100)}% dano e +${Math.round(aura.spd * 100 - 100)}% velocidade nas torres ${TOWER_STATS[st.specialty].name} em ${aura.radius} de raio.`
        : 'Aura passiva bloqueada: melhore AURA em Habilidades.',
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

    // troca de herói
    const others = this.unlockedHeroes.filter(h => h !== kind);

    if (others.length) {
      others.forEach((h, i) => {
        const b = this.makeButton(
          40 + i * 265, 772, `TROCAR: ${HERO_STATS[h].name}`, '#355a52',
          () => {
            this.closeModal();
            this.swapHero(h);
          },
          12, 255, 38,
        );

        b.setDepth(53);
        keep(b);
      });
    } else {
      label(40, 782, 'Outros heróis são liberados nas ondas 30 e 60.', 11, '#b39a62');
    }

    label(
      40, 830,
      `Pontos de habilidade: ${this.skillPoints}   ·   XP ${this.xp} / ${this.heroLevel * 50}`,
      12, '#d9d0b7',
    );

    this.panelNote = label(40, 860, '', 12, '#ff9a8a');
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

  private createAllyVisual(kind: AllyKind): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const legs: Phaser.GameObjects.Rectangle[] = [];

    if (kind === 'dog') {
      const shadow = this.add.ellipse(0, 8, 26, 8, 0x0a0f0b, 0.5);
      const tail = this.add.rectangle(-13, -3, 8, 3, 0x8a6a44).setRotation(-0.6);
      const body = this.add.ellipse(0, 0, 24, 12, 0x9a7448).setStrokeStyle(1, 0x3a2a18);
      const head = this.add.circle(12, -4, 6, 0xa88050).setStrokeStyle(1, 0x3a2a18);
      const ear = this.add.triangle(13, -10, -3, 4, 3, 4, 0, -4, 0x5a3e22);
      const snout = this.add.rectangle(17, -3, 5, 4, 0x6b4b2a);
      const eye = this.add.circle(14, -5, 1.2, 0x000000);

      for (const lx of [-8, -3, 4, 9]) {
        const leg = this.add.rectangle(lx, 6, 3, 6, 0x6b4b2a);
        leg.setData('by', 6);
        legs.push(leg);
      }

      c.add([shadow, tail, ...legs, body, head, ear, snout, eye]);
    } else if (kind === 'human') {
      const shadow = this.add.ellipse(0, 12, 22, 8, 0x0a0f0b, 0.5);
      const leftLeg = this.add.rectangle(-4, 9, 5, 9, 0x30363c);
      const rightLeg = this.add.rectangle(4, 9, 5, 9, 0x30363c);
      leftLeg.setData('by', 9);
      rightLeg.setData('by', 9);
      legs.push(leftLeg, rightLeg);

      const body = this.add.rectangle(0, -2, 14, 15, 0x6b7f8f).setStrokeStyle(1, GOLD);
      const head = this.add.circle(0, -13, 6, 0xc3a47e).setStrokeStyle(1, 0x4a3b2d);
      const helmet = this.add.rectangle(0, -17, 12, 4, 0x9aa6aa);
      const sword = this.add.rectangle(11, -3, 3, 16, 0xdfe6e9).setRotation(-0.3);
      const shield = this.add.ellipse(-10, -2, 8, 13, 0x4d6b86).setStrokeStyle(1, GOLD);

      c.add([shadow, leftLeg, rightLeg, body, head, helmet, sword, shield]);
    } else {
      const glow = this.add.circle(0, 0, 16, 0x50e0ff, 0.25)
        .setBlendMode(Phaser.BlendModes.ADD);
      const body = this.add.ellipse(0, 0, 16, 10, 0x8a949c).setStrokeStyle(2, 0x50e0ff);
      const eye = this.add.circle(0, 1, 3, 0xff4040);

      const rotor = this.add.container(0, -7, [
        this.add.rectangle(0, 0, 22, 2, 0xcfd8dc),
        this.add.rectangle(0, 0, 2, 22, 0xcfd8dc, 0.5),
      ]);

      this.tweens.add({
        targets: rotor,
        angle: 360,
        duration: 220,
        repeat: -1,
      });

      c.add([glow, body, eye, rotor]);
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

        const dmg = cfg.base + Math.floor(this.heroLevel * cfg.perLevel);
        const tx = target.body.x;
        const ty = target.body.y;

        if (a.kind === 'drone') {
          for (const e of [...this.enemies]) {
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

    this.moveHero(delta);
    this.regenerateMana(delta);
    this.updateEnemies(delta);

    if (this.gameOver) return;

    this.updateTowers(delta);
    this.updateAllies(delta);
    this.updateClones(delta);
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
    this.showEndPanel(
      'VITÓRIA',
      '#f0d58a',
      'Você defendeu a fortaleza até a onda 100!\nA campanha foi concluída.',
    );
  }
}

// ==================================================
// EMPÓRIO DO HERÓI (LOJA INICIAL)
// ==================================================

const SHOP_ITEMS: {
  key: 'base' | 'mana' | 'skill';
  name: string;
  desc: string;
  cost: number;
  max: number;
}[] = [
  { key: 'base', name: 'REFORÇO DA FORTALEZA', desc: '+4 de vida máxima da fortaleza.', cost: 120, max: 3 },
  { key: 'mana', name: 'CRISTAL DE MANA', desc: '+25 de mana máxima do herói.', cost: 100, max: 3 },
  { key: 'skill', name: 'PERGAMINHO ARCANO', desc: '+1 ponto de habilidade inicial.', cost: 150, max: 2 },
];

const TOWER_WEAKNESS: Record<TowerKind, string> = {
  basic: 'Fraca contra: Espectral (50%)',
  rapid: 'Fraca contra: Couraçado (40%) e Blindado (25%)',
  sniper: 'Fraca contra: Antimagia (30%) e Ágil (50%)',
};

class ShopScene extends BaseScene {
  private budget = 300;
  private selectedHero: HeroKind = 'guardiao';
  private stock: Record<TowerKind, number> = { basic: 0, rapid: 0, sniper: 0 };
  private bought: TowerKind[] = [];
  private extras = { base: 0, mana: 0, skill: 0 };

  private heroObjs: Phaser.GameObjects.GameObject[] = [];
  private stageObjs: Phaser.GameObjects.GameObject[] = [];
  private countTexts: Record<string, Phaser.GameObjects.Text> = {};

  private budgetText!: Phaser.GameObjects.Text;
  private stockText!: Phaser.GameObjects.Text;
  private noteText!: Phaser.GameObjects.Text;

  private readonly slots = [
    { x: 80, y: 300 }, { x: 150, y: 324 },
    { x: 450, y: 324 }, { x: 520, y: 300 },
    { x: 70, y: 240 }, { x: 530, y: 240 },
  ];

  constructor() {
    super('ShopScene');
  }

  init() {
    this.budget = 300;
    this.selectedHero = 'guardiao';
    this.stock = { basic: 0, rapid: 0, sniper: 0 };
    this.bought = [];
    this.extras = { base: 0, mana: 0, skill: 0 };
    this.heroObjs = [];
    this.stageObjs = [];
    this.countTexts = {};
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

    this.add.text(300, 25, 'EMPÓRIO DO HERÓI', {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: '#f0d58a',
      fontStyle: 'bold',
      stroke: '#1a1006',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.drawStage(bg);
    this.renderStage();
    this.renderHero();

    this.add.text(300, 468, 'FERRAMENTAS DE BATALHA', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#c9a24d',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    const kinds: TowerKind[] = ['basic', 'rapid', 'sniper'];
    kinds.forEach((k, i) => this.makeTowerCard(k, 8 + i * 196, 480));
    SHOP_ITEMS.forEach((it, i) => this.makeItemCard(it, 8 + i * 196, 686));

    this.createBottomBar();
    this.refreshShop();
  }

  // ---------- palco ----------

  private drawStage(g: Phaser.GameObjects.Graphics) {
    this.drawPanelFrame(g, 10, 62, 580, 300);
    this.fillVGradient(g, 18, 70, 564, 284, 0x1b2a33, 0x0b1014, 1, 3);

    for (const px of [34, 150, 428, 544]) {
      g.fillStyle(0x232a30, 1);
      g.fillRect(px, 70, 22, 200);
      g.fillStyle(0x303840, 1);
      g.fillRect(px - 3, 70, 28, 8);
      g.fillRect(px - 3, 262, 28, 8);
      g.lineStyle(1, GOLD_DARK, 1);
      g.strokeRect(px, 70, 22, 200);
    }

    this.fillVGradient(g, 18, 270, 564, 84, 0x2a3a2d, 0x131b16, 1, 3);

    g.fillStyle(0x0a0f0c, 0.6);
    g.fillEllipse(304, 336, 380, 70);
    g.fillStyle(0x6b6a58, 1);
    g.fillEllipse(300, 328, 360, 64);
    g.lineStyle(2, GOLD, 1);
    g.strokeEllipse(300, 328, 360, 64);
    g.lineStyle(1, 0x7fe0e6, 0.6);
    g.strokeEllipse(300, 328, 300, 50);

    for (const sl of this.slots) {
      g.lineStyle(1, GOLD, 0.35);
      g.strokeEllipse(sl.x, sl.y + 8, 46, 22);
    }

    for (const tx of [100, 500]) {
      g.fillStyle(0x3b2d1c, 1);
      g.fillRect(tx - 2, 150, 4, 20);
      g.fillStyle(0x7a6a48, 1);
      g.fillRect(tx - 5, 146, 10, 4);

      const glow = this.add.circle(tx, 134, 26, 0xff9a3c, 0.16)
        .setBlendMode(Phaser.BlendModes.ADD);
      const flame = this.add.ellipse(tx, 135, 8, 13, 0xff8a2a, 0.95);
      const core = this.add.ellipse(tx, 137, 4, 8, 0xffe08a, 1);

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
        duration: 380,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private renderStage() {
    this.stageObjs.forEach(o => this.killVisual(o));
    this.stageObjs = [];

    this.bought.slice(0, this.slots.length).forEach((kind, i) => {
      const sl = this.slots[i];
      const v = this.createTowerVisual(sl.x, sl.y, kind)
        .setScale(1.3)
        .setDepth(4);

      this.stageObjs.push(v);
    });

    if (this.bought.length > this.slots.length) {
      this.stageObjs.push(
        this.add.text(300, 352, `+${this.bought.length - this.slots.length} torres no estoque`, {
          fontFamily: 'Georgia, serif',
          fontSize: '10px',
          color: '#f0d58a',
        }).setOrigin(0.5).setDepth(6),
      );
    }

    const parts: string[] = [];
    if (this.extras.base) parts.push(`Reforço ×${this.extras.base}`);
    if (this.extras.mana) parts.push(`Cristal ×${this.extras.mana}`);
    if (this.extras.skill) parts.push(`Pergaminho ×${this.extras.skill}`);

    if (parts.length) {
      this.stageObjs.push(
        this.add.text(300, 346, parts.join('   '), {
          fontFamily: 'Georgia, serif',
          fontSize: '10px',
          color: '#9fe3b0',
          backgroundColor: '#0b0d10b0',
          padding: { x: 6, y: 2 },
        }).setOrigin(0.5).setDepth(6),
      );
    }
  }

  private renderHero() {
    this.heroObjs.forEach(o => this.killVisual(o));
    this.heroObjs = [];

    const st = HERO_STATS[this.selectedHero];
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.heroObjs.push(o);
      return o;
    };

    const ring = keep(
      this.add.ellipse(300, 330, 250, 60, GOLD_LIGHT, 0.14)
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
      this.createHeroVisual(this.selectedHero, 300, 280)
        .setScale(3.4)
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
        fontSize: '24px',
        color: '#f0d58a',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(6),
    );

    keep(
      this.add.text(300, 118, st.title.toUpperCase(), {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        color: '#b9d6c0',
        letterSpacing: 2,
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(6),
    );

    keep(
      this.add.text(300, 136, st.desc, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#d9d0b7',
        align: 'center',
        wordWrap: { width: 300 },
      }).setOrigin(0.5, 0).setDepth(6),
    );

    // abas dos heróis
    HERO_ORDER.forEach((h, i) => {
      const tab = this.makeButton(
        8 + i * 196, 368, HERO_STATS[h].name,
        h === this.selectedHero ? '#9a7a22' : '#2b333a',
        () => {
          this.selectedHero = h;
          this.renderHero();
        },
        11, 188, 28,
      );

      keep(tab);
    });

    // atributos
    const gb = keep(this.add.graphics());

    const rows: [string, number, string][] = [
      ['DANO', st.damage / 6, `${st.damage}`],
      ['ALCANCE', st.range / 160, `${st.range}`],
      ['VELOCIDADE', st.speed / 280, `${st.speed}`],
      ['ATAQUE', (1000 / st.attackRate) / 2.8, `${(1000 / st.attackRate).toFixed(1)}/s`],
    ];

    rows.forEach(([label, ratio, value], i) => {
      const y = 404 + i * 14;

      keep(
        this.add.text(16, y - 1, label, {
          fontFamily: 'Georgia, serif',
          fontSize: '9px',
          color: '#c9a24d',
          fontStyle: 'bold',
        }),
      );

      gb.lineStyle(1, GOLD_DARK, 1);
      gb.strokeRect(95, y - 1, 152, 10);
      this.drawBar(gb, 96, y, 150, 8, ratio, 0xe8c466, 0x8a6a22, 0);

      keep(
        this.add.text(254, y - 1, value, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '9px',
          color: '#efe6cc',
        }),
      );
    });

    keep(
      this.add.text(
        312, 402,
        `ESPECIALIDADE: ${TOWER_STATS[st.specialty].name}\nPODER: ${SKILL_INFO[st.skill].name} · ${SKILL_INFO[st.skill].description}\n${st.auraName}: ${st.auraDesc}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '9px',
          color: '#e6dfcd',
          wordWrap: { width: 272 },
          lineSpacing: 2,
        },
      ),
    );
  }

  // ---------- cartas ----------

  private makeTowerCard(kind: TowerKind, x: number, y: number) {
    const w = 188;
    const h = 200;
    const st = TOWER_STATS[kind];

    const g = this.add.graphics();
    this.drawPanelFrame(g, x, y, w, h, 6);

    this.createTowerVisual(x + w / 2, y + 66, kind).setScale(1.6);

    this.add.text(x + w / 2, y + 112, st.name, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#f0d58a',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(
      x + w / 2, y + 128,
      `Dano ${st.damage} · Alcance ${st.range} · ${(1000 / st.fireRate).toFixed(1)}/s`,
      { fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#e6dfcd' },
    ).setOrigin(0.5);

    this.add.text(x + w / 2, y + 142, TOWER_WEAKNESS[kind], {
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      color: '#e0a090',
      align: 'center',
      wordWrap: { width: 168 },
    }).setOrigin(0.5, 0);

    this.countTexts[`t_${kind}`] = this.add.text(x + w / 2, y + 166, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#9fe3b0',
    }).setOrigin(0.5);

    this.makeButton(
      x + 8, y + h - 32, `COMPRAR · ${st.cost}`, '#2d5a80',
      () => this.buyTower(kind), 10, 106, 24,
    );

    this.makeButton(
      x + 120, y + h - 32, 'DEVOLVER', '#7a352c',
      () => this.refundTower(kind), 9, 60, 24,
    );
  }

  private drawItemIcon(
    g: Phaser.GameObjects.Graphics,
    key: 'base' | 'mana' | 'skill',
    cx: number,
    cy: number,
  ) {
    if (key === 'base') {
      g.fillStyle(0x6a7f95, 1);
      g.fillRect(cx - 22, cy - 10, 44, 30);

      for (let i = 0; i < 4; i++) {
        g.fillRect(cx - 22 + i * 12, cy - 17, 8, 8);
      }

      g.fillStyle(0x0d0905, 1);
      g.fillRect(cx - 6, cy + 2, 12, 18);
      g.fillCircle(cx, cy + 2, 6);
      g.lineStyle(2, GOLD, 1);
      g.strokeRect(cx - 22, cy - 10, 44, 30);
    } else if (key === 'mana') {
      this.drawGem(g, cx, cy, 18, 0x4aa8ff);
      g.lineStyle(2, 0xdff6ff, 0.9);
      g.strokeTriangle(cx - 18, cy, cx, cy - 18, cx + 18, cy);
      g.fillStyle(0xdff6ff, 0.5);
      g.fillTriangle(cx - 8, cy - 2, cx, cy - 12, cx + 4, cy - 2);
    } else {
      g.fillStyle(0xe8d9a8, 1);
      g.fillRect(cx - 20, cy - 12, 40, 28);
      g.fillStyle(0xc9b27a, 1);
      g.fillCircle(cx - 20, cy + 2, 7);
      g.fillCircle(cx + 20, cy + 2, 7);
      g.lineStyle(1, 0x7a5a24, 1);
      g.strokeRect(cx - 20, cy - 12, 40, 28);

      for (let i = 0; i < 4; i++) {
        g.lineBetween(cx - 14, cy - 6 + i * 6, cx + 14, cy - 6 + i * 6);
      }
    }
  }

  private makeItemCard(
    it: typeof SHOP_ITEMS[number],
    x: number,
    y: number,
  ) {
    const w = 188;
    const h = 200;

    const g = this.add.graphics();
    this.drawPanelFrame(g, x, y, w, h, 6);
    this.drawItemIcon(g, it.key, x + w / 2, y + 62);

    this.add.text(x + w / 2, y + 112, it.name, {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#f0d58a',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(x + w / 2, y + 130, it.desc, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#e6dfcd',
      align: 'center',
      wordWrap: { width: 164 },
    }).setOrigin(0.5, 0);

    this.countTexts[`i_${it.key}`] = this.add.text(x + w / 2, y + 166, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#9fe3b0',
    }).setOrigin(0.5);

    this.makeButton(
      x + 8, y + h - 32, `COMPRAR · ${it.cost}`, '#8a6a22',
      () => this.buyItem(it), 10, 106, 24,
    );

    this.makeButton(
      x + 120, y + h - 32, 'DEVOLVER', '#7a352c',
      () => this.refundItem(it), 9, 60, 24,
    );
  }

  private createBottomBar() {
    const g = this.add.graphics();
    this.drawPanelFrame(g, 8, 892, 584, 44, 6);

    g.fillStyle(0x7a5a14, 1);
    g.fillCircle(32, 914, 11);
    g.fillStyle(0xf2c94c, 1);
    g.fillCircle(32, 914, 9);
    g.lineStyle(1, 0x7a5a14, 1);
    g.strokeCircle(32, 914, 6);

    this.add.text(50, 900, 'MOEDAS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '8px',
      color: '#b39a62',
      letterSpacing: 1,
    });

    this.budgetText = this.add.text(50, 910, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffe08a',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });

    this.stockText = this.add.text(580, 914, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#efe6cc',
      align: 'right',
    }).setOrigin(1, 0.5);

    this.noteText = this.add.text(
      300, 946, 'Gaste suas moedas iniciais e veja o resultado no palco.',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#c9b985',
      },
    ).setOrigin(0.5);

    this.makeButton(
      20, 958, 'COMEÇAR BATALHA', '#8a3a2c',
      () => this.startBattle(), 15, 560, 36,
    );
  }

  // ---------- compras ----------

  private note(text: string) {
    this.noteText.setText(text);
  }

  private refreshShop() {
    this.budgetText.setText(`${this.budget}`);

    (['basic', 'rapid', 'sniper'] as TowerKind[]).forEach(k => {
      this.countTexts[`t_${k}`].setText(`No estoque: ${this.stock[k]}`);
    });

    SHOP_ITEMS.forEach(it => {
      this.countTexts[`i_${it.key}`].setText(
        `Comprados: ${this.extras[it.key]} / ${it.max}`,
      );
    });

    this.stockText.setText(
      `Estoque:  GUARDIÃ ×${this.stock.basic}  ·  BESTEIRA ×${this.stock.rapid}  ·  ARCANA ×${this.stock.sniper}`,
    );
  }

  private buyTower(kind: TowerKind) {
    const st = TOWER_STATS[kind];

    if (this.budget < st.cost) {
      this.note('Moedas insuficientes!');
      return;
    }

    this.budget -= st.cost;
    this.stock[kind]++;
    this.bought.push(kind);

    this.note(`${st.name} adicionada ao estoque. Será construída de graça na batalha.`);
    this.renderStage();
    this.refreshShop();
  }

  private refundTower(kind: TowerKind) {
    if (this.stock[kind] <= 0) return;

    this.budget += TOWER_STATS[kind].cost;
    this.stock[kind]--;
    this.bought.splice(this.bought.lastIndexOf(kind), 1);

    this.note(`${TOWER_STATS[kind].name} devolvida.`);
    this.renderStage();
    this.refreshShop();
  }

  private buyItem(it: typeof SHOP_ITEMS[number]) {
    if (this.extras[it.key] >= it.max) {
      this.note('Limite deste item atingido.');
      return;
    }

    if (this.budget < it.cost) {
      this.note('Moedas insuficientes!');
      return;
    }

    this.budget -= it.cost;
    this.extras[it.key]++;

    this.note(`${it.name} adquirido.`);
    this.renderStage();
    this.refreshShop();
  }

  private refundItem(it: typeof SHOP_ITEMS[number]) {
    if (this.extras[it.key] <= 0) return;

    this.budget += it.cost;
    this.extras[it.key]--;

    this.note(`${it.name} devolvido.`);
    this.renderStage();
    this.refreshShop();
  }

  private startBattle() {
    this.scene.start('GameScene', {
      heroKind: this.selectedHero,
      stock: { ...this.stock },
      extras: { ...this.extras },
      coins: this.budget,
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'app',
  backgroundColor: '#080c09',
  scene: [ShopScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
