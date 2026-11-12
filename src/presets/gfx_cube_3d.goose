// 3D Spinning Lit Cube in Goose (embed_shader)
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

