import { For, Show, type Component } from 'solid-js';
import styles from './Breadcrumbs.module.css';

export type BreadcrumbsProps = {
    items: Breadcrumb[];
};

export type Breadcrumb = {
    icon?: string;
    text: string;
    onClick?: () => void;
};

export const Breadcrumbs: Component<BreadcrumbsProps> = (props) => {
    return (
        <nav class={styles.trail}>
            <ol class={styles.list}>
                <For each={props.items}>
                    {(item, index) => {
                        return (
                            <li class={styles.crumb}>
                                <Show when={index() !== 0}>
                                    <span class={styles.divider}>&gt;</span>
                                </Show>
                                <a
                                    class={styles.link}
                                    classList={{
                                        [styles.active]: index() === props.items.length - 1,
                                        [styles.clickable]: Boolean(item.onClick),
                                    }}
                                    href="#"
                                    onClick={(ev) => {
                                        ev.preventDefault();
                                        item.onClick?.();
                                    }}
                                >
                                    <Show when={item.icon}>
                                        <span class={styles.icon}>{item.icon}</span>
                                    </Show>
                                    <span class={styles.label}>{item.text}</span>
                                </a>
                            </li>
                        );
                    }}
                </For>
            </ol>
        </nav>
    );
};
