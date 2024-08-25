var actionDeposit = require("actionDeposit")
var actionExplore = require("actionExplore")

var roleFetcher = {
  /** @param {Creep} thisCreep **/
  run: function (thisCreep) {
    // This calculates the creep's carrying capacity by multiplying the number of
    // CARRY parts times the CARRY_CAPACITY per part, which is 50
    const carryingCapacity =
      thisCreep.body.filter((bodyPartObject) => bodyPartObject.type === CARRY)
        .length * CARRY_CAPACITY
    // If we have at least 50 resources (CARRY_CAPACITY), which is
    // the same as EXTENSION_ENERGY_CAPACITY[0] (i.e. 50 energy)

    // Ant-style: mark current position for a future road
    if (
      _.filter(
        thisCreep.pos.look(),
        (object) => object.type === "constructionSite"
      ).length === 0
    ) {
      thisCreep.room.createConstructionSite(thisCreep.pos, STRUCTURE_ROAD)
    }
    // Create a decay effect by occasionally wiping the room clean of pending roads
    if (Math.random < 0.01) {
      const pendingRoadSites = thisCreep.room.find(FIND_CONSTRUCTION_SITES, {
        filter: { structureType: STRUCTURE_ROAD }
      })
      for (const pendingRoadSite of pendingRoadSites) {
        pendingRoadSite.remove()
      }
    }

    // Only bring back full loads
    if (thisCreep.memory.mission === "DEPOSIT") {
      actionDeposit(thisCreep)
      if (thisCreep.store.getUsedCapacity() === 0) {
        // We can clear our marker of which structure we were filling
        thisCreep.memory.depositTargetNumber = null
        thisCreep.memory.mission = "PICK UP"
      }
    } else {
      if (thisCreep.store.getUsedCapacity() >= carryingCapacity) {
        // We can clear our marker of which resource we were gathering
        thisCreep.memory.droppedResourceNumber = null
        thisCreep.memory.objective = null
        // And go to to drop off resources
        thisCreep.memory.mission = "DEPOSIT"
      } else {
        /* TODO: Fix fetcher competition logic, based e.g. on miner logic
      // Get all the fetchers who have assigned objectives

      const fetcherDroppedTargets = fetchers.map(
        (creepName) => Game.creeps[creepName].memory.objective
      )
      // Top priority: Dropped resources
      // - that have at least our carrying capacity
      // - and that no other fetchers are assigned to
      const droppedResources = thisCreep.room.find(FIND_DROPPED_RESOURCES, {
        filter: function (resource) {
          return (
            resource.amount >= 1 * carryingCapacity &&
            !fetcherDroppedTargets.includes(String(resource.pos))
          )
        },
      })
      // TODO: assign a number of fetchers dynamically?
      */

        const fetchers = Object.keys(Game.creeps).filter(
          (creepName) =>
            Game.creeps[creepName].memory.role === "fetcher" &&
            Game.creeps[creepName].room === thisCreep.room &&
            creepName !== thisCreep.name
        )
        // Count other fetchers in the same room
        const targetResourceAmount = (fetchers.length * carryingCapacity) / 3
        // console.log(
        //   `${thisCreep.name} is seeking energy drops >= ${targetResourceAmount} in ${thisCreep.room}`
        // )
        const droppedResources = thisCreep.room.find(FIND_DROPPED_RESOURCES, {
          filter: function (resource) {
            return resource.amount >= targetResourceAmount
          }
        })
        // Only target resources that have at least that many times carryingCapacity

        /*const droppedResources = thisCreep.room.find(FIND_DROPPED_RESOURCES, {
          filter: function (resource) {
            return resource.amount >= 1 * carryingCapacity
          },
        })*/
        // Target 1x carryingCapacity, i.e. full loads only */

        if (droppedResources.length) {
          if (thisCreep.memory.droppedResourceNumber == null) {
            // Randomize current droppedResource assignment
            thisCreep.memory.droppedResourceNumber = Math.floor(
              Math.random() * droppedResources.length
            )
            // TODO Set objective: thisCreep.memory.objective = String(              droppedResources[thisCreep.memory.droppedResourceNumber].pos            )
            thisCreep.say("🔄 PICK UP")
            console.log(
              `${thisCreep.name} assigned to @droppedResources[${thisCreep.memory.droppedResourceNumber}]`
            )
          }
          if (
            thisCreep.pickup(
              droppedResources[thisCreep.memory.droppedResourceNumber]
            ) == ERR_NOT_IN_RANGE
          ) {
            thisCreep.moveTo(
              droppedResources[thisCreep.memory.droppedResourceNumber],
              {
                visualizePathStyle: { stroke: "#ffaa00" }
              }
            )
          }
          if (
            thisCreep.pickup(
              droppedResources[thisCreep.memory.droppedResourceNumber]
            ) == ERR_INVALID_TARGET
          ) {
            // Maybe we already picked it up, or someone else did
            thisCreep.memory.droppedResourceNumber = null
            thisCreep.memory.objective = null
          }
        } else {
          // Explore
          thisCreep.memory.mission = "EXPLORE"
          actionExplore(thisCreep)
          /*if (Math.random() < 1 / 50) {
          // 1 in 50
          thisCreep.memory.mission = null
          console.log(`${thisCreep.name} is going to check for resources`)
        }*/
        }
      }
    }
  }
}

module.exports = roleFetcher
