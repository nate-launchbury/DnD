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
    bg: ['#1a1710', '#0e0c08'], fog: '#0a0908',
    shadow: 'rgba(0,0,0,0.65)', ambientTint: 'rgba(255,200,120,0.04)',
    swatch: ['#8a7d6e', '#5a5040'],
    floor: { base: [155, 140, 120], variation: 22, mortar: [82, 70, 55], crack: [58, 48, 35], moss: [65, 95, 48] },
    wall: { base: [20, 18, 16], variation: 6, mortar: [10, 9, 8], top: [40, 35, 28], highlight: 4 },
    door: { wood: [130, 85, 42], grain: [95, 60, 28], metal: [165, 155, 135] },
    water: { deep: [15, 55, 78], surface: [50, 148, 168], highlight: [88, 198, 218] },
  },
  cave: {
    label: 'Cave',
    bg: ['#1a1508', '#0e0c06'], fog: '#0c0a04',
    shadow: 'rgba(10,5,0,0.65)', ambientTint: 'rgba(200,160,80,0.05)',
    swatch: ['#9a8568', '#6a5838'],
    floor: { base: [148, 125, 92], variation: 26, mortar: [78, 62, 42], crack: [55, 40, 25], moss: [75, 115, 45] },
    wall: { base: [24, 20, 14], variation: 6, mortar: [12, 10, 7], top: [45, 38, 26], highlight: 4 },
    door: { wood: [125, 90, 48], grain: [92, 62, 30], metal: [155, 135, 105] },
    water: { deep: [18, 55, 42], surface: [48, 128, 92], highlight: [78, 168, 118] },
  },
  crypt: {
    label: 'Crypt',
    bg: ['#121418', '#080a0e'], fog: '#0a0c10',
    shadow: 'rgba(0,0,10,0.65)', ambientTint: 'rgba(120,140,180,0.05)',
    swatch: ['#7a7e88', '#4a4e58'],
    floor: { base: [132, 128, 122], variation: 18, mortar: [68, 65, 60], crack: [48, 44, 38], moss: [55, 72, 55] },
    wall: { base: [16, 16, 22], variation: 5, mortar: [9, 9, 12], top: [35, 35, 42], highlight: 3 },
    door: { wood: [72, 60, 50], grain: [52, 42, 32], metal: [115, 120, 135] },
    water: { deep: [10, 15, 35], surface: [30, 42, 72], highlight: [50, 68, 108] },
  },
  forest: {
    label: 'Forest',
    bg: ['#0e180e', '#060e06'], fog: '#080c08',
    shadow: 'rgba(0,10,0,0.6)', ambientTint: 'rgba(80,160,60,0.05)',
    swatch: ['#5e7e52', '#3e5e3c'],
    floor: { base: [118, 128, 98], variation: 24, mortar: [58, 65, 45], crack: [42, 50, 32], moss: [68, 110, 40] },
    wall: { base: [14, 22, 12], variation: 5, mortar: [8, 12, 7], top: [38, 45, 32], highlight: 3 },
    door: { wood: [95, 82, 42], grain: [68, 58, 28], metal: [105, 118, 88] },
    water: { deep: [12, 32, 18], surface: [35, 75, 45], highlight: [55, 105, 62] },
  },
  infernal: {
    label: 'Infernal',
    bg: ['#200c08', '#100404'], fog: '#0e0606',
    shadow: 'rgba(15,0,0,0.65)', ambientTint: 'rgba(255,60,20,0.06)',
    swatch: ['#8a4838', '#603020'],
    floor: { base: [142, 72, 52], variation: 22, mortar: [72, 32, 22], crack: [52, 22, 12], moss: [85, 52, 30] },
    wall: { base: [28, 12, 8], variation: 6, mortar: [14, 7, 5], top: [48, 28, 20], highlight: 4 },
    door: { wood: [95, 48, 28], grain: [68, 32, 18], metal: [140, 118, 100] },
    water: { deep: [65, 15, 0], surface: [148, 55, 12], highlight: [218, 95, 22], lava: true },
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

function drawFloorTile(ctx: CanvasRenderingContext2D, t: ThemeDef, gx: number, gy: number) {
  const px = gx * S, py = gy * S

  const n = fbm(gx * 0.5, gy * 0.5, 3, 100)
  const warm = (fbm(gx * 0.3 + 7, gy * 0.3 + 7, 2, 200) - 0.5) * 12
  const v = (n - 0.5) * t.floor.variation * 1.8
  const cr = t.floor.base[0] + v + warm
  const cg = t.floor.base[1] + v
  const cb = t.floor.base[2] + v - warm * 0.4

  ctx.fillStyle = rgb(cr, cg, cb)
  ctx.fillRect(px, py, S, S)

  const angle = h(gx, gy, 80) * Math.PI * 2
  const grad = ctx.createLinearGradient(
    px + S / 2 + Math.cos(angle) * S * 0.5, py + S / 2 + Math.sin(angle) * S * 0.5,
    px + S / 2 - Math.cos(angle) * S * 0.5, py + S / 2 - Math.sin(angle) * S * 0.5
  )
  grad.addColorStop(0, 'rgba(255,255,255,0.05)')
  grad.addColorStop(1, 'rgba(0,0,0,0.05)')
  ctx.fillStyle = grad
  ctx.fillRect(px, py, S, S)

  const stain = fbm(gx * 0.25, gy * 0.25, 3, 42)
  if (stain > 0.48) {
    ctx.fillStyle = `rgba(40,30,15,${((stain - 0.48) * 0.5).toFixed(3)})`
    ctx.fillRect(px, py, S, S)
  } else if (stain < 0.38) {
    ctx.fillStyle = `rgba(255,240,200,${((0.38 - stain) * 0.15).toFixed(3)})`
    ctx.fillRect(px, py, S, S)
  }
}

function drawWallTile(ctx: CanvasRenderingContext2D, t: ThemeDef, gx: number, gy: number, _theme: MapTheme) {
  const px = gx * S, py = gy * S
  const n = fbm(gx * 0.3, gy * 0.3, 3, 777)
  const v = (n - 0.5) * 15
  ctx.fillStyle = rgb(t.wall.base[0] + v, t.wall.base[1] + v, t.wall.base[2] + v)
  ctx.fillRect(px, py, S, S)
}

function drawWallIllustrations(ctx: CanvasRenderingContext2D, t: ThemeDef, theme: MapTheme, grid: { type: string }[][], width: number, height: number) {
  const W = width * S, H = height * S
  const isW = (px: number, py: number) => {
    const gx = Math.floor(px / S), gy = Math.floor(py / S)
    if (gx < 0 || gx >= width || gy < 0 || gy >= height) return false
    return grid[gy][gx].type === 'wall' || grid[gy][gx].type === 'empty'
  }

  ctx.save()
  ctx.beginPath()
  for (let gy = 0; gy < height; gy++)
    for (let gx = 0; gx < width; gx++)
      if (grid[gy][gx].type === 'wall' || grid[gy][gx].type === 'empty')
        ctx.rect(gx * S, gy * S, S, S)
  ctx.clip()

  let wc = 0
  for (let gy = 0; gy < height; gy++)
    for (let gx = 0; gx < width; gx++)
      if (grid[gy][gx].type === 'wall' || grid[gy][gx].type === 'empty') wc++

  if (theme === 'classic') {
    for (let i = 0; i < Math.floor(wc * 0.35); i++) {
      const x = h(i, 0, 3000) * W, y = h(i, 0, 3001) * H
      if (!isW(x, y)) continue
      const r = 6 + h(i, 0, 3002) * 22
      const aspect = 0.5 + h(i, 0, 3004) * 0.5
      const shade = 18 + h(i, 0, 3003) * 35
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * aspect, h(i, 0, 3005) * Math.PI, 0, Math.PI * 2)
      const g = ctx.createRadialGradient(x - r * 0.25, y - r * aspect * 0.25, 0, x, y, r)
      g.addColorStop(0, rgb(shade + 28, shade + 22, shade + 14))
      g.addColorStop(0.5, rgb(shade + 5, shade, shade - 5))
      g.addColorStop(1, rgb(shade - 10, shade - 15, shade - 20))
      ctx.fillStyle = g
      ctx.fill()
    }
    for (let i = 0; i < Math.floor(wc * 0.7); i++) {
      const x = h(i, 1, 4000) * W, y = h(i, 1, 4001) * H
      if (!isW(x, y)) continue
      ctx.fillStyle = `rgba(48,42,32,${(0.25 + h(i, 1, 4003) * 0.4).toFixed(2)})`
      ctx.beginPath()
      ctx.arc(x, y, 1 + h(i, 1, 4002) * 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (theme === 'cave') {
    for (let i = 0; i < Math.floor(wc * 0.18); i++) {
      const x = h(i, 2, 3000) * W, y = h(i, 2, 3001) * H
      if (!isW(x, y)) continue
      const r = 12 + h(i, 2, 3002) * 35
      const aspect = 0.5 + h(i, 2, 3004) * 0.5
      const shade = 22 + h(i, 2, 3003) * 38
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * aspect, h(i, 2, 3005) * Math.PI, 0, Math.PI * 2)
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * aspect * 0.3, 0, x, y, r)
      g.addColorStop(0, rgb(shade + 25, shade + 18, shade + 8))
      g.addColorStop(0.5, rgb(shade, shade - 5, shade - 14))
      g.addColorStop(1, rgb(shade - 14, shade - 20, shade - 26))
      ctx.fillStyle = g
      ctx.fill()
    }
    for (let i = 0; i < Math.floor(wc * 0.15); i++) {
      const x = h(i, 3, 5000) * W, y = h(i, 3, 5001) * H
      if (!isW(x, y)) continue
      const bw = 5 + h(i, 3, 5002) * 10
      const bh = 14 + h(i, 3, 5003) * 32
      const lean = (h(i, 3, 5004) - 0.5) * 6
      ctx.beginPath()
      ctx.moveTo(x - bw / 2, y)
      ctx.lineTo(x + lean, y - bh)
      ctx.lineTo(x + bw / 2, y)
      ctx.closePath()
      const sg = ctx.createLinearGradient(x - bw / 2, y, x + lean, y - bh)
      sg.addColorStop(0, rgb(50, 42, 28))
      sg.addColorStop(0.5, rgb(44, 36, 24))
      sg.addColorStop(1, rgb(58, 50, 36))
      ctx.fillStyle = sg
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x + lean, y - bh)
      ctx.lineTo(x + bw / 2, y)
      ctx.strokeStyle = 'rgba(72,64,48,0.5)'
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
  } else if (theme === 'crypt') {
    for (let i = 0; i < Math.floor(wc * 0.1); i++) {
      const x = h(i, 4, 3000) * W, y = h(i, 4, 3001) * H
      if (!isW(x, y)) continue
      const tw = 10 + h(i, 4, 3002) * 14
      const th = 20 + h(i, 4, 3003) * 28
      const shade = 28 + h(i, 4, 3004) * 20
      ctx.fillStyle = rgb(shade, shade, shade + 7)
      ctx.beginPath()
      ctx.roundRect(x - tw / 2, y - th + tw / 2, tw, th - tw / 2, [0, 0, 2, 2])
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y - th + tw / 2, tw / 2, Math.PI, 0)
      ctx.fill()
      ctx.strokeStyle = `rgba(${shade + 28},${shade + 28},${shade + 35},0.5)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, y - th * 0.72)
      ctx.lineTo(x, y - th * 0.22)
      ctx.moveTo(x - tw * 0.28, y - th * 0.52)
      ctx.lineTo(x + tw * 0.28, y - th * 0.52)
      ctx.stroke()
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.beginPath()
      ctx.ellipse(x, y + 3, tw * 0.7, 4, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    for (let i = 0; i < Math.floor(wc * 0.05); i++) {
      const x = h(i, 5, 6000) * W, y = h(i, 5, 6001) * H
      if (!isW(x, y)) continue
      const cw = 12 + h(i, 5, 6002) * 10
      const ch = 28 + h(i, 5, 6003) * 26
      const angle = (h(i, 5, 6004) - 0.5) * 0.7
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)
      const hw = cw / 2, hh = ch / 2
      ctx.beginPath()
      ctx.moveTo(-hw * 0.55, -hh)
      ctx.lineTo(hw * 0.55, -hh)
      ctx.lineTo(hw, -hh * 0.6)
      ctx.lineTo(hw, hh * 0.7)
      ctx.lineTo(hw * 0.55, hh)
      ctx.lineTo(-hw * 0.55, hh)
      ctx.lineTo(-hw, hh * 0.7)
      ctx.lineTo(-hw, -hh * 0.6)
      ctx.closePath()
      ctx.fillStyle = rgb(32, 22, 15)
      ctx.fill()
      ctx.strokeStyle = 'rgba(52,38,28,0.6)'
      ctx.lineWidth = 0.8
      ctx.stroke()
      ctx.strokeStyle = 'rgba(65,50,38,0.4)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(0, -hh * 0.5)
      ctx.lineTo(0, hh * 0.4)
      ctx.moveTo(-hw * 0.3, -hh * 0.2)
      ctx.lineTo(hw * 0.3, -hh * 0.2)
      ctx.stroke()
      ctx.restore()
    }
    for (let i = 0; i < Math.floor(wc * 0.3); i++) {
      const x = h(i, 6, 7000) * W, y = h(i, 6, 7001) * H
      if (!isW(x, y)) continue
      const ba = h(i, 6, 7002) * Math.PI
      const bl = 5 + h(i, 6, 7003) * 12
      const x1 = x - Math.cos(ba) * bl / 2, y1 = y - Math.sin(ba) * bl / 2
      const x2 = x + Math.cos(ba) * bl / 2, y2 = y + Math.sin(ba) * bl / 2
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = `rgba(162,152,132,${(0.25 + h(i, 6, 7004) * 0.3).toFixed(2)})`
      ctx.lineWidth = 1.5 + h(i, 6, 7005)
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x1, y1, 1.8, 0, Math.PI * 2)
      ctx.arc(x2, y2, 1.8, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(162,152,132,${(0.2 + h(i, 6, 7004) * 0.25).toFixed(2)})`
      ctx.fill()
    }
    for (let i = 0; i < Math.floor(wc * 0.05); i++) {
      const x = h(i, 7, 8000) * W, y = h(i, 7, 8001) * H
      if (!isW(x, y)) continue
      const sr = 5 + h(i, 7, 8002) * 5
      ctx.beginPath()
      ctx.ellipse(x, y, sr, sr * 1.15, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(148,138,118,${(0.3 + h(i, 7, 8003) * 0.25).toFixed(2)})`
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x - sr * 0.3, y - sr * 0.15, sr * 0.22, 0, Math.PI * 2)
      ctx.arc(x + sr * 0.3, y - sr * 0.15, sr * 0.22, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(5,5,12,0.6)'
      ctx.fill()
    }
  } else if (theme === 'forest') {
    for (let i = 0; i < Math.floor(wc * 0.12); i++) {
      const x = h(i, 8, 3000) * W, y = h(i, 8, 3001) * H
      if (!isW(x, y)) continue
      const trunkR = 3 + h(i, 8, 3002) * 5
      const canopyR = 14 + h(i, 8, 3003) * 30
      ctx.beginPath()
      ctx.arc(x, y, trunkR, 0, Math.PI * 2)
      ctx.fillStyle = rgb(36, 24, 10)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x - trunkR * 0.3, y - trunkR * 0.3, trunkR * 0.6, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(52,36,16,0.5)'
      ctx.fill()
      const nl = 6 + Math.floor(h(i, 8, 3004) * 7)
      for (let j = 0; j < nl; j++) {
        const lx = x + (h(i * 13 + j, 8, 3010 + j) - 0.5) * canopyR * 1.8
        const ly = y + (h(i * 13 + j, 8, 3020 + j) - 0.5) * canopyR * 1.8
        const lr = canopyR * (0.3 + h(i * 13 + j, 8, 3030 + j) * 0.55)
        const green = 18 + h(i * 13 + j, 8, 3040 + j) * 42
        ctx.beginPath()
        ctx.arc(lx, ly, lr, 0, Math.PI * 2)
        const lg = ctx.createRadialGradient(lx - lr * 0.2, ly - lr * 0.2, 0, lx, ly, lr)
        lg.addColorStop(0, rgba(5 + green * 0.2, green + 10, 3, 0.55))
        lg.addColorStop(0.6, rgba(3 + green * 0.15, green - 5, 2, 0.42))
        lg.addColorStop(1, rgba(2 + green * 0.1, green - 14, 1, 0.25))
        ctx.fillStyle = lg
        ctx.fill()
      }
    }
    for (let i = 0; i < Math.floor(wc * 0.5); i++) {
      const x = h(i, 9, 5000) * W, y = h(i, 9, 5001) * H
      if (!isW(x, y)) continue
      const gh = 4 + h(i, 9, 5002) * 10
      const lean = (h(i, 9, 5003) - 0.5) * 6
      const green = 38 + Math.floor(h(i, 9, 5004) * 55)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + lean * 0.6, y - gh * 0.6, x + lean, y - gh)
      ctx.strokeStyle = `rgba(18,${green},8,0.5)`
      ctx.lineWidth = 0.8 + h(i, 9, 5005) * 0.7
      ctx.stroke()
    }
  } else if (theme === 'infernal') {
    const nf = 4 + Math.floor(h(0, 10, 9999) * 6)
    for (let i = 0; i < nf; i++) {
      const x1 = h(i, 10, 3000) * W, y1 = h(i, 10, 3001) * H
      const x2 = h(i, 10, 3002) * W, y2 = h(i, 10, 3003) * H
      const cx = h(i, 10, 3004) * W, cy = h(i, 10, 3005) * H
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo(cx, cy, x2, y2)
      ctx.strokeStyle = 'rgba(255,95,8,0.14)'
      ctx.lineWidth = 14 + h(i, 10, 3006) * 12
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo(cx, cy, x2, y2)
      ctx.strokeStyle = 'rgba(255,135,18,0.35)'
      ctx.lineWidth = 5 + h(i, 10, 3007) * 5
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo(cx, cy, x2, y2)
      ctx.strokeStyle = `rgba(255,${175 + Math.floor(h(i, 10, 3008) * 65)},55,0.7)`
      ctx.lineWidth = 1.5 + h(i, 10, 3009) * 2
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo(cx, cy, x2, y2)
      ctx.strokeStyle = 'rgba(255,245,190,0.35)'
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
    for (let i = 0; i < Math.floor(wc * 0.08); i++) {
      const x = h(i, 11, 4000) * W, y = h(i, 11, 4001) * H
      if (!isW(x, y)) continue
      const r = 10 + h(i, 11, 4002) * 28
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * (0.45 + h(i, 11, 4003) * 0.55), h(i, 11, 4004) * Math.PI, 0, Math.PI * 2)
      const pg = ctx.createRadialGradient(x, y, 0, x, y, r)
      pg.addColorStop(0, 'rgba(255,225,75,0.6)')
      pg.addColorStop(0.3, 'rgba(255,130,18,0.48)')
      pg.addColorStop(0.6, 'rgba(215,50,5,0.3)')
      pg.addColorStop(1, 'rgba(90,12,2,0)')
      ctx.fillStyle = pg
      ctx.fill()
    }
    for (let i = 0; i < Math.floor(wc * 0.4); i++) {
      const x = h(i, 12, 5000) * W, y = h(i, 12, 5001) * H
      if (!isW(x, y)) continue
      const r = 0.5 + h(i, 12, 5002) * 2.8
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      const eg = ctx.createRadialGradient(x, y, 0, x, y, r)
      eg.addColorStop(0, 'rgba(255,225,75,0.75)')
      eg.addColorStop(0.5, 'rgba(255,108,12,0.4)')
      eg.addColorStop(1, 'rgba(175,28,4,0)')
      ctx.fillStyle = eg
      ctx.fill()
    }
  }

  ctx.restore()
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

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
          case 'wall': drawWallTile(ctx, t, x, y, theme); break
          case 'door': drawDoorTile(ctx, t, x, y); break
          case 'water': drawWaterTile(ctx, t, x, y); break
          case 'stairs': drawStairsTile(ctx, t, x, y); break
        }

        ctx.globalAlpha = 1
      }
    }

    drawWallIllustrations(ctx, t, theme, grid, width, height)

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
      ctx.globalAlpha = 0.2
      ctx.drawImage(noiseRef.current, 0, 0)
      ctx.restore()
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    const aoSize = S * 0.85
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid[y][x]
        const vis = isCellVisible(dungeon, revealedRooms, players, x, y, vc)
        const walkable = cell.type !== 'wall' && cell.type !== 'empty'
        if (!(vis || isDM) || !walkable) continue

        const px = x * S, py = y * S

        if (isWallAt(x, y - 1)) {
          const g = ctx.createLinearGradient(px, py, px, py + aoSize)
          g.addColorStop(0, 'rgba(0,0,0,0.7)')
          g.addColorStop(0.3, 'rgba(0,0,0,0.3)')
          g.addColorStop(0.7, 'rgba(0,0,0,0.08)')
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.fillRect(px, py, S, aoSize)
        }
        if (isWallAt(x, y + 1)) {
          const g = ctx.createLinearGradient(px, py + S, px, py + S - aoSize)
          g.addColorStop(0, 'rgba(0,0,0,0.7)')
          g.addColorStop(0.3, 'rgba(0,0,0,0.3)')
          g.addColorStop(0.7, 'rgba(0,0,0,0.08)')
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.fillRect(px, py + S - aoSize, S, aoSize)
        }
        if (isWallAt(x - 1, y)) {
          const g = ctx.createLinearGradient(px, py, px + aoSize, py)
          g.addColorStop(0, 'rgba(0,0,0,0.7)')
          g.addColorStop(0.3, 'rgba(0,0,0,0.3)')
          g.addColorStop(0.7, 'rgba(0,0,0,0.08)')
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.fillRect(px, py, aoSize, S)
        }
        if (isWallAt(x + 1, y)) {
          const g = ctx.createLinearGradient(px + S, py, px + S - aoSize, py)
          g.addColorStop(0, 'rgba(0,0,0,0.7)')
          g.addColorStop(0.3, 'rgba(0,0,0,0.3)')
          g.addColorStop(0.7, 'rgba(0,0,0,0.08)')
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.fillRect(px + S - aoSize, py, aoSize, S)
        }
      }
    }

    for (const room of dungeon.rooms) {
      const rcx = (room.position.x + room.size.width / 2) * S
      const rcy = (room.position.y + room.size.height / 2) * S
      const roomR = Math.max(room.size.width, room.size.height) * S * 0.7
      const rg = ctx.createRadialGradient(rcx, rcy, 0, rcx, rcy, roomR)
      rg.addColorStop(0, 'rgba(255,210,140,0.12)')
      rg.addColorStop(0.3, 'rgba(255,190,110,0.06)')
      rg.addColorStop(0.7, 'rgba(255,170,90,0.02)')
      rg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = rg
      ctx.fillRect(rcx - roomR, rcy - roomR, roomR * 2, roomR * 2)
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x].type !== 'door') continue
        const vis = isCellVisible(dungeon, revealedRooms, players, x, y, vc)
        if (!(vis || isDM)) continue
        const tcx = x * S + S / 2, tcy = y * S + S / 2
        const torchR = S * 5
        const tg = ctx.createRadialGradient(tcx, tcy, 0, tcx, tcy, torchR)
        tg.addColorStop(0, 'rgba(255,170,65,0.35)')
        tg.addColorStop(0.1, 'rgba(255,150,50,0.22)')
        tg.addColorStop(0.3, 'rgba(255,130,40,0.10)')
        tg.addColorStop(0.6, 'rgba(255,110,30,0.03)')
        tg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = tg
        ctx.fillRect(tcx - torchR, tcy - torchR, torchR * 2, torchR * 2)
      }
    }

    for (const p of players) {
      const pcx = p.position.x * S + S / 2, pcy = p.position.y * S + S / 2
      const glowR = S * 5
      const grd = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, glowR)
      grd.addColorStop(0, 'rgba(255,215,140,0.25)')
      grd.addColorStop(0.15, 'rgba(255,195,110,0.14)')
      grd.addColorStop(0.4, 'rgba(255,175,90,0.05)')
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
            ctx.fillStyle = 'rgba(10,12,25,0.3)'
            ctx.fillRect(x * S, y * S, S, S)
          }
        }
      }
    }
  }, [grid, width, height, theme, t, revealedRooms, players, visionDistanceFt, exploredCells, isDM, dungeon, isWallAt])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / scale / S)
    const y = Math.floor((e.clientY - rect.top) / scale / S)
    if (x >= 0 && x < width && y >= 0 && y < height) {
      onCellClick(x, y)
    }
  }, [width, height, onCellClick, scale])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const fit = () => {
      const cw = container.clientWidth - 24
      const ch = container.clientHeight - 60
      const mapW = width * S
      const mapH = height * S
      if (mapW <= 0 || mapH <= 0) return
      setScale(Math.min(1, cw / mapW, ch / mapH))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(container)
    return () => ro.disconnect()
  }, [width, height])

  const HP_R = S / 2 - 1
  const HP_C = 2 * Math.PI * HP_R
  const np = { pointerEvents: 'none' as const }

  return (
    <div ref={containerRef} className="dungeon-map-container" style={{ background: `radial-gradient(ellipse at center, ${t.bg[0]} 0%, ${t.bg[1]} 100%)` }}>
      <div
        className="dungeon-map-wrapper"
        style={{
          position: 'relative',
          width: width * S,
          height: height * S,
          cursor: 'pointer',
          flexShrink: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
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
