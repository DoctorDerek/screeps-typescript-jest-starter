import actionExplore from "actionExplore"

export interface Defender extends Creep {
  memory: DefenderMemory
}

interface DefenderMemory extends CreepMemory {
  role: "defender"
  mission: null
  destination: string | null
}

const roleDefender = {
  /** @param {Creep} thisCreep **/
  run: function (thisCreep: Defender) {
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
  }
}

export default roleDefender
