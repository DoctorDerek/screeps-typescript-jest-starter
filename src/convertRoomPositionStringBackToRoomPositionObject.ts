function convertRoomPositionStringBackToRoomPositionObject(
  stringRoomPosition: string
) {
  // input example: [room E56N8 pos 23,26]
  // output example: new RoomPosition(23, 26, 'E56N8');
  // Using the constructor for to create a new RoomPosition object: constructor(x, y, roomName)
  // Output example: const pos = new RoomPosition(10, 25, 'sim');
  // --> from https://docs.screeps.com/api/#RoomPosition
  const regExp = /room (?<roomName>\w+) pos (?<x>\d+),(?<y>\d+)/
  // Board is a 50x50 grid with coordinates ranging from 0 to 49 i.e. 1-2 digits
  const resultOfRegExp = regExp.exec(stringRoomPosition)

  if (resultOfRegExp == null) {
    console.log(`Failed RegExp exec on ${stringRoomPosition}`)
    return new RoomPosition(25, 25, Game.spawns["Spawn1"].room.name)
  } else {
    if (!resultOfRegExp.groups) {
      console.log(`Failed RegExp exec on ${stringRoomPosition}`)
      return new RoomPosition(25, 25, Game.spawns["Spawn1"].room.name)
    }
    const roomName = resultOfRegExp.groups.roomName // e.g. E56N8
    const xCoordinate = Number(resultOfRegExp.groups.x) // e.g. 23
    const yCoordinate = Number(resultOfRegExp.groups.y) // e.g. 26
    return new RoomPosition(xCoordinate, yCoordinate, roomName) // e.g. new RoomPosition(23, 26, "E56N8")
  }
}

export default convertRoomPositionStringBackToRoomPositionObject
// [room E56N8 pos 0,45]
