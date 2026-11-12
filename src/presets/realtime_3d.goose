// Real-Time 3D Raymarching in Goose
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

