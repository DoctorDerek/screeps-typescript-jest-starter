import actionDeposit from "actionDeposit"
import type { Harvester } from "roleHarvester"

function actionHarvest(creep: Harvester) {
  if (creep.store.getFreeCapacity() > 0) {
    // Go harvest active resources
    const sources = creep.room.find(FIND_SOURCES_ACTIVE)
    if (creep.memory.sourceNumber == null) {
      // Randomize current source assignment
      creep.memory.sourceNumber = Math.floor(Math.random() * sources.length)
      creep.say("🔄 harvest")
      console.log(
        `${creep.name} assigned to @sources[${creep.memory.sourceNumber}]`
      )
    }
    if (creep.harvest(sources[creep.memory.sourceNumber]) == ERR_NOT_IN_RANGE) {
      creep.moveTo(sources[creep.memory.sourceNumber], {
        visualizePathStyle: { stroke: "#ffaa00" }
      })
    }
    if (creep.harvest(sources[creep.memory.sourceNumber]) === OK) {
      // Log destination while harvesting
      creep.memory.destination = { x: creep.pos.x, y: creep.pos.y }
    }
  } else {
    creep.memory.destination = null
    actionDeposit(creep)
  }
}

export default actionHarvest
