// 3D Multi-Sphere Whitted Raytracer in Goose
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
    s[0] = SphereObj(vec3(0.0, 0.0 + sin(t_anim * 1.5) * 0.15, 3.2), 0.85, vec3(0.92, 0.18, 0.22), 40.0, 0.35);
    s[1] = SphereObj(vec3(-1.9, -0.2, 3.4 + cos(t_anim) * 0.4), 0.7, vec3(0.96, 0.78, 0.25), 90.0, 0.6);
    s[2] = SphereObj(vec3(1.9, -0.2, 3.4 - cos(t_anim) * 0.4), 0.7, vec3(0.15, 0.88, 0.45), 50.0, 0.4);
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

    float shadow_t; vec3 s_norm; vec3 s_col; float s_spec; float s_refl;
    bool in_shadow = trace_scene(hp + norm * 0.005, ld, shadow_t, s_norm, s_col, s_spec, s_refl);
    float shadow = in_shadow ? 0.25 : 1.0;

    float diff = max(dot(norm, ld), 0.0) * shadow;
    vec3 ref_light = reflect(-ld, norm);
    float spec = pow(max(dot(-rd, ref_light), 0.0), spec_pow) * shadow;

    vec3 ambient = base_col * 0.2;
    vec3 direct = base_col * diff * light_col + vec3(spec * 0.55);
    vec3 color = ambient + direct;

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

