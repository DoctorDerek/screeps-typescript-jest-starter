// TODO: Refactor how destination is stored in memory with newer version (string)
import convertRoomPositionStringBackToRoomPositionObject from "convertRoomPositionStringBackToRoomPositionObject"
import type { Builder } from "roleBuilder"
import type { DefenderMelee } from "roleDefenderMelee"
import type { DefenderRanged } from "roleDefenderRanged"
import type { Fetcher } from "roleFetcher"
import type { Miner } from "roleMiner"

function actionExplore(
  thisCreep: Builder | DefenderMelee | DefenderRanged | Fetcher | Miner
) {
  // TODO: make sure destination is getting unset
  if (
    thisCreep.memory.destination == undefined ||
    typeof thisCreep.memory.destination != "string"
  ) {
    thisCreep.say("🚶 EXPLORE")
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

    // Select an exit to move to at random
    const destinationRoom =
      exitRoomNameArray[Math.floor(exitRoomNameArray.length * Math.random())]

    thisCreep.memory.destination = String(
      new RoomPosition(25, 25, destinationRoom)
    )

    console.log(
      `${thisCreep.name} assigned mission to EXPLORE to Destination ${thisCreep.memory.destination}`
    )
  } else {
    if (thisCreep.memory.destination == undefined) {
      console.log(
        `Attempting to call convertRoomPositionStringBackToRoomPositionObject with value ${thisCreep.memory.destination}`
      )
    }
    if (thisCreep.room.find(FIND_HOSTILE_CREEPS).length > 1) {
      // Potentially a source keeper room or enemy room, leave it by walking back home
      thisCreep.moveTo(Game.spawns["Spawn1"].pos)
    } else {
      // Move toward the assigned exit tile
      thisCreep.moveTo(
        convertRoomPositionStringBackToRoomPositionObject(
          thisCreep.memory.destination
        ),
        { visualizePathStyle: { stroke: "#ffaa00" } }
      )
    }
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
