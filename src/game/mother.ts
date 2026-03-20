import type { BlueprintDeck } from './deck';
import type { GameSwarms } from './swarms';
import type { NodeId, UnitBehaviour, UnitConfiguration } from './types';

export function createMotherConfig(swarms: GameSwarms, deck: BlueprintDeck): UnitConfiguration {
    const spawn = (bpname: string, at: NodeId) => {
        const bp = deck.findByName(bpname);
        console.log(bpname, at, bp);
        if (!bp) {
            return;
        }

        swarms.spawn({
            blueprint: bp.id,
            version: bp.rLastVersion().version,
            position: at,
        });
    };

    const motherBehaviour: UnitBehaviour = {
        setup() {
            return { state: 'idle', data: {}, instructionPointer: 0, prev: null };
        },
        tick(ctx) {},

        getCommands(ctx) {
            return [
                {
                    name: 'spawn',
                    args: [],
                },
            ];
        },

        executeCommand(name, args, ctx) {
            switch (name) {
                case 'spawn':
                    spawn('test', ctx.unitState.location);
                    break;
            }
        },
    };

    return {
        battery: { capacity: 10_000 },
        storage: { size: 10_000 },
        program: motherBehaviour,
        navigator: false,
    };
}
