import roleMiner, { type Miner } from "roleMiner"
import roleBuilder, { type Builder } from "roleBuilder"
import roleFetcher, { type Fetcher } from "roleFetcher"
import roleHarvester, { type Harvester } from "roleHarvester"
import roleUpgrader, { type Upgrader } from "roleUpgrader"
import ErrorMapper from "ErrorMapper"
import roleHealer, { type Healer } from "roleHealer"
import type { DefenderRanged } from "roleDefenderRanged"
import type { DefenderMelee } from "roleDefenderMelee"
import roleDefenderMelee from "roleDefenderMelee"
import roleDefenderRanged from "roleDefenderRanged"
import findMineablePositions from "findMineablePositions"
import roleEye, { type Eye } from "roleEye"
import parseDestination from "parseDestination"
import convertRoomPositionStringBackToRoomPositionObject from "convertRoomPositionStringBackToRoomPositionObject"
import type { Claimer } from "roleClaimer"
import roleClaimer from "roleClaimer"
import parsePosition from "parsePosition"
import assessControllersToClaim from "assessControllersToClaim"

/** IntRange<0,49> types create unions too complex to evaluate 😎 */
export type X = number
export type Y = number
export type RoomName = `${"E" | "W"}${number}${"N" | "S"}${number}`
/**
 * Hash map destination (mineable position) -> objective (source) coordinates.
 * Both are strings: e.g. [room E55N6 pos 14,11] -> [room E55N6 pos 14,12]
 * */
export type Position = `[room ${RoomName} pos ${X},${Y}]`
export type MineablePosition = Position
export type SourcePosition = Position
export type MineablePositions = Map<MineablePosition, SourcePosition>

export type MineablePositionsMap = Map<
  RoomName,
  {
    mineablePositions: MineablePositions
    availableMineablePositions: MineablePositions
  }
>

// const upperFirstCharacter = (string) => string.slice(0, 1).toUpperCase() + string.slice(1)
// const unitTypesAndCounts = {harvesters: 6, "upgraders", "builders", "defenders", "fetchers"]
/*  BODYPART_COST: {
        "move": 50,
        "work": 100,
        "attack": 80,
        "carry": 50,
        "heal": 250,
        "ranged_attack": 150,
        "tough": 10,
        "claim": 600
    }, */
// Default: (Harvester, Upgrader, Builder)
// Old default: Move + work + carry = 200
// Too slow: [WORK, WORK, MOVE, CARRY] = 300
// New default: Move + move + work + carry = 250
// Creep [CARRY, WORK, MOVE] will move 1 square per tick if it does not bear energy, and 1 square per 2 ticks if loaded.
// Fetcher: (Dropped resources and patrol)
// [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY]

// Defender: (Attack and patrol)
// [MOVE, MOVE, ATTACK, ATTACK] = 260
// Miner:
// [WORK, WORK, MOVE, MOVE] = 300

