import type { UnitConfiguration } from './types';
import { BatteryConfiguration } from './battery';
import { EngineConfiguration } from './engine';
import { SolarConfiguration } from './solar';
import { StorageConfiguration } from './storage';
import { AssemblerConfiguration } from './assembler';
import { DrillConfiguration } from './drill';

export const MOTHER_PRESET: UnitConfiguration = {
    assembler: AssemblerConfiguration.Tier2,
    battery: BatteryConfiguration.Tier2,
    solar: SolarConfiguration.Tier2Mobile,
    storage: StorageConfiguration.Tier2Big,
};

export const DEFAULT_SCOUT_PRESET: UnitConfiguration = {
    battery: BatteryConfiguration.Tier1Small,
    engine: EngineConfiguration.Tier1Cheap,
    solar: SolarConfiguration.Tier1Cheap,
    navigator: true,
    scanner: true,
    cpu: `# this is a simple program for a scouting drone
command move(position to) {
    navigator.find_route(to)
    state :navigating
}

command scout {
    state :scouting
}

command return {
    navigator.find_route(navigator.home)
    state :navigating
}

command idle {}

state scouting default {
    engine.move(random)
}

state navigating {
    when not navigator.has_next {
        state :idle
    }
    engine.move(navigator.next_step)
}
`,
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

    battery: BatteryConfiguration.Tier1Regular,
    drill: DrillConfiguration.Tier1,
    engine: EngineConfiguration.Tier1Cheap,
    navigator: true,
    scanner: true,
    storage: StorageConfiguration.Tier1Big,
    solar: SolarConfiguration.Tier1Regular,
};

export const PILE_PRESET: UnitConfiguration = {
    storage: StorageConfiguration.Infinite,
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
        battery: BatteryConfiguration.Tier1Small,
        drill: DrillConfiguration.Tier1,
        engine: EngineConfiguration.Tier1Cheap,
        navigator: true,
        storage: StorageConfiguration.Tier1Regular,
        solar: SolarConfiguration.Tier1Regular,
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
    battery: BatteryConfiguration.Tier1Big,
    drill: DrillConfiguration.Tier1,
    engine: EngineConfiguration.Tier1Cheap,
    navigator: true,
    storage: StorageConfiguration.Tier1Big,
    solar: SolarConfiguration.Tier1Regular,
    scanner: true,
};
