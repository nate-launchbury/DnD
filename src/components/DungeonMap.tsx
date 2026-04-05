import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dungeon } from '../types/dungeon'
import type { Player } from '../types/game'
import { isCellVisible } from '../engine/gameEngine'

export type MapTheme = 'classic' | 'cave' | 'crypt' | 'forest' | 'infernal'

interface ThemeDef {
  label: string
  bg: [string, string]
  fog: string
  shadow: string
  ambientTint: string
  swatch: [string, string]
  floor: { base: [number, number, number]; variation: number; mortar: [number, number, number]; crack: [number, number, number]; moss: [number, number, number] }
  wall: { base: [number, number, number]; variation: number; mortar: [number, number, number]; top: [number, number, number]; highlight: number }
  door: { wood: [number, number, number]; grain: [number, number, number]; metal: [number, number, number] }
  water: { deep: [number, number, number]; surface: [number, number, number]; highlight: [number, number, number]; lava?: boolean }
}

const THEMES: Record<MapTheme, ThemeDef> = {
  classic: {
    label: 'Dungeon',
    bg: ['#16162e', '#0a0a18'], fog: '#08081a',
    shadow: 'rgba(0,0,20,0.6)', ambientTint: 'rgba(100,100,180,0.04)',
    swatch: ['#22223a', '#3e3e5e'],
    floor: { base: [72, 68, 95], variation: 20, mortar: [28, 26, 50], crack: [22, 18, 40], moss: [50, 80, 55] },
    wall: { base: [38, 35, 60], variation: 12, mortar: [18, 16, 36], top: [85, 80, 120], highlight: 15 },
    door: { wood: [95, 65, 35], grain: [70, 48, 22], metal: [130, 135, 150] },
    water: { deep: [15, 22, 50], surface: [40, 55, 95], highlight: [70, 100, 150] },
  },
  cave: {
    label: 'Cave',
    bg: ['#1a1408', '#0c0804'], fog: '#0e0a04',
    shadow: 'rgba(10,5,0,0.6)', ambientTint: 'rgba(180,140,80,0.05)',
    swatch: ['#4a3828', '#7a6850'],
    floor: { base: [90, 72, 55], variation: 22, mortar: [40, 28, 15], crack: [30, 18, 8], moss: [65, 100, 40] },
    wall: { base: [55, 42, 28], variation: 14, mortar: [28, 18, 8], top: [100, 85, 62], highlight: 12 },
    door: { wood: [105, 80, 48], grain: [80, 58, 30], metal: [140, 120, 95] },
    water: { deep: [22, 30, 20], surface: [50, 65, 50], highlight: [70, 90, 65] },
  },
  crypt: {
    label: 'Crypt',
    bg: ['#101418', '#080a0e'], fog: '#060810',
    shadow: 'rgba(0,0,15,0.65)', ambientTint: 'rgba(120,140,180,0.05)',
    swatch: ['#2a2e36', '#404852'],
    floor: { base: [58, 62, 75], variation: 18, mortar: [25, 28, 38], crack: [18, 20, 30], moss: [42, 60, 50] },
    wall: { base: [32, 36, 48], variation: 10, mortar: [16, 18, 28], top: [72, 78, 95], highlight: 12 },
    door: { wood: [60, 50, 42], grain: [45, 35, 28], metal: [105, 112, 128] },
    water: { deep: [8, 12, 28], surface: [25, 35, 60], highlight: [45, 60, 95] },
  },
  forest: {
    label: 'Forest',
    bg: ['#0c1a0c', '#040e04'], fog: '#040c04',
    shadow: 'rgba(0,12,0,0.55)', ambientTint: 'rgba(80,160,60,0.05)',
    swatch: ['#1e3e22', '#3e5e3c'],
    floor: { base: [52, 68, 48], variation: 22, mortar: [22, 35, 18], crack: [16, 28, 12], moss: [55, 95, 35] },
    wall: { base: [30, 45, 28], variation: 14, mortar: [14, 24, 12], top: [68, 92, 58], highlight: 14 },
    door: { wood: [78, 68, 35], grain: [58, 50, 25], metal: [95, 110, 80] },
    water: { deep: [10, 25, 15], surface: [28, 58, 35], highlight: [40, 80, 50] },
  },
  infernal: {
    label: 'Infernal',
    bg: ['#200c08', '#100404'], fog: '#0c0404',
    shadow: 'rgba(15,0,0,0.6)', ambientTint: 'rgba(255,60,20,0.06)',
    swatch: ['#382020', '#603838'],
    floor: { base: [75, 38, 30], variation: 20, mortar: [35, 15, 10], crack: [25, 8, 5], moss: [75, 45, 28] },
    wall: { base: [48, 25, 20], variation: 12, mortar: [22, 10, 8], top: [90, 58, 50], highlight: 12 },
    door: { wood: [78, 40, 25], grain: [58, 28, 18], metal: [128, 110, 95] },
    water: { deep: [60, 15, 0], surface: [140, 50, 10], highlight: [210, 90, 20], lava: true },
  },
}

const S = 32

function h(x: number, y: number, seed = 0): number {
  let v = (x * 374761 + y * 668265 + seed * 982451) ^ (x * y * 1234 + seed)
  v = ((v >> 16) ^ v) * 0x45d9f3b
  v = ((v >> 16) ^ v) * 0x45d9f3b
  return (((v >> 16) ^ v) >>> 0) / 4294967295
}

function noise2D(x: number, y: number, seed = 999): number {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const a = h(ix, iy, seed), b = h(ix + 1, iy, seed)
  const c = h(ix, iy + 1, seed), d = h(ix + 1, iy + 1, seed)
  return a + u * (b - a) + v * (c - a) + u * v * (a - b - c + d)
}

