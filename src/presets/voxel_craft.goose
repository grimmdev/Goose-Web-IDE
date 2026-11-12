// 3D Voxel World (Minecraft in Goose)
import std;
import math;
import vec;
import gfx;

// Embedded Real-Time 3D Voxel DDA Raymarcher (Procedural Terrain, Blocks & Held Item)
let VOXEL_SHADER = """
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_cam_pos;
uniform vec2 u_cam_rot;
uniform float u_action;
uniform float u_score;

int iabs(int v) {
    return v < 0 ? -v : v;
}

// Voxel Map Procedural Query: returns Block ID (0=Air, 1=Grass, 2=Dirt, 3=Stone, 4=Wood, 5=Leaves)
int get_voxel(int px, int py, int pz) {
    if (py < 0) return 3; // Deep bedrock / stone
    if (py > 12) return 0; // Sky above

    // Rolling hill height from 2D coordinates
    float h = sin(float(px) * 0.28) * cos(float(pz) * 0.28) * 2.2 + 4.0;
    int ground_h = int(floor(h));

    if (py < ground_h - 2) return 3; // Stone
    if (py < ground_h) return 2;     // Dirt
    if (py == ground_h) return 1;    // Grass

    // Procedural Voxel Tree at (x=3, z=3)
    if (px == 3 && pz == 3 && py > ground_h && py <= ground_h + 3) return 4; // Oak Trunk
    if (iabs(px - 3) <= 2 && iabs(pz - 3) <= 2 && py >= ground_h + 3 && py <= ground_h + 5) {
        if (iabs(px - 3) == 2 && iabs(pz - 3) == 2 && py == ground_h + 5) return 0;
        return 5; // Foliage Leaves
    }

    // Procedural Voxel Tree at (x=-3, z=5)
    if (px == -3 && pz == 5 && py > ground_h && py <= ground_h + 4) return 4;
    if (iabs(px + 3) <= 2 && iabs(pz - 5) <= 2 && py >= ground_h + 4 && py <= ground_h + 6) return 5;

    return 0;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p_uv = (gl_FragCoord.xy - u_resolution.xy * 0.5) / u_resolution.y;

    // Camera ray direction with yaw and pitch
    float yaw = u_cam_rot.x;
    float pitch = u_cam_rot.y;
    vec3 rd = normalize(vec3(p_uv, 1.2));

    // Pitch rotation (X-axis)
    float cp = cos(pitch), sp = sin(pitch);
    rd = vec3(rd.x, cp * rd.y - sp * rd.z, sp * rd.y + cp * rd.z);

    // Yaw rotation (Y-axis)
    float cy = cos(yaw), sy = sin(yaw);
    rd = vec3(cy * rd.x + sy * rd.z, rd.y, -sy * rd.x + cy * rd.z);

    vec3 ro = u_cam_pos;

    // 3D Voxel DDA Traversal Algorithm (WebGL 1.0 compatible)
    int map_x = int(floor(ro.x));
    int map_y = int(floor(ro.y));
    int map_z = int(floor(ro.z));

    vec3 delta_dist = abs(vec3(1.0) / rd);
    int step_x = rd.x < 0.0 ? -1 : 1;
    int step_y = rd.y < 0.0 ? -1 : 1;
    int step_z = rd.z < 0.0 ? -1 : 1;

    float side_dist_x = (step_x < 0 ? (ro.x - float(map_x)) : (float(map_x) + 1.0 - ro.x)) * delta_dist.x;
    float side_dist_y = (step_y < 0 ? (ro.y - float(map_y)) : (float(map_y) + 1.0 - ro.y)) * delta_dist.y;
    float side_dist_z = (step_z < 0 ? (ro.z - float(map_z)) : (float(map_z) + 1.0 - ro.z)) * delta_dist.z;

    int hit = 0;
    int hit_block = 0;
    vec3 hit_normal = vec3(0.0);

    for (int i = 0; i < 48; i++) {
        if (side_dist_x < side_dist_y) {
            if (side_dist_x < side_dist_z) {
                side_dist_x += delta_dist.x;
                map_x += step_x;
                hit_normal = vec3(-float(step_x), 0.0, 0.0);
            } else {
                side_dist_z += delta_dist.z;
                map_z += step_z;
                hit_normal = vec3(0.0, 0.0, -float(step_z));
            }
        } else {
            if (side_dist_y < side_dist_z) {
                side_dist_y += delta_dist.y;
                map_y += step_y;
                hit_normal = vec3(0.0, -float(step_y), 0.0);
            } else {
                side_dist_z += delta_dist.z;
                map_z += step_z;
                hit_normal = vec3(0.0, 0.0, -float(step_z));
            }
        }

        int block = get_voxel(map_x, map_y, map_z);
        if (block > 0) {
            hit = 1;
            hit_block = block;
            break;
        }
    }

    vec3 sky_color = mix(vec3(0.42, 0.72, 0.98), vec3(0.72, 0.88, 1.0), max(rd.y, 0.0));

    // Volumetric Minecraft-style block clouds
    if (rd.y > 0.05) {
        float cloud_plane = (18.0 - ro.y) / rd.y;
        if (cloud_plane > 0.0 && cloud_plane < 100.0) {
            vec2 cloud_pos = (ro.xz + rd.xz * cloud_plane) * 0.05 + vec2(u_time * 0.015, 0.0);
            float c_noise = sin(cloud_pos.x * 3.1415) * cos(cloud_pos.y * 3.1415);
            if (c_noise > 0.2) sky_color = mix(sky_color, vec3(1.0), 0.85);
        }
    }

    vec3 col = sky_color;

    if (hit == 1) {
        float dist = 0.1;
        if (abs(hit_normal.x) > 0.5) dist = (float(map_x) - ro.x + (1.0 - float(step_x)) * 0.5) / rd.x;
        else if (abs(hit_normal.y) > 0.5) dist = (float(map_y) - ro.y + (1.0 - float(step_y)) * 0.5) / rd.y;
        else dist = (float(map_z) - ro.z + (1.0 - float(step_z)) * 0.5) / rd.z;
        dist = max(dist, 0.05);

        vec3 hit_pos = ro + rd * dist;

        // Voxel Block Materials & Textures
        vec3 block_color = vec3(0.5);

        if (hit_block == 1) {
            // Grass block: lush green top, rich dirt sides
            if (hit_normal.y > 0.5) {
                block_color = vec3(0.35, 0.75, 0.22);
            } else {
                block_color = vec3(0.52, 0.38, 0.25);
                if (hit_pos.y - floor(hit_pos.y) > 0.75) block_color = vec3(0.35, 0.75, 0.22);
            }
        } else if (hit_block == 2) {
            block_color = vec3(0.52, 0.38, 0.25); // Dirt
        } else if (hit_block == 3) {
            block_color = vec3(0.58, 0.6, 0.62); // Stone
        } else if (hit_block == 4) {
            block_color = vec3(0.42, 0.28, 0.16); // Oak wood trunk
            if (abs(hit_normal.y) > 0.5) block_color = vec3(0.68, 0.55, 0.38);
        } else if (hit_block == 5) {
            block_color = vec3(0.22, 0.6, 0.18); // Leaves
        }

        // Directional Sunlight & Crevice Shading
        vec3 sun_dir = normalize(vec3(0.6, 0.9, -0.4));
        float light = max(dot(hit_normal, sun_dir), 0.0) * 0.55 + 0.45;
        if (hit_normal.y < -0.5) light *= 0.5;

        col = block_color * light;

        // Distance Fog
        float fog = clamp(dist / 32.0, 0.0, 1.0);
        col = mix(col, sky_color, fog);
    }

    // First-Person Held Voxel Item in Lower-Right Corner
    vec2 hand_uv = uv - vec2(0.72, 0.12);
    float swing = u_action;
    hand_uv.x += sin(u_time * 4.0) * 0.015;
    hand_uv.y -= swing * 0.12;

    if (hand_uv.x > -0.12 && hand_uv.x < 0.22 && hand_uv.y > -0.15 && hand_uv.y < 0.28) {
        vec2 b = hand_uv;
        float bx = b.x * 1.5 - b.y * 0.8;
        float by = b.x * 0.8 + b.y * 1.5;
        if (abs(bx) < 0.12 && abs(by) < 0.12) {
            vec3 held_color = vec3(0.35, 0.75, 0.22);
            if (u_score > 1.5 && u_score < 2.5) held_color = vec3(0.52, 0.38, 0.25);
            else if (u_score >= 2.5 && u_score < 3.5) held_color = vec3(0.58, 0.6, 0.62);
            else if (u_score >= 3.5) held_color = vec3(0.42, 0.28, 0.16);

            if (by > 0.0) held_color *= 1.15;
            else held_color *= 0.8;
            col = mix(col, held_color, 0.95);
        }
    }

    // Screen Center Crosshair
    if (abs(uv.x - 0.5) < 0.002 && abs(uv.y - 0.5) < 0.015) col = mix(col, vec3(1.0), 0.85);
    if (abs(uv.y - 0.5) < 0.004 && abs(uv.x - 0.5) < 0.01) col = mix(col, vec3(1.0), 0.85);

    gl_FragColor = vec4(col, 1.0);
}
""";

