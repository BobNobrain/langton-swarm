import { createMemo, For, type Component } from 'solid-js';
import { useGame } from '@/gameContext';

type BotData = {
    id: string;
    blueprint: {
        name: string;
        version: number;
    };
    program: {
        state: string;
        instructionPointer: number;
    };
    position: number;
};

export const BotBrowser: Component = () => {
    const { swarms } = useGame();
    const botsData = createMemo(() => {
        return swarms.list().flatMap((swarm) => {
            const bp: BotData['blueprint'] = {
                name: swarm.blueprintName,
                version: swarm.blueprintVersion,
            };

            return swarm.states().map((state, index): BotData => {
                return {
                    id: state.id,
                    blueprint: bp,
                    position: state.bot.location,
                    program: {
                        state: state.behaviour.state,
                        instructionPointer: state.behaviour.instructionPointer,
                    },
                };
            });
        });
    });

    return (
        <>
            <table>
                <thead>
                    <tr style="text-align:left">
                        <th style="width:80px">ID</th>
                        <th style="width:108px">Blueprint</th>
                        <th style="width:80px">State</th>
                        <th style="width:32px">Pos</th>
                    </tr>
                </thead>
                <tbody>
                    <For each={botsData()}>
                        {(bot) => {
                            return (
                                <tr>
                                    <td>{bot.id}</td>
                                    <td>
                                        {bot.blueprint.name} v{bot.blueprint.version}
                                    </td>
                                    <td>
                                        {bot.program.state}:{bot.program.instructionPointer}
                                    </td>
                                    <td style="text-align:right">{bot.position}</td>
                                </tr>
                            );
                        }}
                    </For>
                </tbody>
            </table>
        </>
    );
};
