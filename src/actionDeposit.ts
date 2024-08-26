// var actionExplore = require("actionExplore")

import type { Fetcher } from "roleFetcher"
import type { Harvester } from "roleHarvester"

function actionDeposit(thisCreep: Harvester | Fetcher) {
  thisCreep.say("🚶 depositing")
  const targetDropOffSite = thisCreep.pos.findClosestByPath(
    FIND_MY_STRUCTURES,
    {
      //var targets = thisCreep.room.find(FIND_MY_STRUCTURES, {
      // var targets = Game.spawns["Spawn1"].room.find(FIND_MY_STRUCTURES, {
      filter: (structure) => {
        return (
          (structure.structureType == STRUCTURE_EXTENSION ||
            structure.structureType == STRUCTURE_SPAWN ||
            structure.structureType == STRUCTURE_TOWER ||
            // @ts-expect-error Containers are valid structures:
            structure.structureType == STRUCTURE_CONTAINER ||
            structure.structureType == STRUCTURE_STORAGE) &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        )
      }
    }
  )
  if (targetDropOffSite != null) {
    // There is somewhere to drop it off in the current room
    if (
      thisCreep.transfer(targetDropOffSite, RESOURCE_ENERGY) ===
      ERR_NOT_IN_RANGE
    ) {
      thisCreep.moveTo(targetDropOffSite, {
        visualizePathStyle: { stroke: "#ffffff" }
      })
    }
  } else {
    // There is nowhere to drop it off in the current room
    // Move to within 5 tiles of the spawn. Then we drop it if everything is full
    thisCreep.moveTo(Game.spawns["Spawn1"].pos, {
      visualizePathStyle: { stroke: "#ffffff" }
    })
    if (
      thisCreep.room === Game.spawns["Spawn1"].room &&
      thisCreep.pos.getRangeTo(Game.spawns["Spawn1"].pos) < 3
    ) {
      console.log("Drop it! There are 0 available targets in the home room.")
      thisCreep.say("DROP IT!")
      // There's an issue, so let's drop our resources and mosey on
      thisCreep.drop(RESOURCE_ENERGY)
    }
  }
}

export default actionDeposit
