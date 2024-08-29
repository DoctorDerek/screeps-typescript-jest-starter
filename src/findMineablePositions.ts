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
    })
  })

  /**
   * Establish containers taking triangular averages of the Spawn, the
   * Controller, and the mining position, keeping in mind that the terrain
   * needs to be buildable, not obstructed, non-blocking, and not a wall.
   * */
  if (thisRoom.name === Game.spawns["Spawn1"].room.name)
    mineablePositions.forEach(
      (sourcePositionString, destinationPositionString) => {
        // Containers aren't in FIND_MY_STRUCTURES, so I need FIND_STRUCTURES
        const totalContainersInRoom = thisRoom.find(FIND_STRUCTURES, {
          filter: (structure) => {
            return structure.structureType === STRUCTURE_CONTAINER
          }
        }).length
        const totalContainersUnderConstruction = thisRoom.find(
          FIND_MY_CONSTRUCTION_SITES,
          {
            filter: (structure) => {
              return structure.structureType === STRUCTURE_CONTAINER
            }
          }
        ).length
        const totalContainers =
          totalContainersInRoom + totalContainersUnderConstruction
        const totalExtensionsInRoom = thisRoom.find(FIND_MY_STRUCTURES, {
          filter: (structure) => {
            return structure.structureType === STRUCTURE_EXTENSION
          }
        }).length
        const totalExtensionsUnderConstruction = thisRoom.find(
          FIND_MY_CONSTRUCTION_SITES,
          {
            filter: (structure) => {
              return structure.structureType === STRUCTURE_EXTENSION
            }
          }
        ).length
        const totalExtensions =
          totalExtensionsInRoom + totalExtensionsUnderConstruction
        // There's an early limit of 5/room for each of containers and extensions
        const totalSum = totalContainers + totalExtensions
        // If the room level is less than 2, then there's a hard limit of 5/room
        if (!RCL || RCL < 2) return
        // If the room level is 2 or greater, then there's a hard limit of 10/room
        if (totalSum >= 5 && RCL >= 2) return
        if (totalSum >= 10 && RCL >= 3) return
        // Only build containers if the room level is 3 or greater
        const buildingType =
          RCL && RCL >= 3 && totalContainers < 5
            ? STRUCTURE_CONTAINER
            : STRUCTURE_EXTENSION
        const destinationPosition =
          convertRoomPositionStringBackToRoomPositionObject(
            destinationPositionString
          )
        /**
         * Set a construction site for containers and extensions by drawing a
         * straight line on the grid from the Controller toward the Spawn.
         * Making sure to leave empty squares between each building on the line.
         * */
        const origin = thisRoom.controller?.pos || Game.spawns["Spawn1"].pos
        const goals = [destinationPosition, Game.spawns["Spawn1"].pos]
        const path = PathFinder.search(origin, goals)
        const proposedBuildingPosition = path.path.find((position) => {
          const proposedBuildingPosition = new RoomPosition(
            position.x,
            position.y,
            roomName
          )
          return (
            proposedBuildingPosition.lookFor(LOOK_STRUCTURES).length === 0 &&
            proposedBuildingPosition.lookFor(LOOK_CONSTRUCTION_SITES).length ===
              0 &&
            proposedBuildingPosition.lookFor(LOOK_TERRAIN)[0] !== "wall"
          )
        })
        if (proposedBuildingPosition) {
          proposedBuildingPosition.createConstructionSite(buildingType)
          console.log(
            `🚧 Created construction site ${buildingType} at ${proposedBuildingPosition.x},${proposedBuildingPosition.y}`
          )
        } else {
          console.log(
            `🚧 No construction site ${buildingType} found for ${destinationPositionString}`
          )
        }
      }
    )

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
