import actionExplore from "actionExplore"

export interface DefenderRanged extends Creep {
  memory: DefenderRangedMemory
}

interface DefenderRangedMemory extends CreepMemory {
  role: "defenderRanged"
  mission: null
  destination: string | null
}

const roleDefenderRanged = {
  run: function (thisCreep: DefenderRanged) {
    const target = thisCreep.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
    if (target) {
      thisCreep.say("⚔️ mass")
      // Check for hostile units within 3 tiles for ranged mass attack
      const targets = thisCreep.pos.findInRange(FIND_HOSTILE_CREEPS, 3)
      if (targets.length >= 1) thisCreep.rangedMassAttack()
      else if (targets.length === 0) {
        thisCreep.say("⚔️ hunt")
        if (thisCreep.rangedAttack(target) == ERR_NOT_IN_RANGE)
          thisCreep.moveTo(target)
      }
    } else if (!target) {
      actionExplore(thisCreep)
      // actionPatrol(thisCreep)
    }
  }
}

export default roleDefenderRanged
