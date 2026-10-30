shader_type spatial;
uniform vec4 water_color : source_color = vec4(0.07, 0.16, 0.14, 1.0);
varying vec2 pond_position;
void vertex() {
    pond_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xz;
}
void fragment() {
    float a = pond_position.x * 3.0 + pond_position.y * 1.7 + TIME * 0.45;
    float b = pond_position.x * -1.8 + pond_position.y * 4.2 - TIME * 0.3;
    NORMAL_MAP = normalize(vec3(cos(a) * 0.035 + cos(b) * 0.018,
        sin(a) * 0.022 - sin(b) * 0.025, 1.0)) * 0.5 + 0.5;
    ALBEDO = water_color.rgb * (0.98 + 0.02 * sin(a));
    ROUGHNESS = 0.18;
    SPECULAR = 0.5;
}
