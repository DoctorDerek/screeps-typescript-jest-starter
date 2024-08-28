import actionHeal from "actionHeal"
import type { Position } from "main"

export interface Healer extends Creep {
  memory: HealerMemory
}

interface HealerMemory extends CreepMemory {
  role: "healer"
  mission: "HEAL"
  destination: Position | null
  target: "container" | "extension" | null
  emoji: "🏥"
}

const roleHealer = {
  run: function (creep: Healer, creepsToHeal: Creep[]) {
    actionHeal(creep, creepsToHeal)
  }
}

export default roleHealer
