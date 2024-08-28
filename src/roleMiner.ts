// Drop Miner
// A miner that drops what it mines where it sits, preferably into a container

// State Chart
// Mission: "MINE"
// Objective: {x,y} (energy source)
// Destination: {x,y} (where to move to mine)

// Initial mission: undefined
// --> Set home to memory
// ----> Mission: THINK
// Default mission: THINK
// --> Assess Sources (energy sources)
// Available energy sources are the open tiles adjacent
// Open tiles mean no creep currently assigned to those tiles
// --> If available sources, go to mine them
// ----> Mission: MINE ---> (until death)
// --> If no available sources, go to another room
// ----> Mission: EXPLORE ---> Mission THINK on entering new room
import actionExplore from "actionExplore"
import actionMoveToDestination from "actionMoveToDestination"
import assessSources from "assessSources"

import convertRoomPositionStringBackToRoomPositionObject from "convertRoomPositionStringBackToRoomPositionObject"
import type { MineablePositions, Position } from "main"
import parseDestination from "parseDestination"

export interface Miner extends Creep {
  memory: MinerMemory
}

interface MinerMemory extends CreepMemory {
  role: "miner"
  mission: "THINK" | "MINE" | "EXPLORE"
  depositTargetNumber: number | null
  droppedResourceNumber: number | null
  objective: Position | null
  destination: Position | null
  home: Position | null
}

const roleMiner = {
  run: function (
    thisCreep: Miner,
    availableMiningPositions: MineablePositions
  ) {
    if (!thisCreep?.memory?.mission) {
      // INIT mission
      thisCreep.memory.home = String(thisCreep.pos) as Position
      thisCreep.memory.mission = "THINK"
    }
    if (thisCreep.memory.mission === "THINK") {
      thisCreep.say("⛏️ THINK")
      thisCreep.memory.objective = null
      thisCreep.memory.destination = null
      if (availableMiningPositions.size > 0)
        assessSources(thisCreep, availableMiningPositions)
      else if (availableMiningPositions.size === 0) {
        thisCreep.memory.mission = "EXPLORE"
        thisCreep.memory.destination = null
      }
    }
    if (thisCreep.memory.mission === "MINE") {
      if (!thisCreep.memory.objective || !thisCreep.memory.destination) {
        thisCreep.memory.mission = "THINK"
        return
      }
      const { roomName, x, y } = parseDestination(thisCreep)
      // Try to harvest if I'm at the destination
      if (
        thisCreep.pos.roomName === roomName &&
        thisCreep.pos.x === x &&
        thisCreep.pos.y === y
      ) {
        // In the creep's memory, the objective and destination are stored as strings, so I have to convert them
        const sourcePosition =
          convertRoomPositionStringBackToRoomPositionObject(
            thisCreep.memory.objective
          )
        const destinationPosition =
          convertRoomPositionStringBackToRoomPositionObject(
            thisCreep.memory.destination
          )
        const sourceObjectAtObjective =
          sourcePosition.findClosestByRange(FIND_SOURCES)
        if (!sourceObjectAtObjective) {
          // Shouldn't happen, but if it does, think about it
          thisCreep.memory.mission = "THINK"
          return
        }
        const result = thisCreep.harvest(sourceObjectAtObjective)
        // console.log(`⛏️ Miner ${thisCreep.name} mining result ${result}`)
        if (result === OK) thisCreep.say("⛏️ MINE")
        else {
          thisCreep.say("⛏️ ERROR")
          // Possibly out of resources
          thisCreep.memory.mission = "THINK"
        }
      } else {
        // if (
        //   thisCreep.pos.roomName === roomName &&
        //   convertRoomPositionStringBackToRoomPositionObject(
        //     thisCreep.memory.destination
        //   ).lookFor(LOOK_CREEPS).length > 0
        // ) {
        //   thisCreep.say("⛏️ OCCUPIED")
        //   // Think about it if our mining site is occupied
        //   thisCreep.memory.mission = "THINK"
        // }
        actionMoveToDestination(thisCreep)
      }
    }
    if (thisCreep.memory.mission === "EXPLORE") {
      // If there are mineable positions unexploited in the room, go to them
      if (availableMiningPositions.size > 0) {
        thisCreep.memory.mission = "THINK"
        thisCreep.say("⛏️ THINK")
        assessSources(thisCreep, availableMiningPositions)
      } else if (availableMiningPositions.size === 0) {
        thisCreep.say("⛏️ EXPLORE")
        actionExplore(thisCreep)
      }
    }
  }
}

export default roleMiner
