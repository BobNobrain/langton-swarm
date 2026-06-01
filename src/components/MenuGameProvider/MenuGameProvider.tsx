import { createSignal, onCleanup, onMount, Show, type ParentComponent } from 'solid-js';
import { createGame, type Game, type NodeId } from '@/game';
import { getCameraOrbitForCoords } from '@/game/camera';
import { AUTO_MINER_PRESET, DEFAULT_SCOUT_PRESET, MINING_RIG_PRESET, MOTHER_PRESET } from '@/game/config/presets';
import { spawnFromDeck } from '@/game/utils';
import { GameProvider } from '@/gameContext';
import { createTimeout } from '@/lib/timeouts';
import styles from './MenuGameProvider.module.css';

type SpawnTask = {
    delay: number;
    task: () => void;
};

export const MenuGameProvider: ParentComponent = (props) => {
    const [game, setGame] = createSignal<Game | null>(null);

    const timeout = createTimeout();

    onMount(() => {
        createGame({
            worldgen: { seed: 'langton-swarm' },
        }).then((g) => {
            const coreBp = g.playerDeck.create('Core_Module', MOTHER_PRESET);
            const spawnLocation = g.world.spawnLocation;
            spawnFromDeck(g.playerDeck, g.units.spawn, spawnLocation, coreBp.id)!;

            const { yaw, pitch } = getCameraOrbitForCoords(g.world.surface[spawnLocation].position);
            g.camera.setInstant({ yaw, pitch });

            const scout = g.playerDeck.create('Simple_Scout', DEFAULT_SCOUT_PRESET);
            const miner = g.playerDeck.create('Simple_Auto_Miner', AUTO_MINER_PRESET);
            const tower = g.playerDeck.create('Mining_Rig', MINING_RIG_PRESET);
            spawnFromDeck(g.playerDeck, g.units.spawn, 361 as NodeId, tower.id);

            const tasks: SpawnTask[] = [
                { delay: 1, task: () => spawnFromDeck(g.playerDeck, g.units.spawn, spawnLocation, scout.id) },
                { delay: 3_000, task: () => spawnFromDeck(g.playerDeck, g.units.spawn, spawnLocation, miner.id) },
                { delay: 5_000, task: () => spawnFromDeck(g.playerDeck, g.units.spawn, spawnLocation, scout.id) },
                { delay: 10_000, task: () => spawnFromDeck(g.playerDeck, g.units.spawn, spawnLocation, miner.id) },
            ];

            const processSpawnTask = (task: SpawnTask) => {
                task.task();

                const next = tasks.shift();
                if (!next) {
                    return;
                }

                timeout.schedule(() => processSpawnTask(next), next.delay);
            };

            timeout.schedule(() => processSpawnTask(tasks.shift()!));

            setGame(g);
            g.start();
        });

        onCleanup(() => {
            game()?.stop();
        });
    });

    return (
        <Show when={game()}>
            <GameProvider value={game()!}>
                <div class={styles.wrapper}>{props.children}</div>
            </GameProvider>
        </Show>
    );
};
