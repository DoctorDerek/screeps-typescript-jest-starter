import actionFillUp from "actionFillUp"

export interface Upgrader extends Creep {
  memory: UpgraderMemory
}

interface UpgraderMemory extends CreepMemory {
  role: "upgrader"
  upgrading: boolean
  emoji: "⚡"
}

const roleUpgrader = {
  run: function (creep: Upgrader) {
    const isFull = creep.store.getFreeCapacity() === 0
    const isEmpty = creep.store[RESOURCE_ENERGY] === 0
    if (isEmpty) creep.memory.upgrading = false
    if (!creep.memory.upgrading && !isFull) {
      actionFillUp(creep)
    }
    if (!creep.memory.upgrading && isFull) {
      creep.memory.upgrading = true
    }
    if (!creep.room.controller) {
      creep.say(`${creep.memory.emoji}error`)
      return
    }
    const result = creep.upgradeController(creep.room.controller)
    if (result === OK) creep.say(`${creep.memory.emoji}upgrade`)
    if (
      creep.memory.upgrading &&
      creep.room.controller &&
      result == ERR_NOT_IN_RANGE
    ) {
      creep.say(`${creep.memory.emoji}move`)
      creep.moveTo(creep.room.controller, {
        visualizePathStyle: { stroke: "#ffffff" }
      })
    }
  }
}

export default roleUpgrader
