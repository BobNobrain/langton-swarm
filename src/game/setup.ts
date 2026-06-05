import type { Game } from '.';
import { getCameraOrbitForCoords } from './camera';
import { AUTO_MINER_PRESET, DEFAULT_SCOUT_PRESET, MOTHER_PRESET } from './config';
import { MINING_RIG_PRESET, SIMPLE_BUILDER_PRESET, TEST_PRESET } from './config/presets';
import { spawnFromDeck } from './utils';

export function setupNewGame(
    g: Game,
    cheats: {
        riches?: boolean;
        fog?: boolean;
    } = {},
) {
    const coreBp = g.playerDeck.create('Core_Module', MOTHER_PRESET);
    const spawnLocation = g.world.spawnLocation;
    const coreId = spawnFromDeck(g.playerDeck, g.units.spawn, spawnLocation, coreBp.id)!;
    g.units.inventory.add({
        to: coreId,
        amounts: { structural: 150, electrical: 150, energetical: 100 },
    });

    if (cheats.riches) {
        g.units.inventory.add({
            to: coreId,
            amounts: { structural: 1000, electrical: 1000, energetical: 1000 },
        });
    }

    if (cheats.fog) {
        g.world.discoverNodes(g.world.terraIncognita);
    }

    const { yaw, pitch } = getCameraOrbitForCoords(g.world.surface[spawnLocation].position);
    g.camera.setInstant({ yaw, pitch });

    g.playerDeck.create('Simple_Scout', DEFAULT_SCOUT_PRESET);
    g.playerDeck.create('Simple_Auto_Miner', AUTO_MINER_PRESET);
    g.playerDeck.create('Simple_Builder', SIMPLE_BUILDER_PRESET);
    g.playerDeck.create('Mining_Rig', MINING_RIG_PRESET);

    g.playerDeck.create('Test', TEST_PRESET);
}
