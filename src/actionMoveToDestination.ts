import type { Explorer } from "actionExplore"
import convertRoomPositionStringBackToRoomPositionObject from "convertRoomPositionStringBackToRoomPositionObject"
import parseDestination from "parseDestination"

export default function actionMoveToDestination(thisCreep: Explorer) {
  if (thisCreep.room.find(FIND_HOSTILE_STRUCTURES).length >= 1) {
    // Potentially a source keeper room or enemy room, leave it by walking back home
    thisCreep.moveTo(Game.spawns["Spawn1"].pos)
  } else {
    if (!thisCreep.memory.destination) {
      thisCreep.memory.destination = null
      thisCreep.memory.mission = "THINK"
      return
    }
    const { roomName } = parseDestination(thisCreep)
    if (!roomName) {
      thisCreep.memory.destination = null
      thisCreep.memory.mission = "THINK"
    } else if (roomName !== thisCreep.room.name) {
      // Move toward the assigned exit tile
      const exitDir = Game.map.findExit(thisCreep.room, roomName)
      if (exitDir !== -2 && exitDir !== -10) {
        const exit = thisCreep.pos.findClosestByRange(exitDir)
        if (exit) {
          thisCreep.moveTo(
            exit,
            { visualizePathStyle: { stroke: "#FFC0CB" } } // pink
          )
          thisCreep.say(`${thisCreep.memory.emoji}FAR`)
        } else {
          thisCreep.memory.destination = null
          thisCreep.memory.mission = "THINK"
        }
      }
    } else if (roomName === thisCreep.room.name) {
      // We are in the same room so move to the destination
      // The following throws an error if the room is not visible
      const roomPosition = convertRoomPositionStringBackToRoomPositionObject(
        thisCreep.memory.destination
      )
      thisCreep.say(`${thisCreep.memory.emoji}CLOSE`)
      const resultMove = thisCreep.moveTo(
        roomPosition,
        { visualizePathStyle: { stroke: "#FFC0CB" } } // pink
      )
      // If this creep has arrived, reset the mission
      if (
        resultMove === ERR_NO_PATH ||
        (thisCreep.pos.x === roomPosition.x &&
          thisCreep.pos.y === roomPosition.y) ||
        roomPosition.lookFor(LOOK_CREEPS).length > 0
      ) {
        thisCreep.memory.mission = "THINK"
        thisCreep.memory.destination = null
      }
    }
  }
}
