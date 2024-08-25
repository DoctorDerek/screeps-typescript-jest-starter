var actionHarvest = require("actionHarvest")

var roleHarvester = {
  /** @param {Creep} creep **/
  run: function (creep) {
    actionHarvest(creep)
  }
}

module.exports = roleHarvester
