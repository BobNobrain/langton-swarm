import { type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { DefList, DefListItem } from '../DefList/DefList';

export const WorldInfo: Component = () => {
    const game = useGame();

    return (
        <DefList>
            <DefListItem name="Seed">{game.world.seed}</DefListItem>
            <DefListItem name="Size">{game.world.surface.length ?? '--'} tiles</DefListItem>
        </DefList>
    );
};
