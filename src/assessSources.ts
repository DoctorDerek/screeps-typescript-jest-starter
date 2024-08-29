import findNearestPositionByRange from "findNearestPositionByRange"
import type { MineablePositions, Position } from "main"
import parsePosition from "parsePosition"
import type { Miner } from "roleMiner"

export default function assessSources(
  thisCreep: Miner,
  availableMiningPositions: MineablePositions
) {
  thisCreep.say(`${thisCreep.memory.emoji}ASSESS`)
  thisCreep.memory.mission = "MINE"
  const availableMiningPositionsArray = [...availableMiningPositions.keys()]
  console.log("Mineable positions: " + availableMiningPositionsArray)
  // Select the nearest mineable position available, with rooms estimated at 50
  const destination: Position = findNearestPositionByRange(
    thisCreep,
    availableMiningPositionsArray
  )
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
