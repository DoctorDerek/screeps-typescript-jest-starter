// var actionExplore = require("actionExplore")

import type { Builder } from "roleBuilder"
import type { Healer } from "roleHealer"
import type { Upgrader } from "roleUpgrader"

function actionFillUp(thisCreep: Builder | Upgrader | Healer) {
  // FIND_MY_STRUCTURES doesn't include containers, so I need FIND_STRUCTURES:
  const targetFillUpSite = thisCreep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (structure) =>
      (structure.structureType == STRUCTURE_CONTAINER ||
        structure.structureType == STRUCTURE_STORAGE ||
        structure.structureType == STRUCTURE_TERMINAL ||
        structure.structureType == STRUCTURE_LINK ||
        structure.structureType == STRUCTURE_TOWER ||
        structure.structureType == STRUCTURE_EXTENSION ||
        structure.structureType == STRUCTURE_SPAWN ||
        structure.structureType == STRUCTURE_POWER_SPAWN ||
        structure.structureType == STRUCTURE_NUKER ||
        structure.structureType == STRUCTURE_LAB ||
        structure.structureType == STRUCTURE_FACTORY) &&
      structure?.store?.getUsedCapacity(RESOURCE_ENERGY) >= 50
  })
  if (targetFillUpSite != null) {
    const result = thisCreep.withdraw(targetFillUpSite, RESOURCE_ENERGY)
    if (result === OK) thisCreep.say(`${thisCreep.memory.emoji}⚡⤴️`)
    if (result === ERR_NOT_IN_RANGE) {
      thisCreep.say(`${thisCreep.memory.emoji}⚡🙏`)
      thisCreep.moveTo(targetFillUpSite, {
        visualizePathStyle: { stroke: "#ffffff" }
      })
    }
  } else {
    // Maybe there are some dropped resources we can go grab
    const droppedResourceTarget = thisCreep.pos.findClosestByPath(
      FIND_DROPPED_RESOURCES,
      {
        filter: function (resource) {
          return resource.amount >= 0
        }
      }
    )

    if (droppedResourceTarget != null) {
      const result = thisCreep.pickup(droppedResourceTarget)
      if (result === OK) thisCreep.say(`${thisCreep.memory.emoji}🥀⤴️`)
      if (thisCreep.pickup(droppedResourceTarget) == ERR_NOT_IN_RANGE) {
        thisCreep.say(`${thisCreep.memory.emoji}🥀🙏`)
        thisCreep.moveTo(droppedResourceTarget, {
          visualizePathStyle: { stroke: "#ffaa00" }
        })
      }
    } else {
      thisCreep.say(`${thisCreep.memory.emoji}🥀⏸️`)
    }
  }
}

export default actionFillUp
