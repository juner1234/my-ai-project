shader_type spatial;
render_mode cull_disabled;
uniform vec4 leaf_color : source_color = vec4(0.08, 0.15, 0.04, 1.0);
uniform float breeze_strength = 0.018;
void vertex() {
    vec3 p = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
    float sway = sin(TIME * 0.72 + p.x * 0.85 + p.z * 0.55);
    float flutter = sin(TIME * 1.9 + p.x * 3.2 - p.z * 1.8);
    float height_weight = smoothstep(0.0, 0.7, p.y);
    VERTEX.x += (sway + flutter * 0.22) * breeze_strength * height_weight;
    VERTEX.z += sway * breeze_strength * 0.35 * height_weight;
}
void fragment() {
    ALBEDO = leaf_color.rgb;
    ROUGHNESS = 0.78;
    BACKLIGHT = leaf_color.rgb * 0.18;
}