function fbm(x: number, y: number, octaves = 3, seed = 999): number {
  let val = 0, amp = 1, freq = 1, total = 0
  for (let i = 0; i < octaves; i++) {
    val += noise2D(x * freq, y * freq, seed + i * 137) * amp
    total += amp
    amp *= 0.5
    freq *= 2.2
  }
  return val / total
}

function clamp(v: number, lo = 0, hi = 255): number {
  return v < lo ? lo : v > hi ? hi : v
}

function rgb(r: number, g: number, b: number): string {
  return `rgb(${clamp(Math.round(r))},${clamp(Math.round(g))},${clamp(Math.round(b))})`
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${clamp(Math.round(r))},${clamp(Math.round(g))},${clamp(Math.round(b))},${a.toFixed(3)})`
}

interface Stone { x: number; y: number; w: number; h: number; ci: number }

function getFloorLayout(gx: number, gy: number): Stone[] {
  const r1 = h(gx, gy, 10), r2 = h(gx, gy, 11), r3 = h(gx, gy, 12), r4 = h(gx, gy, 13)
  const g = 2.2
  const stones: Stone[] = []
  const pat = Math.floor(r1 * 6)

  if (pat === 0) {
    const sy = 13 + Math.floor(r2 * 7)
    stones.push({ x: g, y: g, w: S - g * 2, h: sy - g * 1.5, ci: 0 })
    stones.push({ x: g, y: sy + g * 0.5, w: S - g * 2, h: S - sy - g * 1.5, ci: 1 })
  } else if (pat === 1) {
    const sx = 13 + Math.floor(r2 * 7)
    stones.push({ x: g, y: g, w: sx - g * 1.5, h: S - g * 2, ci: 0 })
    stones.push({ x: sx + g * 0.5, y: g, w: S - sx - g * 1.5, h: S - g * 2, ci: 1 })
  } else if (pat <= 3) {
    const sx = 13 + Math.floor(r2 * 6)
    const sy = 13 + Math.floor(r3 * 6)
    stones.push({ x: g, y: g, w: sx - g * 1.5, h: sy - g * 1.5, ci: 0 })
    stones.push({ x: sx + g * 0.5, y: g, w: S - sx - g * 1.5, h: sy - g * 1.5, ci: 1 })
    stones.push({ x: g, y: sy + g * 0.5, w: sx - g * 1.5, h: S - sy - g * 1.5, ci: 2 })
    stones.push({ x: sx + g * 0.5, y: sy + g * 0.5, w: S - sx - g * 1.5, h: S - sy - g * 1.5, ci: 3 })
  } else if (pat === 4) {
    const sy = 14 + Math.floor(r2 * 5)
    const sx = 12 + Math.floor(r3 * 8)
    stones.push({ x: g, y: g, w: S - g * 2, h: sy - g * 1.5, ci: 0 })
    stones.push({ x: g, y: sy + g * 0.5, w: sx - g * 1.5, h: S - sy - g * 1.5, ci: 1 })
    stones.push({ x: sx + g * 0.5, y: sy + g * 0.5, w: S - sx - g * 1.5, h: S - sy - g * 1.5, ci: 2 })
  } else {
    const sy1 = 9 + Math.floor(r2 * 4)
    const sy2 = sy1 + 10 + Math.floor(r3 * 4)
    const sx1 = 13 + Math.floor(r4 * 6)
    stones.push({ x: g, y: g, w: sx1 - g * 1.5, h: sy1 - g * 1.5, ci: 0 })
    stones.push({ x: sx1 + g * 0.5, y: g, w: S - sx1 - g * 1.5, h: sy1 - g * 1.5, ci: 1 })
    stones.push({ x: g, y: sy1 + g * 0.5, w: S - g * 2, h: sy2 - sy1 - g, ci: 2 })
    stones.push({ x: g, y: sy2 + g * 0.5, w: S - g * 2, h: S - sy2 - g * 1.5, ci: 3 })
  }
  return stones
}

function stoneRgb(base: [number, number, number], variation: number, gx: number, gy: number, ci: number): [number, number, number] {
  const v = (h(gx, gy, 200 + ci) - 0.5) * variation * 2
  const warm = (h(gx, gy, 300 + ci) - 0.5) * 8
  return [base[0] + v + warm, base[1] + v, base[2] + v - warm * 0.5]
}

function drawStone(ctx: CanvasRenderingContext2D, px: number, py: number, s: Stone, color: [number, number, number], gx: number, gy: number) {
  const sx = px + s.x, sy = py + s.y, sw = s.w, sh = s.h
  if (sw < 2 || sh < 2) return

  const grad = ctx.createLinearGradient(sx, sy, sx + sw * 0.7, sy + sh)
  grad.addColorStop(0, rgb(color[0] + 14, color[1] + 14, color[2] + 14))
  grad.addColorStop(0.35, rgb(color[0] + 4, color[1] + 4, color[2] + 4))
  grad.addColorStop(0.7, rgb(color[0], color[1], color[2]))
  grad.addColorStop(1, rgb(color[0] - 10, color[1] - 10, color[2] - 10))

  ctx.beginPath()
  ctx.roundRect(sx, sy, sw, sh, 1.5)
  ctx.fillStyle = grad
  ctx.fill()

  const noiseVal = fbm((px + s.x + sw / 2) * 0.06, (py + s.y + sh / 2) * 0.06, 3, 500 + s.ci)
  ctx.fillStyle = `rgba(${noiseVal > 0.55 ? '255,255,255' : '0,0,0'},${Math.abs(noiseVal - 0.5) * 0.15})`
  ctx.beginPath()
  ctx.roundRect(sx + 1, sy + 1, sw - 2, sh - 2, 1)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.fillRect(sx + 1.5, sy + 0.5, sw - 3, 1.2)
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.fillRect(sx + 0.5, sy + 1.5, 1.2, sh - 3)

  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.fillRect(sx + 1.5, sy + sh - 1.5, sw - 3, 1.2)
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  ctx.fillRect(sx + sw - 1.5, sy + 1.5, 1.2, sh - 3)
}

function drawFloorTile(ctx: CanvasRenderingContext2D, t: ThemeDef, gx: number, gy: number) {
  const px = gx * S, py = gy * S

  ctx.fillStyle = rgb(t.floor.mortar[0], t.floor.mortar[1], t.floor.mortar[2])
  ctx.fillRect(px, py, S, S)

  const stones = getFloorLayout(gx, gy)
  for (const s of stones) {
    const col = stoneRgb(t.floor.base, t.floor.variation, gx, gy, s.ci)
    drawStone(ctx, px, py, s, col, gx, gy)
  }

  const r1 = h(gx, gy, 50), r2 = h(gx, gy, 51), r3 = h(gx, gy, 52), r4 = h(gx, gy, 53)

  if (r1 > 0.55) {
    const cx = px + 4 + r2 * 22, cy = py + 4 + r3 * 22
    const dx = (5 + r4 * 10) * (r2 > 0.5 ? 1 : -1)
    const dy = (3 + r1 * 6) * (r3 > 0.5 ? 1 : -1)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + dx, cy + dy)
    ctx.lineTo(cx + dx + dx * 0.3, cy + dy + dy * 0.4)
    ctx.strokeStyle = rgb(t.floor.crack[0], t.floor.crack[1], t.floor.crack[2])
    ctx.lineWidth = 0.6 + r4 * 0.5
    ctx.globalAlpha = 0.5 + r1 * 0.2
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  if (r3 > 0.78) {
    const mx = px + 3 + r1 * 24, my = py + 3 + r2 * 24
    ctx.beginPath()
    ctx.ellipse(mx, my, 3 + r4 * 3, 2 + r3 * 2, r2 * Math.PI, 0, Math.PI * 2)
    ctx.fillStyle = rgba(t.floor.moss[0], t.floor.moss[1], t.floor.moss[2], 0.25 + r1 * 0.15)
    ctx.fill()
  }
}

function drawWallTile(ctx: CanvasRenderingContext2D, t: ThemeDef, gx: number, gy: number, floorBelow: boolean, floorAbove: boolean) {
  const px = gx * S, py = gy * S
  const r1 = h(gx, gy, 30), r2 = h(gx, gy, 31), r3 = h(gx, gy, 32)

  ctx.fillStyle = rgb(t.wall.mortar[0], t.wall.mortar[1], t.wall.mortar[2])
  ctx.fillRect(px, py, S, S)

  const courseH = [10 + Math.floor(r1 * 3), 10 + Math.floor(r2 * 3), 0]
  courseH[2] = S - courseH[0] - courseH[1]
  const mg = 1.2

  let cy = 0
  for (let row = 0; row < 3; row++) {
    const ch = courseH[row]
    const numB = row === 1 ? 2 : 3
    const stagger = row === 1 ? 4 + Math.floor(r3 * 6) : 0
    let bx = stagger

    for (let b = 0; b < numB; b++) {
      const nomW = (S - stagger) / numB
      const jitter = (h(gx * 7 + b, gy * 13 + row, 40) - 0.5) * 3
      let bw = nomW + jitter
      if (b === numB - 1) bw = S - bx

      const bsx = px + bx + mg / 2
      const bsy = py + cy + mg / 2
      const bsw = Math.max(1, bw - mg)
      const bsh = Math.max(1, ch - mg)

      if (bsw > 1 && bsh > 1) {
        const v = (h(gx, gy, 500 + row * 4 + b) - 0.5) * t.wall.variation * 2
        const col: [number, number, number] = [t.wall.base[0] + v, t.wall.base[1] + v, t.wall.base[2] + v]

        const grad = ctx.createLinearGradient(bsx, bsy, bsx, bsy + bsh)
        grad.addColorStop(0, rgb(col[0] + t.wall.highlight, col[1] + t.wall.highlight, col[2] + t.wall.highlight))
        grad.addColorStop(0.5, rgb(col[0], col[1], col[2]))
        grad.addColorStop(1, rgb(col[0] - 6, col[1] - 6, col[2] - 6))

        ctx.beginPath()
        ctx.roundRect(bsx, bsy, bsw, bsh, 0.5)
        ctx.fillStyle = grad
        ctx.fill()
      }
      bx += bw
    }
    cy += ch
  }

  if (floorBelow) {
    const grad = ctx.createLinearGradient(px, py + S - 7, px, py + S)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(0.3, rgba(t.wall.mortar[0], t.wall.mortar[1], t.wall.mortar[2], 0.5))
    grad.addColorStop(1, rgba(t.wall.mortar[0] - 5, t.wall.mortar[1] - 5, t.wall.mortar[2] - 5, 0.9))
    ctx.fillStyle = grad
    ctx.fillRect(px, py + S - 7, S, 7)

    ctx.fillStyle = rgba(t.wall.top[0], t.wall.top[1], t.wall.top[2], 0.3)
    ctx.fillRect(px, py + S - 7, S, 1.5)
  }

  if (floorAbove) {
    ctx.fillStyle = rgba(t.wall.top[0], t.wall.top[1], t.wall.top[2], 0.25)
    ctx.fillRect(px, py, S, 1.5)
  }
}

function drawDoorTile(ctx: CanvasRenderingContext2D, t: ThemeDef, gx: number, gy: number) {
  const px = gx * S, py = gy * S
  const r1 = h(gx, gy, 60)

  ctx.fillStyle = rgb(t.floor.mortar[0], t.floor.mortar[1], t.floor.mortar[2])
  ctx.fillRect(px, py, S, S)

  ctx.beginPath()
  ctx.roundRect(px + 3, py + 2, S - 6, S - 4, 2)
  ctx.fillStyle = rgb(t.door.wood[0] - 15, t.door.wood[1] - 15, t.door.wood[2] - 10)
  ctx.fill()

  const planks = 4
  const pw = (S - 8) / planks
  for (let i = 0; i < planks; i++) {
    const plx = px + 4 + i * pw
    const grad = ctx.createLinearGradient(plx, py, plx + pw, py)
    grad.addColorStop(0, rgb(t.door.wood[0] + 5, t.door.wood[1] + 5, t.door.wood[2] + 3))
    grad.addColorStop(0.3, rgb(t.door.wood[0], t.door.wood[1], t.door.wood[2]))
    grad.addColorStop(0.7, rgb(t.door.wood[0] - 5, t.door.wood[1] - 5, t.door.wood[2] - 3))
    grad.addColorStop(1, rgb(t.door.wood[0] + 2, t.door.wood[1] + 2, t.door.wood[2]))

    ctx.beginPath()
    ctx.roundRect(plx + 0.4, py + 3, pw - 0.8, S - 6, 0.5)
    ctx.fillStyle = grad
    ctx.fill()

    for (let gi = 0; gi < 3; gi++) {
      const gxo = plx + 1.5 + h(gx, gy, 70 + i * 4 + gi) * (pw - 4)
      const wobble = (h(gx, gy, 90 + i * 4 + gi) - 0.5) * 2
      ctx.beginPath()
      ctx.moveTo(gxo, py + 4)
      ctx.lineTo(gxo + wobble, py + S - 4)
      ctx.strokeStyle = rgb(t.door.grain[0], t.door.grain[1], t.door.grain[2])
      ctx.lineWidth = 0.4
      ctx.globalAlpha = 0.35
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  const studs = [[px + S / 2 - 3, py + 7], [px + S / 2 + 3, py + 7], [px + S / 2 - 3, py + S - 9], [px + S / 2 + 3, py + S - 9]]
  for (const [sx, sy] of studs) {
    ctx.beginPath()
    ctx.arc(sx, sy, 1.4, 0, Math.PI * 2)
    ctx.fillStyle = rgb(t.door.metal[0], t.door.metal[1], t.door.metal[2])
    ctx.fill()
    ctx.beginPath()
    ctx.arc(sx - 0.3, sy - 0.3, 0.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fill()
  }

  ctx.beginPath()
  ctx.arc(px + S - 7, py + S / 2, 2, 0, Math.PI * 2)
  ctx.fillStyle = rgb(t.door.metal[0] + 10, t.door.metal[1] + 10, t.door.metal[2] + 10)
  ctx.fill()

  ctx.beginPath()
  ctx.roundRect(px + 2, py + 1, S - 4, S - 2, 2.5)
  ctx.strokeStyle = rgba(t.door.metal[0], t.door.metal[1], t.door.metal[2], 0.4)
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawWaterTile(ctx: CanvasRenderingContext2D, t: ThemeDef, gx: number, gy: number) {
  const px = gx * S, py = gy * S
  const cx = px + S / 2, cy = py + S / 2
  const r1 = h(gx, gy, 70), r2 = h(gx, gy, 71), r3 = h(gx, gy, 72)

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.7)
  grad.addColorStop(0, rgb(t.water.surface[0], t.water.surface[1], t.water.surface[2]))
  grad.addColorStop(0.6, rgb((t.water.deep[0] + t.water.surface[0]) / 2, (t.water.deep[1] + t.water.surface[1]) / 2, (t.water.deep[2] + t.water.surface[2]) / 2))
  grad.addColorStop(1, rgb(t.water.deep[0], t.water.deep[1], t.water.deep[2]))
  ctx.fillStyle = grad
  ctx.fillRect(px, py, S, S)

  for (let i = 0; i < 3; i++) {
    const rx = 5 + i * 4 + r1 * 3
    const ry = 3 + i * 2.5 + r2 * 2
    ctx.beginPath()
    ctx.ellipse(cx + (r1 - 0.5) * 8, cy + (r2 - 0.5) * 8, rx, ry, 0, 0, Math.PI * 2)
    ctx.strokeStyle = rgba(t.water.highlight[0], t.water.highlight[1], t.water.highlight[2], 0.12 - i * 0.03)
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.moveTo(px + 6 + r1 * 10, py + 10 + r2 * 5)
  ctx.quadraticCurveTo(px + 14 + r3 * 4, py + 6 + r1 * 4, px + 22 + r2 * 6, py + 10 + r3 * 5)
  ctx.strokeStyle = rgba(t.water.highlight[0], t.water.highlight[1], t.water.highlight[2], 0.2)
  ctx.lineWidth = 0.7
  ctx.stroke()

  if (t.water.lava) {
    ctx.beginPath()
    ctx.arc(px + 8 + r1 * 16, py + 8 + r2 * 16, 1 + r3, 0, Math.PI * 2)
    ctx.fillStyle = rgba(255, 200, 50, 0.4)
    ctx.fill()
  }
}

function drawStairsTile(ctx: CanvasRenderingContext2D, t: ThemeDef, gx: number, gy: number) {
  const px = gx * S, py = gy * S

  ctx.fillStyle = rgb(t.floor.mortar[0], t.floor.mortar[1], t.floor.mortar[2])
  ctx.fillRect(px, py, S, S)

  const steps = 5
  const stepH = S / steps
  for (let i = 0; i < steps; i++) {
    const shade = 0.65 + (i / steps) * 0.35
    ctx.fillStyle = rgb(t.floor.base[0] * shade, t.floor.base[1] * shade, t.floor.base[2] * shade)
    ctx.fillRect(px + 1, py + i * stepH + 0.5, S - 2, stepH - 1)

    ctx.fillStyle = rgba(t.wall.top[0], t.wall.top[1], t.wall.top[2], 0.15 + (i / steps) * 0.1)
    ctx.fillRect(px + 2, py + i * stepH + 0.5, S - 4, 1)
  }
}

function drawCellDecor(ctx: CanvasRenderingContext2D, theme: MapTheme, t: ThemeDef, gx: number, gy: number, cellType: string) {
  if (cellType !== 'floor') return
  const px = gx * S, py = gy * S
  const cx = px + S / 2, cy = py + S / 2
  const r1 = h(gx, gy, 0), r2 = h(gx, gy, 1), r3 = h(gx, gy, 2), r4 = h(gx, gy, 3), r5 = h(gx, gy, 4)

  if (theme === 'classic') {
    if (r1 > 0.72) {
      for (let i = 0; i < 3; i++) {
        const rx = px + 3 + h(gx, gy, 110 + i) * 24
        const ry = py + 3 + h(gx, gy, 120 + i) * 24
        ctx.fillStyle = rgba(t.floor.mortar[0] + 10, t.floor.mortar[1] + 10, t.floor.mortar[2] + 10, 0.35)
        ctx.fillRect(rx, ry, 2 + h(gx, gy, 130 + i) * 2, 1.5 + h(gx, gy, 140 + i))
      }
    }
    if (r3 > 0.88) {
      ctx.beginPath()
      ctx.moveTo(px + 2 + r1 * 4, py + 2 + r2 * 4)
      ctx.quadraticCurveTo(px + 8 + r2 * 8, py + 1 + r3 * 3, px + 14 + r1 * 10, py + 3 + r4 * 5)
      ctx.quadraticCurveTo(px + 10 + r3 * 6, py + 6 + r1 * 4, px + 4 + r4 * 6, py + 8 + r2 * 5)
      ctx.strokeStyle = 'rgba(140,130,120,0.12)'
      ctx.lineWidth = 0.4
      ctx.stroke()
    }
    if (r5 > 0.88) {
      ctx.fillStyle = 'rgba(200,180,110,0.3)'
      ctx.fillRect(cx - 1 + r1 * 4, cy - 1 + r2 * 3, 1.4, 4)
      ctx.beginPath()
      ctx.arc(cx + r1 * 4, cy - 2.5 + r2 * 3, 1.8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,170,50,0.1)'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx + r1 * 4, cy - 2.5 + r2 * 3, 0.6, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,230,130,0.4)'
      ctx.fill()
    }
  } else if (theme === 'cave') {
    if (r1 > 0.65) {
      ctx.beginPath()
      ctx.moveTo(cx - 2 + r2 * 8, cy + 6)
      ctx.lineTo(cx - 4 + r2 * 8, cy - 4 + r3 * 3)
      ctx.lineTo(cx + r2 * 8, cy + 6)
      ctx.closePath()
      ctx.fillStyle = rgba(t.floor.base[0] + 15, t.floor.base[1] + 10, t.floor.base[2] + 5, 0.35)
      ctx.fill()
    }
    if (r3 > 0.7) {
      const mx = cx - 5 + r1 * 10, my = cy - 3 + r2 * 6
      ctx.beginPath()
      ctx.ellipse(mx, my, 2.5 + r4, 2, r2 * Math.PI, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(80,140,55,0.3)'
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(mx, my + 2)
      ctx.lineTo(mx, my + 5)
      ctx.strokeStyle = 'rgba(60,100,35,0.3)'
      ctx.lineWidth = 0.7
      ctx.stroke()
    }
    if (r5 > 0.8) {
      ctx.beginPath()
      ctx.moveTo(px + 3 + r1 * 20, py + 1)
      ctx.lineTo(px + 3 + r1 * 20 + r2 * 2, py + 5 + r3 * 4)
      ctx.strokeStyle = 'rgba(80,140,160,0.2)'
      ctx.lineWidth = 0.5
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(px + 3 + r1 * 20 + r2 * 2, py + 6 + r3 * 4, 0.7, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(80,140,160,0.2)'
      ctx.fill()
    }
  } else if (theme === 'crypt') {
    if (r1 > 0.8) {
      const sx = cx - 3 + r2 * 6, sy = cy - 2 + r3 * 4
      ctx.beginPath()
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(120,115,105,0.2)'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(sx - 1, sy - 0.8, 0.5, 0, Math.PI * 2)
      ctx.arc(sx + 1, sy - 0.8, 0.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(10,10,20,0.35)'
      ctx.fill()
    }
    if (r4 > 0.82) {
      ctx.fillStyle = 'rgba(200,185,110,0.3)'
      ctx.fillRect(cx + 3 - r1 * 8, cy - 1 + r2 * 4, 1.2, 3.5)
      ctx.beginPath()
      ctx.arc(cx + 3 - r1 * 8 + 0.6, cy - 2 + r2 * 4, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,170,50,0.08)'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx + 3 - r1 * 8 + 0.6, cy - 2 + r2 * 4, 0.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,230,130,0.35)'
      ctx.fill()
    }
  } else if (theme === 'forest') {
    if (r1 > 0.2) {
      for (let i = 0; i < 3; i++) {
        const bx = cx - 6 + r2 * 12, by = cy + 5
        const angle = (i - 1) * 0.3 + (r3 - 0.5) * 0.4
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + Math.sin(angle) * (5 + r4 * 3), by - 5 - r3 * 3)
        ctx.strokeStyle = `rgba(${60 + i * 10},${120 + i * 15},${30 + i * 5},0.4)`
        ctx.lineWidth = 0.6
        ctx.stroke()
      }
    }
    if (r3 > 0.8) {
      ctx.beginPath()
      ctx.arc(cx + 3 - r1 * 6, cy - 3 + r2 * 4, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = r4 > 0.5 ? 'rgba(215,160,210,0.35)' : 'rgba(210,210,70,0.35)'
      ctx.fill()
    }
    if (r4 > 0.6) {
      ctx.beginPath()
      ctx.ellipse(cx - 3 + r1 * 6, cy - 4 + r2 * 8, 2.5, 1, r3 * Math.PI, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(120,85,30,0.2)'
      ctx.fill()
    }
  } else if (theme === 'infernal') {
    if (r1 > 0.3) {
      ctx.beginPath()
      ctx.moveTo(cx - 8 + r2 * 16, cy - 4 + r3 * 4)
      ctx.lineTo(cx - 4 + r2 * 16 + r4 * 4, cy - 2 + r3 * 4 + r1 * 3)
      ctx.lineTo(cx - 6 + r2 * 16 + r4 * 4, cy + r3 * 4 + r1 * 3 + r3 * 2)
      ctx.strokeStyle = 'rgba(255,90,30,0.25)'
      ctx.lineWidth = 0.7
      ctx.stroke()
    }
    if (r2 > 0.6) {
      ctx.beginPath()
      ctx.arc(cx + 4 - r3 * 8, cy - 4 + r4 * 8, 0.5 + r1 * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,${120 + Math.floor(r2 * 80)},30,${0.3 + r2 * 0.2})`
      ctx.fill()
    }
    if (r4 > 0.65) {
      ctx.beginPath()
      ctx.arc(cx - 2 + r1 * 4, cy - 3 + r2 * 6, 1.5 + r4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(30,10,5,0.2)'
      ctx.fill()
    }
  }
}

