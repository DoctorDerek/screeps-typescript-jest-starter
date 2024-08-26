import actionExplore from "actionExplore"

export interface DefenderMelee extends Creep {
  memory: DefenderMeleeMemory
}

interface DefenderMeleeMemory extends CreepMemory {
  role: "defenderMelee"
  mission: null
  destination: string | null
}

const roleDefenderMelee = {
  run: function (thisCreep: DefenderMelee) {
    const target = thisCreep.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
    if (target) {
      thisCreep.say("⚔️ attack")
      if (thisCreep.attack(target) == ERR_NOT_IN_RANGE) {
        thisCreep.say("⚔️ hunt")
        thisCreep.moveTo(target)
      }
    } else if (!target) {
      actionExplore(thisCreep)
      // actionPatrol(thisCreep)
    }
  }
}

export default roleDefenderMelee
