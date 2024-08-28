export default function parseDestination(thisCreep: Creep) {
  if (typeof thisCreep.memory.destination !== "string")
    return { roomName: null, x: null, y: null }
  const groups = /room (\w+) pos (\d+),(\d+)/.exec(thisCreep.memory.destination)
  const roomName = groups?.[1] ? groups[1] : null
  const x = groups?.[2] ? Number(groups[2]) : null
  const y = groups?.[3] ? Number(groups[3]) : null
  // console.log(
  //   `${thisCreep.memory.destination} parseDestination: ${roomName}, ${x}, ${y}`
  // )
  return { roomName, x, y }
}
