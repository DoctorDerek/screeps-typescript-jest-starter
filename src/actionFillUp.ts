// var actionExplore = require("actionExplore")

import type { Builder } from "roleBuilder"
import type { Healer } from "roleHealer"
import type { Upgrader } from "roleUpgrader"

function actionFillUp(thisCreep: Builder | Upgrader | Healer) {
  // FIND_MY_STRUCTURES doesn't include containers, so I need FIND_STRUCTURES:
  const targetFillUpSite = thisCreep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (structure) =>
      (structure.structureType == STRUCTURE_CONTAINER ||
        structure.structureType == STRUCTURE_STORAGE) &&
      structure.store.getUsedCapacity(RESOURCE_ENERGY) >= 50
  })
  if (targetFillUpSite != null) {
    const result = thisCreep.withdraw(targetFillUpSite, RESOURCE_ENERGY)
    // There is somewhere to fill up in the current room
    /*    console.log(
      `${thisCreep.name} attempting withdraw with result ${thisCreep.withdraw(
        targetFillUpSite,
        RESOURCE_ENERGY
      )}`
    )*/
    if (result === OK) thisCreep.say("🚶 WITHDRAW")
    if (result === ERR_NOT_IN_RANGE) {
      thisCreep.say("🚶 FILL UP")
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
      if (result === OK) thisCreep.say("🚶 PICKED")
      if (thisCreep.pickup(droppedResourceTarget) == ERR_NOT_IN_RANGE) {
        thisCreep.say("🚶 PICK UP")
        thisCreep.moveTo(droppedResourceTarget, {
          visualizePathStyle: { stroke: "#ffaa00" }
        })
      }
    } else {
      thisCreep.say("🚶 IDLE")
    }
  }
}

export default actionFillUp
