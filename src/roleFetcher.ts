import actionDeposit from "actionDeposit"
import actionExplore from "actionExplore"
import type { Position } from "main"

export interface Fetcher extends Creep {
  memory: FetcherMemory
}

interface FetcherMemory extends CreepMemory {
  role: "fetcher"
  mission: "PICK UP" | "DEPOSIT" | "EXPLORE"
  destination: Position | null
  depositTargetNumber: number | null
  droppedResourceNumber: number | null
  objective: string | null
  target: "container" | "extension" | null
}

const roleFetcher = {
  run: function (
    thisCreep: Fetcher,
    droppedResources: Resource[],
    containers: StructureContainer[]
  ) {
    // This calculates the creep's carrying capacity by multiplying the number of
    // CARRY parts times the CARRY_CAPACITY per part, which is 50
    const carryingCapacity =
      thisCreep.body.filter((bodyPartObject) => bodyPartObject.type === CARRY)
        .length * CARRY_CAPACITY
    // If we have at least 50 resources (CARRY_CAPACITY), which is
    // the same as EXTENSION_ENERGY_CAPACITY[0] (i.e. 50 energy)

    // Only bring back full loads
    if (thisCreep.memory.mission === "DEPOSIT") {
      actionDeposit(thisCreep)
      if (thisCreep.store.getUsedCapacity() === 0) {
        // We can clear our marker of which structure we were filling
        thisCreep.memory.depositTargetNumber = null
        thisCreep.memory.mission = "PICK UP"
      }
    } else if (
      !thisCreep?.memory.mission ||
      thisCreep.memory.mission === "PICK UP"
    ) {
      const isFull = thisCreep.store.getUsedCapacity() >= carryingCapacity
      if (isFull) {
        // We can clear our marker of which resource we were gathering
        thisCreep.memory.droppedResourceNumber = null
        thisCreep.memory.objective = null
        // And go to to drop off resources
        thisCreep.memory.mission = "DEPOSIT"
      } else {
        // Fetch dropped resources priority over container resources

        if (droppedResources.length) {
          if (thisCreep.memory.droppedResourceNumber == null) {
            // Decide on current droppedResource assignment by dividing
            // the square of dropped resources by the distance to them:
            let bestIndex = 0
            const bestResource = droppedResources.reduce((a, b) => {
              const aDistance = thisCreep.pos.getRangeTo(a)
              const bDistance = thisCreep.pos.getRangeTo(b)
              if (
                Math.pow(a.amount, 2) / aDistance >
                Math.pow(b.amount, 2) / bDistance
              ) {
                bestIndex = droppedResources.indexOf(a)
                return a
              } else {
                bestIndex = droppedResources.indexOf(b)
                return b
              }
            })
            thisCreep.memory.droppedResourceNumber = bestIndex
            // TODO Set objective:
            // thisCreep.memory.objective = String(droppedResources[thisCreep.memory.droppedResourceNumber].pos)
            thisCreep.say(`🛍️ ${bestResource.amount}`)
            console.log(
              `${thisCreep.name} assigned to @droppedResources[${thisCreep.memory.droppedResourceNumber}]`
            )
            console.log(
              `${bestResource.amount} dropped resources at ${
                bestResource.pos.x
              },${
                bestResource.pos.y
              } with a distance of ${thisCreep.pos.getRangeTo(bestResource)}`
            )
          }
          if (
            thisCreep.pickup(
              droppedResources[thisCreep.memory.droppedResourceNumber]
            ) == ERR_NOT_IN_RANGE
          ) {
            thisCreep.say(`🛍️ moveDrop`)
            thisCreep.moveTo(
              droppedResources[thisCreep.memory.droppedResourceNumber],
              { visualizePathStyle: { stroke: "#ffaa00" } }
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
        } else if (containers.length > 0) {
          if (thisCreep.memory.depositTargetNumber == null) {
            // Decide on current container assignment by dividing
            // the amount of container resources by the distance to them:
            let bestIndex = 0
            const bestContainer = containers.reduce((a, b) => {
              const aDistance = thisCreep.pos.getRangeTo(a)
              const bDistance = thisCreep.pos.getRangeTo(b)
              if (
                a.store.getUsedCapacity() / aDistance >
                b.store.getUsedCapacity() / bDistance
              ) {
                bestIndex = containers.indexOf(a)
                return a
              } else {
                bestIndex = containers.indexOf(b)
                return b
              }
            })
            thisCreep.memory.depositTargetNumber = bestIndex
            thisCreep.say(`🛍️ ${bestContainer.store.getUsedCapacity()}`)
            console.log(
              `${thisCreep.name} assigned to @containers[${thisCreep.memory.depositTargetNumber}]`
            )
            console.log(
              `${bestContainer.store.getUsedCapacity()} container resources at ${
                bestContainer.pos.x
              },${
                bestContainer.pos.y
              } with a distance of ${thisCreep.pos.getRangeTo(bestContainer)}`
            )
          }
          if (
            thisCreep.withdraw(
              containers[thisCreep.memory.depositTargetNumber],
              RESOURCE_ENERGY
            ) == ERR_NOT_IN_RANGE
          ) {
            thisCreep.say(`🛍️ moveCont`)
            thisCreep.moveTo(containers[thisCreep.memory.depositTargetNumber], {
              visualizePathStyle: { stroke: "#ffaa00" }
            })
          }
          if (
            thisCreep.withdraw(
              containers[thisCreep.memory.depositTargetNumber],
              RESOURCE_ENERGY
            ) == ERR_INVALID_TARGET
          ) {
            // Maybe we already picked it up, or someone else did
            thisCreep.memory.depositTargetNumber = null
          }
        } else {
          // Explore
          thisCreep.memory.mission = "EXPLORE"
          actionExplore(thisCreep)
          console.log(`${thisCreep.name} is going to check for resources`)
        }
      }
    }
  }
}

export default roleFetcher
