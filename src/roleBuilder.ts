import actionFillUp from "actionFillUp"
import actionExplore from "actionExplore"
import type { Position } from "main"
import parseDestination from "parseDestination"
import actionMoveToDestination from "actionMoveToDestination"

export interface Builder extends Creep {
  memory: BuilderMemory
}

interface BuilderMemory extends CreepMemory {
  role: "builder"
  mission: "FILL UP" | "BUILD" | "EXPLORE" | "THINK"
  destination: Position | null
  emoji: "🚧"
}

const roleBuilder = {
  run: function (creep: Builder) {
    const isFull = creep.store.getFreeCapacity() === 0
    const isEmpty = creep.store[RESOURCE_ENERGY] === 0
    if (isEmpty || !creep?.memory?.mission || creep.memory.mission === "THINK")
      creep.memory.mission = "FILL UP"
    if (creep.memory.mission === "FILL UP" && !isFull) {
      creep.memory.mission = "FILL UP"
      actionFillUp(creep)
    }
    if (creep.memory.mission === "FILL UP" && isFull) {
      creep.memory.mission = "BUILD"
      creep.say(`${creep.memory.emoji}full`)
    }
    if (creep.memory.mission === "BUILD") {
      if (creep?.memory?.destination == null) {
        // Find the closest construction site
        const buildSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
        const buildSitesPositions = buildSites.map((site) => site.pos)
        const closestSitePos = creep.pos.findClosestByPath(buildSitesPositions)
        const closestSiteString = String(closestSitePos) as Position
        /** Buildings less than 50% HP are eligible for repair. */
        const potentialRepairSites = creep.room.find(FIND_STRUCTURES, {
          filter: (structure) => structure.hits / structure.hitsMax < 0.5
        })
        const repairSitesPositions = potentialRepairSites.map(
          (site) => site.pos
        )
        const closestRepairSite =
          creep.pos.findClosestByPath(repairSitesPositions)
        const closestRepairSiteString = String(closestRepairSite) as Position
        if (buildSites.length > 0 && closestSitePos) {
          creep.say(`${creep.memory.emoji}assignB`)
          creep.memory.destination = closestSiteString
          console.log(`${creep.name} assigned to build ${closestSiteString}`)
        } else if (potentialRepairSites.length > 0) {
          creep.say(`${creep.memory.emoji}assignR`)
          creep.memory.destination = closestRepairSiteString
          console.log(`${creep.name} assigned to build ${closestSiteString}`)
        } else if (
          buildSites.length === 0 &&
          potentialRepairSites.length === 0
        ) {
          // Fall back to explore; unlikely to happen for builders / upgraders.
          creep.memory.mission = "EXPLORE"
          creep.memory.destination = null
        }
      }
      if (creep.memory.destination) {
        // I have a destination to build or repair assigned already.
        const { roomName, x, y } = parseDestination(creep)
        if (!(roomName && x && y)) {
          creep.memory.destination = null
          creep.memory.mission = "THINK"
          return
        }
        const closestSite = creep.room.lookForAt(
          LOOK_CONSTRUCTION_SITES,
          new RoomPosition(x, y, roomName)
        )?.[0]
        let closestRepair: Structure | null = creep.room.lookForAt(
          LOOK_STRUCTURES,
          new RoomPosition(x, y, roomName)
        )?.[0]
        // Make sure building is <50% HP
        if (closestRepair?.hits / closestRepair?.hitsMax > 0.5)
          closestRepair = null
        if (!(closestSite || closestRepair)) {
          creep.memory.destination = null
          creep.memory.mission = "THINK"
          return
        }
        const isRepair =
          (closestRepair?.hits || 0) < (closestRepair?.hitsMax || 0)
        const isBuild = closestSite
        if (isBuild && closestSite) {
          const result = creep.build(closestSite)
          if (result === OK) creep.say(`${creep.memory.emoji}build`)
          else if (result == ERR_NOT_IN_RANGE) {
            creep.say(`${creep.memory.emoji}moveB`)
            actionMoveToDestination(creep)
          } else if (creep.build(closestSite) != OK) {
            // There was a different error
            creep.say(`${creep.memory.emoji}errorB`)
            creep.memory.destination = null
            creep.memory.mission = "THINK"
          }
        } else if (isRepair && closestRepair) {
          const result = creep.repair(closestRepair)
          if (result === OK) creep.say(`${creep.memory.emoji}repair`)
          else if (result === ERR_NOT_IN_RANGE) {
            creep.say(`${creep.memory.emoji}moveR`)
            actionMoveToDestination(creep)
          } else if (creep.repair(closestRepair) != OK) {
            // There was a different error
            creep.say(`${creep.memory.emoji}errorR`)
            creep.memory.destination = null
            creep.memory.mission = "THINK"
          }
        }
      }
    }
    if (creep.memory.mission === "EXPLORE") actionExplore(creep)
  }
}

export default roleBuilder
