import {  effect, signal, type ReadonlySignal } from "@preact/signals-core";
import { BufferAttribute, BufferGeometry, Mesh, MeshPhongMaterial, PerspectiveCamera, PointLight, Scene, type Camera } from "three";
import cubeURL from "../runtime/resources/default/feudalid/models/generic/block/model.gltf?url";
import headURL from "../runtime/resources/default/feudalid/models/head/humanoid/model.gltf?url";
import earURL from "../runtime/resources/default/feudalid/models/ear/humanoid/model.gltf?url";
import earElfyURL from "../runtime/resources/default/feudalid/models/ear/elfy/model.gltf?url";
import bodyURL from "../runtime/resources/default/feudalid/models/body/humanoid/model.gltf?url";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { Noise } from "../lib/noise.ts";
import { buildCharacterModel } from "./model.ts";

export interface AppProps {
  domElement:HTMLElement;
  render: (scene: Scene, camera: Camera) => void;
  fov: number;
  width: number;
  height: number;
  mouse: ReadonlySignal<[number, number]>;
}

function useAsync<T>(fn: () => Promise<T>) {
  const s = signal<T | null>(null);

  effect(() => {
    const promise = fn();

    promise.then(x => s.value = x);
  });

  return s;
}

function makeVertices(w: number, src: Float32Array, dst: Float32Array | null): Float32Array {
  const arr = [];

  const n = w * w;
  for (let i = 0; i < n; i++) {
    const val = (src[i]! * 2)-8;

    const y = ((i / w) >>> 0) - w / 2;
    const x = ((i % w) >>> 0) - w / 2;

    arr.push(...[
      x, val, y,
      x + 1, val, y + 1,
      x + 1, val, y,
      x, val, y,
      x, val, y + 1,
      x + 1, val, y + 1,
    ]);
  }

  if (dst && dst.length == arr.length) {
    dst.set(arr);

    return dst;
  }

  return new Float32Array(arr);
}

function makeNoise(ox: number, oy: number, w: number, dst: Float32Array | null): Float32Array {
  const n = w ** 2;
  dst ??= new Float32Array(w ** 2);
  const noise = new Noise(0);
  for (let i = 0; i < n; i++) {
    const x = (i % w) >>> 0;
    const y = (i / w) >>> 0;

    const z3 = 2048;
    const v3 = noise.simplex2((x + ox) / z3, (y + oy) / z3) * 2;
    
    const z2 = 256;
    const v2 = 1 + noise.simplex2((x + ox) / z2, (y + oy) / z2);

    const z1 = 32;
    const v1 = 1 + noise.simplex2((x + ox) / (z1 + v3), (y + oy) / (z1 + v3));
    
    dst[x + y * w] = (v1 * v2 * 3) >>> 0;
  }

  return dst;
}

export function App({ render, fov, width, height }: AppProps) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(fov, width / height);
  const gltfLoader = new GLTFLoader();
  const modelAssetsSignal = useAsync(async () => {
    return {
      head: await gltfLoader.loadAsync(headURL),
      ear: await gltfLoader.loadAsync(earURL),
      earElfy: await gltfLoader.loadAsync(earElfyURL),
      body: await gltfLoader.loadAsync(bodyURL)
    } 
  });

  const material = new MeshPhongMaterial({ color: 0x888888 });

  effect(() => {
    if (modelAssetsSignal.value == null) return;

    const modelAssets = modelAssetsSignal.value;

    const human = buildCharacterModel({
      head: modelAssets.head.scene,
      ear: modelAssets.earElfy.scene,
      body: modelAssets.body.scene
    });

    scene.add(human);
  });

  camera.position.z = 2;
  camera.position.y = 0.25;

  effect(() => {
    let isCanceled = false;
    let prevTime: number | undefined;
    const frame = () => requestAnimationFrame(time => {
      if (isCanceled) return;
      frame();

      prevTime = time;

      render(scene, camera);
    });

    frame();

    return () => isCanceled = true;
  });


  // effect(() => {
  //   let noisemap = makeNoise(0, 0, 32, null);
  //   let vertices = makeVertices(32, noisemap, null);

  //   const geom = new BufferGeometry();

  //   geom.setAttribute("position", new BufferAttribute(vertices, 3));

  //   let isCancelled = false;
  //   let t = 0;
  //   const f = () => setTimeout(() => {
  //     if (isCancelled) return;

  //     t += 1;

  //     noisemap = makeNoise(t, t, 32, noisemap);
  //     vertices = makeVertices(32, noisemap, vertices);

  //     geom.setAttribute("position", new BufferAttribute(vertices, 3));

  //     f();
  //   }, 16);
  //   f();

  //   const terrain = new Mesh(geom, material);

  //   terrain.rotateX(Math.PI * 45 / 180);

  //   scene.add(terrain);

  //   return () => isCancelled = true;
  // })
  const light = new PointLight(0xFFFFFF, 39, 0, 0);

  light.position.y = 10;
  light.position.z = 5;

  scene.add(light);

  return {};
}
