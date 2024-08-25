var actionExplore = require("actionExplore")

var roleDefender = {
  /** @param {Creep} thisCreep **/
  run: function (thisCreep) {
    const target = thisCreep.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
    if (target) {
      thisCreep.say("⚔️ attacking")
      if (thisCreep.attack(target) == ERR_NOT_IN_RANGE) {
        thisCreep.moveTo(target)
      }
    } else {
      actionExplore(thisCreep)
      // actionPatrol(thisCreep)
    }
  },
}

module.exports = roleDefender
