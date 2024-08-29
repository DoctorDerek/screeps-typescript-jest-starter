import actionMoveToDestination from "actionMoveToDestination"
import type { Position, RoomName } from "main"
import type { Builder } from "roleBuilder"
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
function actionExplore(thisCreep: Explorer) {
  if (
    thisCreep.memory.destination == undefined ||
    typeof thisCreep.memory.destination != "string"
  ) {
    thisCreep.say(`${thisCreep.memory.emoji}ASSIGN`)
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

    // Select an exit to move to that is moving away from our spawn
    const spawn = Game.spawns["Spawn1"].room.name
    // Randomize the array in case of a tie
    exitRoomNameArray.sort(() => Math.random() - 0.5)
    const destinationRoomName = exitRoomNameArray.reduce((a, b) => {
      const rangeToA = Game.map.getRoomLinearDistance(spawn, a)
      const rangeToB = Game.map.getRoomLinearDistance(spawn, b)
      return rangeToA > rangeToB ? a : b
    }) as RoomName
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
    const destination: Position = `[room ${destinationRoomName} pos ${proposedX},${proposedY}]`
    thisCreep.memory.destination = destination

    console.log(
      `${thisCreep.name} assigned mission to EXPLORE to Destination ${destination}`
    )
  } else {
    actionMoveToDestination(thisCreep)
  }
  if (
    thisCreep.pos.x === 0 ||
    thisCreep.pos.x === 49 ||
    thisCreep.pos.y === 0 ||
    thisCreep.pos.y === 49
  ) {
    // At an exit on the 50x50 game board
    // Reset mission
    thisCreep.memory.mission = "THINK"
    thisCreep.memory.destination = null
    // Move off the border by 1 step
    thisCreep.moveTo(25, 25)
  }
}

export default actionExplore
