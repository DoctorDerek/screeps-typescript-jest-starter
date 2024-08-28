import type { Position } from "main"

export default function parsePosition(position: Position) {
  const groups = /room (\w+) pos (\d+),(\d+)/.exec(position)
  const roomName = groups?.[1] ? groups[1] : null
  const x = groups?.[2] ? Number(groups[2]) : null
  const y = groups?.[3] ? Number(groups[3]) : null
  return { roomName, x, y }
}
