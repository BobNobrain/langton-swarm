import { BufferAttribute, Color, FrontSide, ShaderLib, ShaderMaterial, Uniform, UniformsUtils, type Side } from 'three';
import type { RawColor } from '@/lib/3d';
import fragmentShader from './fragment.glsl?raw';
import vertexShader from './vertex.glsl?raw';

export type PolyMatPaletteItem = {
    color: RawColor | string | number;
    altColor?: RawColor | string | number;
    /** in scene units */
    colorNoiseScale?: number;
    /** 0-1 */
    emission?: number;
    normalNoiseStrength?: number;
    /** Animation period, seconds */
    animationSpeed?: number;
    roughness?: number;
    metalness?: number;
};

export type PolyMatOptions = {
    palette: PolyMatPaletteItem[];
    side?: Side;
    flatShading?: boolean;
};

export class PolyMat extends ShaderMaterial {
    public readonly isAnimated;
    private flatShading = false;

    static createAttributes(mats: number[]): Record<string, BufferAttribute> {
        return {
            palleteIndex: new BufferAttribute(new Int32Array(mats), 1),
        };
    }

    constructor({ palette, side = FrontSide, flatShading = false }: PolyMatOptions) {
        let isAnimated = false;
        let hasColorNoise = false;
        let hasEmissive = false;
        let hasNormalNoise = false;

        const colors: Color[] = new Array(palette.length);
        const roughnesses: number[] = new Array(palette.length);
        const metalnesses: number[] = new Array(palette.length);
        const altColors: Color[] = new Array(palette.length);
        const colorNoises: number[] = new Array(palette.length);
        const emissives: number[] = new Array(palette.length);
        const normalNoises: number[] = new Array(palette.length);
        const animationSpeeds: number[] = new Array(palette.length);

        for (let i = 0; i < palette.length; i++) {
            const {
                color,
                altColor = color,
                animationSpeed = 0,
                colorNoiseScale = 1,
                emission = 0,
                normalNoiseStrength: normalNoiseScale = 0,
                roughness = 1,
                metalness = 0,
            } = palette[i];

            isAnimated ||= animationSpeed > 0;
            hasColorNoise ||= color !== altColor;
            hasEmissive ||= emission > 0;
            hasNormalNoise ||= normalNoiseScale > 0;

            colors[i] = Array.isArray(color) ? new Color(...color) : new Color(color);
            roughnesses[i] = roughness;
            metalnesses[i] = metalness;

            altColors[i] = Array.isArray(altColor) ? new Color(...altColor) : new Color(altColor);
            colorNoises[i] = 1 / colorNoiseScale;
            emissives[i] = emission;
            normalNoises[i] = normalNoiseScale;
            animationSpeeds[i] = animationSpeed;
        }

        const polyMatUniforms: Record<string, Uniform> = {
            uColors: new Uniform(colors),
            uRoughnesses: new Uniform(roughnesses),
            uMetalnesses: new Uniform(metalnesses),
        };

        if (hasColorNoise) {
            polyMatUniforms.uAltColors = new Uniform(altColors);
            polyMatUniforms.uColorNoises = new Uniform(colorNoises);
        }

        if (hasEmissive) {
            polyMatUniforms.uEmissives = new Uniform(emissives);
        }

        if (hasNormalNoise) {
            polyMatUniforms.uNormalNoises = new Uniform(normalNoises);
        }

        if (isAnimated) {
            polyMatUniforms.uAnimationSpeeds = new Uniform(animationSpeeds);
            polyMatUniforms.uTime = new Uniform(performance.now());
        }

        const uniforms = UniformsUtils.merge([ShaderLib.standard.uniforms, polyMatUniforms]);

        super({
            vertexShader,
            fragmentShader,
            uniforms,
            side,
            lights: true,
            defines: {
                PALLETE_SIZE: palette.length,
                ANIMATED: isAnimated,
                HAS_COLOR_NOISE: hasColorNoise,
                HAS_NORMAL_NOISE: hasNormalNoise,
                HAS_EMISSIVE: hasEmissive,
            },
        });

        this.isAnimated = isAnimated;
        this.flatShading = flatShading;
    }

    animate() {
        const uTime = this.uniforms.uTime as Uniform<number> | undefined;
        if (uTime) {
            uTime.value = performance.now();
        }
    }
}
