import type { Explorer } from "actionExplore"
import convertRoomPositionStringBackToRoomPositionObject from "convertRoomPositionStringBackToRoomPositionObject"
import parseDestination from "parseDestination"
import type { Position } from "main"

export default function actionMoveToDestination(thisCreep: Explorer) {
  /**
   * Remove hostile structures I can't dismantle: controllers, source keeper
   * lairs, and invader cores, which need to be attacked not dismantled.
   * I also remove my own structures, roads, walls, and containers.
   * */
  const structuresToDismantle = thisCreep.room.find(FIND_STRUCTURES, {
    filter: (structure) => {
      {
        if ("my" in structure && structure.my) return false
        return (
          structure.structureType !== STRUCTURE_CONTROLLER &&
          structure.structureType !== STRUCTURE_KEEPER_LAIR &&
          structure.structureType !== STRUCTURE_INVADER_CORE &&
          structure.structureType !== STRUCTURE_ROAD &&
          structure.structureType !== STRUCTURE_CONTAINER &&
          structure.structureType !== STRUCTURE_POWER_BANK
        )
      }
    }
  })
  const hasWorkPart = thisCreep.getActiveBodyparts(WORK) > 0
  const canDismantle = structuresToDismantle.length > 0 && hasWorkPart
  if (canDismantle) {
    // Dismantling time!
    const closestStructure = thisCreep.pos.findClosestByRange(
      structuresToDismantle
    )
    const closestPosition = String(closestStructure?.pos) as Position
    console.log(`⛓️‍💥${thisCreep.name} dismantling at ${closestPosition}`)
    if (!closestStructure) return // Shouldn't happen, but type safe
    thisCreep.memory.destination = closestPosition
    const result = thisCreep.dismantle(closestStructure)
    if (result === OK) thisCreep.say(`${thisCreep.memory.emoji}🤺🫡`)
    else {
      thisCreep.say(`${thisCreep.memory.emoji}🤺${String(result)}`)
      thisCreep.memory.destination = null
      thisCreep.memory.mission = "THINK"
    }
  }
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
      const exit = thisCreep.pos.findClosestByPath(exitDir, {
        range: 1
      })
      if (exit) {
        const moveResult = thisCreep.moveTo(
          exit,
          { visualizePathStyle: { stroke: "#FFC0CB" } } // pink
        )
        if (moveResult === OK) thisCreep.say(`${thisCreep.memory.emoji}FAR`)
        if (moveResult === ERR_NO_PATH || moveResult === ERR_INVALID_TARGET) {
          thisCreep.memory.destination = null
          thisCreep.memory.mission = "THINK"
        }
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
      {
        plainCost: 1,
        // Eyes with 5x MOVE parts ignore swamps so should path as such
        swampCost: thisCreep.memory.role === "eye" ? 1 : 5,
        visualizePathStyle: { stroke: "#FFC0CB" }
      } // pink
    )
    const haveArrivedWithinRange = thisCreep.pos.inRangeTo(roomPosition, 1)
    const buildingsAtDestination = roomPosition.lookFor(LOOK_STRUCTURES)
    const foundBuildingsAtDestination = buildingsAtDestination.length > 0
    const creepsAtDestination = roomPosition.lookFor(LOOK_CREEPS)
    const foundCreepsAtDestination = creepsAtDestination.length > 0
    // Reset if I arrive, if I can't get there, or if there's a creep there.
    const haveArrivedAtPos = thisCreep.pos.inRangeTo(roomPosition, 0)
    const haveArrived =
      haveArrivedAtPos ||
      ((foundBuildingsAtDestination || foundCreepsAtDestination) &&
        haveArrivedWithinRange)
    const foundWallAtPos = roomPosition.lookFor(LOOK_TERRAIN)[0] === "wall"
    if (foundWallAtPos || resultMove === ERR_NO_PATH || haveArrived) {
      thisCreep.memory.mission = "THINK"
      thisCreep.memory.destination = null
    }
  }
}
