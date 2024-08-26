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

import convertRoomPositionStringBackToRoomPositionObject from "convertRoomPositionStringBackToRoomPositionObject"

export interface Miner extends Creep {
  memory: MinerMemory
}

interface MinerMemory extends CreepMemory {
  role: "Miner"
  mission: "THINK" | "MINE" | "EXPLORE"
  depositTargetNumber: number | null
  droppedResourceNumber: number | null
  objective: string | null
  destination: string | null
  home: Room
}

const assessSources = (
  thisCreep: Miner,
  availableMiningPositions: Map<string, string>
) => {
  if (availableMiningPositions.size === 0) {
    // No available mining positions
    // --> Mission: EXPLORE
    thisCreep.memory.mission = "EXPLORE"
    thisCreep.say("🔍 EXPLORE!!")
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
      return thisCreep.pos.getRangeTo(posA) < thisCreep.pos.getRangeTo(posB)
        ? a
        : b
    })
    thisCreep.memory.destination = destination
    // Assign the energy source to the mission objective (string resulting from RoomPosition object stored in memory)
    // Hash key accessed by string lookup of string resulting from RoomPosition
    thisCreep.memory.objective =
      availableMiningPositions.get(thisCreep.memory.destination) || null
    thisCreep.say("⛏️ MINE!!")
    console.log(
      `${thisCreep.name} assigned mission to MINE Objective ${thisCreep.memory.objective} from Destination ${thisCreep.memory.destination}`
    )
  }
}

const roleMiner = {
  run: function (thisCreep: Miner, mineablePositions: Map<string, string>) {
    if (thisCreep.spawning === true) {
      // INIT mission
      thisCreep.memory.home = thisCreep.room
      thisCreep.memory.mission = "THINK"
    } else {
      if (thisCreep.memory.mission === "THINK") {
        thisCreep.say("⛏ THINK")
        thisCreep.memory.objective = null
        thisCreep.memory.destination = null
        assessSources(thisCreep, mineablePositions)
      }
      if (thisCreep.memory.mission === "MINE") {
        thisCreep.say("⛏️ MINE")
        if (
          thisCreep.memory.objective == undefined ||
          thisCreep.memory.destination == undefined
        ) {
          thisCreep.memory.mission = "THINK"
        } else {
          // In the creep's memory, the objective and destination are stored as strings, so we have to convert them
          if (thisCreep.memory.objective == undefined) {
            console.log(
              `Attempting to call convertRoomPositionStringBackToRoomPositionObject with value ${thisCreep.memory.objective}`
            )
          }
          if (thisCreep.memory.destination == undefined) {
            console.log(
              `Attempting to call convertRoomPositionStringBackToRoomPositionObject with value ${thisCreep.memory.destination}`
            )
          }

          const sourcePosition =
            convertRoomPositionStringBackToRoomPositionObject(
              thisCreep.memory.objective
            )
          const destinationPosition =
            convertRoomPositionStringBackToRoomPositionObject(
              thisCreep.memory.destination
            )
          const sourceObjectAtObjective =
            sourcePosition.findClosestByRange(FIND_SOURCES_ACTIVE)
          /*
          if (
            thisCreep.harvest(sourceObjectAtObjective) < 0 &&
            thisCreep.harvest(sourceObjectAtObjective) !== ERR_NOT_IN_RANGE
          ) {
            // Think about it if our mining site is giving us an error, such as because it's empty
            thisCreep.memory.mission = "THINK"
          }*/
          if (
            sourceObjectAtObjective &&
            thisCreep.harvest(sourceObjectAtObjective) === ERR_NOT_IN_RANGE
          ) {
            /*if (destinationPosition.lookFor(LOOK_CREEPS).length > 0) {
              // Think about it if our mining site is occupied
              thisCreep.memory.mission = "THINK"
            }*/
            thisCreep.say("⛏️ MOVE")
            thisCreep.moveTo(destinationPosition, {
              visualizePathStyle: { stroke: "#ffaa00" }
            })
          }
        }
      }
      if (thisCreep.memory.mission === "EXPLORE") {
        thisCreep.say("⛏️ EXPLORE")
        // Occasionally think about it
        if (Game.time % 10 === 0) {
          thisCreep.memory.mission = "THINK"
        }
        actionExplore(thisCreep)
      }
    }
  }
}

export default roleMiner
