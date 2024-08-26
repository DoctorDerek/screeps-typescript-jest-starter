import actionExplore from "actionExplore"

export interface DefenderMelee extends Creep {
  memory: DefenderMeleeMemory
}

interface DefenderMeleeMemory extends CreepMemory {
  role: "defenderMelee"
  mission: null
  destination: string | null
  /** Once `overwhelmingForce` triggers, fury means a fight to the death. */
  fury: boolean
}

const roleDefenderMelee = {
  run: function (thisCreep: DefenderMelee, overwhelmingForce: boolean) {
    const fury = thisCreep.memory.fury
    if (!overwhelmingForce) {
      thisCreep.say("⚔️ rally")
      // Go to the rally point in the center of the room
      const x = 23 + Math.floor(Math.random() * 5)
      const y = 23 + Math.floor(Math.random() * 5)
      thisCreep.moveTo(new RoomPosition(x, y, thisCreep.room.name))
      return
    } else if (fury || overwhelmingForce) {
      thisCreep.memory.fury = true
      const target = thisCreep.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
      if (target) {
        thisCreep.say("⚔️ melee")
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
}

export default roleDefenderMelee
