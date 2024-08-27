import actionExplore from "actionExplore"
import type { Position } from "main"

export interface Eye extends Creep {
  memory: EyeMemory
}

interface EyeMemory extends CreepMemory {
  role: "eye"
  mission: "EXPLORE" | "THINK" | null
  destination: Position | null
}

const roleEye = {
  run: function (creep: Eye) {
    actionExplore(creep)
  }
}

export default roleEye
