import type { ParentComponent } from 'solid-js';
import styles from './Button.module.css';

type ButtonStyle = 'primary' | 'secondary' | 'text';

const cls: Record<ButtonStyle, string> = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    text: styles.btnText,
};

export const Button: ParentComponent<{
    style?: ButtonStyle;
    disabled?: boolean;
    onClick?: (ev: MouseEvent) => void;
}> = (props) => {
    return (
        <button
            type="button"
            classList={{
                [styles.button]: true,
                [cls[props.style ?? 'secondary']]: true,
                [styles.disabled]: props.disabled,
                [styles.clickable]: Boolean(props.onClick),
            }}
            disabled={props.disabled}
            onClick={props.onClick}
        >
            {props.children}
        </button>
    );
};
