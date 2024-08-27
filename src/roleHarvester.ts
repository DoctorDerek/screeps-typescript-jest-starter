import actionHarvest from "actionHarvest"
import type { Position } from "main"

export interface Harvester extends Creep {
  memory: HarvesterMemory
}

interface HarvesterMemory extends CreepMemory {
  role: "Harvester"
  mission: "PICK UP" | "DEPOSIT" | "EXPLORE"
  depositTargetNumber: number | null
  droppedResourceNumber: number | null
  objective: string | null
  destination: Position | null
  sourceNumber: number | null
  target: "container" | "extension" | null
}

const roleHarvester = {
  run: function (creep: Harvester) {
    actionHarvest(creep)
  }
}

export default roleHarvester
