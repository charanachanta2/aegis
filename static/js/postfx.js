import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const vignetteGrain = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 col = texture2D(tDiffuse, vUv);
      vec2 c = vUv - 0.5;
      float vig = 1.0 - smoothstep(0.35, 0.9, length(c));
      col.rgb *= mix(0.72, 1.0, vig);
      float grain = (rand(vUv * time) - 0.5) * 0.035;
      col.rgb += grain;
      gl_FragColor = col;
    }`,
};

export function createPostFX(renderer, scene, camera) {
  const w = innerWidth, h = innerHeight;

  const rt = new THREE.WebGLRenderTarget(w, h, {
    samples: 4,
    type: THREE.HalfFloatType,
  });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));

  const ssao = new SSAOPass(scene, camera, w, h);
  ssao.kernelRadius = 6;
  ssao.minDistance = 0.002;
  ssao.maxDistance = 0.12;
  composer.addPass(ssao);

  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.4, 0.94);
  composer.addPass(bloom);

  const grade = new ShaderPass(vignetteGrain);
  composer.addPass(grade);

  composer.addPass(new OutputPass());

  function setSize(w, h) {
    composer.setSize(w, h);
    composer.setPixelRatio(renderer.getPixelRatio());
  }
  setSize(w, h);

  function render(dt) {
    grade.uniforms.time.value += dt;
    composer.render();
  }

  return { composer, setSize, render };
}
