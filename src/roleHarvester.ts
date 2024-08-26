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
  sourceNumber: number
}

const roleHarvester = {
  run: function (creep: Harvester, harvesters: Harvester[]) {
    actionHarvest(creep, harvesters)
  }
}

export default roleHarvester
