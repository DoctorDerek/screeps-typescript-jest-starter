import actionDeposit from "actionDeposit"
import type { Harvester } from "roleHarvester"

function actionHarvest(creep: Harvester, harvesters: Harvester[]) {
  const freeCapacity = creep.store.getFreeCapacity()
  const hasRoom = freeCapacity > 0
  const isFull = freeCapacity === 0
  let sources = creep.room.find(FIND_SOURCES_ACTIVE)
  // .filter((source) => source.energy > 0)
  if (hasRoom && creep.memory.sourceNumber == null) {
    // Go harvest active resources
    // Grab the used sourceNumbers (indices) from the other harvesters
    const usedSourceNumbers = harvesters
      .filter((harvester) => harvester.memory.sourceNumber != null)
      .map((harvester) => harvester.memory.sourceNumber)

    // Sort sources by distance from this creep
    sources = sources.sort(
      (a, b) =>
        creep.pos.getRangeTo(a.pos.x, a.pos.y) -
        creep.pos.getRangeTo(b.pos.x, b.pos.y)
    )

    // Assign an unused source to this creep
    creep.memory.sourceNumber =
      [...Array(sources.length).keys()].find(
        (sourceNumber) =>
          !usedSourceNumbers.includes(sourceNumber) &&
          creep.pos.findPathTo(sources[sourceNumber]) != null
      ) || 0

    creep.say("🌾 assign")
    console.log(
      `🌾 assign: ${creep.name} assigned to @sources[${creep.memory.sourceNumber}]`
    )
  }

  if (hasRoom && creep.memory.sourceNumber != null) {
    if (creep.harvest(sources[creep.memory.sourceNumber]) == ERR_NOT_IN_RANGE) {
      creep.say("🌾 move")
      if (
        creep.moveTo(sources[creep.memory.sourceNumber], {
          visualizePathStyle: { stroke: "#ffaa00" }
        }) != OK
      )
        creep.memory.sourceNumber = null // Maybe I can't reach it? ERR_NO_PATH?
    }
    if (creep.harvest(sources[creep.memory.sourceNumber || 0]) === OK) {
      // Log destination while harvesting
      creep.memory.destination = { x: creep.pos.x, y: creep.pos.y }
      creep.say("🌾 harvest")
    }
  }

  if (isFull) {
    // Deposit if full
    creep.memory.destination = null
    creep.say("🌾 deposit")
    actionDeposit(creep)
  }
}

export default actionHarvest
