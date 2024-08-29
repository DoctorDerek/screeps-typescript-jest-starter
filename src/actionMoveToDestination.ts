import type { Explorer } from "actionExplore"
import convertRoomPositionStringBackToRoomPositionObject from "convertRoomPositionStringBackToRoomPositionObject"
import parseDestination from "parseDestination"
import type { Position } from "main"

export default function actionMoveToDestination(thisCreep: Explorer) {
  // Remove hostile structures that I can't dismantle, like a source keeper lair
  const structuresToDismantle = thisCreep.room.find(FIND_STRUCTURES, {
    filter: (structure) => {
      return (
        structure.room.name != Game.spawns["Spawn1"].room.name &&
        structure.structureType !== STRUCTURE_KEEPER_LAIR &&
        structure.structureType !== STRUCTURE_CONTROLLER
      )
    }
  })
  const hasWorkPart = thisCreep.getActiveBodyparts(WORK) > 0
  const canDismantle = structuresToDismantle.length > 0 && hasWorkPart
  if (canDismantle) {
    // Dismantling time!
    const closestStructure = thisCreep.pos.findClosestByRange(
      structuresToDismantle
    )
    if (!closestStructure) return // Shouldn't happen, but type safe
    thisCreep.memory.destination = String(closestStructure.pos) as Position
    const result = thisCreep.dismantle(closestStructure)
    if (result === OK) thisCreep.say(`${thisCreep.memory.emoji}DISMANTLE`)
    if (result === ERR_NOT_IN_RANGE) {
      const moveResult = thisCreep.moveTo(
        closestStructure,
        { visualizePathStyle: { stroke: "#000000" } } // black
      )
      if (moveResult === OK) thisCreep.say(`${thisCreep.memory.emoji}DISMOVE`)
      if (moveResult === ERR_NO_PATH) {
        thisCreep.memory.destination = null
        thisCreep.memory.mission = "THINK"
      }
    }
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
