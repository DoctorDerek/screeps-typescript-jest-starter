import type { Position } from "main"
import parsePosition from "parsePosition"

/**
 * Divide the square of the resources by the square of the distance, multi-room
 * without needing vision
 * */
export default function findBestDroppedResources(
  thisCreep: Creep,
  availableSources: Resource[]
) {
  availableSources.sort((a: Resource, b: Resource) => {
    const { roomName: roomNameA, x: xA, y: yA } = a.pos
    const { roomName: roomNameB, x: xB, y: yB } = b.pos
    const amountA = a.amount
    const amountB = b.amount

    if (!(roomNameA && xA && yA && roomNameB && xB && yB && amountA && amountB))
      return 0
    const thisRoomName = thisCreep.pos.roomName
    const roomsA = Game.map.getRoomLinearDistance(thisRoomName, roomNameA)
    const roomsB = Game.map.getRoomLinearDistance(thisRoomName, roomNameB)
    const thisX = thisCreep.pos.x
    const thisY = thisCreep.pos.y
    const getRangeTo = (rooms: number, x: number, y: number) =>
      50 * rooms + (Math.abs(x - thisX) + Math.abs(y - thisY)) / 50
    const rangeToA = getRangeTo(roomsA, xA, yA)
    const rangeToB = getRangeTo(roomsB, xB, yB)
    return amountA ** 2 / rangeToA ** 2 > amountB ** 2 / rangeToB ** 2 ? -1 : 1
  })
  return availableSources.shift() // Remove resource from other fetchers
}
