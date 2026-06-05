import { createSignal, Show, type JSX, type ParentComponent, splitProps } from 'solid-js';
import { createButtonController, Button } from '../Button/Button';
import { Floater } from '../Floater/Floater';
import styles from './ConfirmationButton.module.css';
import { triggerResize } from '@/lib/BoundsTracker';

export const ConfirmationButton: ParentComponent<
    Omit<Parameters<typeof Button>[0], 'controllerRef'> & {
        confirmation?: JSX.Element;
        confirmText?: JSX.Element;
        cancelText?: JSX.Element;
        floaterProps?: Omit<Parameters<typeof Floater>[0], 'children' | 'target' | 'onClickOutside'>;
    }
> = (props) => {
    const controller = createButtonController();
    const [confirmationVisible, setConfirmationVisible] = createSignal(false);
    const [original, passedToButton] = splitProps(props, [
        'onClick',
        'confirmation',
        'confirmText',
        'cancelText',
        'floaterProps',
    ]);

    return (
        <>
            <Button
                {...passedToButton}
                controllerRef={controller.ref}
                onClick={() => {
                    triggerResize();
                    setConfirmationVisible(true);
                }}
            />
            <Show when={confirmationVisible()}>
                <Floater
                    target={controller.rGet().bounds()}
                    onClickOutside={() => setConfirmationVisible(false)}
                    {...(original.floaterProps ?? {})}
                >
                    <div class={styles.confirmation}>
                        <div class={styles.content} onClick={(ev) => ev.stopPropagation()}>
                            {original.confirmation ?? 'Please confirm action'}
                        </div>
                        <div class={styles.actions}>
                            <Button style="text" onClick={() => setConfirmationVisible(false)}>
                                {original.cancelText ?? 'Cancel'}
                            </Button>
                            <Button
                                style={passedToButton.style}
                                onClick={(ev) => {
                                    setConfirmationVisible(false);
                                    original.onClick?.(ev);
                                }}
                            >
                                {original.confirmText ?? 'Confirm'}
                            </Button>
                        </div>
                    </div>
                </Floater>
            </Show>
        </>
    );
};
