import convertRoomPositionStringBackToRoomPositionObject from "convertRoomPositionStringBackToRoomPositionObject"
import type { MineablePositions } from "main"
import type { Miner } from "roleMiner"

export default function assessSources(
  thisCreep: Miner,
  availableMiningPositions: MineablePositions
) {
  thisCreep.say("⛏️ ASSIGN")
  thisCreep.memory.mission = "MINE"
  console.log("Mineable positions: " + [...availableMiningPositions.keys()])
  // Select the nearest mineable position available
  const destination = [...availableMiningPositions.keys()].reduce((a, b) => {
    const posA = convertRoomPositionStringBackToRoomPositionObject(a)
    const posB = convertRoomPositionStringBackToRoomPositionObject(b)
    const rangeToA = thisCreep.pos.getRangeTo(posA)
    const rangeToB = thisCreep.pos.getRangeTo(posB)
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
