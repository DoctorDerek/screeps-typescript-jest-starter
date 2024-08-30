import convertRoomPositionStringBackToRoomPositionObject from "convertRoomPositionStringBackToRoomPositionObject"
import type {
  MineablePosition,
  MineablePositions,
  RoomName,
  SourcePosition
} from "main"
import type { Miner } from "roleMiner"

export default function findMineablePositions(
  roomName: RoomName,
  miners: Miner[]
) {
  const thisRoom = Game.rooms[roomName]
  const RCL = thisRoom.controller?.level
  /** Select all sources with available energy from this room: */
  const activeSources = thisRoom.find(FIND_SOURCES_ACTIVE)
  /**
   * `mineablePositions` is all of the available positions to mine taking into
   * account that some sources are too close to Source Keeper Lairs.
   * */
  const mineablePositions = new Map() as MineablePositions
  /**
   * `availableMineablePositions` accounts for miners that are already mining,
   * so this is the list sent to the miners themselves.
   * */
  const availableMineablePositions = new Map() as MineablePositions
  activeSources.forEach((source) => {
    const sourcePositionString = String(source.pos) as SourcePosition
    const sourceX = source.pos.x
    const sourceY = source.pos.y
    // lookForAtArea(type, top, left, bottom, right, [asArray])
    const lookArray = thisRoom.lookForAtArea(
      LOOK_TERRAIN,
      sourceY - 1,
      sourceX - 1,
      sourceY + 1,
      sourceX + 1,
      true
    )
    lookArray
      .filter((positionAsJSON) => positionAsJSON.terrain !== "wall")
      .forEach((mineablePositionAsJSON) => {
        // Each item returned by lookForAtArea looks like:
        // {"type":"terrain","terrain":"plain","x":24,"y":42}
        // Retrieve RoomPosition object `mineablePosition` from x,y coordinates
        const mineablePosition = thisRoom.getPositionAt(
          mineablePositionAsJSON.x,
          mineablePositionAsJSON.y
        )
        if (!mineablePosition) return // Shouldn't happen, but fixes types.
        const mineablePositionString = String(
          mineablePosition
        ) as MineablePosition
        mineablePositions.set(mineablePositionString, sourcePositionString)
        if (
          mineablePosition &&
          // Remove occupied positions from the hash map:
          mineablePosition.lookFor(LOOK_CREEPS).length === 0
        )
          availableMineablePositions.set(
            mineablePositionString,
            sourcePositionString
          )
      })
  })

  // Remove positions near source keeper lairs as these are "too hot" to mine
  // (e.g. 5 tiles away from the lair)
  const sourceKeeperLairs = thisRoom.find(FIND_HOSTILE_STRUCTURES, {
    filter: (structure) => structure.structureType === STRUCTURE_KEEPER_LAIR
  })
  sourceKeeperLairs.forEach((lair) => {
    const lairX = lair.pos.x
    const lairY = lair.pos.y
    const lookArray = thisRoom.lookForAtArea(
      LOOK_TERRAIN,
      lairY - 5,
      lairX - 5,
      lairY + 5,
      lairX + 5,
      true
    )
    lookArray.forEach((positionAsJSON) => {
      const position = thisRoom.getPositionAt(
        positionAsJSON.x,
        positionAsJSON.y
      )
      const positionString = String(position) as MineablePosition
      mineablePositions.delete(positionString)
      availableMineablePositions.delete(positionString)
    })
  })

  // Remove taken positions from the hash map of {"(x,y)": true} coordinates
  miners.forEach((creep) => {
    if (!creep.memory.destination) return // Miner has no destination
    const takenPositionString = String(
      creep.memory.destination
    ) as MineablePosition
    // e.g. [room E55N6 pos 14,11]
    availableMineablePositions.delete(takenPositionString)
  })

  return { mineablePositions, availableMineablePositions }
}
