import type { Component } from 'solid-js';
import styles from './MultiplayerNotice.module.css';

export const MultiplayerNotice: Component = () => {
    return (
        <div class={styles.notice}>
            <p>
                This game prototype only supports singleplayer mode. However, I hope to eventually develop a multiplayer
                mode with player-hosted servers. By that time, the game will probably be off the web and shaped like a
                proper standalone app.
            </p>
            <p>
                I have a few thoughts in mind for multiplayer mode, but the main idea is that it will be a sandbox – I
                don't wont it to be strictly competitive, or PvE-only. Players should be able to set the rules and their
                goals for the game themselves – some would enjoy duels or deathmatches, competing whose blueprints are
                the best; others will use it as a cooperative sandbox to conquer another asteroid in the most efficient
                way, or build the most sophisticated resource extraction system. The game will include a bunch of
                configurable game rules that you can tinker with when setting up the game server, adjusting it to your
                needs.
            </p>
            <p>
                Unfortunatelly, multiplayer mode is way beyond the prototype scope. Implementing it from the start would
                have taken at least another year of my time, and I want this idea of a game to see the light much sooner
                – to see if it's even worth the effort. But it will always be a target that I have in mind for the game
                – to support both singleplayer and multiplayer modes.
            </p>
        </div>
    );
};
