import actionDeposit from "actionDeposit"
import actionExplore from "actionExplore"
import actionMoveToDestination from "actionMoveToDestination"
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
            } else if (result === OK) thisCreep.say("🛍️ PICKED")
            else {
              thisCreep.say("🛍️ ERROR")
              // Possibly out of resources
              thisCreep.memory.mission = "EXPLORE"
            }
          } else {
            // Not at destination
            actionMoveToDestination(thisCreep)
            return
          }
        }
        /**
         * No destination, so we need to find one. Fetchers don't withdraw from
         * containers, they only pick up energy from the ground; but fetchers
         * do deposit energy in containers for upgraders and builders.
         * */
        if (droppedResources.length) {
          // Decide on current droppedResource assignment by dividing the
          // square of dropped resources by the square distance to them:
          const bestResource = droppedResources.reduce((a, b) => {
            const roomsA = a?.room?.name
              ? Game.map.getRoomLinearDistance(
                  thisCreep.pos.roomName,
                  a.room.name
                )
              : 0
            const roomsB = b?.room?.name
              ? Game.map.getRoomLinearDistance(
                  thisCreep.pos.roomName,
                  b.room.name
                )
              : 0
            const rangeToA =
              roomsA === 0 ? thisCreep.pos.getRangeTo(a) : 50 * roomsA
            const rangeToB =
              roomsB === 0 ? thisCreep.pos.getRangeTo(b) : 50 * roomsB
            if (
              Math.pow(a.amount, 2) / Math.pow(rangeToA, 2) >
              Math.pow(b.amount, 2) / Math.pow(rangeToB, 2)
            )
              return a
            else return b
          })
          thisCreep.memory.destination = String(bestResource.pos) as Position
          thisCreep.say(`🛍️ ${bestResource.amount}`)
          console.log(
            `${thisCreep.name} moving to dropped resources at ${thisCreep.memory.destination}`
          )
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
