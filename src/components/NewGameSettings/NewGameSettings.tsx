import { createSignal, type Component } from 'solid-js';
import { setGameOptions } from '@/gameOptions';
import { KeyCode } from '@/lib/input';
import { Button } from '../Button/Button';
import { Form, FormActions, FormSection } from '../Form/Form';
import { FormField } from '../FormField/FormField';
import { Header, Heading } from '../Header/Header';
import { NumberInput } from '../NumberInput/NumberInput';
import { TextInput } from '../TextInput/TextInput';
import { Toggle } from '../Toggle/Toggle';
import styles from './NewGameSettings.module.css';

export const NewGameSettings: Component<{
    onStart: () => void;
}> = (props) => {
    const [seed, setSeed] = createSignal('');

    const [worldSize, setWorldSize] = createSignal<10 | 15 | 20 | 30 | 40>(20);

    const [maxElevation, setMaxElevation] = createSignal(3);
    const isMaxElevationValid = () => {
        const value = maxElevation();
        return value >= 0 && value <= 5;
    };

    const [minSplats, setMinSplats] = createSignal(7);
    const isMinSplatsValid = () => {
        const value = minSplats();
        return value >= 0 && value <= 10;
    };
    const [maxSplats, setMaxSplats] = createSignal(20);
    const isMaxSplatsValid = () => {
        const value = maxSplats();
        return value >= 0 && value <= 30;
    };

    const [isTutorialEnabled, setTutorialEnabled] = createSignal(true);
    const [ticksPerSecond, setTicksPerSecond] = createSignal(20);
    const isTicksPerSecondValid = () => {
        const value = ticksPerSecond();
        return Number.isInteger(value) && value >= 10 && value <= 50;
    };

    const [isInitiallyPaused, setInitiallyPaused] = createSignal(false);

    return (
        <Form
            preventImplicitSubmit
            onSubmit={() => {
                if (!isMaxElevationValid() || !isMinSplatsValid() || !isMaxSplatsValid() || !isTicksPerSecondValid()) {
                    return;
                }

                setGameOptions({
                    worldgen: {
                        seed: seed() || randomSeed(),
                        subdivisions: worldSize(),
                        maxElevation: maxElevation(),
                        minSplats: minSplats(),
                        maxSplats: maxSplats(),
                    },
                    enableTutorial: isTutorialEnabled(),
                    initiallyPaused: isInitiallyPaused(),
                    tickTime: Math.floor(1000 / ticksPerSecond()),
                });
                props.onStart();
            }}
        >
            <Header padded withMargin>
                <Heading size="sm" withMargin>
                    Generation Settings
                </Heading>
            </Header>
            <FormSection>
                <FormField label="World seed" insetH>
                    <TextInput
                        value={seed()}
                        onUpdate={setSeed}
                        placeholder="Leave empty for random"
                        allowsReturnHotkey
                    />
                </FormField>
                <FormField label="World Size" insetH>
                    <div class={styles.toggleGroup}>
                        <button style="display:none" />
                        <Button style={worldSize() === 10 ? 'primary' : 'secondary'} onClick={() => setWorldSize(10)}>
                            Tiny
                        </Button>
                        <Button style={worldSize() === 15 ? 'primary' : 'secondary'} onClick={() => setWorldSize(15)}>
                            Small
                        </Button>
                        <Button style={worldSize() === 20 ? 'primary' : 'secondary'} onClick={() => setWorldSize(20)}>
                            Regular
                        </Button>
                        <Button style={worldSize() === 30 ? 'primary' : 'secondary'} onClick={() => setWorldSize(30)}>
                            Large
                        </Button>
                        <Button style={worldSize() === 40 ? 'primary' : 'secondary'} onClick={() => setWorldSize(40)}>
                            Vast
                        </Button>
                    </div>
                </FormField>
                <FormField label="Max Elevation" insetH error={!isMaxElevationValid()}>
                    <NumberInput
                        value={maxElevation()}
                        onUpdate={setMaxElevation}
                        placeholder="0-5"
                        allowsReturnHotkey
                    />
                </FormField>
                <FormField label="Min Splats" insetH error={!isMinSplatsValid()}>
                    <NumberInput value={minSplats()} onUpdate={setMinSplats} placeholder="0-10" allowsReturnHotkey />
                </FormField>
                <FormField label="Max Splats" insetH error={!isMaxSplatsValid()}>
                    <NumberInput value={maxSplats()} onUpdate={setMaxSplats} placeholder="0-30" allowsReturnHotkey />
                </FormField>
            </FormSection>
            <Header padded withMargin>
                <Heading size="sm" withMargin>
                    Game Rules
                </Heading>
            </Header>
            <FormSection>
                <FormField label="Tutorial" insetH>
                    <Toggle
                        label={isTutorialEnabled() ? 'Enabled (but not implemented :D)' : 'Disabled'}
                        value={isTutorialEnabled()}
                        onUpdate={setTutorialEnabled}
                    />
                </FormField>
                <FormField label="Pause" insetH>
                    <Toggle
                        label={isInitiallyPaused() ? 'Paused at the start' : 'Not paused at the start'}
                        value={isInitiallyPaused()}
                        onUpdate={setInitiallyPaused}
                    />
                </FormField>
                <FormField label="Ticks / s" insetH error={!isTicksPerSecondValid()}>
                    <NumberInput
                        value={ticksPerSecond()}
                        onUpdate={setTicksPerSecond}
                        placeholder="10-50"
                        allowsReturnHotkey
                        onBlur={() => {
                            setTicksPerSecond((value) => {
                                const effectiveTickLength = Math.floor(1000 / value);
                                const down = Math.floor(1000 / effectiveTickLength);
                                const up = Math.ceil(1000 / effectiveTickLength);

                                if (down === value || up === value) {
                                    return value;
                                }

                                return down;
                            });
                        }}
                    />
                </FormField>
            </FormSection>
            <FormActions classList={{ [styles.actions]: true }} align="center">
                <Button type="submit" style="primary" hotkey={{ key: KeyCode.Enter, ctrl: true }}>
                    Start
                </Button>
            </FormActions>
        </Form>
    );
};

function randomSeed(): string {
    return Array.from({ length: 16 })
        .fill(0)
        .map(() => Math.floor(Math.random() * 16))
        .map((i) => i.toString(16)[0])
        .join('');
}
