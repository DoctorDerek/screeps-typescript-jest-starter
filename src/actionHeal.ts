import actionDeposit from "actionDeposit"
import actionFillUp from "actionFillUp"
import type { Healer } from "roleHealer"

function actionHeal(creep: Healer, creepsToHeal: Creep[]) {
  // Try to heal the closest damaged friendly creep
  const target = creepsToHeal.reduce((acc, current) => {
    const isHurt = current.hits < current.hitsMax
    if (acc === null) return current
    const isCloser = creep.pos.getRangeTo(current) < creep.pos.getRangeTo(acc)
    if (isHurt && isCloser) return current
    if (isHurt && !isCloser) return acc
    if (!isHurt) return acc
    return current
  })
  if (target) {
    const isSelf = creep.id === target.id
    if (isSelf) creep.say("🏥 self")
    if (!isSelf) creep.say("🏥 heal")
    if (creep.heal(target) === ERR_NOT_IN_RANGE) {
      creep.say("🏥 move")
      creep.moveTo(target, { visualizePathStyle: { stroke: "#33ff00" } })
    }
  } else {
    // If there are no damaged creeps, fill up resources
    const freeCapacity = creep.store.getFreeCapacity()
    const hasRoom = freeCapacity > 0
    const isFull = freeCapacity === 0
    if (hasRoom) actionFillUp(creep)
    if (isFull) actionDeposit(creep)
  }
}

export default actionHeal
