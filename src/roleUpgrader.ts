import actionFillUp from "actionFillUp"

export interface Upgrader extends Creep {
  memory: UpgraderMemory
}

interface UpgraderMemory extends CreepMemory {
  role: "upgrader"
  upgrading: boolean
}

const roleUpgrader = {
  run: function (creep: Upgrader) {
    const isFull = creep.store.getFreeCapacity() === 0
    const isEmpty = creep.store[RESOURCE_ENERGY] === 0
    if (isEmpty) creep.memory.upgrading = false
    if (!creep.memory.upgrading && !isFull) {
      actionFillUp(creep)
      creep.say("⚡ pick up")
    }
    if (!creep.memory.upgrading && isFull) {
      creep.memory.upgrading = true
      creep.say("⚡ upgrade")
    }

    if (
      creep.memory.upgrading &&
      creep.room.controller &&
      creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE
    )
      creep.moveTo(creep.room.controller, {
        visualizePathStyle: { stroke: "#ffffff" }
      })
  }
}

export default roleUpgrader
