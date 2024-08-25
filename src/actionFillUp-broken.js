const actionFillUp = function (thisCreep) {
  thisCreep.say("🔄 FILL UP")
  thisCreep.memory.sourceNumber = null // Clear current source
  const storageSites = thisCreep.room.find(FIND_MY_STRUCTURES, {
    filter: (structure) => {
      return (
        (structure.structureType == STRUCTURE_EXTENSION ||
          structure.structureType == STRUCTURE_SPAWN ||
          structure.structureType == STRUCTURE_TOWER ||
          structure.structureType == STRUCTURE_CONTAINER ||
          structure.structureType == STRUCTURE_STORAGE) &&
        structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
      )
    }
  })
  if (thisCreep.memory.storageSiteNumber > storageSites.length) {
    thisCreep.memory.storageSiteNumber = null
  }

  if (storageSites.length > 0) {
    if (thisCreep.memory.storageSiteNumber == null) {
      thisCreep.memory.storageSiteNumber = Math.floor(
        Math.random() * storageSites.length
      )
      console.log(
        `${thisCreep.name} assigned to @storageSites[${thisCreep.memory.storageSiteNumber}]`
      )
    }
    if (
      thisCreep.withdraw(
        storageSites[thisCreep.memory.storageSiteNumber],
        RESOURCE_ENERGY
      ) == ERR_NOT_IN_RANGE
    ) {
      thisCreep.moveTo(storageSites[thisCreep.memory.storageSiteNumber].pos, {
        visualizePathStyle: { stroke: "#ffffff" }
      })
    } else if (
      thisCreep.withdraw(
        storageSites[thisCreep.memory.storageSiteNumber],
        RESOURCE_ENERGY
      ) != OK &&
      thisCreep.withdraw(
        storageSites[thisCreep.memory.storageSiteNumber],
        RESOURCE_ENERGY
      ) != ERR_BUSY // still being spawned
    ) {
      // There was a different error
      console.log(
        `${thisCreep.name} withdraw error ${thisCreep.withdraw(
          storageSites[thisCreep.memory.storageSiteNumber],
          RESOURCE_ENERGY
        )} Storage unit ${storageSites[thisCreep.memory.storageSiteNumber]} 
         Structure Type ${
           storageSites[thisCreep.memory.storageSiteNumber].structureType
         }`
      )
      thisCreep.memory.storageSiteNumber = null
    }
  }
}

module.exports = actionFillUp
