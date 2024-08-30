import actionDeposit from "actionDeposit"
import actionExplore from "actionExplore"
import type { RoomName } from "main"
import type { Harvester } from "roleHarvester"

function actionHarvest(creep: Harvester, totalCreeps: number) {
  const freeCapacity = creep.store.getFreeCapacity()
  const isFull = freeCapacity === 0
  const isEmpty = freeCapacity === creep.store.getCapacity()

  if (
    isEmpty ||
    !creep?.memory?.mission ||
    creep.memory.mission === "PICK UP" ||
    creep.memory.mission === "THINK"
  ) {
    if (!isFull) {
      /**
       * If there are at least 10 creeps, harvesters shouldn't harvest in the
       * home room, because they end up sticking around and blocking miners.
       * */
      const homeRoomName = Game.spawns["Spawn1"].room.name as RoomName
      const creepRoomName = creep.room.name as RoomName
      if (totalCreeps >= 10 && creepRoomName === homeRoomName) {
        creep.memory.mission = "EXPLORE"
      } else {
        const target = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
        if (target) {
          const result = creep.harvest(target)
          if (result == OK) creep.say(`${creep.memory.emoji}🌾👨‍🌾`)
          if (result == ERR_NOT_IN_RANGE) {
            creep.say(`${creep.memory.emoji}🌾🧺`)
            const moveResult = creep.moveTo(target, {
              visualizePathStyle: { stroke: "#FCE850" }
            })
            if (moveResult == ERR_NO_PATH) creep.memory.mission = "EXPLORE"
          }
          if (result == ERR_NOT_ENOUGH_RESOURCES)
            creep.memory.mission = "EXPLORE"
        }
        if (!target) creep.memory.mission = "EXPLORE"
      }
    } else if (isFull) {
      // Deposit if full
      creep.memory.destination = null
      creep.memory.mission = "DEPOSIT"
    }
  }
  if (creep.memory.mission === "DEPOSIT") {
    actionDeposit(creep)
    if (isEmpty) creep.memory.mission = "PICK UP"
  }
  if (creep.memory.mission === "EXPLORE") actionExplore(creep)
}

export default actionHarvest
