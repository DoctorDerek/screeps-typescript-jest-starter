import actionHeal from "actionHeal"
import type { Position } from "main"

export interface Healer extends Creep {
  memory: HealerMemory
}

interface HealerMemory extends CreepMemory {
  role: "Healer"
  mission: "HEAL"
  destination: Position | null
  target: "container" | "extension" | null
}

const roleHealer = {
  run: function (creep: Healer, creepsToHeal: Creep[]) {
    actionHeal(creep, creepsToHeal)
  }
}

export default roleHealer
