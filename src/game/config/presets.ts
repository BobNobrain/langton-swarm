import type { UnitConfiguration } from './types';
import { BatteryConfiguration } from './battery';
import { EngineConfiguration } from './engine';
import { SolarConfiguration } from './solar';
import { StorageConfiguration } from './storage';
import { AssemblerConfiguration } from './assembler';
import { DrillConfiguration } from './drill';
import { parseProgram } from '../program/parser';
import { parser } from '../program/bsml';
import { compile } from '../program/compile';

export const MOTHER_PRESET: UnitConfiguration = {
    program: compileOrDie(`# This script handles unit assembly process for Cores
command spawn(blueprint target) {
    assembler.queue(target)
    state :assembling
}

state assembling {
    if not assembler.is_assembling {
        if assembler.queue_length == 0 {
            send_notification("Assembler queue finished")
            state :idle
        }

        assembler.start_from_queue
    }

    # perform the construction
    if not assembler.finish_assembling {
        # if something went wrong
        state :idle
    }
}

when assembler.queue_updated {
    state :assembling
}
`),
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
    scanner: false,
    program: compileOrDie(`# this is a simple program for a scouting drone
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
    navigator.find_route(navigator.closest_unknown)
    state :scouting_move
}
state scouting_move {
    if not navigator.has_next {
        state :scouting
    }
    engine.move(navigator.next_step)
}

state navigating {
    if not navigator.has_next {
        state :idle
    }
    engine.move(navigator.next_step)
}
`),
};

export const TEST_PRESET: UnitConfiguration = {
    program: compileOrDie(`# Unit's program is a state machine

when spawned {
    send_notification("ya rodilsya")
    engine.move(navigator.random)
}

command move(position to) {
    navigator.find_route(to)
    state :navigating
}

command mine {
    state :mining
}

command roam {
    state :roaming_start
}

command idle {}

command scan {
    scanner.scan
}

command drop {
    storage.unload_all
}
command load {
    storage.pickup_all
}

state roaming_start default {
    scanner.scan
    navigator.find_route(scanner.find_closest_unscanned)
    state :roaming_moving
}
state roaming_moving {
    if not navigator.has_next {
        state :roaming_start
    }
    engine.move(navigator.next_step)
}

state navigating {
    if not navigator.has_next {
        state :idle
    }
    engine.move(navigator.next_step)
}

state mining {
    if storage.get_free_space <= 0 or not drill.probe {
        state :full
    }

    drill.mine
}

state full {
    navigator.find_route(navigator.home)
    state :navigating
}
`),

    battery: BatteryConfiguration.Tier1Regular,
    drill: DrillConfiguration.Tier1,
    engine: EngineConfiguration.Tier1Cheap,
    navigator: true,
    scanner: true,
    storage: StorageConfiguration.Tier1Big,
    solar: SolarConfiguration.Tier1Regular,
};

export function createDefaultUnitConfig(): UnitConfiguration {
    return {
        program: compileOrDie(`# Unit's program is a state machine
when spawned {
    engine.move(navigator.random) # move away 1 cell in random direction
    state :idle
}

command move(position to) {
    if navigator.find_route(to) {
        state :navigating
    }
}

state navigating {
    if not navigator.has_next {
        # the destination has been reached
        state :idle
    }

    engine.move(navigator.next_step)
}

command mine {
    state :mining
}

state mining {
    if storage.is_full {
        # cannot mine anymore, no storage space left
        state :idle
    }
    if not drill.probe {
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
    if not navigator.has_next {
        storage.unload_all # transfer what we have to main storage
        engine.move(navigator.random)
        state :idle
    }

    engine.move(navigator.next_step)
}
`),
        battery: BatteryConfiguration.Tier1Small,
        drill: DrillConfiguration.Tier1,
        engine: EngineConfiguration.Tier1Cheap,
        navigator: true,
        storage: StorageConfiguration.Tier1Regular,
        solar: SolarConfiguration.Tier1Regular,
    };
}

export const AUTO_MINER_PRESET: UnitConfiguration = {
    program: compileOrDie(`# This is a program for an automatic mining unit.
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
    deposit = scanner.closest_surface_deposit
    if deposit /= navigator.location {
        navigator.find_route(deposit)
        state :navigating
    }

    if storage.get_filled_share > 0 {
        state :find_home
    }

    engine.move(navigator.random)
}

state navigating {
    if not navigator.has_next {
        state :mining
    }

    engine.move(navigator.next_step)
}

state mining {
    if storage.is_full {
        # cannot mine anymore, no storage space left or the deposit has been drained
        state :find_home
    }
    if not drill.probe {
        if storage.get_filled_share > 0.3 {
            state :find_home
        }
        state :roaming
    }

    drill.mine
}

state find_home {
    navigator.find_route(navigator.home)
    state :returning
}

state returning {
    if not navigator.has_next {
        # we're home
        storage.unload_all
        state :roaming
    }

    engine.move(navigator.next_step)
}
`),
    battery: BatteryConfiguration.Tier1Big,
    drill: DrillConfiguration.Tier1,
    engine: EngineConfiguration.Tier1Cheap,
    navigator: true,
    storage: StorageConfiguration.Tier1Big,
    solar: SolarConfiguration.Tier1Regular,
    scanner: true,
};

export const SIMPLE_BUILDER_PRESET: UnitConfiguration = {
    program: compileOrDie(`# This is a program for a simple manual construction unit

when spawned {
    engine.move(navigator.random)
}

command move(position to) {
    if navigator.find_route(to) {
        state :navigating
    }
}

state navigating {
    if not navigator.has_next {
        # the destination has been reached
        state :idle
    }

    engine.move(navigator.next_step)
}

command start(blueprint target) {
    if not assembler.create_construction_site(target) {
        state :idle
    }

    state :constructing
}

command construct {
    state :constructing
}

state constructing {
    storage.unload_max(assembler.get_site_missing_materials)
    if not assembler.finish_construction {
        # show_error("Not enough materials")
        engine.move(navigator.random)
        state :idle
    }

    # send_notification("Construction done")
    engine.move(navigator.random) # and then move 1 tile away
    state :idle
}
`),
    battery: BatteryConfiguration.Tier1Regular,
    engine: EngineConfiguration.Tier1Cheap,
    navigator: true,
    storage: StorageConfiguration.Tier1Big,
    solar: SolarConfiguration.Tier1Regular,
    assembler: AssemblerConfiguration.Tier1,
};

export const MINING_RIG_PRESET: UnitConfiguration = {
    program: compileOrDie(`
command mine {
    state :mining
}
command halt {}

state mining {
    drill.mine
}
`),
    drill: DrillConfiguration.Tier2,
    storage: StorageConfiguration.Tier1Big,
    solar: SolarConfiguration.Tier1Regular,
    battery: BatteryConfiguration.Tier1Big,
};

// private presets for in-game use
export const PILE_PRESET: UnitConfiguration = {
    storage: StorageConfiguration.Infinite,
};

export function constructionSitePreset(target: UnitConfiguration): UnitConfiguration {
    return {
        construction: target,
        storage: StorageConfiguration.Infinite,
    };
}

function compileOrDie(source: string): NonNullable<UnitConfiguration['program']> {
    const parsed = parseProgram(source, parser.parse(source));
    if (parsed.errors.length) {
        console.error(source);
        console.error(parsed);
        for (const error of parsed.errors) {
            console.error(error.message);
            console.error(source.substring(error.pos.from, error.pos.to));
        }
        throw new Error('failed to parse built-in program');
    }

    const compiled = compile(parsed.program);

    return {
        source,
        compiled,
    };
}
