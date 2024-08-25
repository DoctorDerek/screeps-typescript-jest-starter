const actionFillUp = require("actionFillUp")
const actionExplore = require("actionExplore")

const roleBuilder = {
  /** @param {Creep} thisCreep **/
  run: function (thisCreep) {
    if (thisCreep.store[RESOURCE_ENERGY] < thisCreep.store.getCapacity()) {
      thisCreep.memory.mission = "FILL UP"
      thisCreep.say("🚧 FILL UP")
      actionFillUp(thisCreep)
    }
    if (thisCreep.store.getFreeCapacity() === 0) {
      thisCreep.memory.mission = "BUILD"
      const buildSites = thisCreep.room.find(FIND_MY_CONSTRUCTION_SITES)
      if (buildSites.length) {
        thisCreep.say("🚧 build")
        if (thisCreep.memory.buildSiteNumber == null) {
          thisCreep.memory.buildSiteNumber = Math.floor(
            Math.random() * buildSites.length
          )
          console.log(
            `${thisCreep.name} assigned to @buildSites[${thisCreep.memory.buildSiteNumber}]`
          )
        }
        if (
          thisCreep.build(buildSites[thisCreep.memory.buildSiteNumber]) ==
          ERR_NOT_IN_RANGE
        ) {
          thisCreep.moveTo(buildSites[thisCreep.memory.buildSiteNumber], {
            visualizePathStyle: { stroke: "#ffffff" },
          })
        } else if (
          thisCreep.build(buildSites[thisCreep.memory.buildSiteNumber]) != OK
        ) {
          // There was a different error
          console.log(
            `${thisCreep.name} build error ${thisCreep.build(
              buildSites[thisCreep.memory.buildSiteNumber]
            )} when trying to build ${
              buildSites[thisCreep.memory.buildSiteNumber]
            }`
          )
          thisCreep.memory.buildSiteNumber = null
        }
      } else {
        thisCreep.memory.mission = "EXPLORE"
        thisCreep.memory.destination = null
        thisCreep.memory.buildSiteNumber = null
        actionExplore(thisCreep)
      }
    }
  },
}

module.exports = roleBuilder
