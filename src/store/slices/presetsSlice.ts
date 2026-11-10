import { createSlice } from "@reduxjs/toolkit";
import { DEFAULT_STARTER_SOURCE } from "./editorSlice";

export interface PresetItem {
  id: string;
  title: string;
  description: string;
  category: "3D Engine" | "2D Games" | "Algorithms" | "Language" | "Debugging";
  code: string;
}

export const PRESETS: PresetItem[] = [
  {
    id: "hello_world",
    title: "Hello World (Centered Graphic)",
    description: "Goose starter with centered glowing 2D vector text rendered in real-time WebGL.",
    category: "Language",
    code: DEFAULT_STARTER_SOURCE,
  },
  {
    id: "gfx_cube_3d",
    title: "Official 3D GFX Cube (Dual Vertex & Fragment Shaders)",
    description: "Official Goose 3D spinning lit cube demonstrating native embed_shader for both vertex and fragment pipelines.",
    category: "3D Engine",
    code: `// @controls: flight
// Official Goose 3D Spinning Lit Cube (samples/27_gfx_cube.goose)
import std;
import math;
import vec;

struct Vertex { pos: float3, normal: float3, color: u8[4] }

// Vertex shader with transformation matrices
let cube_vs = embed_shader("vert", """
    layout(location = 0) in vec3 a_pos;
    layout(location = 1) in vec3 a_normal;
    layout(location = 2) in vec4 a_color;
    layout(set = 1, binding = 0) uniform Transform {
        mat4 model;
        mat4 view_proj;
    };
    layout(location = 0) out vec3 v_normal;
    layout(location = 1) out vec4 v_color;
    void main() {
        v_normal = (model * vec4(a_normal, 0.0)).xyz;
        v_color = a_color;
        gl_Position = view_proj * model * vec4(a_pos, 1.0);
    }
""");

// Fragment shader with directional lighting
let cube_fs = embed_shader("frag", """
    layout(location = 0) in vec3 v_normal;
    layout(location = 1) in vec4 v_color;
    layout(location = 0) out vec4 result;
    void main() {
        float light = max(dot(normalize(v_normal), normalize(vec3(0.4, 0.8, 0.6))), 0.0);
        result = vec4(v_color.rgb * (0.25 + 0.75 * light), 1.0);
    }
""");

fn cube_verts(verts: Vertex[>..]&) {
    let axes: float3[3] = [float3 { 1.0, 0.0, 0.0 }, float3 { 0.0, 1.0, 0.0 }, float3 { 0.0, 0.0, 1.0 }];
    let colors: u8[4][6] = [
        [230, 80, 60, 255], [240, 170, 50, 255], [90, 200, 90, 255],
        [70, 160, 230, 255], [160, 100, 220, 255], [230, 230, 230, 255]
    ];
    for f in 6 {
        let sign: f32 = if f % 2 == 0 { 1.0 } else { 0.0 - 1.0 };
        let n = axes[f / 2] * float3 { sign, sign, sign };
        verts.push(Vertex { pos: n * float3 { 0.5, 0.5, 0.5 }, normal: n, color: colors[f] });
    }
}

fn main() {
    var verts: Vertex[>..] = [];
    cube_verts(verts);
    print("=== Official Goose 3D GFX Cube Initialized ===");
    print("Generated {verts.len} cube face vertices with dual embed_shader pipelines.");
}
`,
  },
  {
    id: "realtime_3d",
    title: "Real-Time 3D Raymarching",
    description: "Raymarched rotating torus and orbiting sphere with phong shading and checkered floor.",
    category: "3D Engine",
    code: `// @controls: flight
// Real-Time 3D Engine in Goose (Running Live in WebAssembly at 60 FPS)
import std;
import math;
import vec;

let WIDTH = 160;
let HEIGHT = 100;
let NUM_PIXELS = 16000;

var fb: u8[>..] = [];

fn init_fb() {
    if fb.len == 0 {
        for i in 0..(NUM_PIXELS * 4) {
            fb.push(0);
        }
    }
}

fn sd_sphere(p: float3, r: f32) -> f32 {
    return length(p) - r;
}

fn sd_torus(p: float3, r1: f32, r2: f32) -> f32 {
    let q = float2 { length(float2 { p.x, p.z }) - r1, p.y };
    return length(q) - r2;
}

fn rotate_y(p: float3, a: f32) -> float3 {
    let c = cos(a);
    let s = sin(a);
    return float3 { c * p.x + s * p.z, p.y, 0.0 - s * p.x + c * p.z };
}

fn rotate_x(p: float3, a: f32) -> float3 {
    let c = cos(a);
    let s = sin(a);
    return float3 { p.x, c * p.y - s * p.z, s * p.y + c * p.z };
}

fn reflect_vec(v: float3, n: float3) -> float3 {
    return v - n * (2.0 * dot(v, n));
}

fn map_scene(p: float3, time: f32) -> f32, i64 {
    let d_plane = p.y - (0.0 - 1.2);

    var tp = p - float3 { 0.0, 0.0, 3.2 };
    tp = rotate_y(tp, time * 1.5);
    tp = rotate_x(tp, time * 0.8);
    let d_torus = sd_torus(tp, 0.9, 0.32);

    let sx = sin(time * 2.2) * 1.8;
    let sz = 3.2 + cos(time * 2.2) * 1.8;
    let sy = sin(time * 4.0) * 0.4;
    let sp = p - float3 { sx, sy, sz };
    let d_sphere = sd_sphere(sp, 0.45);

    var d_obj = d_torus;
    var mat = 1;
    if d_sphere < d_obj {
        d_obj = d_sphere;
        mat = 2;
    }

    if d_plane < d_obj {
        return d_plane, 0;
    }
    return d_obj, mat;
}

fn calc_normal(p: float3, time: f32) -> float3 {
    let eps: f32 = 0.005;
    let d, m = map_scene(p, time);
    let dx, m1 = map_scene(p + float3 { eps, 0.0, 0.0 }, time);
    let dy, m2 = map_scene(p + float3 { 0.0, eps, 0.0 }, time);
    let dz, m3 = map_scene(p + float3 { 0.0, 0.0, eps }, time);
    return normalize(float3 { dx - d, dy - d, dz - d });
}

export "goose_get_fb" fn get_fb() -> const u8[:] {
    init_fb();
    return fb;
}

export "goose_render_frame" fn render_frame(time: f32, yaw: f32, pitch: f32, cx: f32, cy: f32, cz: f32) {
    init_fb();
    let light_dir = normalize(float3 { 0.6, 1.2, -0.8 });
    let cam_pos = float3 { cx, cy, cz };

    var idx = 0;
    for y in 0..HEIGHT {
        let v = 1.0 - (y as f32 / HEIGHT) * 2.0;
        for x in 0..WIDTH {
            let u = ((x as f32 / WIDTH) * 2.0 - 1.0) * (WIDTH / HEIGHT);

            var rd = normalize(float3 { u * 0.7, v * 0.7, 1.0 });
            rd = rotate_x(rd, pitch);
            rd = rotate_y(rd, yaw);

            var t: f32 = 0.1;
            var hit_mat = 0 - 1;
            var hp = float3_0;

            for step in 0..20 {
                let p = cam_pos + rd * t;
                let d, mat = map_scene(p, time);
                if d < 0.02 {
                    hit_mat = mat;
                    hp = p;
                    break;
                }
                t += d;
                if t > 10.0 { break; }
            }

            var r: f32 = 0.06;
            var g: f32 = 0.08;
            var b: f32 = 0.12;

            if hit_mat >= 0 {
                let n = calc_normal(hp, time);
                let diff = max(dot(n, light_dir), 0.0);
                let ref = reflect_vec(rd * (0.0 - 1.0), n);
                let spec = pow(max(dot(ref, light_dir), 0.0), 12.0 as f32);

                if hit_mat == 0 {
                    let fx = floor((hp.x + 100.0) * 1.5) as i64;
                    let fz = floor((hp.z + 100.0) * 1.5) as i64;
                    let is_check = (fx + fz) % 2 == 0;
                    if is_check {
                        r = 0.3 * diff + 0.1;
                        g = 0.5 * diff + 0.15;
                        b = 0.7 * diff + 0.2;
                    } else {
                        r = 0.1 * diff + 0.05;
                        g = 0.12 * diff + 0.05;
                        b = 0.18 * diff + 0.08;
                    }
                } else if hit_mat == 1 {
                    r = 0.95 * diff + 0.4 * spec + 0.2;
                    g = 0.75 * diff + 0.4 * spec + 0.15;
                    b = 0.25 * diff + 0.4 * spec + 0.05;
                } else {
                    r = 0.2 * diff + 0.6 * spec + 0.1;
                    g = 0.85 * diff + 0.6 * spec + 0.2;
                    b = 0.95 * diff + 0.6 * spec + 0.3;
                }

                let fog = min(t / 10.0, 1.0);
                r = r * (1.0 - fog) + 0.06 * fog;
                g = g * (1.0 - fog) + 0.08 * fog;
                b = b * (1.0 - fog) + 0.12 * fog;
            }

            fb[idx]     = min(r * 255.0, 255.0) as u8;
            fb[idx + 1] = min(g * 255.0, 255.0) as u8;
            fb[idx + 2] = min(b * 255.0, 255.0) as u8;
            fb[idx + 3] = 255;
            idx += 4;
        }
    }
}

fn main() {
    print("Realtime 3D engine initialized.");
}
`,
  },
  {
    id: "flappy_goose",
    title: "2D Flappy Goose",
    description: "Interactive tap-to-flap physics simulation, scrolling pipe obstacles, and collision detection.",
    category: "2D Games",
    code: `// @controls: tap("Flap")
// Flappy Goose: 2D tap-to-flap physics & pipe collision in Goose
import std;
import math;

struct Bird {
    y: f32,
    vy: f32,
    score: i64,
    alive: bool,
}

struct Pipe {
    x: f32,
    gap_y: f32,
    gap_size: f32,
    passed: bool,
}

let GRAVITY: f32 = 0.34;
let FLAP_FORCE: f32 = -4.9;
let PIPE_SPEED: f32 = 2.0;

// Embedded WebGL Fragment Shader for 2D Flappy Viewport
let FLAPPY_SHADER = """
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_player_pos;
uniform float u_action;
uniform float u_score;
uniform vec3 u_pipe1;
uniform vec3 u_pipe2;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 pos = vec2(uv.x, 1.0 - uv.y);

    vec3 col = mix(vec3(0.35, 0.75, 0.98), vec3(0.7, 0.9, 1.0), uv.y);

    float cloud = sin((uv.x + u_time * 0.03) * 12.0) * cos(uv.y * 15.0);
    if (cloud > 0.4 && uv.y > 0.5) col = mix(col, vec3(1.0), 0.7);

    float hill = sin((uv.x + u_time * 0.08) * 8.0) * 0.06 + 0.28;
    if (uv.y < hill) col = vec3(0.3, 0.7, 0.35);

    if (uv.y < 0.16) {
        col = vec3(0.82, 0.68, 0.42);
        if (uv.y > 0.14) col = vec3(0.4, 0.8, 0.2);
    }

    float p1_w = 0.12;
    if (abs(uv.x - u_pipe1.x) < p1_w * 0.5) {
        float gap_top = 1.0 - (u_pipe1.y - u_pipe1.z * 0.5);
        float gap_bot = 1.0 - (u_pipe1.y + u_pipe1.z * 0.5);
        if (uv.y > gap_top || uv.y < gap_bot) {
            col = vec3(0.25, 0.72, 0.22);
            float rim = (uv.x - (u_pipe1.x - p1_w * 0.5)) / p1_w;
            if (rim < 0.2) col += vec3(0.15);
            if (rim > 0.8) col -= vec3(0.12);
        }
    }

    if (abs(uv.x - u_pipe2.x) < p1_w * 0.5) {
        float gap_top = 1.0 - (u_pipe2.y - u_pipe2.z * 0.5);
        float gap_bot = 1.0 - (u_pipe2.y + u_pipe2.z * 0.5);
        if (uv.y > gap_top || uv.y < gap_bot) {
            col = vec3(0.25, 0.72, 0.22);
            float rim = (uv.x - (u_pipe2.x - p1_w * 0.5)) / p1_w;
            if (rim < 0.2) col += vec3(0.15);
            if (rim > 0.8) col -= vec3(0.12);
        }
    }

    vec2 bird_uv = (pos - u_player_pos) * vec2(u_resolution.x / u_resolution.y, 1.0);
    float bird_dist = length(bird_uv);
    if (bird_dist < 0.05) {
        col = vec3(0.98, 0.98, 0.96);
        if (bird_uv.x > 0.02 && abs(bird_uv.y) < 0.015) col = vec3(1.0, 0.55, 0.0);
        if (length(bird_uv - vec2(0.015, -0.015)) < 0.007) col = vec3(0.0);
        float wing_flap = sin(u_time * 18.0) * 0.015;
        if (length(bird_uv - vec2(-0.02, 0.01 + wing_flap)) < 0.025) col = vec3(0.88, 0.88, 0.85);
    }

    // In-game Score HUD Tokens (rendered directly by Goose shader)
    for (float i = 0.0; i < 15.0; i += 1.0) {
        if (i < u_score) {
            vec2 coin_pos = vec2(0.06 + i * 0.045, 0.93);
            if (length((uv - coin_pos) * vec2(1.0, 1.6)) < 0.016) {
                col = vec3(1.0, 0.88, 0.2);
            }
        }
    }

    if (u_action < 0.5) {
        col = mix(col, vec3(0.8, 0.1, 0.1), 0.35);
    }

    gl_FragColor = vec4(col, 1.0);
}
""";

fn flap(b: Bird&) {
    if b.alive {
        b.vy = FLAP_FORCE;
    }
}

fn update_game(b: Bird&, pipes: Pipe[2]&) {
    if !b.alive { return; }

    b.vy = b.vy + GRAVITY;
    b.y = b.y + b.vy;

    if b.y > 180.0 {
        b.y = 180.0;
        b.alive = false;
    }
    if b.y < 0.0 {
        b.y = 0.0;
        b.vy = 0.0;
    }

    for i in 0..2 {
        pipes[i].x = pipes[i].x - PIPE_SPEED;
        if pipes[i].x < -40.0 {
            pipes[i].x = 320.0;
            pipes[i].passed = false;
        }

        let bird_x: f32 = 60.0;
        if bird_x + 12.0 > pipes[i].x && bird_x - 12.0 < pipes[i].x + 36.0 {
            let in_gap = b.y > (pipes[i].gap_y - pipes[i].gap_size * 0.5) &&
                         b.y < (pipes[i].gap_y + pipes[i].gap_size * 0.5);
            if !in_gap {
                b.alive = false;
            }
        }

        if !pipes[i].passed && pipes[i].x < bird_x {
            pipes[i].passed = true;
            b.score = b.score + 1;
        }
    }
}

fn main() {
    var goose = Bird { y: 100.0, vy: 0.0, score: 0, alive: true };
    var pipes: Pipe[2] = [
        Pipe { x: 200.0, gap_y: 90.0, gap_size: 55.0, passed: false },
        Pipe { x: 380.0, gap_y: 110.0, gap_size: 55.0, passed: false },
    ];

    print("=== Flappy Goose Initialized ===");
    for tick in 0..5 {
        if tick == 2 { flap(goose); }
        update_game(goose, pipes);
        print("Tick {tick}: Goose Y={goose.y}, Score={goose.score}");
    }
}
`,
  },
  {
    id: "gameboy_2d",
    title: "2D Top-Down Game Boy Adventure",
    description: "Retro 8x8 tilemap dungeon with multi-area detection, obstacles, and sacred relic quest.",
    category: "2D Games",
    code: `// @controls: dpad, button("Action")
// 2D Top-Down Retro Game Boy RPG in Goose
import std;

struct Vector2 {
    x: i64,
    y: i64,
}

enum Area {
    Courtyard,
    FortressGate,
    AncientDungeon,
    Sanctum,
}

enum Tile {
    Empty,        // Walkable Courtyard Grass
    StoneWall,    // Impassable Wall
    Water,        // Impassable Water Pond
    TreasureChest,// Closed Chest with Golden Key
    DungeonGate,  // Locked Portcullis Door
    DungeonFloor, // Walkable Dungeon Stone
    RelicPedestal,// Sacred Relic Altar
}

struct GameState {
    hero_pos: Vector2,
    keys: i64,
    gate_open: bool,
    area: Area,
    quest_complete: bool,
}

// Vector2 Named Map Coordinates
let SPAWN_POS = Vector2 { x: 2, y: 2 }; // Guaranteed open empty courtyard space
let CHEST_POS = Vector2 { x: 6, y: 1 }; // Golden Key chest
let GATE_POS  = Vector2 { x: 3, y: 4 }; // Fortress dungeon entrance
let RELIC_POS = Vector2 { x: 3, y: 6 }; // Sacred Goose altar

fn vec2_eq(a: Vector2, b: Vector2) -> bool {
    return a.x == b.x && a.y == b.y;
}

fn vec2_add(a: Vector2, b: Vector2) -> Vector2 {
    return Vector2 { x: a.x + b.x, y: a.y + b.y };
}

fn is_empty_space(pos: Vector2, map: Tile[8][8]&) -> bool {
    if pos.x < 0 || pos.x >= 8 || pos.y < 0 || pos.y >= 8 {
        return false;
    }
    let t = map[pos.y][pos.x];
    return t == Tile.Empty || t == Tile.DungeonFloor;
}

// Embedded WebGL Fragment Shader for 2D Game Boy CRT Viewport
let GAMEBOY_SHADER = """
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_player_pos;
uniform float u_action; // 1.0 = gate open, 0.0 = locked
uniform float u_score;  // key count (1 = collected)
uniform vec3 u_pipe1;   // x: 1=chest closed/0=open, y: 1=quest complete, z: area code (0=courtyard, 1=gate, 2=dungeon, 3=sanctum)

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    vec3 gb_darkest  = vec3(0.06, 0.22, 0.06); // Deep ink
    vec3 gb_dark     = vec3(0.19, 0.38, 0.19); // Shadow green
    vec3 gb_light    = vec3(0.55, 0.67, 0.06); // Olive midtone
    vec3 gb_lightest = vec3(0.61, 0.73, 0.06); // Bright background
    vec3 col = gb_lightest;

    // --- 1. Top HUD Bar (Retro Game Boy Status Bar across uv.y > 0.88) ---
    if (uv.y > 0.88) {
        col = gb_dark;
        if (uv.y < 0.895) {
            col = gb_darkest; // Bottom border of HUD bar
        } else {
            // Left HUD: Key Icon & Collected Status
            vec2 key_center = vec2(0.07, 0.94);
            float dist_ring = length((uv - key_center) * vec2(u_resolution.x / u_resolution.y, 1.0));
            bool is_key_bow = dist_ring < 0.032 && dist_ring > 0.014;
            bool is_key_stem = (uv.x > 0.07 && uv.x < 0.13 && abs(uv.y - 0.94) < 0.012);
            bool is_key_teeth = (uv.x > 0.105 && uv.x < 0.125 && uv.y < 0.94 && uv.y > 0.915);

            if (is_key_bow || is_key_stem || is_key_teeth) {
                if (u_score > 0.5) {
                    float shimmer = sin(u_time * 6.0) * 0.15;
                    col = (shimmer > 0.0) ? gb_lightest : gb_light;
                } else {
                    col = gb_darkest; // Empty key silhouette
                }
            }

            // Center HUD: Current Area Badge Icon
            vec2 area_pos = vec2(0.42, 0.94);
            vec2 a_uv = (uv - area_pos) * vec2(u_resolution.x / u_resolution.y, 1.0);

            if (u_pipe1.y > 0.5 || u_pipe1.z > 2.5) {
                // Sanctum / Victory Crown & Star
                if (length(a_uv) < 0.035 || (abs(a_uv.x) < 0.045 && a_uv.y > -0.02 && a_uv.y < 0.025)) {
                    float flash = sin(u_time * 10.0) * 0.5 + 0.5;
                    col = (flash > 0.3) ? gb_lightest : gb_light;
                }
            } else if (u_pipe1.z > 1.5) {
                // Ancient Dungeon Skull / Bricks
                if (abs(a_uv.x) < 0.035 && abs(a_uv.y) < 0.025) {
                    col = gb_darkest;
                    if (abs(a_uv.x) < 0.02 && a_uv.y > -0.01) col = gb_light;
                }
            } else if (u_pipe1.z > 0.5) {
                // Fortress Gate Archway
                if (abs(a_uv.x) < 0.035 && a_uv.y > -0.025 && a_uv.y < 0.025) {
                    col = (u_action > 0.5) ? gb_lightest : gb_darkest;
                }
            } else {
                // Courtyard Sun / Tree
                if (length(a_uv) < 0.026) {
                    col = gb_lightest;
                }
            }

            // Right HUD: 3 Health Hearts
            for (float h = 0.0; h < 3.0; h += 1.0) {
                vec2 h_pos = vec2(0.80 + h * 0.065, 0.94);
                vec2 h_uv = (uv - h_pos) * vec2(u_resolution.x / u_resolution.y, 1.0);
                float heart_dist = length(h_uv);
                if (heart_dist < 0.025) {
                    col = gb_lightest;
                }
            }
        }
        gl_FragColor = vec4(col, 1.0);
        return;
    }

    // --- 2. 8x8 Playfield (Scaled into uv.y <= 0.88) ---
    vec2 map_uv = vec2(uv.x, uv.y / 0.88);
    vec2 grid = floor(map_uv * vec2(8.0, 8.0));
    grid.y = 7.0 - grid.y;
    vec2 t_uv = fract(map_uv * vec2(8.0, 8.0));

    bool is_wall = (grid.x < 0.5 || grid.x > 6.5 || grid.y < 0.5 || grid.y > 6.5 || (abs(grid.y - 4.0) < 0.4 && abs(grid.x - 3.0) > 0.5));
    bool is_gate = (abs(grid.x - 3.0) < 0.4 && abs(grid.y - 4.0) < 0.4);
    bool is_water = (abs(grid.x - 4.0) < 0.4 && (abs(grid.y - 1.0) < 0.4 || abs(grid.y - 2.0) < 0.4));
    bool is_chest = (abs(grid.x - 6.0) < 0.4 && abs(grid.y - 1.0) < 0.4);
    bool is_relic = (abs(grid.x - 3.0) < 0.4 && abs(grid.y - 6.0) < 0.4);
    bool is_hero = (abs(grid.x - u_player_pos.x) < 0.4 && abs(grid.y - u_player_pos.y) < 0.4);
    bool in_dungeon_room = (grid.y >= 5.0 && grid.x >= 1.0 && grid.x <= 6.0);

    // --- Base Terrain / Background Tile Layer ---
    if (is_wall) {
        // --- Brick Masonry Stone Wall ---
        float row = floor(t_uv.y * 4.0);
        float shift = mod(row, 2.0) == 0.0 ? 0.0 : 0.5;
        float col_div = fract(t_uv.x * 2.0 + shift);
        bool mortar = (fract(t_uv.y * 4.0) < 0.15) || (col_div < 0.12);
        if (mortar) {
            col = gb_darkest;
        } else {
            col = gb_dark;
            if (t_uv.x > 0.15 && t_uv.y > 0.15 && fract(t_uv.y * 4.0) > 0.35 && col_div > 0.25) {
                col = gb_light;
            }
        }
    } else if (is_gate) {
        // --- Fortress Gate ---
        if (u_action > 0.5) {
            // Open archway into dungeon
            col = gb_darkest;
            if (mod(t_uv.y * 6.0, 1.0) < 0.2) col = gb_dark;
            if (t_uv.y > 0.6 && abs(t_uv.x - 0.5) < 0.25) {
                float flick = sin(u_time * 12.0) * 0.05;
                if (length(t_uv - vec2(0.5, 0.75 + flick)) < 0.12) col = gb_lightest;
            }
        } else {
            // Locked Portcullis Bars
            bool is_arch = length(t_uv - vec2(0.5, 0.85)) > 0.48;
            bool is_bar = mod(t_uv.x * 5.0, 1.0) < 0.22;
            if (is_arch || is_bar) {
                col = gb_darkest;
            } else {
                col = gb_dark;
                if (length(t_uv - vec2(0.5, 0.42)) < 0.09 || (abs(t_uv.x - 0.5) < 0.035 && t_uv.y > 0.30 && t_uv.y < 0.45)) {
                    col = gb_lightest;
                }
            }
        }
    } else if (is_water) {
        // --- Courtyard Water Pond ---
        float wave = sin(t_uv.x * 12.0 + u_time * 5.0 + t_uv.y * 6.0);
        col = (wave > 0.3) ? gb_dark : ((wave > -0.3) ? gb_light : gb_darkest);
    } else if (is_chest) {
        // --- Treasure Chest on Courtyard Grass ---
        col = gb_lightest;
        if (fract(t_uv.x * 3.0) < 0.2 && fract(t_uv.y * 3.0) < 0.2) col = gb_light;
        bool in_box = (t_uv.x > 0.18 && t_uv.x < 0.82 && t_uv.y > 0.18 && t_uv.y < 0.76);
        if (in_box) {
            if (u_pipe1.x > 0.5) {
                // Closed Chest
                col = gb_dark;
                if (t_uv.y > 0.48) col = gb_darkest;
                if (abs(t_uv.x - 0.5) < 0.08 && t_uv.y > 0.40 && t_uv.y < 0.54) col = gb_lightest;
                float bob = sin(u_time * 7.0) * 0.04;
                if (length(t_uv - vec2(0.5, 0.84 + bob)) < 0.09) col = gb_lightest;
            } else {
                // Open Empty Chest
                col = gb_darkest;
                if (t_uv.y < 0.45) col = gb_dark;
                if (abs(t_uv.x - 0.5) < 0.25 && t_uv.y > 0.30 && t_uv.y < 0.42) col = gb_light;
            }
        }
    } else if (is_relic) {
        // --- Sacred Golden Goose Relic on Pedestal (Checkered Dungeon Floor Beneath) ---
        float tile_div = mod(floor(t_uv.x * 2.0) + floor(t_uv.y * 2.0), 2.0);
        col = (tile_div > 0.5) ? gb_dark : gb_darkest;
        // Stone Pedestal base
        if (t_uv.y < 0.40 && t_uv.x > 0.20 && t_uv.x < 0.80) {
            col = gb_darkest;
            if (t_uv.y > 0.32) col = gb_light;
        }
        // Floating Golden Goose Figurine
        float bob = sin(u_time * 6.0) * 0.04;
        vec2 goose_uv = t_uv - vec2(0.5, 0.62 + bob);
        if (length(goose_uv * vec2(1.0, 1.4)) < 0.16) {
            col = gb_lightest;
            // Beak
            if (goose_uv.x > 0.08 && abs(goose_uv.y) < 0.04) col = gb_light;
        }
        // Sacred Sparkle Halo
        float aura = length(goose_uv);
        if (aura > 0.20 && aura < 0.28) {
            float spark = sin(u_time * 12.0 + t_uv.x * 20.0);
            if (spark > 0.4) col = gb_lightest;
        }
    } else if (in_dungeon_room) {
        // --- Ancient Dungeon Flagstone Floor (Checkered tiles) ---
        float tile_div = mod(floor(t_uv.x * 2.0) + floor(t_uv.y * 2.0), 2.0);
        col = (tile_div > 0.5) ? gb_dark : gb_darkest;
        // Cobblestone cracks
        if (fract(t_uv.x * 2.0) < 0.10 || fract(t_uv.y * 2.0) < 0.10) {
            col = gb_darkest;
        }
        // Side wall torches flicker
        if ((grid.x == 1.0 && t_uv.x < 0.30) || (grid.x == 6.0 && t_uv.x > 0.70)) {
            if (t_uv.y > 0.45 && t_uv.y < 0.75) {
                float tflick = sin(u_time * 15.0 + grid.y * 4.0) * 0.04;
                if (length(t_uv - vec2(grid.x == 1.0 ? 0.20 : 0.80, 0.60 + tflick)) < 0.09) {
                    col = gb_lightest;
                }
            }
        }
    } else {
        // --- Sunlit Courtyard Grass ---
        col = gb_lightest;
        if (mod(floor(map_uv.x * 32.0) + floor(map_uv.y * 32.0), 2.0) == 0.0) {
            col = gb_lightest;
        } else if (fract(t_uv.x * 3.0) < 0.2 && fract(t_uv.y * 3.0) < 0.2) {
            col = gb_light;
        }
    }

    // --- Hero Sprite Overlay Layer (Renders on top of background tile) ---
    if (is_hero) {
        bool hero_pixel = false;
        vec3 hero_col = col;

        // Translucent Drop Shadow on whatever floor is beneath
        float shadow = length((t_uv - vec2(0.5, 0.16)) * vec2(1.0, 2.4));
        if (shadow < 0.28) {
            hero_col = mix(col, gb_darkest, 0.65);
            hero_pixel = true;
        }

        // Boots
        if (t_uv.y > 0.12 && t_uv.y < 0.28 && abs(t_uv.x - 0.5) < 0.24 && abs(t_uv.x - 0.5) > 0.05) {
            hero_col = gb_darkest;
            hero_pixel = true;
        }
        // Green Tunic / Body
        if (t_uv.x > 0.26 && t_uv.x < 0.74 && t_uv.y > 0.25 && t_uv.y < 0.62) {
            hero_col = gb_dark;
            if (abs(t_uv.y - 0.32) < 0.035) hero_col = gb_darkest;
            if (abs(t_uv.y - 0.32) < 0.03 && abs(t_uv.x - 0.5) < 0.06) hero_col = gb_lightest;
            hero_pixel = true;
        }
        // Shield on Left Arm
        if (t_uv.x > 0.16 && t_uv.x < 0.30 && t_uv.y > 0.30 && t_uv.y < 0.58) {
            hero_col = gb_light;
            if (abs(t_uv.x - 0.23) < 0.04 && abs(t_uv.y - 0.44) < 0.08) hero_col = gb_darkest;
            hero_pixel = true;
        }
        // Sword on Right Arm
        if (t_uv.x > 0.70 && t_uv.x < 0.82 && t_uv.y > 0.38 && t_uv.y < 0.72) {
            hero_col = gb_lightest;
            if (t_uv.y < 0.44) hero_col = gb_darkest;
            hero_pixel = true;
        }
        // Head / Face
        if (t_uv.x > 0.33 && t_uv.x < 0.67 && t_uv.y > 0.52 && t_uv.y < 0.80) {
            hero_col = gb_lightest;
            if ((abs(t_uv.x - 0.43) < 0.04 || abs(t_uv.x - 0.57) < 0.04) && abs(t_uv.y - 0.64) < 0.04) {
                hero_col = gb_darkest;
            }
            hero_pixel = true;
        }
        // Cap with Golden Goose Feather
        if (t_uv.y > 0.70 && t_uv.x > 0.30 && t_uv.x < 0.70) {
            hero_col = gb_dark;
            if (t_uv.x > 0.58 && t_uv.y > 0.78 && t_uv.y < 0.94) {
                hero_col = gb_lightest;
            }
            hero_pixel = true;
        }

        // Victory Halo when Quest Complete!
        if (u_pipe1.y > 0.5) {
            float halo = length(t_uv - vec2(0.5, 0.5));
            if (halo > 0.40 && halo < 0.48) {
                float pulse = sin(u_time * 8.0) * 0.5 + 0.5;
                if (pulse > 0.3) {
                    hero_col = gb_lightest;
                    hero_pixel = true;
                }
            }
        }

        if (hero_pixel) {
            col = hero_col;
        }
    }

    // Subtle Game Boy CRT scanlines
    col *= 0.94 + 0.06 * sin(uv.y * u_resolution.y * 3.14159);

    gl_FragColor = vec4(col, 1.0);
}
""";

fn get_area(pos: Vector2) -> Area {
    if pos.y == 4 { return Area.FortressGate; }
    if pos.y >= 5 {
        if pos.y == 6 && pos.x == 3 { return Area.Sanctum; }
        return Area.AncientDungeon;
    }
    return Area.Courtyard;
}

fn area_name(a: Area) -> const u8[:] {
    if a == Area.Courtyard { return "Sunlit Courtyard"; }
    if a == Area.FortressGate { return "Fortress Gate"; }
    if a == Area.AncientDungeon { return "Ancient Dungeon Depths"; }
    return "Sanctum of the Sacred Goose";
}

fn try_move(state: GameState&, dir: Vector2, map: Tile[8][8]&) -> bool {
    let next_pos = vec2_add(state.hero_pos, dir);

    if next_pos.x < 0 || next_pos.x >= 8 || next_pos.y < 0 || next_pos.y >= 8 {
        print("Blocked by world boundary!");
        return false;
    }

    let tile = map[next_pos.y][next_pos.x];
    if tile == Tile.StoneWall {
        print("Blocked by ancient stone wall at ({next_pos.x}, {next_pos.y})!");
        return false;
    }
    if tile == Tile.Water {
        print("Blocked by deep water at ({next_pos.x}, {next_pos.y})! Walk around the pond.");
        return false;
    }

    if vec2_eq(next_pos, CHEST_POS) && tile == Tile.TreasureChest {
        state.keys = state.keys + 1;
        map[next_pos.y][next_pos.x] = Tile.Empty;
        print("★ Opened chest at ({next_pos.x}, {next_pos.y})! Acquired Golden Key!");
    }

    if vec2_eq(next_pos, GATE_POS) && tile == Tile.DungeonGate {
        if state.keys > 0 || state.gate_open {
            if !state.gate_open {
                state.keys = state.keys - 1;
                state.gate_open = true;
                print("★ Unlocked the Fortress Gate with the Golden Key!");
            }
        } else {
            print("The Fortress Gate is locked tight. Find the Golden Key first.");
            return false;
        }
    }

    if vec2_eq(next_pos, RELIC_POS) && tile == Tile.RelicPedestal {
        state.quest_complete = true;
        print("★ RETRIEVED THE SACRED GOLDEN GOOSE RELIC! QUEST COMPLETE! ★");
    }

    state.hero_pos = next_pos;

    let new_area = get_area(next_pos);
    if new_area != state.area {
        state.area = new_area;
        let name = area_name(new_area);
        print("--> Entered Area: {name} at ({next_pos.x}, {next_pos.y})");
    }

    return true;
}

fn main() {
    var world_map: Tile[8][8] = [
        [Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall],
        [Tile.StoneWall, Tile.Empty,     Tile.Empty,     Tile.Empty,     Tile.Water,     Tile.Empty,     Tile.TreasureChest, Tile.StoneWall],
        [Tile.StoneWall, Tile.Empty,     Tile.Empty,     Tile.Empty,     Tile.Water,     Tile.Empty,     Tile.Empty,     Tile.StoneWall],
        [Tile.StoneWall, Tile.Empty,     Tile.Empty,     Tile.Empty,     Tile.Empty,     Tile.Empty,     Tile.Empty,     Tile.StoneWall],
        [Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.DungeonGate, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall],
        [Tile.StoneWall, Tile.DungeonFloor, Tile.DungeonFloor, Tile.DungeonFloor, Tile.DungeonFloor, Tile.DungeonFloor, Tile.DungeonFloor, Tile.StoneWall],
        [Tile.StoneWall, Tile.DungeonFloor, Tile.DungeonFloor, Tile.RelicPedestal, Tile.DungeonFloor, Tile.DungeonFloor, Tile.DungeonFloor, Tile.StoneWall],
        [Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall, Tile.StoneWall],
    ];

    // Confirm spawn is in an open empty space
    var spawn = SPAWN_POS;
    if !is_empty_space(spawn, world_map) {
        spawn = Vector2 { x: 2, y: 2 };
    }

    var state = GameState {
        hero_pos: spawn,
        keys: 0,
        gate_open: false,
        area: Area.Courtyard,
        quest_complete: false,
    };

    print("=== Game Boy 2D Adventure Initialized ===");
    print("Hero spawned at empty space ({state.hero_pos.x}, {state.hero_pos.y}) in {area_name(state.area)}");

    // Move freely in open courtyard
    try_move(state, Vector2 { x: 0, y: 1 }, world_map); // (2, 3)
    try_move(state, Vector2 { x: 1, y: 0 }, world_map); // (3, 3)
    try_move(state, Vector2 { x: 1, y: 0 }, world_map); // (4, 3)
    try_move(state, Vector2 { x: 1, y: 0 }, world_map); // (5, 3)
    try_move(state, Vector2 { x: 1, y: 0 }, world_map); // (6, 3)
    try_move(state, Vector2 { x: 0, y: 0 - 1 }, world_map); // (6, 2)
    try_move(state, Vector2 { x: 0, y: 0 - 1 }, world_map); // (6, 1) chest!

    // Walk to Gate
    try_move(state, Vector2 { x: 0, y: 1 }, world_map);
    try_move(state, Vector2 { x: 0, y: 1 }, world_map);
    try_move(state, Vector2 { x: 0 - 1, y: 0 }, world_map);
    try_move(state, Vector2 { x: 0 - 1, y: 0 }, world_map);
    try_move(state, Vector2 { x: 0 - 1, y: 0 }, world_map);
    try_move(state, Vector2 { x: 0, y: 1 }, world_map); // (3, 4) Gate!

    // Enter Dungeon to Relic
    try_move(state, Vector2 { x: 0, y: 1 }, world_map); // (3, 5) Dungeon
    try_move(state, Vector2 { x: 0, y: 1 }, world_map); // (3, 6) Relic!

    print("=== Adventure Summary ===");
    print("Final Hero Pos: ({state.hero_pos.x}, {state.hero_pos.y})");
    print("Current Area: {area_name(state.area)}");
    print("Quest Complete: {state.quest_complete}");
}
`,
  },
  {
    id: "raytracer",
    title: "3D Sphere Raytracer Benchmark",
    description: "Multi-object 3D raytracer computing shadows and specular reflections across 64,000 pixels.",
    category: "3D Engine",
    code: `// @controls: flight
// 3D Multi-Sphere Whitted Raytracer with Hard Shadows & Specular Reflections
import std;
import math;
import vec;

struct Sphere {
    center: float3,
    radius: f32,
    color: float3,
    specular: f32,
    reflect_k: f32,
}

struct Ray {
    origin: float3,
    dir: float3,
}

struct Hit {
    hit: bool,
    t: f32,
    norm: float3,
    col: float3,
    spec: f32,
    refl: f32,
}

// Embedded WebGL Analytical Whitted Raytracer Fragment Shader
let RAYTRACER_SHADER = """
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_cam_rot;
uniform vec3 u_cam_pos;

struct SphereObj {
    vec3 center;
    float radius;
    vec3 color;
    float specular;
    float reflect_k;
};

float intersect_sphere(vec3 ro, vec3 rd, SphereObj s) {
    vec3 oc = ro - s.center;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - s.radius * s.radius;
    float h = b * b - c;
    if (h < 0.0) return -1.0;
    float t = -b - sqrt(h);
    return (t > 0.001) ? t : -1.0;
}

float intersect_plane(vec3 ro, vec3 rd, float plane_y) {
    if (abs(rd.y) < 0.0001) return -1.0;
    float t = (plane_y - ro.y) / rd.y;
    return (t > 0.001) ? t : -1.0;
}

bool trace_scene(vec3 ro, vec3 rd, out float out_t, out vec3 out_norm, out vec3 out_col, out float out_spec, out float out_refl) {
    float t_anim = u_time * 0.8;
    SphereObj s[4];
    // 0: Central Ruby Sphere
    s[0] = SphereObj(vec3(0.0, 0.0 + sin(t_anim * 1.5) * 0.15, 3.2), 0.85, vec3(0.92, 0.18, 0.22), 40.0, 0.35);
    // 1: Left Polished Gold Sphere
    s[1] = SphereObj(vec3(-1.9, -0.2, 3.4 + cos(t_anim) * 0.4), 0.7, vec3(0.96, 0.78, 0.25), 90.0, 0.6);
    // 2: Right Emerald Glossy Sphere
    s[2] = SphereObj(vec3(1.9, -0.2, 3.4 - cos(t_anim) * 0.4), 0.7, vec3(0.15, 0.88, 0.45), 50.0, 0.4);
    // 3: Front Chrome Mirror Ball
    s[3] = SphereObj(vec3(sin(t_anim * 1.2) * 1.2, -0.65, 2.3 + cos(t_anim * 1.2) * 0.4), 0.35, vec3(0.95, 0.95, 0.98), 120.0, 0.85);

    float min_t = 1000.0;
    int hit_id = -1;

    for (int i = 0; i < 4; i++) {
        float t = intersect_sphere(ro, rd, s[i]);
        if (t > 0.001 && t < min_t) {
            min_t = t;
            hit_id = i;
        }
    }

    // Reflective Checkerboard Plane at y = -1.0
    float t_plane = intersect_plane(ro, rd, -1.0);
    if (t_plane > 0.001 && t_plane < min_t) {
        min_t = t_plane;
        hit_id = 4;
    }

    if (hit_id == -1) return false;

    out_t = min_t;
    vec3 hp = ro + rd * min_t;

    if (hit_id < 4) {
        for (int i = 0; i < 4; i++) {
            if (hit_id == i) {
                out_norm = normalize(hp - s[i].center);
                out_col = s[i].color;
                out_spec = s[i].specular;
                out_refl = s[i].reflect_k;
            }
        }
    } else {
        out_norm = vec3(0.0, 1.0, 0.0);
        vec2 tile = floor(hp.xz * 1.5);
        bool is_check = mod(tile.x + tile.y, 2.0) == 0.0;
        out_col = is_check ? vec3(0.85, 0.85, 0.9) : vec3(0.18, 0.22, 0.28);
        out_spec = 30.0;
        out_refl = 0.35;
    }

    return true;
}

vec3 shade_point(vec3 ro, vec3 rd) {
    vec3 light_pos = vec3(2.5, 4.0, 1.0);
    vec3 light_col = vec3(1.0, 0.98, 0.92);

    float t; vec3 norm; vec3 base_col; float spec_pow; float refl_k;
    if (!trace_scene(ro, rd, t, norm, base_col, spec_pow, refl_k)) {
        float sky = 0.5 * (rd.y + 1.0);
        return mix(vec3(0.08, 0.1, 0.15), vec3(0.25, 0.4, 0.65), sky);
    }

    vec3 hp = ro + rd * t;
    vec3 ld = normalize(light_pos - hp);

    // Hard Shadow Ray
    float shadow_t; vec3 s_norm; vec3 s_col; float s_spec; float s_refl;
    bool in_shadow = trace_scene(hp + norm * 0.005, ld, shadow_t, s_norm, s_col, s_spec, s_refl);
    float shadow = in_shadow ? 0.25 : 1.0;

    // Diffuse & Blinn-Phong Specular
    float diff = max(dot(norm, ld), 0.0) * shadow;
    vec3 ref_light = reflect(-ld, norm);
    float spec = pow(max(dot(-rd, ref_light), 0.0), spec_pow) * shadow;

    vec3 ambient = base_col * 0.2;
    vec3 direct = base_col * diff * light_col + vec3(spec * 0.55);
    vec3 color = ambient + direct;

    // 1-Bounce Recursive Reflection Ray
    if (refl_k > 0.05) {
        vec3 refl_dir = reflect(rd, norm);
        float rt; vec3 r_norm; vec3 r_col; float r_spec; float r_refl;
        if (trace_scene(hp + norm * 0.005, refl_dir, rt, r_norm, r_col, r_spec, r_refl)) {
            vec3 rhp = (hp + norm * 0.005) + refl_dir * rt;
            vec3 rld = normalize(light_pos - rhp);
            float rdiff = max(dot(r_norm, rld), 0.0);
            vec3 bounce_col = r_col * (0.25 + 0.75 * rdiff);
            color = mix(color, bounce_col, refl_k);
        } else {
            float rsky = 0.5 * (refl_dir.y + 1.0);
            vec3 sky_refl = mix(vec3(0.08, 0.1, 0.15), vec3(0.25, 0.4, 0.65), rsky);
            color = mix(color, sky_refl, refl_k * 0.5);
        }
    }

    return color;
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    vec3 ro = u_cam_pos;
    vec3 rd = normalize(vec3(uv * 0.75, 1.0));

    float pitch = u_cam_rot.y;
    float yaw = u_cam_rot.x;
    float cp = cos(pitch), sp = sin(pitch);
    rd = vec3(rd.x, cp * rd.y - sp * rd.z, sp * rd.y + cp * rd.z);
    float cy = cos(yaw), sy = sin(yaw);
    rd = vec3(cy * rd.x + sy * rd.z, rd.y, -sy * rd.x + cy * rd.z);

    vec3 col = shade_point(ro, rd);
    float vig = 1.0 - 0.25 * length(uv);
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}
""";

fn intersect_sphere(ray_origin: float3, ray_dir: float3, sphere: Sphere) -> f32 {
    let oc = ray_origin - sphere.center;
    let b = 2.0 * dot(oc, ray_dir);
    let c = dot(oc, oc) - sphere.radius * sphere.radius;
    let disc = b * b - 4.0 * c;
    if disc < 0.0 {
        return 0.0 - 1.0;
    }
    return (0.0 - b - sqrt(disc)) / 2.0;
}

fn main() {
    print("=== Goose 3D Analytical Whitted Raytracer Benchmark ===");
    let s0 = Sphere { center: float3 { 0.0, 0.0, 3.2 }, radius: 0.85, color: float3 { 0.92, 0.18, 0.22 }, specular: 40.0, reflect_k: 0.35 };
    let test_ray = Ray { origin: float3_0, dir: normalize(float3 { 0.0, 0.0, 1.0 }) };
    let t = intersect_sphere(test_ray.origin, test_ray.dir, s0);
    print("Primary ray hit central sphere at t = {t}");
    print("Multi-sphere raytracer with hard shadows & reflections live in Viewport.");
}
`,
  },
  {
    id: "mandelbrot",
    title: "ASCII Mandelbrot Fractal",
    description: "Complex number iteration computing the Mandelbrot fractal set rendered directly to console.",
    category: "Algorithms",
    code: `import std;

fn main() {
    let width = 60;
    let height = 24;
    let max_iter = 50;

    var row: u8[>..] = [];

    for y in 0..height {
        let ci = (y as f32 / height) * 2.0 - 1.0;
        row.clear();
        for x in 0..width {
            let cr = (x as f32 / width) * 3.0 - 2.1;
            var zr = 0.0;
            var zi = 0.0;
            var iter = 0;
            while zr * zr + zi * zi <= 4.0 && iter < max_iter {
                let next_zr = zr * zr - zi * zi + cr;
                zi = 2.0 * zr * zi + ci;
                zr = next_zr;
                iter += 1;
            }
            if iter == max_iter {
                row.push('#');
            } else if iter > 20 {
                row.push('*');
            } else if iter > 8 {
                row.push('.');
            } else {
                row.push(' ');
            }
        }
        print(row);
    }
}
`,
  },
  {
    id: "tour",
    title: "Goose Language Tour & Structs",
    description: "Struct definitions, methods, vector math, and string formatting in Goose.",
    category: "Language",
    code: `import std;

struct Duck {
    name: const u8[:],
    quack_power: i64,
}

fn honk(d: Duck) {
    print("{d.name} goes HONK with power {d.quack_power}!");
}

fn main() {
    let my_duck = Duck {
        name: "Gertrude",
        quack_power: 9000,
    };
    my_duck.honk();
}
`,
  },
  {
    id: "syntax_error",
    title: "Syntax Error Diagnostics Demo",
    description: "Demonstrates instant in-browser syntax diagnostic reporting with line/column markers.",
    category: "Debugging",
    code: `import std;

fn main() {
    // Missing closing parenthesis triggers a syntax error
    let x = (42 + 10;
    print(x);
}
`,
  },
  {
    id: "type_error",
    title: "Type Mismatch Diagnostics Demo",
    description: "Demonstrates type checker errors caught client-side in ~1.5 milliseconds.",
    category: "Debugging",
    code: `import std;

fn add(a: i64, b: i64) -> i64 {
    return a + b;
}

fn main() {
    // Passing a boolean where i64 is expected
    let res = add(10, true);
    print("Result: {res}");
}
`,
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