function generateNoiseTexture(w: number, ht: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = ht
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(w, ht)

  for (let y = 0; y < ht; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm(x * 0.04, y * 0.04, 4, 777) * 0.6
        + fbm(x * 0.12, y * 0.12, 3, 888) * 0.3
        + noise2D(x * 0.3, y * 0.3, 333) * 0.1
      const v = Math.floor(clamp(n * 255, 0, 255))
      const idx = (y * w + x) * 4
      img.data[idx] = v
      img.data[idx + 1] = v
      img.data[idx + 2] = v
      img.data[idx + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}

function hpColor(ratio: number): string {
  if (ratio > 0.6) return '#2ecc71'
  if (ratio > 0.3) return '#f1c40f'
  return '#e74c3c'
}

interface Props {
  dungeon: Dungeon
  revealedRooms: Set<string>
  players: Player[]
  selectedPlayerId: string | null
  isDM: boolean
  defeatedEnemies: Set<string>
  enemyPositions: Record<string, { x: number; y: number }>
  enemyHp: Record<string, number>
  selectedEnemyId: string | null
  lootPositions: Record<string, { x: number; y: number }>
  collectedLoot: Set<string>
  visionDistanceFt: number
  exploredCells: Set<string>
  onCellClick: (x: number, y: number) => void
  onEnemyClick: (enemyId: string, screenPos: { x: number; y: number }) => void
  onLootClick: (lootId: string) => void
}

export default function DungeonMap({
  dungeon, revealedRooms, players, selectedPlayerId, isDM,
  defeatedEnemies, enemyPositions, enemyHp, selectedEnemyId,
  lootPositions, collectedLoot, visionDistanceFt, exploredCells,
  onCellClick, onEnemyClick, onLootClick
}: Props) {
  const { grid } = dungeon.map
  const height = grid.length
  const width = grid[0]?.length ?? 0

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const noiseRef = useRef<HTMLCanvasElement | null>(null)
  const [theme, setTheme] = useState<MapTheme>('classic')
  const t = THEMES[theme]

  const getPlayerAt = useCallback((x: number, y: number) => {
    return players.find(p => p.position.x === x && p.position.y === y)
  }, [players])

  const enemyByCell = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const [id, pos] of Object.entries(enemyPositions)) {
      if (defeatedEnemies.has(id)) continue
      map.set(`${pos.x},${pos.y}`, { id, name: findEnemyName(dungeon, id) })
    }
    return map
  }, [enemyPositions, defeatedEnemies, dungeon])

  const lootByCell = useMemo(() => {
    const map = new Map<string, { id: string; name: string; magical: boolean; category: string }>()
    for (const [id, pos] of Object.entries(lootPositions)) {
      if (collectedLoot.has(id)) continue
      const item = findLootItem(dungeon, id)
      map.set(`${pos.x},${pos.y}`, {
        id, name: item?.name ?? 'Item', magical: !!item?.magical, category: item?.category ?? 'gear',
      })
    }
    return map
  }, [lootPositions, collectedLoot, dungeon])

  const isFloorAt = useCallback((gx: number, gy: number) => {
    if (gy < 0 || gy >= height || gx < 0 || gx >= width) return false
    const ct = grid[gy][gx].type
    return ct === 'floor' || ct === 'door' || ct === 'water' || ct === 'stairs'
  }, [grid, height, width])

  const isWallAt = useCallback((gx: number, gy: number) => {
    if (gy < 0 || gy >= height || gx < 0 || gx >= width) return true
    return grid[gy][gx].type === 'wall' || grid[gy][gx].type === 'empty'
  }, [grid, height, width])

  useEffect(() => {
    if (!noiseRef.current) {
      noiseRef.current = generateNoiseTexture(width * S, height * S)
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fogRgb = t.fog.startsWith('#')
      ? [parseInt(t.fog.slice(1, 3), 16), parseInt(t.fog.slice(3, 5), 16), parseInt(t.fog.slice(5, 7), 16)]
      : [8, 8, 20]

    ctx.fillStyle = rgb(fogRgb[0], fogRgb[1], fogRgb[2])
    ctx.fillRect(0, 0, width * S, height * S)

    const vc = visionDistanceFt / 5

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid[y][x]
        const vis = isCellVisible(dungeon, revealedRooms, players, x, y, vc)
        const exp = exploredCells.has(`${x},${y}`)
        const inRoom = cell.roomId && revealedRooms.has(cell.roomId)

        const walkable = cell.type !== 'wall' && cell.type !== 'empty'
        const isWall = cell.type === 'wall'

        let show = false
        if (isDM) {
          show = cell.type !== 'empty'
        } else {
          const lit = vis && walkable
          const fog = !vis && exp && walkable
          const vWall = isWall && vis
          show = lit || fog || vWall
        }
        if (!show) continue

        let op = 1
        if (!isDM) {
          if (vis) op = 1
          else if (!vis && exp && walkable) op = 0.4
          else if (isWall && vis) op = 0.35
        }

        ctx.globalAlpha = op

        switch (cell.type) {
          case 'floor': drawFloorTile(ctx, t, x, y); break
          case 'wall': drawWallTile(ctx, t, x, y, isFloorAt(x, y + 1), isFloorAt(x, y - 1)); break
          case 'door': drawDoorTile(ctx, t, x, y); break
          case 'water': drawWaterTile(ctx, t, x, y); break
          case 'stairs': drawStairsTile(ctx, t, x, y); break
        }

        if (show && op > 0.3) {
          drawCellDecor(ctx, theme, t, x, y, cell.type)
        }

        ctx.globalAlpha = 1
      }
    }

    if (noiseRef.current) {
      ctx.save()
      ctx.beginPath()
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const cell = grid[y][x]
          const vis = isCellVisible(dungeon, revealedRooms, players, x, y, vc)
          const exp = exploredCells.has(`${x},${y}`)
          const walkable = cell.type !== 'wall' && cell.type !== 'empty'
          const isW = cell.type === 'wall'
          if (isDM) {
            if (walkable || isW) ctx.rect(x * S, y * S, S, S)
          } else if ((vis && walkable) || (vis && isW) || (!vis && exp && walkable)) {
            ctx.rect(x * S, y * S, S, S)
          }
        }
      }
      ctx.clip()
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = 0.13
      ctx.drawImage(noiseRef.current, 0, 0)
      ctx.restore()
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    const sh = 14
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid[y][x]
        const vis = isCellVisible(dungeon, revealedRooms, players, x, y, vc)
        const walkable = cell.type !== 'wall' && cell.type !== 'empty'
        if (!(vis || isDM) || !walkable) continue

        const px = x * S, py = y * S

        if (isWallAt(x, y - 1)) {
          const g = ctx.createLinearGradient(px, py, px, py + sh)
          g.addColorStop(0, t.shadow)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.fillRect(px, py, S, sh)
        }
        if (isWallAt(x, y + 1)) {
          const g = ctx.createLinearGradient(px, py + S, px, py + S - sh)
          g.addColorStop(0, t.shadow)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.fillRect(px, py + S - sh, S, sh)
        }
        if (isWallAt(x - 1, y)) {
          const g = ctx.createLinearGradient(px, py, px + sh, py)
          g.addColorStop(0, t.shadow)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.fillRect(px, py, sh, S)
        }
        if (isWallAt(x + 1, y)) {
          const g = ctx.createLinearGradient(px + S, py, px + S - sh, py)
          g.addColorStop(0, t.shadow)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.fillRect(px + S - sh, py, sh, S)
        }
      }
    }

    for (const p of players) {
      const pcx = p.position.x * S + S / 2, pcy = p.position.y * S + S / 2
      const glowR = S * 2.5
      const grd = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, glowR)
      grd.addColorStop(0, 'rgba(255,220,150,0.06)')
      grd.addColorStop(0.4, 'rgba(255,200,120,0.03)')
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grd
      ctx.fillRect(pcx - glowR, pcy - glowR, glowR * 2, glowR * 2)
    }

    if (!isDM) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const cell = grid[y][x]
          const vis = isCellVisible(dungeon, revealedRooms, players, x, y, vc)
          const exp = exploredCells.has(`${x},${y}`)
          const walkable = cell.type !== 'wall' && cell.type !== 'empty'
          if (!vis && exp && walkable) {
            ctx.fillStyle = 'rgba(15,20,40,0.15)'
            ctx.fillRect(x * S, y * S, S, S)
          }
        }
      }
    }
  }, [grid, width, height, theme, t, revealedRooms, players, visionDistanceFt, exploredCells, isDM, dungeon, isFloorAt, isWallAt])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / S)
    const y = Math.floor((e.clientY - rect.top) / S)
    if (x >= 0 && x < width && y >= 0 && y < height) {
      onCellClick(x, y)
    }
  }, [width, height, onCellClick])

  const HP_R = S / 2 - 1
  const HP_C = 2 * Math.PI * HP_R
  const np = { pointerEvents: 'none' as const }

  return (
    <div className="dungeon-map-container" style={{ background: `radial-gradient(ellipse at center, ${t.bg[0]} 0%, ${t.bg[1]} 100%)` }}>
      <div
        className="dungeon-map-wrapper"
        style={{ position: 'relative', width: width * S, height: height * S, cursor: 'pointer', flexShrink: 0 }}
        onClick={handleCanvasClick}
      >
        <canvas
          ref={canvasRef}
          width={width * S}
          height={height * S}
          className="dungeon-map"
          style={{ display: 'block' }}
        />
        <svg
          width={width * S}
          height={height * S}
          viewBox={`0 0 ${width * S} ${height * S}`}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <defs>
            <linearGradient id="swordBlade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c0dff8" /><stop offset="50%" stopColor="#8bb8e0" /><stop offset="100%" stopColor="#6a9ec4" />
            </linearGradient>
          </defs>

          {grid.map((row, y) =>
            row.map((cell, x) => {
              const vc = visionDistanceFt / 5
              const vis = isCellVisible(dungeon, revealedRooms, players, x, y, vc)
              const inRoom = cell.roomId && revealedRooms.has(cell.roomId)
              const pHere = getPlayerAt(x, y)
              const eHere = (vis || (isDM && inRoom)) ? enemyByCell.get(`${x},${y}`) : null
              const lHere = (vis || (isDM && inRoom)) ? lootByCell.get(`${x},${y}`) : null
              const isSel = pHere?.id === selectedPlayerId
              const isESel = eHere?.id === selectedEnemyId
              const cx = x * S + S / 2, cy = y * S + S / 2

              const hasEntity = pHere || eHere || lHere
              if (!hasEntity) return null

              return (
                <g key={`${x}-${y}`}>
                  {(vis || isDM) && lHere && !pHere && !eHere && (
                    <g onClick={(e) => { e.stopPropagation(); onLootClick(lHere.id) }} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
                      <circle cx={cx} cy={cy} r={S / 2 - 1} fill="transparent" />
                      {lHere.category === 'weapon' && lHere.magical ? (
                        <g style={np}>
                          <circle cx={cx} cy={cy} r={S / 2 - 2} fill="none" stroke="rgba(100,200,255,0.6)" strokeWidth={1.5} className="magic-sword-aura" />
                          <circle cx={cx} cy={cy} r={S / 2 + 2} fill="none" stroke="rgba(100,200,255,0.25)" strokeWidth={1} className="magic-sword-aura-outer" />
                          <g transform={`translate(${cx},${cy}) rotate(-45) scale(0.65)`}>
                            <path d="M 0,-16 L 3,-12 2.5,-2 0,2 -2.5,-2 -3,-12 Z" fill="url(#swordBlade)" stroke="#a0d4ff" strokeWidth={0.6} className="magic-sword-blade" />
                            <line x1="0" y1="-14" x2="0" y2="-2" stroke="rgba(150,220,255,0.5)" strokeWidth={0.8} />
                            <path d="M 0,-16 L 1.5,-13 -1.5,-13 Z" fill="rgba(200,240,255,0.8)" />
                            <rect x="-6" y="1" width="12" height="2.5" rx="0.8" fill="#8b7535" stroke="#c9a227" strokeWidth={0.4} />
                            <circle cx="-5" cy="2.25" r="0.8" fill="#c9a227" /><circle cx="5" cy="2.25" r="0.8" fill="#c9a227" />
                            <rect x="-1.5" y="3.5" width="3" height="7" rx="0.6" fill="#5a3a1a" stroke="#3a2510" strokeWidth={0.3} />
                            <circle cx="0" cy="11.5" r="2" fill="#8b7535" stroke="#c9a227" strokeWidth={0.4} />
                            <circle cx="0" cy="11.5" r="0.8" fill="#64c8ff" className="magic-sword-gem" />
                          </g>
                        </g>
                      ) : (
                        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize={lHere.magical ? 16 : 14} style={np}>
                          {lHere.magical ? '✨' : '📦'}
                        </text>
                      )}
                    </g>
                  )}

                  {(vis || isDM) && eHere && !pHere && (
                    <g onClick={(e) => { e.stopPropagation(); onEnemyClick(eHere.id, { x: e.clientX, y: e.clientY }) }} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
                      <circle cx={cx} cy={cy} r={S / 2 - 1} fill="transparent" />
                      {isESel && <circle cx={cx} cy={cy} r={S / 2 - 2} fill="none" stroke="#e74c3c" strokeWidth={2} style={np} />}
                      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize={18} style={np}>🦎</text>
                      {isDM && (() => {
                        const ed = findEnemyData(dungeon, eHere.id)
                        if (!ed) return null
                        const hp = enemyHp[eHere.id] ?? ed.hp
                        const r = hp / ed.maxHp
                        const bx = x * S + 3, by = y * S + S - 5, bw = S - 6
                        return <>
                          <rect x={bx} y={by} width={bw} height={3} rx={1} fill="#333" style={np} />
                          <rect x={bx} y={by} width={bw * r} height={3} rx={1} fill={hpColor(r)} style={{ ...np, transition: 'width 0.3s, fill 0.3s' }} />
                        </>
                      })()}
                    </g>
                  )}

                  {pHere && <>
                    <circle cx={cx} cy={cy} r={HP_R} fill="none" stroke="#333" strokeWidth={3} style={np} />
                    <circle cx={cx} cy={cy} r={HP_R} fill="none"
                      stroke={hpColor(pHere.hp / pHere.maxHp)} strokeWidth={3}
                      strokeDasharray={HP_C} strokeDashoffset={HP_C * (1 - pHere.hp / pHere.maxHp)}
                      transform={`rotate(-90 ${cx} ${cy})`}
                      style={{ ...np, transition: 'stroke-dashoffset 0.3s, stroke 0.3s' }}
                    />
                    <circle cx={cx} cy={cy} r={S / 2 - 5}
                      fill={pHere.tokenColor} stroke={isSel ? '#fff' : 'transparent'} strokeWidth={isSel ? 2 : 0}
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); onCellClick(x, y) }}
                    />
                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold" fill="#fff" style={np}>
                      {pHere.characterName[0]}
                    </text>
                  </>}
                </g>
              )
            })
          )}
        </svg>
      </div>
      <div className="map-toggle-row" style={{ justifyContent: 'center' }}>
        {isDM && (
          <div className="map-theme-bar">
            {(Object.keys(THEMES) as MapTheme[]).map(k => (
              <button key={k}
                className={`map-theme-btn ${theme === k ? 'map-theme-btn--active' : ''}`}
                onClick={() => setTheme(k)}
                style={{ '--swatch-a': THEMES[k].swatch[0], '--swatch-b': THEMES[k].swatch[1] } as React.CSSProperties}
              >
                <span className="map-theme-swatch" />{THEMES[k].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function findEnemyData(dungeon: Dungeon, enemyId: string): import('../types/dungeon').Enemy | null {
  for (const room of dungeon.rooms) { const e = room.enemies.find(e => e.id === enemyId); if (e) return e }
  return null
}
function findEnemyName(dungeon: Dungeon, enemyId: string): string {
  for (const room of dungeon.rooms) { const e = room.enemies.find(e => e.id === enemyId); if (e) return e.name }
  return 'Enemy'
}
function findLootItem(dungeon: Dungeon, lootId: string): import('../types/dungeon').Item | null {
  for (const room of dungeon.rooms) { const i = room.loot.find(l => l.id === lootId); if (i) return i }
  return null
}
