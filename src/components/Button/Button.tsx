import { createMemo, Show, type ParentComponent } from 'solid-js';
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import { createHotkey, renderHotkey, type HotkeyDescriptor } from '@/lib/hotkey';
import styles from './Button.module.css';
import { HotkeyDisplay } from '../HotkeyDisplay/HotkeyDisplay';
import { Floater, type FloaterProps } from '../Floater/Floater';
import { createBoundsTracker } from '@/lib/BoundsTracker';

type ButtonStyle = 'primary' | 'secondary' | 'text';
type HotkeyPosition = 'none' | 'top-right' | 'middle-left';

const cls: Record<ButtonStyle, string> = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    text: styles.btnText,
};

const hotkeyCls: Record<HotkeyPosition, string> = {
    none: styles.hposNone,
    'top-right': styles.hposTR,
    'middle-left': styles.hposML,
};

export type ButtonController = {
    focus(): void;
};

export const Button: ParentComponent<{
    type?: 'button' | 'submit';
    style?: ButtonStyle;
    disabled?: boolean;
    inline?: boolean;
    vibrantFocus?: boolean;
    hotkey?: HotkeyDescriptor;
    hotkeyPosition?: 'none' | 'top-right' | 'middle-left';
    rmbHotkey?: boolean;
    onClick?: (ev: MouseEvent | KeyboardEvent) => void;
    onMouseEnter?: (ev: MouseEvent) => void;
    onMouseLeave?: (ev: MouseEvent) => void;
    controllerRef?: ControllerRef<ButtonController>;
}> = (props) => {
    if (props.hotkey) {
        createHotkey(
            {
                ...props.hotkey,
                isEnabled: () => !props.disabled && (props.hotkey?.isEnabled?.() ?? true),
            },
            (ev) => props.onClick?.(ev),
        );
    }

    const boundsTracker = createBoundsTracker<HTMLButtonElement>();

    provideController(
        {
            focus() {
                boundsTracker.getElement()?.focus();
            },
        },
        () => props.controllerRef,
    );

    const hotkeyPosition = createMemo(
        (): Pick<
            FloaterProps<any>,
            'horizontalAnchor' | 'horizontalDirection' | 'verticalAnchor' | 'verticalDirection' | 'offsetX' | 'offsetY'
        > => {
            switch (props.hotkeyPosition) {
                case 'none':
                    return {};

                case 'middle-left':
                    return {
                        horizontalAnchor: 'left',
                        horizontalDirection: 'left',
                        verticalAnchor: 'top',
                        verticalDirection: 'down',
                        offsetX: -8,
                        offsetY: 3,
                    };

                case 'top-right':
                case undefined:
                    return {
                        horizontalAnchor: 'right',
                        horizontalDirection: 'left',
                        verticalAnchor: 'top',
                        verticalDirection: 'up',
                        offsetX: 4,
                        offsetY: -4,
                    };
            }
        },
    );

    return (
        <button
            ref={boundsTracker.ref}
            type={props.type ?? 'button'}
            classList={{
                [styles.button]: true,
                [cls[props.style ?? 'secondary']]: true,
                [styles.disabled]: props.disabled,
                [styles.clickable]: Boolean(props.onClick),
                [styles.inline]: props.inline,
                [styles.vibrantFocus]: props.vibrantFocus,
            }}
            disabled={props.disabled}
            onClick={props.onClick}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
        >
            <span class={styles.label}>{props.children}</span>
            <Show when={(props.hotkey || props.rmbHotkey) && props.hotkeyPosition !== 'none'}>
                {/* <span
                    class={styles.hotkey}
                    classList={{
                        [styles.mouseButton]: props.rmbHotkey && !props.hotkey,
                        [hotkeyCls[props.hotkeyPosition ?? 'top-right']]: true,
                    }}
                >
                    {props.hotkey ? renderHotkey(props.hotkey) : <span class={styles.mouseButtonFill}></span>}
                </span> */}
                <Floater target={boundsTracker} {...hotkeyPosition()}>
                    <HotkeyDisplay hotkey={props.rmbHotkey ? 'rmb' : props.hotkey!} class={styles.hotkey} />
                </Floater>
            </Show>
        </button>
    );
};

export function createButtonController() {
    return createControllerRef<ButtonController>({
        focus() {},
    });
}
