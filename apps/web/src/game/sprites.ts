import { Game, InvaderType } from '@lab/domain';

/** Cor de cada tipo, a mesma no jogo, na legenda, no placar e nas estatísticas. */
export const INVADER_COLORS: Record<InvaderType, string> = {
  [InvaderType.Drone]: '#4ade80',
  [InvaderType.Stinger]: '#38bdf8',
  [InvaderType.Crown]: '#f472b6',
};

export const INVADER_NAMES: Record<InvaderType, string> = {
  [InvaderType.Drone]: 'Drone',
  [InvaderType.Stinger]: 'Ferrão',
  [InvaderType.Crown]: 'Coroa',
};

export const SHIP_COLOR = '#fbbf24';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Pose da animação: troca a cada passo da formação (a posição anda de STEP_X em STEP_X). */
export function poseOf(x: number): 0 | 1 {
  return Math.round(x / Game.STEP_X) % 2 === 0 ? 0 : 1;
}

/** Desenho próprio de cada invasor, só com formas geométricas, numa caixa de 34×24. */
export function drawInvader(ctx: Ctx, type: InvaderType, x: number, y: number, pose: 0 | 1): void {
  const color = INVADER_COLORS[type];
  ctx.save();
  ctx.translate(x, y);
  // halo suave
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(17, 12, 20, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  if (type === InvaderType.Drone) {
    // casco hexagonal com um olho e duas pernas que alternam
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.lineTo(26, 2);
    ctx.lineTo(33, 10);
    ctx.lineTo(26, 17);
    ctx.lineTo(8, 17);
    ctx.lineTo(1, 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    const spread = pose ? 4 : 0;
    ctx.moveTo(10, 17);
    ctx.lineTo(6 - spread, 23);
    ctx.moveTo(24, 17);
    ctx.lineTo(28 + spread, 23);
    ctx.stroke();
    eye(ctx, 17, 9.5, 4.5);
  } else if (type === InvaderType.Stinger) {
    // losango com asas que batem e um ferrão embaixo
    const wing = pose ? 6 : 1;
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(27, 10);
    ctx.lineTo(17, 20);
    ctx.lineTo(7, 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 9);
    ctx.lineTo(0, 4 + wing);
    ctx.lineTo(3, 15);
    ctx.closePath();
    ctx.moveTo(26, 9);
    ctx.lineTo(34, 4 + wing);
    ctx.lineTo(31, 15);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(17, 20);
    ctx.lineTo(17, 24);
    ctx.stroke();
    eye(ctx, 13.5, 9, 2.6);
    eye(ctx, 20.5, 9, 2.6);
  } else {
    // cúpula com três pontas de coroa e antenas que balançam
    ctx.beginPath();
    ctx.moveTo(3, 21);
    ctx.lineTo(3, 12);
    ctx.quadraticCurveTo(17, -1, 31, 12);
    ctx.lineTo(31, 21);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 7);
    ctx.lineTo(10, 1);
    ctx.lineTo(13, 5);
    ctx.lineTo(17, -2);
    ctx.lineTo(21, 5);
    ctx.lineTo(24, 1);
    ctx.lineTo(26, 7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    const sway = pose ? 3 : -3;
    for (const base of [8, 17, 26]) {
      ctx.moveTo(base, 21);
      ctx.lineTo(base + sway, 24);
    }
    ctx.stroke();
    eye(ctx, 11.5, 14, 3);
    eye(ctx, 22.5, 14, 3);
  }
  ctx.restore();
}

function eye(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.fillStyle = '#0b1020';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

/** Nave do jogador numa caixa de 46×26. */
export function drawShip(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
  ctx.beginPath();
  ctx.ellipse(23, 16, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createLinearGradient(0, 0, 0, 26);
  body.addColorStop(0, '#fde68a');
  body.addColorStop(1, '#d97706');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(23, 0);
  ctx.lineTo(30, 11);
  ctx.lineTo(46, 20);
  ctx.lineTo(44, 26);
  ctx.lineTo(2, 26);
  ctx.lineTo(0, 20);
  ctx.lineTo(16, 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.ellipse(23, 13, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fb923c';
  ctx.fillRect(10, 26, 6, 3);
  ctx.fillRect(30, 26, 6, 3);
  ctx.restore();
}
