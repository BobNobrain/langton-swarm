import { DoubleSide, ShaderLib, ShaderMaterial, Uniform, UniformsUtils } from 'three';
import fragmentShader from './fragment.glsl?raw';
import vertexShader from './vertex.glsl?raw';

export class PlanetMaterial extends ShaderMaterial {
    private flatShading = true;

    constructor() {
        const uTime = new Uniform(performance.now());
        const uniforms = UniformsUtils.merge([
            ShaderLib.standard.uniforms,
            {
                uTime,
            },
        ]);

        super({
            vertexShader,
            fragmentShader,
            uniforms,
            side: DoubleSide,
            vertexColors: true,
            lights: true,
            defines: {},
        });
    }

    animate() {
        (this.uniforms.uTime as Uniform<number>).value = performance.now();
    }
}
