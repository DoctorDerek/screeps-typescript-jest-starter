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
    destination?: Position | null | { x: number; y: number }
  }
}
function unwrappedLoop() {
  // Housekeeping: Delete dead creeps from memory
  for (const name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name]
      console.log("Clearing non-existing creep memory:", name)
    }
  }

  // Trigger safe mode if spawn is under half health (last resort)
  if (Game.spawns["Spawn1"].hits < Game.spawns["Spawn1"].hitsMax / 2)
    Game.spawns["Spawn1"].room.controller?.activateSafeMode()

  const miners = _.filter(
    Game.creeps,
    (creep) => creep.memory.role == "miner"
  ) as Miner[]

  const thisRoom = Game.spawns["Spawn1"].room
  const RCL = thisRoom.controller?.level

  // Populate the mineablePositions hash map across rooms where I have vision
  const allRooms = Object.keys(Game.rooms) as RoomName[]
  const mineablePositionsMap = new Map() as MineablePositionsMap

  const allDroppedResources: Resource[] = []
  // Only target resources that have at least that many times carryingCapacity

  /*const droppedResources = thisCreep.room.find(FIND_DROPPED_RESOURCES, {
    filter: function (resource) {
      return resource.amount >= 1 * carryingCapacity
    },
  })*/
  // Target 1x carryingCapacity, i.e. full loads only */

  const allContainers: StructureContainer[] = []

  for (const roomName of allRooms) {
    const thisRoom = Game.rooms[roomName]
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
  }

  // Ant-style: mark current position for a future road
  const fetchers = _.filter(
    Game.creeps,
    (creep) => creep.memory.role == "fetcher"
  ) as Fetcher[]
  const upgraders = _.filter(
    Game.creeps,
    (creep) => creep.memory.role == "upgrader"
  ) as Upgrader[]
  const creepsForRoads = [...fetchers, ...upgraders]
  if (
    RCL &&
    RCL >= 4 && // Only build roads at RCL 4 and above
    // Limit the number of construction sites to 10 per room:
    thisRoom.find(FIND_CONSTRUCTION_SITES).length < 10
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

  const totalMineablePositions = allMineablePositions.size

  /** `n` is how many miners and used as the factor for priority order */
  const n = totalMineablePositions

  const totalCreeps = Object.values(Game.creeps).length

  // The hash map mineablePositions now only includes available positions
  // Sum all sources across all spawns
  const numberOfSources = Object.values(Game.spawns).reduce(
    (acc, spawn) => acc + spawn.room.find(FIND_SOURCES).length,
    0
  )
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
  if (
    Game.spawns["Spawn1"].room.energyAvailable >= 300 &&
    Game.spawns["Spawn1"].spawning == undefined
  ) {
    const harvesters = _.filter(
      Game.creeps,
      (creep) => creep.memory.role == "harvester"
    ) as Harvester[]
    console.log("Harvesters: " + harvesters.length)
    // Moved up
    console.log("Upgraders: " + upgraders.length)
    const builders = _.filter(
      Game.creeps,
      (creep) => creep.memory.role == "builder"
    ) as Builder[]
    console.log("Builders: " + builders.length)
    const defendersRanged = _.filter(
      Game.creeps,
      (creep) => creep.memory.role == "defenderRanged"
    ) as DefenderRanged[]
    console.log("Defenders Ranged: " + defendersRanged.length)
    const defendersMelee = _.filter(
      Game.creeps,
      (creep) => creep.memory.role == "defenderMelee"
    ) as DefenderMelee[]
    console.log("Defenders Melee: " + defendersMelee.length)
    // Moved up
    console.log("Fetchers: " + fetchers.length)
    // Moved up
    console.log("Miners: " + miners.length)
    const healers = _.filter(
      Game.creeps,
      (creep) => creep.memory.role == "healer"
    ) as Miner[]
    console.log("Healers: " + healers.length)
    const eyes = _.filter(
      Game.creeps,
      (creep) => creep.memory.role == "eye"
    ) as Miner[]
    console.log("Eyes: " + eyes.length)

    /**
     * Once I have 2 miners, 1 of the 2 harvesters transform into a fetcher.
     * Then once I have n miners, the remaining harvester transforms into an
     * upgraders, as goal 1 is RCL 3 + 7-10 extensions to get claimers.
     * */
    if (miners.length >= 2 && harvesters.length >= 2) {
      const harvester = harvesters[0]
      const fetcher = harvester as unknown as Fetcher
      fetcher.memory.role = "fetcher"
      fetcher.memory.mission = "PICK UP"
      fetcher.memory.destination = null
    }
    if (miners.length >= n && harvesters.length >= 1) {
      harvesters.forEach((harvester: Harvester) => {
        const upgrader = harvester as unknown as Upgrader
        upgrader.memory.role = "upgrader"
        upgrader.memory.upgrading = false
        upgrader.memory.destination = null
      })
    }
    // If there are no construction sites, the builders transform into upgraders
    if (
      Object.values(Game.spawns).reduce(
        (acc, spawn) =>
          acc + spawn.room.find(FIND_MY_CONSTRUCTION_SITES).length,
        0
      ) === 0 &&
      builders.length > 0
    ) {
      builders.forEach((builder: Builder) => {
        const upgrader = builder as unknown as Upgrader
        upgrader.memory.role = "upgrader"
        upgrader.memory.destination = null
      })
    }

    // 2 harvesters to start, then min 2 eyes at all times, then
    // n/2 miner, n/2 fetcher, n miner, n fetcher, n/4 builder, n/4 upgrader,
    // NO defenders
    // x n sources across all rooms
    // Builder will only spawn if there are construction sites.
    if (totalCreeps < 2) {
      const newName = Game.time + "_" + "Harvester" + harvesters.length
      console.log("Spawning new harvester: " + newName)
      // [WORK, WORK, MOVE, MOVE, CARRY, CARRY], // 500
      // [WORK, WORK, WORK, MOVE, CARRY, CARRY, CARRY, CARRY], // 550
      // [WORK, MOVE, MOVE, CARRY], // 250
      Game.spawns["Spawn1"].spawnCreep(
        [WORK, WORK, MOVE, CARRY], // 300
        newName,
        { memory: { role: "harvester" } }
      )
    } else if (miners.length < Math.max(Math.floor(n / 2), numberOfSources)) {
      const newName = Game.time + "_" + "Miner" + miners.length
      console.log("Spawning new miner: " + newName)
      //  [WORK, WORK, MOVE, MOVE], // 300
      // [WORK, WORK, WORK, WORK, MOVE, MOVE], // 500
      Game.spawns["Spawn1"].spawnCreep(
        [WORK, WORK, MOVE], // 250
        newName,
        { memory: { role: "miner" } }
      )
    } else if (fetchers.length < Math.max(Math.floor(n / 2), numberOfSources)) {
      const newName = Game.time + "_" + "Fetcher" + fetchers.length
      console.log("Spawning new fetcher: " + newName)
      // [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY], // 500
      //        [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY], // 300
      Game.spawns["Spawn1"].spawnCreep(
        [MOVE, MOVE, CARRY, CARRY, CARRY, CARRY], // 300
        newName,
        { memory: { role: "fetcher" } }
      )
    } else if (miners.length < n) {
      const newName = Game.time + "_" + "Miner" + miners.length
      console.log("Spawning new miner: " + newName)
      //  [WORK, WORK, MOVE, MOVE], // 300
      // [WORK, WORK, WORK, WORK, MOVE, MOVE], // 500
      Game.spawns["Spawn1"].spawnCreep(
        [WORK, WORK, MOVE], // 250
        newName,
        { memory: { role: "miner" } }
      )
    } else if (fetchers.length < n) {
      const newName = Game.time + "_" + "Fetcher" + fetchers.length
      console.log("Spawning new fetcher: " + newName)
      // [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY], // 500
      //        [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY], // 300
      Game.spawns["Spawn1"].spawnCreep(
        [MOVE, MOVE, CARRY, CARRY, CARRY, CARRY], // 300
        newName,
        { memory: { role: "fetcher" } }
      )
    } else if (eyes.length < 2) {
      const newName = Game.time + "_" + "Eyes" + eyes.length
      console.log("Spawning new eye: " + newName)
      Game.spawns["Spawn1"].spawnCreep(
        [MOVE], // 50
        newName,
        { memory: { role: "eye" } }
      )
    } else if (
      builders.length < Math.max(Math.floor(n / 4), numberOfSources) &&
      // Sum construction sites in all spawns to make sure there is at least 1:
      Object.values(Game.spawns).reduce(
        (acc, spawn) =>
          acc + spawn.room.find(FIND_MY_CONSTRUCTION_SITES).length,
        0
      ) > 0
    ) {
      const newName = Game.time + "_" + "Builder" + builders.length
      console.log("Spawning new builder: " + newName)
      // [WORK, WORK, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY], // 500
      // [WORK, WORK, WORK, MOVE, CARRY, CARRY, CARRY, CARRY], // 550
      // [WORK, MOVE, MOVE, CARRY], // 250
      Game.spawns["Spawn1"].spawnCreep(
        [WORK, WORK, MOVE, CARRY], // 300
        newName,
        { memory: { role: "builder" } }
      )
    } else if (
      upgraders.length < Math.max(Math.floor(n / 4), numberOfSources)
    ) {
      const newName = Game.time + "_" + "Upgrader" + upgraders.length
      console.log("Spawning new upgrader: " + newName)
      // [WORK, WORK, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY], // 500
      // [WORK, WORK, WORK, MOVE, CARRY, CARRY, CARRY, CARRY], // 550
      // [WORK, MOVE, MOVE, CARRY], // 250
      Game.spawns["Spawn1"].spawnCreep(
        [WORK, WORK, MOVE, CARRY], // 300
        newName,
        { memory: { role: "upgrader" } }
      )
    } else if (defendersRanged.length < 0) {
      // off
      const newName = Game.time + "_" + "DefRanged" + defendersRanged.length
      console.log("Spawning new defender ranged: " + newName)
      // [ATTACK, ATTACK, MOVE, MOVE], // 260
      // [ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE ], // 520
      Game.spawns["Spawn1"].spawnCreep(
        [TOUGH, MOVE, MOVE, RANGED_ATTACK], // 260
        newName,
        { memory: { role: "defenderRanged" } }
      )
    } else if (defendersMelee.length < 0) {
      // off
      const newName = Game.time + "_" + "DefMelee" + defendersMelee.length
      console.log("Spawning new defender melee: " + newName)
      // [ATTACK, ATTACK, MOVE, MOVE], // 260
      // [ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE ], // 520
      Game.spawns["Spawn1"].spawnCreep(
        [TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK], // 250
        newName,
        { memory: { role: "defenderMelee" } }
      )
    } else if (healers.length < 0) {
      // off
      const newName = Game.time + "_" + "Healer" + healers.length
      console.log("Spawning new healer: " + newName)
      // [ATTACK, ATTACK, MOVE, MOVE], // 260
      // [ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE ], // 520
      Game.spawns["Spawn1"].spawnCreep(
        [HEAL, MOVE], // 300
        newName,
        { memory: { role: "healer" } }
      )
    }
    // The fallback role is off
    else {
    }
  }

  // Visual display if spawn is spawning
  const spawnObject = Game.spawns["Spawn1"].spawning
  if (spawnObject) {
    const spawningCreep = Game.creeps[spawnObject.name]
    Game.spawns["Spawn1"].room.visual.text(
      "🛠️" +
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
  const overwhelmingForce =
    creeps.filter(
      (creep) =>
        creep.memory.role === "defenderMelee" ||
        creep.memory.role === "defenderRanged" ||
        creep.memory.role === "healer"
    ).length >= 12

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
        roleFetcher.run(creep as Fetcher, allDroppedResources, allContainers)
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