declare global {
  interface CreepMemory {
    role: string
    destination?: Position | null
    emoji: string
  }
}
function unwrappedLoop() {
  const harvesters = [] as Harvester[]
  const miners = [] as Miner[]
  const fetchers = [] as Fetcher[]
  const upgraders = [] as Upgrader[]
  const builders = [] as Builder[]
  const defendersRanged = [] as DefenderRanged[]
  const defendersMelee = [] as DefenderMelee[]
  const healers = [] as Healer[]
  const eyes = [] as Eye[]
  const claimers = [] as Claimer[]
  for (const name in Memory.creeps) {
    const creep = Game.creeps[name]
    if (!creep) {
      delete Memory.creeps[name]
      // Housekeeping: Delete dead creeps from memory
      console.log("Clearing non-existing creep memory:", name)
    } else if (creep) {
      const role = creep.memory.role
      if (role === "harvester") harvesters.push(creep as Harvester)
      if (role === "miner") miners.push(creep as Miner)
      if (role === "fetcher") fetchers.push(creep as Fetcher)
      if (role === "upgrader") upgraders.push(creep as Upgrader)
      if (role === "builder") builders.push(creep as Builder)
      if (role === "defenderRanged")
        defendersRanged.push(creep as DefenderRanged)
      if (role === "defenderMelee") defendersMelee.push(creep as DefenderMelee)
      if (role === "healer") healers.push(creep as Healer)
      if (role === "eye") eyes.push(creep as Eye)
      if (role === "claimer") claimers.push(creep as Claimer)
    }
  }

  // Trigger safe mode if spawn is under half health (last resort)
  if (Game.spawns["Spawn1"].hits < Game.spawns["Spawn1"].hitsMax / 2)
    Game.spawns["Spawn1"].room.controller?.activateSafeMode()

  const homeRoom = Game.spawns["Spawn1"].room
  const RCL = homeRoom.controller?.level

  // Populate the mineablePositions hash map across rooms where I have vision
  const allRooms = Object.keys(Game.rooms) as RoomName[]
  const mineablePositionsMap = new Map() as MineablePositionsMap
  const allDroppedResources: Resource[] = []
  const allContainers: StructureContainer[] = []
  const allConstructionSites: ConstructionSite[] = []
  const allEnemies: Creep[] = []
  /** Total number of sources across all rooms */
  let numberOfSources = 0
  for (const roomName of allRooms) {
    const thisRoom = Game.rooms[roomName]
    numberOfSources += thisRoom.find(FIND_SOURCES).length
    mineablePositionsMap.set(roomName, findMineablePositions(roomName, miners))
    thisRoom
      .find(FIND_DROPPED_RESOURCES)
      .forEach((resource) => allDroppedResources.push(resource))
    thisRoom.find(FIND_STRUCTURES).forEach((structure) => {
      if (
        structure.structureType === STRUCTURE_CONTAINER &&
        structure.store.getUsedCapacity(RESOURCE_ENERGY) >= 50
      )
        allContainers.push(structure)
    })
    thisRoom.find(FIND_CONSTRUCTION_SITES).forEach((site) => {
      allConstructionSites.push(site)
    })
    thisRoom.find(FIND_HOSTILE_CREEPS).forEach((enemy) => {
      allEnemies.push(enemy)
    })
  }
  const totalConstructionSites = allConstructionSites.length
  const totalEnemyHP = allEnemies.reduce((acc, enemy) => acc + enemy.hits, 0)

  // Remove dropped resources that are already destination of a fetcher
  fetchers.forEach((fetcher) => {
    const { roomName, x, y } = parseDestination(fetcher)
    if (!(roomName && x && y)) return
    const destinationPosition = `[room ${roomName} pos ${x},${y}]`
    allDroppedResources.forEach((resource, resourceIndex) => {
      if (String(resource.pos) === destinationPosition)
        allDroppedResources.splice(resourceIndex, 1)
    })
  })

  // 🏗️ Construction projects

  /**
   * Establish containers taking triangular averages of the Spawn, the
   * Controller, and the mining position, keeping in mind that the terrain
   * needs to be buildable, not obstructed, non-blocking, and not a wall.
   * */
  const homeRoomName = homeRoom.name as RoomName
  const calculateExtensionsAndContainers = () => {
    const homeRoomMineablePositions =
      mineablePositionsMap.get(homeRoomName)?.mineablePositions
    const totalContainersInRoom = homeRoom.find(FIND_STRUCTURES, {
      filter: (structure) => structure.structureType === STRUCTURE_CONTAINER
    }).length
    const totalContainersUnderConstruction = homeRoom.find(
      FIND_MY_CONSTRUCTION_SITES,
      {
        filter: (structure) => structure.structureType === STRUCTURE_CONTAINER
      }
    ).length
    const totalContainers =
      totalContainersInRoom + totalContainersUnderConstruction
    const totalExtensionsInRoom = homeRoom.find(FIND_MY_STRUCTURES, {
      filter: (structure) => structure.structureType === STRUCTURE_EXTENSION
    }).length
    const totalExtensionsUnderConstruction = homeRoom.find(
      FIND_MY_CONSTRUCTION_SITES,
      {
        filter: (structure) => structure.structureType === STRUCTURE_EXTENSION
      }
    ).length
    const totalExtensions =
      totalExtensionsInRoom + totalExtensionsUnderConstruction
    const totalSum = totalContainers + totalExtensions
    /**
     * RCL 1: nothing
     * RCL 2: 5/extensions and 5/containers -- But I don't build containers.
     * RCL 3: 10/extensions and 5/containers -- I wait to build the containers;
     * I don't build containers until there are at least 7 extensions (300
     * spawn + 7 * 50 extensions = 650 energy for MOVE + CLAIM claimers).
     * RCL 4: 20/extensions, 5/containers, storage -- not implemented yet
     * */
    if (!RCL || RCL < 2) return
    if (totalSum >= 5 && RCL === 2) return
    if (totalSum >= 15 && RCL >= 3) return
    const buildingType =
      // Don't build containers until there are at least 7 extensions
      totalExtensionsInRoom >= 7 && totalContainers < 5
        ? STRUCTURE_CONTAINER
        : STRUCTURE_EXTENSION
    const destinationPositions = !Array.isArray(homeRoomMineablePositions)
      ? ([] as RoomPosition[])
      : Array.from(homeRoomMineablePositions.keys()).map(
          convertRoomPositionStringBackToRoomPositionObject
        )

    /**
     * Set a construction site for containers and extensions by drawing a
     * straight line on the grid from the Controller toward the Spawn.
     * Making sure to leave empty squares between each building on the line.
     * */
    const origin = homeRoom.controller?.pos || Game.spawns["Spawn1"].pos
    const goals = [...destinationPositions, Game.spawns["Spawn1"].pos].map(
      (pos) => ({ pos, maxRooms: 1, range: 2 }) // Range 1+ recommended in docs
    )
    type X = number
    type Y = number
    type ObstacleCountMap = Map<
      `${X},${Y}`,
      { obstacleCount: number; terrain: number }
    >
    const obstacleCountMapAllRooms = new Map<RoomName, ObstacleCountMap>()
    allRooms.forEach((roomName) => {
      const room = Game.rooms[roomName]
      if (!room) return
      const positionsToBlock = [
        ...room
          .find(FIND_STRUCTURES, {
            filter: (structure) =>
              structure.structureType !== STRUCTURE_ROAD &&
              structure.structureType !== STRUCTURE_CONTAINER
            // Roads and containers are walkable
          })
          .map((struct) => struct.pos),
        ...room.find(FIND_CREEPS).map((creep) => creep.pos),
        ...room.find(FIND_CONSTRUCTION_SITES).map((site) => site.pos)
      ]
      const obstacleMap = new Map<`${X},${Y}`, boolean>()
      positionsToBlock.forEach((pos) => {
        obstacleMap.set(`${pos.x},${pos.y}`, true)
      })

      const allTerrain = room.getTerrain()
      const obstacleCountMap = new Map() as ObstacleCountMap
      for (let roomX = 0; roomX < 50; roomX++) {
        for (let roomY = 0; roomY < 50; roomY++) {
          const terrain = allTerrain.get(roomX, roomY)
          let obstacleCount = 0
          if (terrain === TERRAIN_MASK_WALL) obstacleCount = 0xff
          else if (terrain === TERRAIN_MASK_SWAMP) obstacleCount = 5
          else if (terrain === 0) obstacleCount = 1 // Plains
          for (let xDelta = -1; xDelta <= 1 && obstacleCount < 0xff; xDelta++) {
            for (
              let yDelta = -1;
              yDelta <= 1 && obstacleCount < 0xff;
              yDelta++
            ) {
              let x = roomX + xDelta
              if (x < 0) x = 0
              if (x > 49) x = 49
              let y = roomY + yDelta
              if (y < 0) y = 0
              if (y > 49) y = 49
              const posString: `${X},${Y}` = `${x},${y}`
              if (!obstacleMap.has(posString)) continue
              const hasObstacle = obstacleMap.get(posString)
              // Blocked
              if (xDelta === 0 && yDelta === 0 && hasObstacle)
                obstacleCount = 0xff
              // Has an obstacle surrounding it
              if (hasObstacle) obstacleCount += 1
            }
          }
          const posString: `${X},${Y}` = `${roomX},${roomY}`
          obstacleCountMap.set(posString, { obstacleCount, terrain })
        }
      }
      obstacleCountMapAllRooms.set(roomName, obstacleCountMap)
    })

    /** The `alt` version is "wide" from controller, not "tall". */
    const getRoomCallback = (alt?: boolean) => (roomName: RoomName) => {
      const room = Game.rooms[roomName]
      const costs = new PathFinder.CostMatrix()
      if (!room) return costs
      const obstacleMap = obstacleCountMapAllRooms.get(roomName)
      if (!obstacleMap) return costs
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          const posString: `${X},${Y}` = `${x},${y}`
          if (!obstacleMap.has(posString)) continue
          const { obstacleCount, terrain } = obstacleMap.get(posString) || {}
          if (!(obstacleCount && terrain)) continue
          if (obstacleCount === 0xff) costs.set(x, y, 0xff)
          else if (obstacleCount !== 0xff && alt) costs.set(x, y, obstacleCount)
          // Completely block a position as being unpathable
          costs.set(x, y, terrain === TERRAIN_MASK_SWAMP ? 5 : 1)
        }
      }
      return costs
    }
    const roomCallback = getRoomCallback()
    const altRoomCallback = getRoomCallback(true)
    // Remove all positions from each path with >= 1 obstacles
    const path: RoomPosition[] =
      PathFinder.search(origin, goals, { roomCallback })?.path || []
    const altPath: RoomPosition[] =
      PathFinder.search(origin, goals, {
        roomCallback: altRoomCallback
      })?.path || []
    /** I reorder the path so that the middle elements are first. */
    const reorderedPath: RoomPosition[] = []
    const popFromMiddle = (p: RoomPosition[]) =>
      p.splice(Math.floor(p.length / 2), 1)?.[0]
    let popcorn: RoomPosition
    while ((popcorn = popFromMiddle(path))) {
      reorderedPath.push(popcorn)
      if (!path.length) break
    }

    /**
     * Before I filter out the obstructed paths, I need to increase the search
     * to include all tiles within 10 tiles of each step of each of the paths.
     * */
    const expandSearch = (path: RoomPosition[]) => {
      const expandedPath = [] as RoomPosition[]
      path.forEach((pos, index) => {
        const D = 5
        for (let xDelta = -D; xDelta <= D; xDelta++) {
          for (let yDelta = -D; yDelta <= D; yDelta++) {
            const x = pos.x + xDelta
            const y = pos.y + yDelta
            // The exit tiles at 0's and 49's are not buildable:
            if (x < 1 || x > 48 || y < 1 || y > 48) continue
            const newPos = new RoomPosition(x, y, pos.roomName)
            // If the delta is small, then add it near the current index:
            if (Math.abs(xDelta) <= 1 && Math.abs(yDelta) <= 1)
              expandedPath.splice(index, 0, newPos)
            else expandedPath.push(newPos) // Otherwise, push to end.
          }
        }
      })
      return expandedPath
    }
    /** Check for no obstructions so I can build without blocking traffic */
    const filterOutBlocking = (pos: RoomPosition) => {
      const roomName = pos.roomName as RoomName
      const obstacleCountMap = obstacleCountMapAllRooms.get(roomName)
      const obstacleCount = obstacleCountMap?.get(
        `${pos.x},${pos.y}`
      )?.obstacleCount
      return Number(obstacleCount) < 2
    }
    const pathReady = expandSearch(reorderedPath).filter(filterOutBlocking)
    const altReorderedPath: RoomPosition[] = []
    let altPopcorn: RoomPosition
    while ((altPopcorn = popFromMiddle(altPath))) {
      altReorderedPath.push(altPopcorn)
      if (!altPath.length) break
    }
    const altPathReady =
      expandSearch(altReorderedPath).filter(filterOutBlocking)

    const whichPath = reorderedPath.length ? pathReady : altPathReady
    const proposedBuildingPosition = whichPath?.[0]
    if (proposedBuildingPosition) {
      proposedBuildingPosition.createConstructionSite(buildingType)
      console.log(
        `🚧 Created construction site "${buildingType}" at ${proposedBuildingPosition.x},${proposedBuildingPosition.y}`
      )
    } else {
      console.log(
        `🚧 No construction site "${buildingType}" found for ${homeRoomName}`
      )
    }
  }
  if (RCL && RCL >= 2) calculateExtensionsAndContainers()

  // Ant-style: mark current position for a future road
  const creepsForRoads = [...builders, ...upgraders]
  if (
    RCL &&
    RCL >= 4 && // Only build roads at RCL 4 and above
    // Limit the number of construction sites to 10 across all rooms:
    totalConstructionSites < 10
  ) {
    creepsForRoads.forEach((creep) => {
      // Check there's no construction site in the current tile already:
      if (
        _.filter(
          creep.pos.look(),
          (object) => object.type === "constructionSite"
        ).length === 0
      )
        homeRoom.createConstructionSite(creep.pos, STRUCTURE_ROAD)
    })
  }
  // Create a decay effect by sometimes wiping the room clean of pending roads
  if (Game.time % 100 === 0) {
    allRooms.forEach((roomName) =>
      Game.rooms[roomName]
        .find(FIND_CONSTRUCTION_SITES, {
          filter: { structureType: STRUCTURE_ROAD }
        })
        .forEach((site) => site.remove())
    )
  }

  // The hash map mineablePositions now only includes available positions
  const { allMineablePositions, allAvailableMineablePositions } = Array.from(
    mineablePositionsMap.values()
  ).reduce(
    (acc, { mineablePositions, availableMineablePositions }) => {
      acc.allMineablePositions = new Map([
        ...acc.allMineablePositions,
        ...mineablePositions
      ])
      acc.allAvailableMineablePositions = new Map([
        ...acc.allAvailableMineablePositions,
        ...availableMineablePositions
      ])
      return acc
    },
    {
      allMineablePositions: new Map() as MineablePositions,
      allAvailableMineablePositions: new Map() as MineablePositions
    }
  )
  /** Total mineable positions across all rooms */
  const totalMineablePositions = allMineablePositions.size
  let adjustedMineablePositions = 0
  /** Divide room yield by linear distance from source to spawn */
  Array.from(allMineablePositions.keys()).forEach((mineablePosition) => {
    const { roomName } = parsePosition(mineablePosition)
    if (!roomName) return
    const distance = Game.map.getRoomLinearDistance(homeRoomName, roomName)
    // Home room and 1 range rooms are gold (full yield), then drop off linearly
    const range = Math.max(1, distance)
    const adjustedYield = 1 / range
    adjustedMineablePositions += adjustedYield
  })
  adjustedMineablePositions = Math.round(adjustedMineablePositions)

  /** `n` is how many miners and used as the factor for priority order */
  const n = adjustedMineablePositions

  const totalCreeps = Object.values(Game.creeps).length

  /*  BODYPART_COST: {
        "move": 50,
        "work": 100,
        "attack": 80,
        "carry": 50,
        "heal": 250,
        "ranged_attack": 150,
        "tough": 10,
        "claim": 600
    }, */
  // Default: (Harvester, Upgrader, Builder)
  // Old default: Move + work + carry = 200
  // Too slow: [WORK, WORK, MOVE, CARRY] = 300
  // New default: Move + move + work + carry = 250
  // Creep [CARRY, WORK, MOVE] will move 1 square per tick if it does not bear energy, and 1 square per 2 ticks if loaded.
  // Slow Defender: (Attack and patrol)
  // [TOUGH, ATTACK, ATTACK, ATTACK, MOVE] = 300
  // Fast Defender: (Attack and patrol)
  // [MOVE, MOVE, ATTACK, ATTACK, TOUGH, TOUGH, TOUGH, TOUGH] = 300
  // Fetcher: (Dropped resources / Tanker)
  // [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY] = 300
  // Miner: (Static drop miner -- however also a remote miner, so needs MOVE)
  // [MOVE, MOVE, WORK, WORK] = 300

  // Spawn new creeps if at least 300 energy (default max to a spawn)
  // Initially Game.spawns["Spawn1"].room.energyCapacityAvailable === 300
  /* if (
    Game.spawns["Spawn1"].room.energyAvailable >=
      Game.spawns["Spawn1"].room.energyCapacityAvailable &&
    Game.spawns["Spawn1"].spawning == undefined
  ) */
  const transformCreeps = () => {
    /**
     * Transform harvesters to upgraders ASAP to hit RCL 2 and get extensions.
     * The main goal is RCL 3 + 7-10 extensions to get claimers ASAP.
     * */
    if (harvesters.length >= 1 && fetchers.length >= 1) {
      harvesters.forEach((harvester: Harvester) => {
        const upgrader = harvester as unknown as Upgrader
        upgrader.memory.role = "upgrader"
        upgrader.memory.emoji = "⚡"
        upgrader.memory.upgrading = false
        upgrader.memory.destination = null
      })
    }

    // If there are no construction sites, the builders transform into upgraders
    if (totalConstructionSites === 0 && builders.length > 0) {
      builders.forEach((builder: Builder) => {
        const upgrader = builder as unknown as Upgrader
        upgrader.memory.role = "upgrader"
        upgrader.memory.emoji = "⚡"
        upgrader.memory.destination = null
        upgrader.memory.upgrading = false
      })
    }
    // If there are construction sites, the upgraders transform into builders
    if (totalConstructionSites > 0 && upgraders.length > 0) {
      upgraders.forEach((upgrader: Upgrader) => {
        const builder = upgrader as unknown as Builder
        builder.memory.role = "builder"
        builder.memory.emoji = "🚧"
        builder.memory.destination = null
        builder.memory.mission = "THINK"
      })
    }
    // console.log(`🚧 There are ${totalConstructionSites} construction sites:
    // ${allConstructionSites
    //   .map((site) => `${site.structureType}${site.pos}`)
    //   .join(", ")}`)
  }
  transformCreeps()

  // Currently Game.spawns["Spawn1"].room.energyCapacityAvailable === 550
  const energy = Game.spawns["Spawn1"].room.energyAvailable
  /** 300 at the beginning RCL1 then 550 at RCL2 with 5 extensions */
  const energyMax = Game.spawns["Spawn1"].room.energyCapacityAvailable
  const notSpawning = Game.spawns["Spawn1"].spawning == undefined
  if (
    notSpawning &&
    /**
     * Normally I wait until full energy to spawn, but if an invader wipes my
     * base then my spawn will only charge up to 300 energy when I start over.
     * */
    (energy >= energyMax || (energy >= 300 && totalCreeps < 4))
  ) {
    console.log("Harvesters: " + harvesters.length)
    console.log("Upgraders: " + upgraders.length)
    console.log("Builders: " + builders.length)
    console.log("Defenders Ranged: " + defendersRanged.length)
    console.log("Defenders Melee: " + defendersMelee.length)
    console.log("Fetchers: " + fetchers.length)
    console.log("Miners: " + miners.length)
    console.log("Healers: " + healers.length)
    console.log("Eyes: " + eyes.length)
    console.log("Claimers: " + claimers.length)
    console.log("Total creeps: " + totalCreeps)

    /** Finds the max body of a given repeatable unit at current `energy` */
    const getBodyByUnit = (unit: BodyPartConstant[]) => {
      const cost = unit.reduce((acc, part) => acc + BODYPART_COST[part], 0)
      const times = Math.floor(energy / cost)
      const body: BodyPartConstant[] = []
      for (let i = 0; i < times; i++) body.push(...unit)
      return body
    }
    /**
     * [WORK, WORK, MOVE, CARRY] // 300 -- fat creeps 1-4
     * [WORK, MOVE, MOVE, CARRY] // 250 -- quick creeps 5-n
     * [WORK, MOVE, MOVE, MOVE, CARRY, CARRY], // 350
     * [WORK, WORK, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY], // 500
     **/
    const getHarvesterBody = () => {
      if (totalCreeps < 4) return [WORK, WORK, MOVE, CARRY] // 300
      if (energyMax < 350) return [WORK, MOVE, MOVE, CARRY] // 250
      if (energyMax < 500)
        // >= 350
        return [WORK, MOVE, MOVE, MOVE, CARRY, CARRY] // 350
      // if (energyMax >= 500)
      return [WORK, WORK, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY] // 500
    }
    const spawnHarvester = () => {
      const newName = Game.time + "_" + "Harvester" + harvesters.length
      console.log("Spawning new harvester: " + newName)
      Game.spawns["Spawn1"].spawnCreep(getHarvesterBody(), newName, {
        memory: { role: "harvester", emoji: "🌾" }
      } as Pick<Harvester, "memory">)
    }
    /**
     * [WORK, MOVE], // 100 x unit
     * **/
    const getMinerBody = () => getBodyByUnit([WORK, MOVE])
    const spawnMiner = () => {
      const newName = Game.time + "_" + "Miner" + miners.length
      console.log("Spawning new miner: " + newName)
      Game.spawns["Spawn1"].spawnCreep(getMinerBody(), newName, {
        memory: { role: "miner", emoji: "⛏️" }
      } as Pick<Miner, "memory">)
    }
    /**
     * [MOVE, CARRY], // 100 x unit
     * */
    const getFetcherBody = () => getBodyByUnit([MOVE, CARRY])
    const spawnFetcher = () => {
      const newName = Game.time + "_" + "Fetcher" + fetchers.length
      console.log("Spawning new fetcher: " + newName)
      Game.spawns["Spawn1"].spawnCreep(getFetcherBody(), newName, {
        memory: { role: "fetcher", emoji: "🛍️" }
      } as Pick<Fetcher, "memory">)
    }
    /**
     * [MOVE,MOVE,MOVE,MOVE,MOVE] // 250
     * Eyes need 5 MOVE so that walking through swamps doesn't slow them down.
     * */
    const getEyeBody = () => [MOVE, MOVE, MOVE, MOVE, MOVE] // 250
    const spawnEye = () => {
      const newName = Game.time + "_" + "Eyes" + eyes.length
      console.log("Spawning new eye: " + newName)
      Game.spawns["Spawn1"].spawnCreep(getEyeBody(), newName, {
        memory: { role: "eye", emoji: "👁️" }
      } as Pick<Eye, "memory">)
    }
    /**
     * old (fast):
     * [WORK, MOVE, MOVE, CARRY], // 250
     * [WORK, WORK, MOVE, MOVE, MOVE, CARRY], // 400
     *
     * new (slow):
     * [WORK, WORK, MOVE, CARRY], // 300
     * [WORK, WORK, WORK, MOVE, CARRY], // 400
     * [WORK, WORK, WORK, WORK, MOVE, CARRY], // 500
     * [WORK, WORK, WORK, WORK, WORK, MOVE, CARRY], // 600
     * [WORK], // 100 x unit + [MOVE, CARRY] // 100
     * */
    const getBuilderBody = () => {
      const unit = [WORK]
      const body = getBodyByUnit(unit)
      body.pop() // Need 100 back (1 WORK) for MOVE and CARRY (50 each)
      body.push(MOVE, CARRY)
      return body
    }
    const spawnBuilder = () => {
      const newName = Game.time + "_" + "Builder" + builders.length
      console.log("Spawning new builder: " + newName)
      Game.spawns["Spawn1"].spawnCreep(getBuilderBody(), newName, {
        memory: { role: "builder", emoji: "🚧" }
      } as Pick<Builder, "memory">)
    }
    const getUpgraderBody = getBuilderBody
    const spawnUpgrader = () => {
      const newName = Game.time + "_" + "Upgrader" + upgraders.length
      console.log("Spawning new upgrader: " + newName)
      Game.spawns["Spawn1"].spawnCreep(getUpgraderBody(), newName, {
        memory: { role: "upgrader", emoji: "⚡" }
      } as Pick<Upgrader, "memory">)
    }
    /**
     * [TOUGH,MOVE,MOVE,RANGED_ATTACK] 260 x unit (idea for tougher ones)
     * [MOVE,RANGED_ATTACK] 200 x unit (current preference for cost efficiency)
     * */
    const getDefenderRangedBody = () => getBodyByUnit([MOVE, RANGED_ATTACK])
    const spawnDefenderRanged = () => {
      const newName =
        Game.time + "_" + "DefenderRanged" + defendersRanged.length
      console.log("Spawning new defender ranged: " + newName)
      Game.spawns["Spawn1"].spawnCreep(getDefenderRangedBody(), newName, {
        memory: { role: "defenderRanged", emoji: "🏹" }
      } as Pick<DefenderRanged, "memory">)
    }
    /**
     * [TOUGH,MOVE,MOVE,ATTACK] 190 x unit
     * [MOVE,ATTACK] 130 x unit
     * */
    const getDefenderMeleeBody = () => getBodyByUnit([MOVE, ATTACK])
    const spawnDefenderMelee = () => {
      const newName = Game.time + "_" + "DefenderMelee" + defendersMelee.length
      console.log("Spawning new defender melee: " + newName)
      Game.spawns["Spawn1"].spawnCreep(getDefenderMeleeBody(), newName, {
        memory: { role: "defenderMelee", emoji: "⚔️" }
      } as Pick<DefenderMelee, "memory">)
    }
    /**
     * [TOUGH,MOVE,MOVE,HEAL] 360 x unit
     * [MOVE,HEAL] 300 x unit
     * */
    const spawnHealer = () => {
      const newName = Game.time + "_" + "Healer" + healers.length
      console.log("Spawning new healer: " + newName)
      Game.spawns["Spawn1"].spawnCreep(
        [MOVE, HEAL], // 300
        newName,
        { memory: { role: "healer", emoji: "🏥" } } as Pick<Healer, "memory">
      )
    }
    /** [MOVE, CLAIM] 650 x unit */
    const getClaimerBody = () => getBodyByUnit([MOVE, CLAIM])
    const spawnClaimer = () => {
      const newName = Game.time + "_" + "Claimers" + claimers.length
      console.log("Spawning new claimer: " + newName)
      Game.spawns["Spawn1"].spawnCreep(getClaimerBody(), newName, {
        memory: { role: "claimer", emoji: "🛄" }
      } as Pick<Claimer, "memory">)
    }
    /**
     * 4 harvester, n/2 miner, n/4 fetcher, n miner, n fetcher, n/4 claimer,
     * n/4 eye, n/4 builder, n/4 upgrader, NO defenders x n mining sites.
     * 4 harvesters at the beginning all transform into 4 upgraders when the
     * 2nd fetcher is made, and 4 is enough to reach RCL 2 in one go.
     * Builders only spawns if there are construction sites / upgraders if not.
     * Claimers only spawn if there are at least 7 extensions.
     * Don't build army until RCL 4; then max it to farm Source Keeper rooms.
     * */
    const buildArmy = (RCL || 0) >= 4
    if (totalCreeps < 4) spawnHarvester()
    else if (miners.length < Math.max(Math.floor(n / 2), numberOfSources))
      spawnMiner()
    else if (
      fetchers.length <
      Math.max(Math.floor(n / 4), Math.floor(numberOfSources / 2))
    )
      spawnFetcher()
    else if (miners.length < n) spawnMiner()
    else if (fetchers.length < n) spawnFetcher()
    else if (
      energyMax >= 650 &&
      claimers.length <
        Math.max(Math.floor(n / 4), Math.floor(numberOfSources / 2))
    )
      spawnClaimer()
    else if (
      eyes.length < Math.max(Math.floor(n / 4), Math.floor(numberOfSources / 2))
    )
      spawnEye()
    else if (
      !buildArmy &&
      builders.length < Math.max(Math.floor(n / 4), numberOfSources) &&
      // Sum construction sites in all spawns to make sure there is at least 1:
      totalConstructionSites > 0
    )
      spawnBuilder()
    else if (
      !buildArmy &&
      upgraders.length < Math.max(Math.floor(n / 4), numberOfSources) &&
      totalConstructionSites === 0
    )
      spawnUpgrader()
    else if (buildArmy && defendersRanged.length < n) spawnDefenderRanged()
    else if (buildArmy && defendersMelee.length < n) spawnDefenderMelee()
    else if (buildArmy && healers.length < n) spawnHealer()
    else {
      // The fallback role is off
    }
  }

  // Visual display if spawn is spawning
  const spawnObject = Game.spawns["Spawn1"].spawning
  if (spawnObject) {
    const spawningCreep = Game.creeps[spawnObject.name]
    const percent = `${Math.floor(
      100 - (100 * spawnObject.remainingTime) / spawnObject.needTime
    )}%`
    homeRoom.visual.text(
      spawningCreep.memory.emoji + spawningCreep.memory.role + percent,
      Game.spawns["Spawn1"].pos.x + 1,
      Game.spawns["Spawn1"].pos.y,
      { align: "left", opacity: 1 }
    )
  } else if (!spawnObject) {
    // Show n and energy avaiable
    homeRoom.visual.text(
      `n ${n} | ⚡ ${homeRoom.energyAvailable}/${homeRoom.energyCapacityAvailable}`,
      Game.spawns["Spawn1"].pos.x + 1,
      Game.spawns["Spawn1"].pos.y,
      { align: "left", opacity: 1 }
    )
  }

  // Make towers attack & repair
  Object.values(Game.rooms).forEach((room) => {
    if (room.controller?.my) {
      const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
        filter: { structureType: STRUCTURE_TOWER }
      })

      towers.forEach((tower) => {
        const closestDamagedStructure = tower.pos.findClosestByRange(
          FIND_STRUCTURES,
          { filter: (structure) => structure.hits < structure.hitsMax }
        )
        if (closestDamagedStructure) {
          tower.repair(closestDamagedStructure)
        }

        const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
        if (closestHostile) {
          tower.attack(closestHostile)
        }
      })
    }
  })

  /** For the healers to know whom to heal */
  const creepsToHeal = Object.values(Game.creeps)
    .filter(
      (creep: Creep) =>
        creep.memory.role === "healer" || /defender/.exec(creep.memory.role)
    )
    .sort(
      // Sort defenders before healers
      (a, b) => {
        if (/defender/.exec(a.memory.role) && b.memory.role === "healer")
          return -1
        if (a.memory.role === "healer" && /defender/.exec(b.memory.role))
          return 1
        return 0
      }
    )

  const creeps = Object.values(Game.creeps)
  const allies = [...defendersMelee, ...defendersRanged, ...healers]
  const totalAlliedHP = allies.reduce((acc, ally) => acc + ally.hits, 0)
  const FORCE_FACTOR = 3
  const overwhelmingForce = totalAlliedHP > totalEnemyHP * FORCE_FACTOR

  const allControllers = assessControllersToClaim(claimers)
  // Run all creeps
  for (const creep of creeps) {
    try {
      // Don't run creeps that are spawning
      if (creep.spawning) continue
      else if (creep.memory.role == "defenderMelee")
        roleDefenderMelee.run(creep as DefenderMelee, overwhelmingForce)
      else if (creep.memory.role == "defenderRanged")
        roleDefenderRanged.run(creep as DefenderRanged, overwhelmingForce)
      else if (creep.memory.role == "miner")
        roleMiner.run(creep as Miner, allAvailableMineablePositions)
      else if (creep.memory.role == "fetcher")
        roleFetcher.run(creep as Fetcher, allDroppedResources)
      else if (creep.memory.role == "harvester")
        roleHarvester.run(creep as Harvester, totalCreeps)
      else if (creep.memory.role == "upgrader")
        roleUpgrader.run(creep as Upgrader)
      else if (creep.memory.role == "builder") roleBuilder.run(creep as Builder)
      else if (creep.memory.role == "healer")
        roleHealer.run(creep as Healer, creepsToHeal)
      else if (creep.memory.role == "eye") roleEye.run(creep as Eye)
      else if (creep.memory.role == "claimer")
        roleClaimer.run(creep as Claimer, allControllers)
    } catch (e) {
      console.log(`${creep.name} threw a ${e}`)
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
const loop = ErrorMapper.wrapLoop(unwrappedLoop)

export { loop, unwrappedLoop }
