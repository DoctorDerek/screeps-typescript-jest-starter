import actionHeal from "actionHeal"

export interface Healer extends Creep {
  memory: HealerMemory
}

interface HealerMemory extends CreepMemory {
  role: "Healer"
  mission: "HEAL"
  destination: string | null
}

const roleHealer = {
  run: function (creep: Healer, creepsToHeal: Creep[]) {
    actionHeal(creep, creepsToHeal)
  }
}

export default roleHealer
