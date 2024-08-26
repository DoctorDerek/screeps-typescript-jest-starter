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
      creep.say("🚧 full")
    }

    if (creep.memory.building == true) {
      creep.memory.mission = "BUILD"
      const buildSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
      const potentialRepairSites = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => structure.hits < structure.hitsMax
      })
      if (buildSites.length > 0) {
        creep.say("🚧 build")
        if (creep.memory.buildSiteNumber == null) {
          // Find the closest construction site
          let closestIndex = 0
          const closestSite = buildSites.reduce((prev, current) => {
            if (creep.pos.getRangeTo(prev) < creep.pos.getRangeTo(current)) {
              closestIndex = buildSites.indexOf(prev)
              return prev
            }
            closestIndex = buildSites.indexOf(current)
            return current
          })
          creep.memory.buildSiteNumber = closestIndex
          console.log(
            `${creep.name} assigned to @buildSites[${creep.memory.buildSiteNumber}]`
          )
          console.log(
            `builder moving to ${closestSite.pos.x}, ${
              closestSite.pos.y
            } at distance of ${creep.pos.getRangeTo(closestSite)}`
          )
        }
        if (
          creep.build(buildSites[creep.memory.buildSiteNumber]) ==
          ERR_NOT_IN_RANGE
        ) {
          creep.say("🚧 moveR")
          creep.moveTo(buildSites[creep.memory.buildSiteNumber], {
            visualizePathStyle: { stroke: "#ffffff" }
          })
          return
        } else if (
          creep.build(buildSites[creep.memory.buildSiteNumber]) != OK
        ) {
          // There was a different error
          console.log(
            `${creep.name} build error ${creep.build(
              buildSites[creep.memory.buildSiteNumber]
            )} when trying to build ${buildSites[creep.memory.buildSiteNumber]}`
          )
          creep.memory.buildSiteNumber = null
        }
      } else if (potentialRepairSites.length > 0) {
        creep.say("🚧 repair")
        let closestIndex = 0
        const closestSite = potentialRepairSites.reduce((prev, current) => {
          if (creep.pos.getRangeTo(prev) < creep.pos.getRangeTo(current)) {
            closestIndex = potentialRepairSites.indexOf(prev)
            return prev
          }
          closestIndex = potentialRepairSites.indexOf(current)
          return current
        })
        console.log(
          `builder moving to ${closestSite.pos.x}, ${
            closestSite.pos.y
          } at distance of ${creep.pos.getRangeTo(closestSite)}`
        )
        if (
          creep.repair(potentialRepairSites[closestIndex]) == ERR_NOT_IN_RANGE
        ) {
          creep.say("🚧 moveR")
          creep.moveTo(potentialRepairSites[closestIndex], {
            visualizePathStyle: { stroke: "#ffffff" }
          })
          return
        } else if (creep.repair(potentialRepairSites[closestIndex]) != OK) {
          // There was a different error
          console.log(
            `${creep.name} repair error ${creep.repair(
              potentialRepairSites[closestIndex]
            )} when trying to repair ${closestSite.structureType} at ${
              closestSite.pos.x
            }, ${closestSite.pos.y}`
          )
        }
      } else if (buildSites.length === 0 && potentialRepairSites.length === 0) {
        // Fall back to explore mission
        creep.memory.mission = "EXPLORE"
        creep.memory.destination = null
        creep.memory.buildSiteNumber = null
        actionExplore(creep)
      }
    }
  }
}

export default roleBuilder
