import actionDeposit from "actionDeposit"
import actionExplore from "actionExplore"
import actionMoveToDestination from "actionMoveToDestination"
import findBestDroppedResources from "findBestDroppedResources"
import type { Position } from "main"
import parseDestination from "parseDestination"

export interface Fetcher extends Creep {
  memory: FetcherMemory
}

interface FetcherMemory extends CreepMemory {
  role: "fetcher"
  mission: "PICK UP" | "DEPOSIT" | "EXPLORE" | "THINK"
  destination: Position | null
  depositTargetNumber: number | null
  target: "container" | "extension" | null
  emoji: "🛍️"
}

const roleFetcher = {
  run: function (thisCreep: Fetcher, droppedResources: Resource[]) {
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
      !thisCreep?.memory?.mission ||
      thisCreep.memory.mission === "PICK UP" ||
      thisCreep.memory.mission === "THINK"
    ) {
      const isFull = thisCreep.store.getUsedCapacity() >= carryingCapacity
      if (isFull) {
        // We can clear our marker of which resource we were gathering
        thisCreep.memory.destination = null
        // And go to to drop off resources
        thisCreep.memory.mission = "DEPOSIT"
      } else {
        // Fetch dropped resources priority over container resources
        if (thisCreep.memory.destination) {
          const { roomName, x, y } = parseDestination(thisCreep)
          if (!roomName || !x || !y) {
            thisCreep.memory.mission = "EXPLORE"
            return
          }
          // Try to pick up if I'm at the destination (within range 1)
          if (
            thisCreep.pos.roomName === roomName &&
            thisCreep.pos.x >= x - 1 &&
            thisCreep.pos.x <= x + 1 &&
            thisCreep.pos.y >= y - 1 &&
            thisCreep.pos.y <= y + 1
          ) {
            // In the creep's memory, the objective and destination are stored as strings, so I have to convert them
            const droppedResourcePosition = new RoomPosition(x, y, roomName)
            if (!droppedResourcePosition) {
              // Shouldn't happen, but if it does, think about it
              thisCreep.memory.mission = "EXPLORE"
              return
            }
            const result = thisCreep.pickup(
              droppedResourcePosition.lookFor(LOOK_ENERGY)[0]
            )
            if (result == ERR_INVALID_TARGET) {
              // Maybe we already picked it up, or someone else did
              thisCreep.memory.destination = null
              thisCreep.memory.mission = "PICK UP"
            } else if (result === OK)
              thisCreep.say(`${thisCreep.memory.emoji}PICKUP`)
            else {
              thisCreep.say(`${thisCreep.memory.emoji} ERROR`)
              // Possibly out of resources
              thisCreep.memory.mission = "EXPLORE"
            }
          } else {
            // Not at destination
            actionMoveToDestination(thisCreep)
            return
          }
        } else if (droppedResources.length) {
          /**
           * No destination, so I find one. Fetchers don't withdraw from
           * containers, they only pick up energy from the ground; but fetchers
           * do deposit energy in containers for upgraders and builders.
           * */
          const bestResource = findBestDroppedResources(
            thisCreep,
            droppedResources
          )
          if (!bestResource) {
            thisCreep.memory.mission = "EXPLORE"
            return
          }
          const destination = String(bestResource.pos) as Position
          thisCreep.memory.destination = destination
          const pos = String(thisCreep.pos) as Position
          thisCreep.say(`${thisCreep.memory.emoji} ${bestResource.amount}`)
          console.log(
            `${thisCreep.name} go on ${bestResource.amount} dropped resources at ${destination} from ${pos}`
          )
        } else {
          thisCreep.memory.mission === "EXPLORE"
          return
        }
      }
    } else if (thisCreep.memory.mission === "EXPLORE") actionExplore(thisCreep)
  }
}

export default roleFetcher
