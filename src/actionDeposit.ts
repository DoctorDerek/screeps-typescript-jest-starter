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
  /** Nuestros amiguitos are always preferred to transfer to 🥳🦜*/
  const closestAmiguito = thisCreep.pos.findClosestByPath(FIND_MY_CREEPS, {
    filter: (creep) => {
      return (
        (creep.memory.role === "builder" ||
          creep.memory.role === "upgrader" ||
          creep.memory.role === "healer") &&
        creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      )
    }
  })
  const targetDropOffSite =
    closestAmiguito || thisCreep?.memory?.target === "container"
      ? closestContainer || closestExtension
      : closestExtension || closestContainer
  const emoji = closestAmiguito
    ? "🧑‍🤝‍🧑"
    : thisCreep?.memory?.target === "container"
    ? "📦"
    : "🔌"

  const isEmpty = thisCreep.store.getUsedCapacity() === 0
  if (targetDropOffSite != null && !isEmpty) {
    // There is somewhere to drop it off in the current room
    const result = thisCreep.transfer(targetDropOffSite, RESOURCE_ENERGY)
    if (result === OK) thisCreep.say(`${thisCreep.memory.emoji}${emoji}⤵️`)
    else if (result === ERR_NOT_IN_RANGE) {
      const moveResult = thisCreep.moveTo(targetDropOffSite, {
        visualizePathStyle: { stroke: "#ffffff" }
      })
      if (moveResult === OK) thisCreep.say(`${thisCreep.memory.emoji}⚡🚶‍➡️`)
      else thisCreep.say(`${thisCreep.memory.emoji}⚡${String(moveResult)}`)
    } else {
      thisCreep.say(`${thisCreep.memory.emoji}${emoji}${String(result)}`)
    }
  } else if (targetDropOffSite == null || isEmpty) {
    // Find the closest construction site
    let targetConstructionSite = thisCreep.pos.findClosestByPath(
      FIND_MY_CONSTRUCTION_SITES
    )
    if (targetConstructionSite != null) {
      // Drop it off by the construction site
      if (thisCreep.pos.getRangeTo(targetConstructionSite) > 3) {
        thisCreep.say(`${thisCreep.memory.emoji}🏗️🔛`)
        thisCreep.moveTo(targetConstructionSite, {
          visualizePathStyle: { stroke: "#ffffff" }
        })
      } else {
        thisCreep.say(`${thisCreep.memory.emoji}🏗️⤵️`)
        thisCreep.drop(RESOURCE_ENERGY)
        targetConstructionSite = null
      }
    } else if (targetConstructionSite == null) {
      // There is nowhere to drop it off in the current room
      // Move to within 5 tiles of the spawn. Then we drop it if all is full
      thisCreep.say(`${thisCreep.memory.emoji}🏡🔛`)
      thisCreep.moveTo(Game.spawns["Spawn1"].pos, {
        visualizePathStyle: { stroke: "#ffffff" }
      })
      if (
        thisCreep.room === Game.spawns["Spawn1"].room &&
        thisCreep.pos.getRangeTo(Game.spawns["Spawn1"].pos) < 3
      ) {
        thisCreep.say(`${thisCreep.memory.emoji}🏡⤵️`)
        console.log("Drop it! There are 0 available targets in the home room.")
        // There's an issue, so let's drop our resources and mosey on
        thisCreep.drop(RESOURCE_ENERGY)
      }
    }
  }
}

export default actionDeposit
