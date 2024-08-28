import parsePosition from "parsePosition"

export default function parseDestination(thisCreep: Creep) {
  if (typeof thisCreep.memory.destination !== "string")
    return { roomName: null, x: null, y: null }
  const destination = thisCreep.memory.destination
  const { roomName, x, y } = parsePosition(destination)
  // console.log(`${destination} parseDestination: ${roomName}, ${x}, ${y}`)
  return { roomName, x, y }
}
