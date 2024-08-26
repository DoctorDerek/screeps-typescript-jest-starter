import type { Fetcher } from "roleFetcher"
import type { Harvester } from "roleHarvester"
import type { Healer } from "roleHealer"

function actionDeposit(thisCreep: Harvester | Fetcher | Healer) {
  const targetDropOffSite = thisCreep.pos.findClosestByPath(
    FIND_MY_STRUCTURES,
    {
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
  } else if (targetDropOffSite == null) {
    // Find the closest construction site
    let targetConstructionSite = thisCreep.pos.findClosestByPath(
      FIND_MY_CONSTRUCTION_SITES
    )
    if (targetConstructionSite != null) {
      // Drop it off by the construction site
      if (thisCreep.pos.getRangeTo(targetConstructionSite) > 3) {
        thisCreep.moveTo(targetConstructionSite, {
          visualizePathStyle: { stroke: "#ffffff" }
        })
      } else {
        thisCreep.drop(RESOURCE_ENERGY)
        targetConstructionSite = null
      }
    } else if (targetConstructionSite == null) {
      // There is nowhere to drop it off in the current room
      // Move to within 5 tiles of the spawn. Then we drop it if all is full
      thisCreep.moveTo(Game.spawns["Spawn1"].pos, {
        visualizePathStyle: { stroke: "#ffffff" }
      })
      if (
        thisCreep.room === Game.spawns["Spawn1"].room &&
        thisCreep.pos.getRangeTo(Game.spawns["Spawn1"].pos) < 3
      ) {
        console.log("Drop it! There are 0 available targets in the home room.")
        // There's an issue, so let's drop our resources and mosey on
        thisCreep.drop(RESOURCE_ENERGY)
      }
    }
  }
}

export default actionDeposit
