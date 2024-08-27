import convertRoomPositionStringBackToRoomPositionObject from "convertRoomPositionStringBackToRoomPositionObject"
import type { MineablePositions } from "main"
import type { Miner } from "roleMiner"

export default function assessSources(
  thisCreep: Miner,
  availableMiningPositions: MineablePositions
) {
  if (availableMiningPositions.size === 0) {
    // No available mining positions
    // --> Mission: EXPLORE
    thisCreep.memory.mission = "EXPLORE"
    thisCreep.say("⛏️ EXPLORE!!")
  } else {
    // Found at least 1 available mining position
    // --> Mission: MINE
    thisCreep.memory.mission = "MINE"
    console.log("Mineable positions: " + [...availableMiningPositions.keys()])
    // Select a position available at random and assign it as the mission destination
    // (RoomPosition object stored in memory)
    // Select the nearest mineable position available
    const destination = [...availableMiningPositions.keys()].reduce((a, b) => {
      const posA = convertRoomPositionStringBackToRoomPositionObject(a)
      const posB = convertRoomPositionStringBackToRoomPositionObject(b)
      const rangeToA = thisCreep.pos.getRangeTo(posA)
      const rangeToB = thisCreep.pos.getRangeTo(posB)
      return rangeToA < rangeToB ? a : b
    })
    thisCreep.memory.destination = destination
    // Assign the energy source to the mission objective (string resulting from RoomPosition object stored in memory)
    // Hash key accessed by string lookup of string resulting from RoomPosition
    thisCreep.memory.objective =
      availableMiningPositions.get(thisCreep.memory.destination) || null
    thisCreep.say("⛏️ ASSIGN")
    console.log(
      `${thisCreep.name} assigned mission to MINE Objective ${thisCreep.memory.objective} from Destination ${thisCreep.memory.destination}`
    )
  }
}
