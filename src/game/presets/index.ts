import type { UnitConfiguration } from '../types';

export const MOTHER_PRESET: UnitConfiguration = {
    battery: { capacity: 10_000 },
    storage: { size: 10_000 },
    navigator: false,
    mother: true,
};

export const TEST_PRESET: UnitConfiguration = {
    cpu: `# Unit's program is a state machine

command move(position to) {
    navigator.find_route(to)
    state :navigating
}

command mine {
    state :mining
}

command roam {
    state :roaming
}

command idle {}

command scan {
    when scanner.find_largest_deposit(3) {
        navigator.find_route(scanner.found_location())
        state :navigating
    }

    state :idle
}

command drop {
    storage.unload_all
}
command load {
    storage.pickup_all
}

state roaming default {
    engine.move(random)
}

state navigating {
    when not navigator.has_next {
        state :idle
    }
    engine.move(navigator.next_step)
}

state mining {
    when storage.get_free_space <= 0 or not drill.probe {
        state :idle
    }

    drill.mine
}
`,

    battery: { capacity: 100 },
    drill: true,
    engine: {
        power: 1,
    },
    navigator: true,
    scanner: true,
    storage: { size: 100 },
};

export const PILE_PRESET: UnitConfiguration = {
    storage: { size: Infinity },
};

export function createDefaultUnitConfig(): UnitConfiguration {
    return {
        cpu: `# Unit's program is a state machine
when spawned {
    engine.move(random) # move away 1 cell in random direction
    state :idle
}

command move(position to) {
    when navigator.find_route(to) {
        state :navigating
    }
}

state navigating {
    when not navigator.has_next {
        # the destination has been reached
        state :idle
    }

    engine.move(navigator.next_step)
}

command mine {
    state :mining
}

state mining {
    when storage.is_full {
        # cannot mine anymore, no storage space left
        state :idle
    }
    when not drill.probe {
        state :idle
    }

    drill.mine
}

command stop {
    state :idle
}

command home {
    navigator.find_route(navigator.home)
    state :returning
}

state returning {
    when not navigator.has_next {
        storage.unload_all # transfer what we have to main storage
        engine.move(random)
        state :idle
    }

    engine.move(navigator.next_step)
}
`,
        battery: { capacity: 100 },
        drill: true,
        engine: {
            power: 1,
        },
        navigator: true,
        storage: { size: 100 },
        scanner: false,
    };
}

export const AUTO_MINER_PRESET: UnitConfiguration = {
    cpu: `# This is a program for an automatic mining unit.
# It will roam until found a resource vein,
# then mine it until its storage is full,
# and return all the resources home

command stop {}
command roam {
    state :roaming
}
command return {
    state :find_home
}

state roaming default {
    engine.move(random)
    when scanner.find_closest_deposit {
        navigator.find_route(scanner.found_location)
        state :navigating
    }
}

state navigating {
    when not navigator.has_next {
        state :mining
    }

    engine.move(navigator.next_step)
}

state mining {
    when storage.is_full or not drill.probe {
        # cannot mine anymore, no storage space left or the deposit has been drained
        state :find_home
    }

    drill.mine
}

state find_home {
    navigator.find_route(navigator.home)
    state :returning
}

state returning {
    when not navigator.has_next {
        # we're home
        storage.unload_all
        state :roaming
    }

    engine.move(navigator.next_step)
}
`,
    battery: { capacity: 100 },
    drill: true,
    engine: {
        power: 1,
    },
    navigator: true,
    storage: { size: 100 },
    scanner: true,
};
