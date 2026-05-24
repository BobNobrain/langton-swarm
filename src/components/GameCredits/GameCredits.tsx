import type { Component } from 'solid-js';
import styles from './GameCredits.module.css';

export const GameCredits: Component = () => {
    return (
        <div class={styles.credits}>
            <p>
                This game was developed by{' '}
                <a href="https://github.com/BobNobrain" target="_blank" rel="noopener noreferrer">
                    @bobnobrain
                </a>
                . The source code is available{' '}
                <a href="https://github.com/BobNobrain/langton-swarm" target="_blank" rel="noopener noreferrer">
                    here
                </a>
                . If you have any feedback you want to share, you can contact me on{' '}
                <a href="mailto:bobnobrain@yandex.ru" target="_blank" rel="noopener noreferrer">
                    bobnobrain@yandex.ru
                </a>
                .
            </p>
            <p>
                Please note that this is still a very early game build. Things may (and will) break, game balance is
                non-existing, and a ton of stuff isn't even implemented yet. Things will change, and bugs will
                (hopefully) be fixed – you can follow game's GitHub repository for updates.
            </p>
        </div>
    );
};
