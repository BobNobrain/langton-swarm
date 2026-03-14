import { type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { MouseButton } from '@/lib/input';
import { GameSwarms } from '../GameSwarms/GameSwarms';
import { GameCamera } from '../GameCamera/GameCamera';
import { GameGlobalLight } from '../GameGlobalLight/GameGlobalLight';
import { PlanetMesh } from '../PlanetMesh/PlanetMesh';
import { onSceneEmptyClick } from '../hooks/handlers';

export const GameScene: Component = () => {
    const game = useGame();

    onSceneEmptyClick((ev) => {
        if (ev.button !== MouseButton.Left) {
            return;
        }

        game.ui.selectTile(null);
    });

    return (
        <>
            <PlanetMesh
                planetNodes={game.world.planet()?.nodes ?? []}
                selectedTileId={game.ui.rSelectedTile()}
                onTileClick={(tileId) => {
                    game.ui.selectTile(tileId);
                }}
            />
            <GameSwarms />
            <GameGlobalLight />
            <GameCamera fov={75} far={10} near={0.1} />
        </>
    );
};
