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
  for (const name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name]
      // Housekeeping: Delete dead creeps from memory
      console.log("Clearing non-existing creep memory:", name)
    }
    const creep = Game.creeps[name]
    const role = creep.memory.role
    if (role === "harvester") harvesters.push(creep as Harvester)
    if (role === "miner") miners.push(creep as Miner)
    if (role === "fetcher") fetchers.push(creep as Fetcher)
    if (role === "upgrader") upgraders.push(creep as Upgrader)
    if (role === "builder") builders.push(creep as Builder)
    if (role === "defenderRanged") defendersRanged.push(creep as DefenderRanged)
    if (role === "defenderMelee") defendersMelee.push(creep as DefenderMelee)
    if (role === "healer") healers.push(creep as Healer)
    if (role === "eye") eyes.push(creep as Eye)
  }

  // Trigger safe mode if spawn is under half health (last resort)
  if (Game.spawns["Spawn1"].hits < Game.spawns["Spawn1"].hitsMax / 2)
    Game.spawns["Spawn1"].room.controller?.activateSafeMode()

  const thisRoom = Game.spawns["Spawn1"].room
  const RCL = thisRoom.controller?.level

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

  // Ant-style: mark current position for a future road
  const creepsForRoads = [...fetchers, ...upgraders]
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
        thisRoom.createConstructionSite(creep.pos, STRUCTURE_ROAD)
    })
  }
  // Create a decay effect by occasionally wiping the room clean of pending roads
  // if (Math.random() < 0.01) {
  //   const pendingRoadSites = thisCreep.room.find(FIND_CONSTRUCTION_SITES, {
  //     filter: { structureType: STRUCTURE_ROAD }
  //   })
  //   for (const pendingRoadSite of pendingRoadSites) {
  //     pendingRoadSite.remove()
  //   }
  // }

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

  /** `n` is how many miners and used as the factor for priority order */
  const n = totalMineablePositions

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
  // Currently Game.spawns["Spawn1"].room.energyCapacityAvailable === 550
  const energy = Game.spawns["Spawn1"].room.energyAvailable
  /** 300 at the beginning RCL1 then 550 at RCL2 with 5 extensions */
  const energyMax = Game.spawns["Spawn1"].room.energyCapacityAvailable
  const notSpawning = Game.spawns["Spawn1"].spawning == undefined
  if (energy >= energyMax && notSpawning) {
    console.log("Harvesters: " + harvesters.length)
    console.log("Upgraders: " + upgraders.length)
    console.log("Builders: " + builders.length)
    console.log("Defenders Ranged: " + defendersRanged.length)
    console.log("Defenders Melee: " + defendersMelee.length)
    console.log("Fetchers: " + fetchers.length)
    console.log("Miners: " + miners.length)
    console.log("Healers: " + healers.length)
    console.log("Eyes: " + eyes.length)

    /**
     * Once I have n miners, the all harvesters transform into upgraders,
     * as the main goal is RCL 3 + 7-10 extensions to get claimers ASAP.
     *
     * With n harvesters at the beginning, there's no need for extra fetchers;
     * harvesters have WORK parts and thus make better upgraders anyway.
     * */
    // if (miners.length >= n && harvesters.length >= 1) {
    //   harvesters.forEach((harvester: Harvester) => {
    //     const upgrader = harvester as unknown as Upgrader
    //     upgrader.memory.role = "upgrader"
    //     upgrader.memory.emoji = "⚡"
    //     upgrader.memory.upgrading = false
    //     upgrader.memory.destination = null
    //   })
    // }
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
        builder.memory.building = false
        builder.memory.buildSiteNumber = null
        builder.memory.mission = "FILL UP"
      })
    }
    // console.log(`🚧 There are ${totalConstructionSites} construction sites:
    // ${allConstructionSites
    //   .map((site) => `${site.structureType}${site.pos}`)
    //   .join(", ")}`)

    /**
     * [WORK, WORK, MOVE, CARRY] // 300 -- fat creeps 1-3
     * [WORK, MOVE, MOVE, CARRY] // 250 -- quick creeps 4-n
     * [WORK, MOVE, MOVE, MOVE, CARRY, CARRY], // 350
     * [WORK, WORK, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY], // 500
     **/
    const getHarvesterBody = () => {
      if (totalCreeps < 3) return [WORK, WORK, MOVE, CARRY] // 300
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
     * [WORK, WORK, MOVE, MOVE], // 300
     * [WORK, WORK, WORK, MOVE, MOVE, MOVE], // 450
     * **/
    const getMinerBody = () => {
      if (energyMax < 450) return [WORK, WORK, MOVE, MOVE] // 300
      // if (energyMax >= 450)
      return [WORK, WORK, WORK, MOVE, MOVE, MOVE] // 450
    }
    const spawnMiner = () => {
      const newName = Game.time + "_" + "Miner" + miners.length
      console.log("Spawning new miner: " + newName)
      Game.spawns["Spawn1"].spawnCreep(getMinerBody(), newName, {
        memory: { role: "miner", emoji: "⛏️" }
      } as Pick<Miner, "memory">)
    }
    /**
     * [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY], // 300
     * [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY], // 400
     * [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY], // 500
     * */
    const getFetcherBody = () => {
      if (energyMax < 400) return [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY] // 300
      if (energyMax < 500) return [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY] // 400
      // if (energyMax >= 500)
      return [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY] // 500
    }
    const spawnFetcher = () => {
      const newName = Game.time + "_" + "Fetcher" + fetchers.length
      console.log("Spawning new fetcher: " + newName)
      Game.spawns["Spawn1"].spawnCreep(getFetcherBody(), newName, {
        memory: { role: "fetcher", emoji: "🛍️" }
      } as Pick<Fetcher, "memory">)
    }
    const spawnEye = () => {
      const newName = Game.time + "_" + "Eyes" + eyes.length
      console.log("Spawning new eye: " + newName)
      Game.spawns["Spawn1"].spawnCreep(
        [MOVE], // 50
        newName,
        { memory: { role: "eye", emoji: "👁️" } } as Pick<Eye, "memory">
      )
    }
    /**
     * [WORK, MOVE, MOVE, CARRY], // 250
     * [WORK, WORK, MOVE, MOVE, MOVE, CARRY], // 400
     * [WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, CARRY], // 500
     * */
    const getBuilderBody = () => {
      if (energyMax < 400) return [WORK, MOVE, MOVE, CARRY] // 250
      if (energyMax < 500) return [WORK, WORK, MOVE, MOVE, MOVE, CARRY] // 400
      // if (energyMax >= 500)
      return [WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, CARRY] // 500
    }
    const spawnBuilder = () => {
      const newName = Game.time + "_" + "Builder" + builders.length
      console.log("Spawning new builder: " + newName)
      // [WORK, WORK, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY], // 500
      // [WORK, WORK, WORK, MOVE, CARRY, CARRY, CARRY, CARRY], // 550
      // [WORK, MOVE, MOVE, CARRY], // 250
      Game.spawns["Spawn1"].spawnCreep(getBuilderBody(), newName, {
        memory: { role: "builder", emoji: "🚧" }
      } as Pick<Builder, "memory">)
    }
    const getUpgraderBody = getBuilderBody
    const spawnUpgrader = () => {
      const newName = Game.time + "_" + "Upgrader" + upgraders.length
      console.log("Spawning new upgrader: " + newName)
      // [WORK, WORK, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY], // 500
      // [WORK, WORK, WORK, MOVE, CARRY, CARRY, CARRY, CARRY], // 550
      // [WORK, MOVE, MOVE, CARRY], // 250
      // [WORK, WORK, MOVE, CARRY], // 300
      Game.spawns["Spawn1"].spawnCreep(getUpgraderBody(), newName, {
        memory: { role: "upgrader", emoji: "⚡" }
      } as Pick<Upgrader, "memory">)
    }
    const spawnDefenderRanged = () => {
      const newName =
        Game.time + "_" + "DefenderRanged" + defendersRanged.length
      console.log("Spawning new defender ranged: " + newName)
      // [ATTACK, ATTACK, MOVE, MOVE], // 260
      // [ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE ], // 520
      Game.spawns["Spawn1"].spawnCreep(
        [MOVE, MOVE, RANGED_ATTACK], // 260
        newName,
        { memory: { role: "defenderRanged", emoji: "🏹" } } as Pick<
          DefenderRanged,
          "memory"
        >
      )
    }
    const spawnDefenderMelee = () => {
      const newName = Game.time + "_" + "DefenderMelee" + defendersMelee.length
      console.log("Spawning new defender melee: " + newName)
      // [ATTACK, ATTACK, MOVE, MOVE], // 260
      // [ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE ], // 520
      Game.spawns["Spawn1"].spawnCreep(
        [TOUGH, MOVE, MOVE, ATTACK], // 250
        newName,
        { memory: { role: "defenderMelee", emoji: "⚔️" } } as Pick<
          DefenderMelee,
          "memory"
        >
      )
    }
    const spawnHealer = () => {
      const newName = Game.time + "_" + "Healer" + healers.length
      console.log("Spawning new healer: " + newName)
      // [ATTACK, ATTACK, MOVE, MOVE], // 260
      // [ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE ], // 520
      Game.spawns["Spawn1"].spawnCreep(
        [HEAL, MOVE], // 300
        newName,
        { memory: { role: "healer", emoji: "🏥" } } as Pick<Healer, "memory">
      )
    }
    /**
     * 3 then n/4 harvester, n/2 miner, n/2 fetcher, n miner, n fetcher, 2 eye,
     * n/4 builder, n/4 upgrader, NO defenders x n mining sites in all rooms.
     * Builder only spawns if there are construction sites.
     * */
    if (
      totalCreeps < 3 ||
      harvesters.length <
        Math.max(Math.floor(n / 4), Math.floor(numberOfSources / 2))
    )
      spawnHarvester()
    else if (miners.length < Math.max(Math.floor(n / 2), numberOfSources))
      spawnMiner()
    else if (
      fetchers.length <
      Math.max(Math.floor(n / 4), Math.floor(numberOfSources / 2))
    )
      spawnFetcher()
    else if (miners.length < n) spawnMiner()
    else if (fetchers.length < Math.min(Math.floor(n / 2), numberOfSources))
      spawnFetcher()
    else if (eyes.length < 2) spawnEye()
    else if (
      builders.length < Math.max(Math.floor(n / 4), numberOfSources) &&
      // Sum construction sites in all spawns to make sure there is at least 1:
      totalConstructionSites > 0
    )
      spawnBuilder()
    else if (
      upgraders.length < Math.max(Math.floor(n / 4), numberOfSources) &&
      totalConstructionSites === 0
    )
      spawnUpgrader()
    else if (defendersRanged.length < 0) spawnDefenderRanged() // off
    else if (defendersMelee.length < 0) spawnDefenderMelee() // off
    else if (healers.length < 0) spawnHealer() // off
    else {
      // The fallback role is off
    }
  }

  // Visual display if spawn is spawning
  const spawnObject = Game.spawns["Spawn1"].spawning
  if (spawnObject) {
    const spawningCreep = Game.creeps[spawnObject.name]
    Game.spawns["Spawn1"].room.visual.text(
      spawningCreep.memory.emoji +
        spawningCreep.memory.role +
        +Math.floor(
          100 - (100 * spawnObject.remainingTime) / spawnObject.needTime
        ) +
        "%",
      Game.spawns["Spawn1"].pos.x + 1,
      Game.spawns["Spawn1"].pos.y,
      { align: "left", opacity: 0.8 }
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

  // Run all creeps
  for (const creep of creeps) {
    try {
      // Don't run creeps that are spawning
      if (creep.spawning) continue
      if (creep.memory.role == "defenderMelee")
        roleDefenderMelee.run(creep as DefenderMelee, overwhelmingForce)
      if (creep.memory.role == "defenderRanged")
        roleDefenderRanged.run(creep as DefenderRanged, overwhelmingForce)
      if (creep.memory.role == "miner")
        roleMiner.run(creep as Miner, allAvailableMineablePositions)
      if (creep.memory.role == "fetcher")
        roleFetcher.run(creep as Fetcher, allDroppedResources)
      if (creep.memory.role == "harvester")
        roleHarvester.run(creep as Harvester)
      if (creep.memory.role == "upgrader") roleUpgrader.run(creep as Upgrader)
      if (creep.memory.role == "builder") roleBuilder.run(creep as Builder)
      if (creep.memory.role == "healer")
        roleHealer.run(creep as Healer, creepsToHeal)
      if (creep.memory.role == "eye") roleEye.run(creep as Eye)
    } catch (e) {
      console.log(`${creep.name} threw a ${e}`)
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
const loop = ErrorMapper.wrapLoop(unwrappedLoop)

export { loop, unwrappedLoop }