var cam_x: f32 = 0.0;
var cam_y: f32 = 8.5;
var cam_z: f32 = 0.0 - 5.0;
var yaw: f32 = 0.0;
var pitch: f32 = 0.0 - 0.18;
var arm_swing: f32 = 0.0;
var selected_block: f32 = 1.0;
var dpad_x: f32 = 0.0;
var dpad_y: f32 = 0.0;

var u_cam_pos = float3 { 0.0, 8.5, 0.0 - 5.0 };
var u_cam_rot = float2 { 0.0, 0.0 - 0.18 };
var u_action: f32 = 0.0;
var u_score: f32 = 1.0;

fn move_voxel(dist: f32) {
    let fwd_x = sin(yaw) * dist;
    let fwd_z = cos(yaw) * dist;
    cam_x = cam_x + fwd_x;
    cam_z = cam_z + fwd_z;
}

fn dpad(dx: i64, dy: i64) {
    let rot_speed: f32 = 0.25;
    let move_step: f32 = 0.45;

    if dx < 0 { yaw = yaw - rot_speed; }
    if dx > 0 { yaw = yaw + rot_speed; }

    if dy > 0 {
        move_voxel(move_step);
    } else if dy < 0 {
        move_voxel(0.0 - move_step);
    }

    u_cam_pos = float3 { cam_x, cam_y, cam_z };
    u_cam_rot = float2 { yaw, pitch };
}

