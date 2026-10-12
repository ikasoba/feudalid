import { action, createModel, effect, signal } from "@preact/signals-core";
import { App as InitialApp } from "./app.ts";
import { WebGLRenderer } from "three";

const App = signal(InitialApp);
if (import.meta.hot) {
  import.meta.hot.accept("./app.ts", mod => {
    if (!mod) return;
    App.value = mod.App;

    console.log(mod);
  });
}

globalThis.addEventListener("load", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const renderer = new WebGLRenderer();
  renderer.setSize(width, height);

  effect(() => {
    const AppModel = createModel(App.value);

    
    const app = new AppModel({
      fov: 75,
      width,
      height,
      domElement: renderer.domElement,
      render: renderer.render.bind(renderer),
      mouse: null!
    });

    return () => {
      using _ = app;
    }
  });

  document.body.append(renderer.domElement);
});
