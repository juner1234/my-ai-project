shader_type sky;
uniform vec4 top_color : source_color = vec4(0.22, 0.48, 0.75, 1.0);
uniform vec4 horizon_color : source_color = vec4(0.77, 0.85, 0.87, 1.0);
uniform vec4 ground_color : source_color = vec4(0.22, 0.28, 0.19, 1.0);
uniform vec4 cloud_color : source_color = vec4(0.94, 0.95, 0.91, 1.0);
uniform float cloud_amount = 0.5;
uniform float night_amount = 0.0;
uniform vec3 sun_direction = vec3(-0.4, 0.7, -0.5);
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void sky() {
    float h = max(EYEDIR.y, 0.0);
    vec3 color = mix(horizon_color.rgb, top_color.rgb, pow(h, 0.55));
    vec2 plane = EYEDIR.xz / max(EYEDIR.y + 0.25, 0.12) * 2.0;
    float clouds = noise2(plane) * 0.57 + noise2(plane * 2.0) * 0.28 + noise2(plane * 4.0) * 0.15;
    float cover = smoothstep(0.53, 0.76, clouds) * smoothstep(0.0, 0.15, EYEDIR.y) * cloud_amount;
    color = mix(color, cloud_color.rgb, cover);
    float sun = smoothstep(0.9993, 0.9998, dot(EYEDIR, normalize(sun_direction)));
    color += vec3(1.0, 0.76, 0.42) * sun * (1.0 - night_amount) * 2.0;
    vec2 grid = SKY_COORDS * vec2(1100.0, 550.0);
    float seed = hash21(floor(grid));
    float point = 1.0 - smoothstep(0.02, 0.18, length(fract(grid) - vec2(0.5)));
    float stars = step(0.994, seed) * point * smoothstep(0.02, 0.18, EYEDIR.y);
    float moon = smoothstep(0.99945, 0.9997, dot(EYEDIR, normalize(vec3(0.4, 0.63, -0.55))));
    color += (vec3(0.75, 0.83, 1.0) * stars * 2.4 + vec3(0.8, 0.86, 1.0) * moon * 1.5) * night_amount;
    COLOR = EYEDIR.y < 0.0 ? mix(horizon_color.rgb, ground_color.rgb, min(-EYEDIR.y * 4.0, 1.0)) : color;
}
