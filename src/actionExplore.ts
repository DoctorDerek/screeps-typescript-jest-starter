import actionMoveToDestination from "actionMoveToDestination"
import type { Position } from "main"
import type { Builder } from "roleBuilder"
import type { Claimer } from "roleClaimer"
import type { DefenderMelee } from "roleDefenderMelee"
import type { DefenderRanged } from "roleDefenderRanged"
import type { Eye } from "roleEye"
import type { Fetcher } from "roleFetcher"
import type { Harvester } from "roleHarvester"
import type { Miner } from "roleMiner"

export type Explorer =
  | Builder
  | DefenderMelee
  | DefenderRanged
  | Eye
  | Fetcher
  | Harvester
  | Miner
  | Claimer
function actionExplore(thisCreep: Explorer) {
  if (
    thisCreep.memory.destination == undefined ||
    typeof thisCreep.memory.destination != "string"
  ) {
    thisCreep.say(`${thisCreep.memory.emoji}⛵🎯`)
    // const exitPositions = thisCreep.room.find(FIND_EXIT)
    const exitRoomNameArray = Array.from(
      Object.values(Game.map.describeExits(thisCreep.room.name))
    )
    /* Game.map.describeExits(thisCreep.room.name) Return value


    The exits information in the following format, or null if the room not found.

    {
        "1": "W8N4",    // TOP
        "3": "W7N3",    // RIGHT
        "5": "W8N2",    // BOTTOM
        "7": "W9N3"     // LEFT
    } */

    const destinationRoomName =
      exitRoomNameArray[Math.floor(Math.random() * exitRoomNameArray.length)]
    const destinationRoom = Game.rooms[destinationRoomName]
    let proposedX = 25
    let proposedY = 25
    // Check for no terrain blocking, move y using a for loop
    if (destinationRoom)
      while (
        destinationRoom
          .lookAt(proposedX, proposedY)
          .filter((object) => object.type === "terrain")[0].terrain === "wall"
      ) {
        // Random walk weighted 60%/40% in favor of decreasing x/y
        if (Math.random() > 0.6) Math.random() > 0.5 ? proposedY-- : proposedX--
        else Math.random() > 0.5 ? proposedY++ : proposedX++
        proposedX = proposedX < 0 ? 0 : proposedX
        proposedY = proposedY < 0 ? 0 : proposedY
        proposedX > 49 ? 49 : proposedX
        proposedY > 49 ? 49 : proposedY
      }
    /** Calling new RoomPosition() won't work without vision, but this will */
    const destination =
      `[room ${destinationRoomName} pos ${proposedX},${proposedY}]` as Position
    thisCreep.memory.destination = destination

    console.log(
      `${thisCreep.name} assigned mission to EXPLORE to Destination ${destination}`
    )
  } else {
    actionMoveToDestination(thisCreep)
  }
}

export default actionExplore
