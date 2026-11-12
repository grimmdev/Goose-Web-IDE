import { createSlice } from "@reduxjs/toolkit";
import helloWorldCode from "@/presets/hello_world.goose";
import realtime3dCode from "@/presets/realtime_3d.goose";
import raytracerCode from "@/presets/raytracer.goose";
import gfxCube3dCode from "@/presets/gfx_cube_3d.goose";
import voxelCraftCode from "@/presets/voxel_craft.goose";

export interface PresetItem {
  id: string;
  title: string;
  description: string;
  category: "3D Engine" | "2D Games" | "Algorithms" | "Language" | "Debugging" | "UI";
  code: string;
}

export const PRESETS: PresetItem[] = [
  {
    id: "hello_world",
    title: "Hello World",
    description: "Starter program with real-time vector graphics.",
    category: "Language",
    code: helloWorldCode,
  },
  {
    id: "realtime_3d",
    title: "Real-Time 3D Raymarching",
    description: "Interactive raymarched 3D scene with shading.",
    category: "3D Engine",
    code: realtime3dCode,
  },
  {
    id: "raytracer",
    title: "3D Sphere Raytracer",
    description: "Whitted raytracer with shadows and reflections.",
    category: "3D Engine",
    code: raytracerCode,
  },
  {
    id: "gfx_cube_3d",
    title: "3D GFX Cube",
    description: "Spinning lit 3D cube with embed_shader pipelines.",
    category: "3D Engine",
    code: gfxCube3dCode,
  },
  {
    id: "voxel_craft",
    title: "Minecraft",
    description: "Interactive 3D voxel block world.",
    category: "3D Engine",
    code: voxelCraftCode,
  },
];

interface PresetsState {
  items: PresetItem[];
}

const initialState: PresetsState = {
  items: PRESETS,
};

export const presetsSlice = createSlice({
  name: "presets",
  initialState,
  reducers: {},
});

export default presetsSlice.reducer;
