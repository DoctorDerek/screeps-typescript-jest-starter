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
    const exits = Game.map.describeExits(thisCreep.room.name)
    const exitDirectionArray = Array.from(Object.keys(exits))
    const exitRoomNameArray = Array.from(Object.values(exits))
    /* Game.map.describeExits(thisCreep.room.name) Return value


    The exits information in the following format, or null if the room not found.

    {
        "1": "W8N4",    // TOP
        "3": "W7N3",    // RIGHT
        "5": "W8N2",    // BOTTOM
        "7": "W9N3"     // LEFT
    } */
    const exitIndex = Math.floor(Math.random() * exitRoomNameArray.length)
    const exitDirection = exitDirectionArray[exitIndex]
    const destinationRoomName = exitRoomNameArray[exitIndex]
    const destinationRoom = Game.rooms[destinationRoomName]
    // The exit direction tells us which pos we will be at in the new room:
    let proposedX = 25
    let proposedY = 25
    // Coming in from 1 top, we will be at x=25, y=1
    // Coming in from 3 right, we will be at x=48, y=25
    // Coming in from 5 bottom, we will be at x=25, y=48
    // Coming in from 7 left, we will be at x=1, y=25
    if (exitDirection === "1") proposedY = 1
    if (exitDirection === "3") proposedX = 48
    if (exitDirection === "5") proposedY = 48
    if (exitDirection === "7") proposedX = 1
    // Check for no terrain blocking, move y using a for loop
    if (destinationRoom)
      for (
        let i = 0;
        i < 100 &&
        destinationRoom
          .lookAt(proposedX, proposedY)
          .filter((object) => object.type === "terrain")[0].terrain === "wall";
        i++ // Prevent infinite loop in broken rooms
      ) {
        if (exitDirection === "1") proposedX++
        if (exitDirection === "3") proposedY++
        if (exitDirection === "5") proposedX--
        if (exitDirection === "7") proposedY--
        // Loop around for search
        if (proposedX > 48) proposedX = 1
        if (proposedX < 1) proposedX = 48
        if (proposedY > 48) proposedY = 1
        if (proposedY < 1) proposedY = 48
      }
    /** Calling new RoomPosition() won't work without vision, but this will */
    const destination =
      `[room ${destinationRoomName} pos ${proposedX},${proposedY}]` as Position
    thisCreep.memory.destination = destination
    thisCreep.say(
      `${thisCreep.memory.emoji}🚀${destinationRoomName}${proposedX},${proposedY}`
    )
    console.log(
      `${thisCreep.name} assigned mission to EXPLORE to Destination ${destination}`
    )
  } else {
    actionMoveToDestination(thisCreep)
  }
}

export default actionExplore
