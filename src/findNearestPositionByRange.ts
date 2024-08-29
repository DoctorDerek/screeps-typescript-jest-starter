import type { Position } from "main"
import parsePosition from "parsePosition"

/**
 * Find the nearest by approximate distance, multi-room without needing vision
 * */
export default function findNearestPositionByRange(
  thisCreep: Creep,
  availablePositions: Position[]
) {
  return availablePositions.reduce((a: Position, b: Position) => {
    const { roomName: roomNameA, x: xA, y: yA } = parsePosition(a)
    const { roomName: roomNameB, x: xB, y: yB } = parsePosition(b)

    if (!(roomNameA && xA && yA && roomNameB && xB && yB)) return a
    const thisRoomName = thisCreep.pos.roomName
    const roomsA = Game.map.getRoomLinearDistance(thisRoomName, roomNameA)
    const roomsB = Game.map.getRoomLinearDistance(thisRoomName, roomNameB)
    const thisX = thisCreep.pos.x
    const thisY = thisCreep.pos.y
    const getRangeTo = (rooms: number, x: number, y: number) =>
      50 * rooms + (Math.abs(x - thisX) + Math.abs(y - thisY)) / 50
    const rangeToA = getRangeTo(roomsA, xA, yA)
    const rangeToB = getRangeTo(roomsB, xB, yB)
    return rangeToA < rangeToB ? a : b
  })
}
