#define STANDARD
attribute vec3 varcolor;
attribute float varscale;
attribute float emission;
attribute float bumpiness;
attribute float roughness;
attribute float animation;

uniform float uTime;

varying vec3 vViewPosition;
varying vec3 vVertexCoords;
varying vec3 vVarcolor;
varying float vVarscale;
varying float vEmission;
varying float vBumpiness;
varying float vRoughness;
varying float vAnimationTime;

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

    vVarcolor = varcolor;
    vVarscale = varscale;
    vEmission = emission;
    vBumpiness = bumpiness;
    vRoughness = roughness;
    vAnimationTime = uTime * animation;
}
