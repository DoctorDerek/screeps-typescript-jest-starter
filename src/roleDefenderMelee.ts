import actionExplore from "actionExplore"
import type { Position } from "main"

export interface DefenderMelee extends Creep {
  memory: DefenderMeleeMemory
}

interface DefenderMeleeMemory extends CreepMemory {
  role: "defenderMelee"
  mission: null
  destination: Position | null
  /** Once `overwhelmingForce` triggers, fury means a fight to the death. */
  fury: boolean
  emoji: "⚔️"
}

const roleDefenderMelee = {
  run: function (thisCreep: DefenderMelee, overwhelmingForce: boolean) {
    const fury = thisCreep.memory.fury
    if (!overwhelmingForce) {
      thisCreep.say(`${thisCreep.memory.emoji}rally`)
      // Go to the rally point in the center of the room
      const x = 23 + Math.floor(Math.random() * 5)
      const y = 23 + Math.floor(Math.random() * 5)
      thisCreep.moveTo(new RoomPosition(x, y, thisCreep.room.name))
      return
    } else if (fury || overwhelmingForce) {
      thisCreep.memory.fury = true
      const target = thisCreep.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
      if (target) {
        thisCreep.say(`${thisCreep.memory.emoji}melee`)
        if (thisCreep.attack(target) == ERR_NOT_IN_RANGE) {
          thisCreep.say(`${thisCreep.memory.emoji}hunt`)
          thisCreep.moveTo(target)
        }
      } else if (!target) {
        actionExplore(thisCreep)
        // actionPatrol(thisCreep)
      }
    }
  }
}

export default roleDefenderMelee
