//@ts-ignore
import mod from "noisejs";

export interface Noise {
  new(seed: number): Noise;

  simplex2(x: number, y: number): number;
};

export const Noise: Noise = mod.Noise; 
