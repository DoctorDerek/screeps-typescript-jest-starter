import type { Position } from "main"

export default function assessControllersToClaim(claimers: Creep[]) {
  const allRooms = Object.values(Game.rooms)
  const allControllers = allRooms
    .map((room) => room.controller)
    .filter((controller) => {
      // Claimers should only 2 source rooms, not 1 source rooms
      const has2Sources = controller?.room.find(FIND_SOURCES).length === 2
      if (!has2Sources) return false
      // Not assigned to another claimer
      const controllerPosition = String(controller?.pos) as Position
      const alreadyAssigned = claimers.find(
        (claimer) => claimer.memory.destination === controllerPosition
      )
      if (alreadyAssigned) return false
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
    .filter(Boolean)
  return allControllers as StructureController[]
}
