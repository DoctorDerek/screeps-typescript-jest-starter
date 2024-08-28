import type { Fetcher } from "roleFetcher"
import type { Harvester } from "roleHarvester"
import type { Healer } from "roleHealer"

function actionDeposit(thisCreep: Harvester | Fetcher | Healer) {
  const closestContainer = thisCreep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (structure) =>
      (structure.structureType == STRUCTURE_CONTAINER ||
        structure.structureType == STRUCTURE_STORAGE) &&
      structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
  })
  const closestExtension = thisCreep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
    filter: (structure) => {
      return (
        (structure.structureType == STRUCTURE_EXTENSION ||
          structure.structureType == STRUCTURE_SPAWN ||
          structure.structureType == STRUCTURE_TOWER) &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      )
    }
  })
  /**
   * 50% chance of prioritizing container / storage *OR* spawn / extension /
   * tower to make sure that there is a good balance and not always preferring
   * one or the other
   * */
  if (thisCreep.memory.target == null) {
    if (Math.random() > 0.5) thisCreep.memory.target = "container"
    else thisCreep.memory.target = "extension"
  }
  const targetDropOffSite =
    thisCreep?.memory?.target === "container"
      ? closestContainer || closestExtension
      : closestExtension || closestContainer

  if (targetDropOffSite != null) {
    const result = thisCreep.transfer(targetDropOffSite, RESOURCE_ENERGY)
    // There is somewhere to drop it off in the current room
    if (result === ERR_NOT_IN_RANGE) {
      thisCreep.say(`${thisCreep.memory.emoji}movedrop`)
      thisCreep.moveTo(targetDropOffSite, {
        visualizePathStyle: { stroke: "#ffffff" }
      })
    } else {
      thisCreep.say(`${thisCreep.memory.emoji}dropoff`)
      thisCreep.transfer(targetDropOffSite, RESOURCE_ENERGY)
    }
  } else if (targetDropOffSite == null) {
    // Find the closest construction site
    let targetConstructionSite = thisCreep.pos.findClosestByPath(
      FIND_MY_CONSTRUCTION_SITES
    )
    if (targetConstructionSite != null) {
      // Drop it off by the construction site
      if (thisCreep.pos.getRangeTo(targetConstructionSite) > 3) {
        thisCreep.say(`${thisCreep.memory.emoji}movesite`)
        thisCreep.moveTo(targetConstructionSite, {
          visualizePathStyle: { stroke: "#ffffff" }
        })
      } else {
        thisCreep.say(`${thisCreep.memory.emoji}dropsite`)
        thisCreep.drop(RESOURCE_ENERGY)
        targetConstructionSite = null
      }
    } else if (targetConstructionSite == null) {
      // There is nowhere to drop it off in the current room
      // Move to within 5 tiles of the spawn. Then we drop it if all is full
      thisCreep.say(`${thisCreep.memory.emoji}movehome`)
      thisCreep.moveTo(Game.spawns["Spawn1"].pos, {
        visualizePathStyle: { stroke: "#ffffff" }
      })
      if (
        thisCreep.room === Game.spawns["Spawn1"].room &&
        thisCreep.pos.getRangeTo(Game.spawns["Spawn1"].pos) < 3
      ) {
        thisCreep.say(`${thisCreep.memory.emoji}drophome`)
        console.log("Drop it! There are 0 available targets in the home room.")
        // There's an issue, so let's drop our resources and mosey on
        thisCreep.drop(RESOURCE_ENERGY)
      }
    }
  }
}

export default actionDeposit
