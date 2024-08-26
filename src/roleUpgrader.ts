import actionFillUp from "actionFillUp"

export interface Upgrader extends Creep {
  memory: UpgraderMemory
}

interface UpgraderMemory extends CreepMemory {
  role: "Upgrader"
  upgrading: boolean
}

const roleUpgrader = {
  run: function (creep: Upgrader) {
    if (
      creep.memory.upgrading &&
      creep.store[RESOURCE_ENERGY] < creep.store.getCapacity()
    ) {
      creep.memory.upgrading = false
      creep.say("⚡ pick up")
    }
    if (!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
      creep.memory.upgrading = true
      creep.say("⚡ upgrade")
    }

    if (creep.memory.upgrading) {
      if (
        creep.room.controller &&
        creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE
      ) {
        creep.moveTo(creep.room.controller, {
          visualizePathStyle: { stroke: "#ffffff" }
        })
      }
    } else {
      actionFillUp(creep)
    }
  }
}

export default roleUpgrader
