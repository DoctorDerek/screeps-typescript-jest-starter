import actionFillUp from "actionFillUp"
import actionExplore from "actionExplore"
import type { Position } from "main"

export interface Builder extends Creep {
  memory: BuilderMemory
}

interface BuilderMemory extends CreepMemory {
  building: boolean
  role: "builder"
  buildSiteNumber: number | null
  mission: "FILL UP" | "BUILD" | "EXPLORE"
  destination: Position | null
  emoji: "🚧"
}

const roleBuilder = {
  run: function (creep: Builder) {
    const isFull = creep.store.getFreeCapacity() === 0
    const isEmpty = creep.store[RESOURCE_ENERGY] === 0
    if (isEmpty) creep.memory.building = false
    if (!creep.memory.building && !isFull) {
      creep.memory.mission = "FILL UP"
      actionFillUp(creep)
    }
    if (!creep.memory.building && isFull) {
      creep.memory.building = true
      creep.memory.mission = "BUILD"
      creep.say(`${creep.memory.emoji}full`)
    }

    if (creep.memory.building == true) {
      creep.memory.mission = "BUILD"
      const buildSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
      /** Buildings less than 50% HP are eligible for repair. */
      const potentialRepairSites = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => structure.hits / structure.hitsMax < 0.5
      })
      if (buildSites.length > 0) {
        creep.say(`${creep.memory.emoji}build`)
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
          creep.say(`${creep.memory.emoji}moveB`)
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
        creep.say(`${creep.memory.emoji}repair`)
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
          creep.say(`${creep.memory.emoji}moveR`)
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
