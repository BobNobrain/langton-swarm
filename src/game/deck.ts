import { createMemo, createSignal } from 'solid-js';
import type { BotBehaviour, BotBlueprint } from './types';
import { createDefaultBotConfig } from './config';
import { compileBotProgram, createDefaultProgramText } from './program';

export type BlueprintDeckCard = {
    versions: {
        blueprint: BotBlueprint;
        compiled: BotBehaviour | null;
        locked: boolean;
    }[];
};

export type BlueprintDeck = {
    blueprints: () => Record<string, BotBlueprint[]>;
    createBlueprint: (name: string) => BotBlueprint;
    createBlueprintVersion: (version: BotBlueprint) => void;
    archiveBlueprint: (name: string) => void;

    updateBlueprint: (name: string, blueprint: Pick<BotBlueprint, 'program' | 'config'>) => void;

    getBehaviour: (name: string, version: number) => BotBehaviour | null;
    getBlueprint: (name: string, version: number) => BotBlueprint | null;
};

export function createBlueprintDeck(): BlueprintDeck {
    const [getCards, setCards] = createSignal<Record<string, BlueprintDeckCard>>({});

    return {
        blueprints: createMemo(() => {
            const bps = getCards();
            const result: Record<string, BotBlueprint[]> = {};

            for (const [name, { versions }] of Object.entries(bps)) {
                result[name] = versions.map((v) => v.blueprint);
            }

            return result;
        }),
        createBlueprint: (name) => {
            const result: BotBlueprint = {
                name,
                version: 0,
                archived: false,
                config: createDefaultBotConfig(),
                program: createDefaultProgramText(name),
            };

            const compiled = compileBotProgram(result);

            setCards((old) => ({
                ...old,
                [name]: {
                    versions: [
                        {
                            blueprint: result,
                            compiled: compiled.ok ? compiled.result : null,
                            locked: false,
                        },
                    ],
                },
            }));
            return result;
        },
        createBlueprintVersion: (version) => {
            // TODO
            throw new Error('not implemented');
        },
        archiveBlueprint: (name) => {
            // TODO
            throw new Error('not implemented');
        },

        updateBlueprint: (name, blueprint) => {
            setCards((old) => {
                if (!old[name]) {
                    return old;
                }

                const copy = { ...old };
                const card: BlueprintDeckCard = {
                    versions: copy[name].versions.slice(),
                };
                copy[name] = card;

                const lastVersion = card.versions[card.versions.length - 1];
                const newVersion: typeof lastVersion = {
                    blueprint: {
                        name: lastVersion.blueprint.name,
                        version: lastVersion.blueprint.version,
                        archived: false,
                        config: blueprint.config,
                        program: blueprint.program,
                    },
                    compiled: null,
                    locked: false,
                };

                if (lastVersion.locked) {
                    card.versions.push(newVersion);
                } else {
                    card.versions[card.versions.length - 1] = newVersion;
                }

                return copy;
            });
        },

        getBehaviour: (name, version) => {
            const card = getCards()[name];
            if (!card) {
                return null;
            }

            const v = card.versions[version];
            if (!v) {
                return null;
            }

            return v.compiled;
        },

        getBlueprint: (name, version) => {
            const card = getCards()[name];
            if (!card) {
                return null;
            }

            const v = card.versions[version];
            if (!v) {
                return null;
            }

            return v.blueprint;
        },
    };
}
