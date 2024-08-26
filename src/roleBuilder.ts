import actionFillUp from "actionFillUp"
import actionExplore from "actionExplore"

export interface Builder extends Creep {
  memory: BuilderMemory
}

interface BuilderMemory extends CreepMemory {
  building: boolean
  role: "builder"
  buildSiteNumber: number | null
  mission: "FILL UP" | "BUILD" | "EXPLORE"
  destination: string | null
}

const roleBuilder = {
  run: function (creep: Builder) {
    const isFull = creep.store.getFreeCapacity() === 0
    const isEmpty = creep.store[RESOURCE_ENERGY] === 0
    if (isEmpty) creep.memory.building = false
    if (!creep.memory.building && !isFull) {
      creep.memory.mission = "FILL UP"
      creep.say("🚧 FILL UP")
      actionFillUp(creep)
    }
    if (!creep.memory.building && isFull) {
      creep.memory.building = true
      creep.memory.mission = "BUILD"
      creep.say("🚧 build")
    }

    if ((creep.memory.building = true)) {
      creep.memory.mission = "BUILD"
      const buildSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
      if (buildSites.length) {
        creep.say("🚧 build")
        if (creep.memory.buildSiteNumber == null) {
          creep.memory.buildSiteNumber = Math.floor(
            Math.random() * buildSites.length
          )
          console.log(
            `${creep.name} assigned to @buildSites[${creep.memory.buildSiteNumber}]`
          )
        }
        if (
          creep.build(buildSites[creep.memory.buildSiteNumber]) ==
          ERR_NOT_IN_RANGE
        ) {
          creep.say("🚧 move")
          creep.moveTo(buildSites[creep.memory.buildSiteNumber], {
            visualizePathStyle: { stroke: "#ffffff" }
          })
        } else if (
          creep.build(buildSites[creep.memory.buildSiteNumber]) != OK
        ) {
          creep.say("🚧 error")
          // There was a different error
          console.log(
            `${creep.name} build error ${creep.build(
              buildSites[creep.memory.buildSiteNumber]
            )} when trying to build ${buildSites[creep.memory.buildSiteNumber]}`
          )
          creep.memory.buildSiteNumber = null
        }
      } else {
        creep.memory.mission = "EXPLORE"
        creep.memory.destination = null
        creep.memory.buildSiteNumber = null
        actionExplore(creep)
      }
    }
  }
}

export default roleBuilder
