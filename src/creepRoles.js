// How long does it take to harvest? Calculations
// 3000 energy is refilled every 300 game ticks
// 1 carry part ==> 2 energy units per tick
// Typical source has 3 access points ==> 3 miners
// If each has 2 carry parts (250 or 300 cost build with 1 or 2 moves)
// Then each of the 3 miners is harvesting 4 energy per tick
// So each tick it's dropping by 12
// Over the course of 300 game ticks, that's 3600
// So we run out after 250 game ticks, leaving 50 game ticks empty

/*  BODYPART_COST: {
        "move": 50,
        "work": 100,
        "attack": 80,
        "carry": 50,
        "heal": 250,
        "ranged_attack": 150,
        "tough": 10,
        "claim": 600
    }, */
// Default: (Harvester, Upgrader, Builder)
// Old default: Move + work + carry = 200
// Too slow: [WORK, WORK, MOVE, CARRY] = 300
// New default: Move + move + work + carry = 250
// Creep [CARRY, WORK, MOVE] will move 1 square per tick if it does not bear energy, and 1 square per 2 ticks if loaded.
// Slow Defender: (Attack and patrol)
// [TOUGH, ATTACK, ATTACK, ATTACK, MOVE] = 300
// Fast Defender: (Attack and patrol)
// [MOVE, MOVE, ATTACK, ATTACK, TOUGH, TOUGH, TOUGH, TOUGH] = 300
// Fetcher: (Dropped resources / Tanker)
// [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY] = 300
// Miner: (Static drop miner)
// [MOVE, WORK, WORK] = 250

/*
https://docs.screeps.com/api/#Creep
Body part 	Build cost 	Effect per one body part
MOVE 	50 	Decreases fatigue by 2 points per tick.
WORK 	100 	

Harvests 2 energy units from a source per tick.

Harvests 1 resource unit from a mineral or a deposit per tick.

Builds a structure for 5 energy units per tick.

Repairs a structure for 100 hits per tick consuming 1 energy unit per tick.

Dismantles a structure for 50 hits per tick returning 0.25 energy unit per tick.

Upgrades a controller for 1 energy unit per tick.
CARRY 	50 	Can contain up to 50 resource units.
ATTACK 	80 	Attacks another creep/structure with 30 hits per tick in a short-ranged attack.
RANGED_ATTACK 	150 	

Attacks another single creep/structure with 10 hits per tick in a long-range attack up to 3 squares long.

Attacks all hostile creeps/structures within 3 squares range with 1-4-10 hits (depending on the range).
HEAL 	250 	Heals self or another creep restoring 12 hits per tick in short range or 4 hits per tick at a distance.
CLAIM 	600 	

Claims a neutral room controller.

Reserves a neutral room controller for 1 tick per body part.

Attacks a hostile room controller downgrading its timer by 300 ticks per body parts.

Attacks a neutral room controller reservation timer by 1 tick per body parts.

A creep with this body part will have a reduced life time of 600 ticks and cannot be renewed.
TOUGH 	10 	No effect, just additional hit points to the creep's body. Can be boosted to resist damage. */

const creepRoles = [
  {
    role: "Miner",
    buildTemplate: [WORK, WORK, MOVE],
    emoji: "⛏️",
  },
]

creepRoles // export
