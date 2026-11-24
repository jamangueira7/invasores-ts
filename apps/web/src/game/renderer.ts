import { type Game, InvaderType, type Shot } from '@lab/domain';
import { drawInvader, drawShip, INVADER_COLORS, poseOf, SHIP_COLOR } from './sprites';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

/**
 * Desenha o jogo com buffer duplo (cap. 13): tudo vai para um canvas fora da tela e,
 * no fim do quadro, é copiado de uma vez para o canvas visível. Explosões nascem dos
 * eventos do `Game`; o renderer nunca muda o estado do jogo.
 */
export class Renderer implements Disposable {
  private readonly buffer: OffscreenCanvas | HTMLCanvasElement;
  private readonly bufferCtx: Ctx;
  private readonly screenCtx: CanvasRenderingContext2D;
  private readonly unsubscribe: (() => void)[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private banner: { text: string; life: number } | null = null;
  private shake = 0;
  private last = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly game: Game,
    private readonly scale = Math.min(2, window.devicePixelRatio || 1),
  ) {
    canvas.width = game.width * scale;
    canvas.height = game.height * scale;
    this.buffer =
      typeof OffscreenCanvas === 'function'
        ? new OffscreenCanvas(canvas.width, canvas.height)
        : Object.assign(document.createElement('canvas'), { width: canvas.width, height: canvas.height });
    const ctx = this.buffer.getContext('2d') as Ctx | null;
    const screen = canvas.getContext('2d', { alpha: false });
    if (!ctx || !screen) throw new Error('Canvas 2D indisponível');
    this.bufferCtx = ctx;
    this.screenCtx = screen;

    this.unsubscribe.push(
      game.on('invaderKilled', (e) => {
        this.explode(e.x, e.y, INVADER_COLORS[e.type], 18);
        this.floaters.push({ x: e.x, y: e.y, text: `+${e.points}`, life: 700, color: INVADER_COLORS[e.type] });
      }),
      game.on('playerHit', (e) => {
        this.explode(e.x, e.y, SHIP_COLOR, 40);
        this.explode(e.x, e.y, '#f87171', 24);
        this.shake = 300;
      }),
      game.on('waveCleared', (e) => {
        this.banner = { text: `Onda ${e.nextWave}`, life: 1600 };
      }),
      game.on('gameOver', () => {
        this.explode(game.player.centerX, game.player.y + 12, '#f87171', 60);
      }),
    );
  }

  private explode(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.03 + Math.random() * 0.18;
      const max = 350 + Math.random() * 450;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: max,
        max,
        color,
        size: 1.5 + Math.random() * 2.5,
      });
    }
  }

  draw(now: number): void {
    const dt = this.last ? Math.min(now - this.last, 50) : 16;
    this.last = now;
    const ctx = this.bufferCtx;
    const { game } = this;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    this.drawBackground(ctx);
    ctx.save();
    if (this.shake > 0) {
      this.shake -= dt;
      ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }

    for (const invader of game.invaders) drawInvader(ctx, invader.type, invader.x, invader.y, poseOf(invader.x));
    for (const shot of game.shots) this.drawShot(ctx, shot, now);

    const blink = game.player.isInvulnerable && Math.floor(now / 110) % 2 === 0;
    if (game.status !== 'over' && !blink) drawShip(ctx, game.player.x, game.player.y);

    this.drawEffects(ctx, dt);
    ctx.restore();

    // buffer duplo: copia o quadro pronto de uma vez
    this.screenCtx.drawImage(this.buffer, 0, 0);
  }

  private drawBackground(ctx: Ctx): void {
    const { width, height } = this.game;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#060818');
    sky.addColorStop(0.6, '#0b1030');
    sky.addColorStop(1, '#1a0f2e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    for (const star of this.game.stars.all) {
      ctx.globalAlpha = 0.35 + star.size * 0.2;
      ctx.fillStyle = star.color;
      const s = star.size * 0.8;
      ctx.fillRect(star.x, star.y, s, s);
    }
    ctx.globalAlpha = 1;

    // chão
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.fillRect(0, height - 18, width, 2);
  }

  private drawShot(ctx: Ctx, shot: Shot, now: number): void {
    if (shot.owner === 'player') {
      ctx.fillStyle = 'rgba(253, 230, 138, 0.25)';
      ctx.fillRect(shot.x - 3, shot.y - 2, shot.width + 6, shot.height + 6);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(shot.x, shot.y, shot.width, shot.height);
      return;
    }
    // tiro inimigo em zigue-zague
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const phase = Math.floor(now / 80) % 2 ? 3 : -3;
    ctx.moveTo(shot.x + 2, shot.y);
    ctx.lineTo(shot.x + 2 + phase, shot.y + 5);
    ctx.lineTo(shot.x + 2 - phase, shot.y + 10);
    ctx.lineTo(shot.x + 2, shot.y + 14);
    ctx.stroke();
  }

  private drawEffects(ctx: Ctx, dt: number): void {
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.font = '700 15px Outfit, system-ui, sans-serif';
    this.floaters = this.floaters.filter((f) => (f.life -= dt) > 0);
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life / 400);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - (700 - f.life) * 0.04);
    }
    ctx.globalAlpha = 1;

    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
      else {
        ctx.globalAlpha = Math.min(1, this.banner.life / 400);
        ctx.font = '800 48px Outfit, system-ui, sans-serif';
        ctx.fillStyle = INVADER_COLORS[InvaderType.Crown];
        ctx.fillText(this.banner.text, this.game.width / 2, this.game.height / 2);
        ctx.globalAlpha = 1;
      }
    }
  }

  [Symbol.dispose](): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
  }
}