fn button(idx: i64) {
    arm_swing = 1.0;
    if idx == 0 {
        print("Placed voxel block!");
    } else if idx == 1 {
        selected_block = selected_block + 1.0;
        if selected_block > 4.0 { selected_block = 1.0; }
        print("Cycled held block item to ID: {selected_block as i64}");
    }
}

fn tick(dt: f32) {
    if arm_swing > 0.0 {
        arm_swing = max(0.0, arm_swing - dt * 4.0);
    }

    let rot_speed: f32 = 2.4;
    let move_speed: f32 = 4.5;

    let turning_left = gfx::key_down("Left") || gfx::key_down("A") || dpad_x < 0.0 - 0.1;
    let turning_right = gfx::key_down("Right") || gfx::key_down("D") || dpad_x > 0.1;
    let moving_fwd = gfx::key_down("Up") || gfx::key_down("W") || dpad_y > 0.1;
    let moving_back = gfx::key_down("Down") || gfx::key_down("S") || dpad_y < 0.0 - 0.1;

    if turning_left { yaw = yaw - rot_speed * dt; }
    if turning_right { yaw = yaw + rot_speed * dt; }

    if moving_fwd {
        move_voxel(move_speed * dt);
    } else if moving_back {
        move_voxel(0.0 - (move_speed * dt));
    }

    u_cam_pos = float3 { cam_x, cam_y, cam_z };
    u_cam_rot = float2 { yaw, pitch };
    u_action = arm_swing;
    u_score = selected_block;
}

fn main() {
    print("=== 3D Voxel Craft World Initialized ===");
    print("Use D-pad / WASD to navigate voxels. Tap 'Place' / 'Break'!");
}
