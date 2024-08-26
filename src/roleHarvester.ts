import actionHarvest from "actionHarvest"

export interface Harvester extends Creep {
  memory: HarvesterMemory
}

interface HarvesterMemory extends CreepMemory {
  role: "Harvester"
  mission: "PICK UP" | "DEPOSIT" | "EXPLORE"
  depositTargetNumber: number | null
  droppedResourceNumber: number | null
  objective: string | null
  destination: { x: number; y: number } | null
  sourceNumber: number | null
}

const roleHarvester = {
  run: function (creep: Harvester, harvesters: Harvester[]) {
    // Harvester is the first creep and is useless after 500 ticks
    if ((creep?.ticksToLive || 1500) < 1000) creep.suicide()
    actionHarvest(creep, harvesters)
  }
}

export default roleHarvester
