// var actionExplore = require("actionExplore")

function actionFillUp(thisCreep) {
  thisCreep.say("🚶 FILL UP")
  const targetFillUpSite = thisCreep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
    //var targets = thisCreep.room.find(FIND_MY_STRUCTURES, {
    // var targets = Game.spawns["Spawn1"].room.find(FIND_MY_STRUCTURES, {
    filter: (structure) => {
      return (
        (structure.structureType == STRUCTURE_CONTAINER ||
          structure.structureType == STRUCTURE_STORAGE) &&
        structure.store.getUsedCapacity(RESOURCE_ENERGY) >= 50
        /*        (structure.structureType == STRUCTURE_EXTENSION ||
          structure.structureType == STRUCTURE_SPAWN ||
          structure.structureType == STRUCTURE_TOWER ||
          structure.structureType == STRUCTURE_CONTAINER ||
          structure.structureType == STRUCTURE_STORAGE) &&
        structure.store.getUsedCapacity(RESOURCE_ENERGY) >= 50*/
      )
    }
  })
  if (targetFillUpSite != null) {
    // There is somewhere to fill up in the current room
    /*    console.log(
      `${thisCreep.name} attempting withdraw with result ${thisCreep.withdraw(
        targetFillUpSite,
        RESOURCE_ENERGY
      )}`
    )*/
    if (
      thisCreep.withdraw(targetFillUpSite, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE
    ) {
      thisCreep.moveTo(targetFillUpSite, {
        visualizePathStyle: { stroke: "#ffffff" }
      })
    }
  } else {
    // Maybe there are some dropped resources we can go grab
    const droppedResourceTarget = thisCreep.pos.findClosestByPath(
      FIND_DROPPED_RESOURCES,
      {
        filter: function (resource) {
          return resource.amount >= 0
        }
      }
    )

    if (droppedResourceTarget != null) {
      thisCreep.say("🔄 PICK UP")
      if (thisCreep.pickup(droppedResourceTarget) == ERR_NOT_IN_RANGE) {
        thisCreep.moveTo(droppedResourceTarget, {
          visualizePathStyle: { stroke: "#ffaa00" }
        })
      }
    }
  }
}

module.exports = actionFillUp
