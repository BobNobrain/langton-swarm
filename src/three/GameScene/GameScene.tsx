import { type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { MouseButton } from '@/lib/input';
import { GameCamera } from '../GameCamera/GameCamera';
import { GameGlobalLight } from '../GameGlobalLight/GameGlobalLight';
import { GameSwarms } from '../GameSwarms/GameSwarms';
import { onSceneEmptyClick } from '../hooks/handlers';
// import { PathTrace } from '../PathTrace/PathTrace';
import { PlanetMesh } from '../PlanetMesh/PlanetMesh';
import { PlanetResources } from '../PlanetResources/PlanetResources';
import { useInScene } from '../hooks/useInScene';
import { Mesh, MeshStandardMaterial, SphereGeometry } from 'three';

export const GameScene: Component = () => {
    const game = useGame();

    onSceneEmptyClick((ev) => {
        if (ev.button !== MouseButton.Left) {
            return;
        }

        game.ui.selectTile(null);
    });

    // const testPath = createMemo(() => {
    //     const nav = game.world.planet()?.nav;
    //     if (!nav) {
    //         return [];
    //     }

    //     const START = 0;
    //     const END = 100;
    //     const N = 1000;

    //     let ts = performance.now();
    //     console.profile('pathf');
    //     for (let i = 0; i < N; i++) {
    //         nav.findPath(START, END);
    //     }
    //     console.profileEnd('pathf');
    //     console.log(N + ' pathfinding time', performance.now() - ts);

    //     return nav.findPath(START, END);
    // });

    useInScene(() => new Mesh(new SphereGeometry(0.1), new MeshStandardMaterial({ color: '#ff00ff' })));

    return (
        <>
            <PlanetMesh
                planetNodes={game.world.surface}
                selectedTileId={game.ui.rSelectedTile()}
                hilightedTiles={game.ui.rHighlightedTiles()}
                onTileClick={(tileId) => {
                    game.ui.selectTile(tileId, { selectUnits: true });
                }}
                onTileRightClick={game.ui.tileRightClick.trigger}
                onTileHover={game.ui.hoverTile}
            />
            <PlanetResources />
            <GameSwarms />
            <GameGlobalLight />
            <GameCamera fov={75} far={100_000} near={0.01} />
            {/* <PathTrace nodes={game.world.planet()?.nodes ?? []} path={testPath()} /> */}
        </>
    );
};
