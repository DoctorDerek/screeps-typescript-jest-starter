import clear from "rollup-plugin-clear"
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import typescript from "rollup-plugin-typescript2"
import screeps from "rollup-plugin-screeps"

let cfg
const dest = process.env.DEST
if (!dest) {
  console.log(
    "No destination specified - code will be compiled but not uploaded"
  )
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  cfg = require("./screeps.json")[dest]
  if (!cfg) {
    throw new Error("Invalid upload destination")
  }
}

export default {
  input: "src/main.ts",
  output: {
    file: "C:/Users/derek/AppData/Local/Screeps/scripts/127_0_0_1___21025/default/main.js",
    format: "cjs",
    sourcemap: true
  },

  plugins: [
    clear({ targets: ["dist"] }),
    resolve(),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" }),
    screeps({ config: cfg, dryRun: cfg == null })
  ]
}
