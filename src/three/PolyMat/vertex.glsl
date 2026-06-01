#define STANDARD
attribute int palleteIndex;

uniform vec3 uColors[PALLETE_SIZE];
uniform float uRoughnesses[PALLETE_SIZE];
uniform float uMetalnesses[PALLETE_SIZE];
varying vec3 vViewPosition;
varying vec3 vVertexCoords;
varying vec3 vColor;
varying float vRoughness;
varying float vMetalness;

#ifdef HAS_COLOR_NOISE
uniform vec3 uAltColors[PALLETE_SIZE];
uniform float uColorNoises[PALLETE_SIZE];
varying vec3 vAltColor;
varying float vColorNoise;
#endif

#ifdef HAS_NORMAL_NOISE
uniform float uNormalNoises[PALLETE_SIZE];
varying float vNormalNoise;
#endif

#ifdef HAS_EMISSIVE
uniform float uEmissives[PALLETE_SIZE];
varying float vEmission;
#endif

#ifdef ANIMATED
uniform float uTime;
uniform float uAnimationSpeeds[PALLETE_SIZE];
varying float vAnimationTime;
#endif

#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

    vVertexCoords = position.xyz;
    vColor = uColors[palleteIndex];
    vRoughness = uRoughnesses[palleteIndex];
    vMetalness = uMetalnesses[palleteIndex];

    #ifdef HAS_COLOR_NOISE
    vAltColor = uAltColors[palleteIndex];
    vColorNoise = uColorNoises[palleteIndex];
    #endif

    #ifdef HAS_NORMAL_NOISE
    vNormalNoise = uNormalNoises[palleteIndex];
    #endif

    #ifdef HAS_EMISSIVE
    vEmission = uEmissives[palleteIndex];
    #endif

    #ifdef ANIMATED
    vAnimationTime = uTime * uAnimationSpeeds[palleteIndex] * 0.001;
    #endif
}
