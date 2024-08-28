import actionDeposit from "actionDeposit"
import actionExplore from "actionExplore"
import type { Harvester } from "roleHarvester"

function actionHarvest(creep: Harvester) {
  const freeCapacity = creep.store.getFreeCapacity()
  const isFull = freeCapacity === 0

  // Since harvesters conflict with miners so much I deprecated the sourceNumber
  if (!isFull) {
    const target = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
    if (target) {
      const result = creep.harvest(target)
      if (result == OK) creep.say(`${creep.memory.emoji}harvest`)
      if (result == ERR_NOT_IN_RANGE) {
        creep.say(`${creep.memory.emoji}move`)
        creep.moveTo(target)
      }
    } else if (!target) {
      actionExplore(creep)
    }
  } else if (isFull) {
    // Deposit if full
    creep.memory.destination = null
    actionDeposit(creep)
  }
}

export default actionHarvest
