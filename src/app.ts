import {  effect, signal, type ReadonlySignal } from "@preact/signals-core";
import { BufferAttribute, BufferGeometry, Mesh, MeshPhongMaterial, PerspectiveCamera, PointLight, Scene, type Camera } from "three";
import cubeURL from "../runtime/resources/default/feudalid/models/generic/block/model.gltf?url";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { Noise } from "../lib/noise.ts";

export interface AppProps {
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
  const modelSignal = useAsync(() => gltfLoader.loadAsync(cubeURL));

  camera.position.z = 32;

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

  const material = new MeshPhongMaterial({ color: 0x888888 });

  effect(() => {
    if (modelSignal.value == null) return;

    let noisemap = makeNoise(0, 0, 32, null);
    let vertices = makeVertices(32, noisemap, null);

    const geom = new BufferGeometry();

    geom.setAttribute("position", new BufferAttribute(vertices, 3));

    let isCancelled = false;
    let t = 0;
    const f = () => setTimeout(() => {
      if (isCancelled) return;

      t += 1;

      noisemap = makeNoise(t, t, 32, noisemap);
      vertices = makeVertices(32, noisemap, vertices);

      geom.setAttribute("position", new BufferAttribute(vertices, 3));

      f();
    }, 16);
    f();

    const terrain = new Mesh(geom, material);

    terrain.rotateX(Math.PI * 45 / 180);

    scene.add(terrain);

    return () => isCancelled = true;
  })
  const light = new PointLight(0xFFFFFF, 25, 0, 1.5);

  light.position.y = 15;

  scene.add(light);

  return {};
}
