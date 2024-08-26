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
  run: function (thisCreep: DefenderRanged, overwhelmingForce: boolean) {
    if (!overwhelmingForce) {
      thisCreep.say("🏹️ rally")
      // Go to the rally point in the center of the room
      const x = 23 + Math.floor(Math.random() * 5)
      const y = 23 + Math.floor(Math.random() * 5)
      thisCreep.moveTo(new RoomPosition(x, y, thisCreep.room.name))
      return
    } else if (overwhelmingForce) {
      // Check for hostile units within 3 tiles for ranged mass attack
      const targets = thisCreep.pos.findInRange(FIND_HOSTILE_CREEPS, 3)
      if (targets.length >= 1) {
        thisCreep.rangedMassAttack()
        thisCreep.say("🏹️ mass")
        return
      }
      const target = thisCreep.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
      if (target) {
        thisCreep.say("🏹️ ranged")
        if (thisCreep.rangedAttack(target) == ERR_NOT_IN_RANGE) {
          thisCreep.say("🏹️ hunt")
          thisCreep.moveTo(target)
        }
      } else if (!target) {
        actionExplore(thisCreep)
        // actionPatrol(thisCreep)
      }
    }
  }
}

export default roleDefenderRanged
