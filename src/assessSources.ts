import type { MineablePositions } from "main"
import parsePosition from "parsePosition"
import type { Miner } from "roleMiner"

export default function assessSources(
  thisCreep: Miner,
  availableMiningPositions: MineablePositions
) {
  thisCreep.say(`${thisCreep.memory.emoji}ASSESS`)
  thisCreep.memory.mission = "MINE"
  console.log("Mineable positions: " + [...availableMiningPositions.keys()])
  // Select the nearest mineable position available, with rooms estimated at 50
  const destination = [...availableMiningPositions.keys()].reduce((a, b) => {
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
  thisCreep.memory.destination = destination
  /**
   * Assign the energy source to the mission objective
   * (string resulting from RoomPosition object stored in memory)
   * Hash key accessed by string lookup of string resulting from RoomPosition
   * */
  thisCreep.memory.objective = availableMiningPositions.get(destination) || null
  /**
   * Remove the selected position from the available positions.
   *
   * This will affect the next miner that is assigned a position, i.e. the
   * mineablePositionsMap will be updated in the main loop.
   * */
  availableMiningPositions.delete(destination)
  console.log(
    `${thisCreep.name} assigned mission to MINE Objective ${thisCreep.memory.objective} from Destination ${thisCreep.memory.destination}`
  )
}
