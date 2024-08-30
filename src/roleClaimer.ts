import actionExplore from "actionExplore"
import actionMoveToDestination from "actionMoveToDestination"
import findNearestPositionByRange from "findNearestPositionByRange"
import type { Position } from "main"
import parseDestination from "parseDestination"

export interface Claimer extends Creep {
  memory: ClaimerMemory
}

interface ClaimerMemory extends CreepMemory {
  role: "claimer"
  mission: "CLAIM" | "EXPLORE" | "THINK" | null
  destination: Position | null
  emoji: "🛄"
}

const roleClaimer = {
  run: function (creep: Claimer) {
    if (!creep.memory.mission || creep.memory.mission === "THINK")
      creep.memory.mission = "CLAIM"
    if (creep.memory.mission === "CLAIM") {
      if (!creep.memory.destination) {
        const allRooms = Object.values(Game.rooms)
        const allControllers = allRooms
          .map((room) => room.controller)
          .filter((controller) => {
            const isMyController = Boolean(controller?.my)
            if (isMyController) return false
            const { username, ticksToEnd } = controller?.reservation || {}
            const hasReservation = Boolean(ticksToEnd)
            if (!hasReservation) return true
            const isMyReservation = username === "Mapachito"
            const notMyReservation = !isMyReservation
            if (hasReservation && notMyReservation) return false
            const myReservationButNotFull =
              isMyReservation && ticksToEnd && ticksToEnd < 3000
            if (myReservationButNotFull) return true
            return false
          })
        const allPositions = allControllers
          .map((controller) => controller?.pos)
          .filter(Boolean)
        if (allPositions.length === 0) creep.memory.mission = "EXPLORE"
        // @ts-expect-error This can't be undefined due to .filter(Boolean):
        const closestPosition = findNearestPositionByRange(creep, allPositions)
        if (closestPosition)
          creep.memory.destination = String(closestPosition) as Position
        else creep.memory.mission = "EXPLORE"
      }
      if (creep.memory.destination) {
        const { roomName, x, y } = parseDestination(creep)
        if (!(roomName && x && y)) {
          creep.memory.destination = null
          creep.memory.mission = "THINK"
          return
        }
        const thisRoom = Game.rooms[roomName]
        if (!thisRoom) {
          creep.memory.destination = null
          creep.memory.mission = "THINK"
          return
        }
        // const destination = new RoomPosition(x, y, roomName)
        const controller = thisRoom.controller
        if (!controller) {
          creep.memory.destination = null
          creep.memory.mission = "THINK"
          return
        }
        const result = creep.claimController(controller)
        if (result === OK) creep.say(`${creep.memory.emoji}CLAIM`)
        else if (result === ERR_NOT_IN_RANGE) actionMoveToDestination(creep)
        else if (result === ERR_GCL_NOT_ENOUGH) {
          const resultReserve = creep.reserveController(controller)
          if (resultReserve === OK) creep.say(`${creep.memory.emoji}RESERVE`)
          else if (resultReserve === ERR_NOT_IN_RANGE)
            actionMoveToDestination(creep)
          else {
            creep.memory.destination = null
            creep.memory.mission = "THINK"
            creep.say(`${creep.memory.emoji}ERRORR`)
          }
        } else {
          creep.memory.destination = null
          creep.memory.mission = "THINK"
          creep.say(`${creep.memory.emoji}ERRORC`)
        }
      }
    }
    if (creep.memory.mission === "EXPLORE") actionExplore(creep)
  }
}

export default roleClaimer
