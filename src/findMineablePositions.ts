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
        if (totalSum >= 10 && RCL >= 3) return
        // Only build containers if the room level is 4 or greater
        const buildingType =
          RCL && RCL >= 4 && totalContainers < 5
            ? STRUCTURE_CONTAINER
            : STRUCTURE_EXTENSION
        /**
         * Set a construction site for a container at this location if available
         * because resources dropped on the ground will decay after 300 ticks.
         * Builders will auto-build the container once the miners set the sites.
         * */
        const destinationPosition =
          convertRoomPositionStringBackToRoomPositionObject(
            destinationPositionString
          )
        let proposedX = thisRoom?.controller
          ? Math.floor(
              (Game.spawns["Spawn1"].pos.x +
                destinationPosition.x +
                thisRoom.controller.pos.x) /
                3
            )
          : Math.floor(
              (Game.spawns["Spawn1"].pos.x + destinationPosition.x) / 2
            )
        let proposedY = thisRoom?.controller
          ? Math.floor(
              (Game.spawns["Spawn1"].pos.y +
                destinationPosition.y +
                thisRoom.controller.pos.y) /
                3
            )
          : Math.floor(
              (Game.spawns["Spawn1"].pos.y + destinationPosition.y) / 2
            )
        // Check for no terrain blocking, move y using a for loop
        while (
          thisRoom
            .lookAt(proposedX, proposedY)
            .filter((object) => object.type === "terrain")[0].terrain === "wall"
        ) {
          // Random walk weighted 60%/40% in favor of decreasing x/y
          if (Math.random() > 0.6)
            Math.random() > 0.5 ? proposedY-- : proposedX--
          else Math.random() > 0.5 ? proposedY++ : proposedX++
          proposedX = proposedX < 0 ? 0 : proposedX
          proposedY = proposedY < 0 ? 0 : proposedY
          proposedX > 49 ? 49 : proposedX
          proposedY > 49 ? 49 : proposedY
        }
        const proposedBuildingPosition = new RoomPosition(
          proposedX,
          proposedY,
          thisRoom.name
        )
        const noConstructionSite =
          proposedBuildingPosition.lookFor(LOOK_CONSTRUCTION_SITES).length === 0
        const noBuildingCurrently =
          proposedBuildingPosition.lookFor(LOOK_STRUCTURES).length === 0
        const noTerrainBlocking =
          proposedBuildingPosition.lookFor(LOOK_TERRAIN)[0] !== "wall"
        const noObstructions =
          proposedBuildingPosition.lookFor(LOOK_CREEPS).length === 0
        const validBuildingPosition =
          noTerrainBlocking &&
          noObstructions &&
          noBuildingCurrently &&
          noConstructionSite
        if (validBuildingPosition) {
          proposedBuildingPosition.createConstructionSite(buildingType)
          console.log(
            `🚧 Created construction site ${buildingType} at ${proposedBuildingPosition.x},${proposedBuildingPosition.y}`
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
