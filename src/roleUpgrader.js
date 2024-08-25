const actionFillUp = require("actionFillUp")

const roleUpgrader = {
  /** @param {Creep} creep **/
  run: function (creep) {
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
      if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller, {
          visualizePathStyle: { stroke: "#ffffff" }
        })
      }
    } else {
      actionFillUp(creep)
    }
  }
}

module.exports = roleUpgrader
