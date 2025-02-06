

let glslEnv=`

### **Shader Context**

You are allowed to use the following GLSL functions and uniforms:

### **Uniforms**

uniform float iTime; // Time in seconds
uniform sampler2D iChannel0; // A 64x64 RGB noise texture

### **Constants**

const float pi = 3.1415926;
const float PI = 3.1415926; // You can remove one if you don't need both pi and PI

### **Available Functions**

// Convert HSL to RGB
vec3 hsl(float cx, float cy, float cz);

// Convert HSL color to RGB
vec3 hsl2rgb(vec3 c);

// Convert HSV color to RGB
vec3 hsv2rgb(vec3 c);

// Corrected atan2 function: takes (y, x) in that order
float atan2(float y, float x);

// 2D noise function
float noise(vec2 p);

// 3D noise function (pseudo-3D using a 2D noise texture)
float noise(vec3 p);

// Multi-octave turbulence function (3D input)
float turbulent(vec3 p);

// Multi-octave turbulence function (2D input)
float turbulent(vec2 p);

`


let vertex=`
varying vec3 vWorldPos;
varying vec2 vUv;
    void main() {
        vUv = uv;
        vWorldPos = (modelMatrix * vec4( position, 1.0 )).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4( vWorldPos, 1.0 );
        
        //vWorldPos = gl_Position.xyz/gl_Position.w;
    }
`

let fragment=`
varying vec3 vWorldPos; // world space fragment position -- only use this for Effect3
varying vec2 vUv;       // fragment uv -- only use this for Effect2
uniform float iTime;    // time in seconds
uniform sampler2D iChannel0; // a 64x64 rgb noise texture

const float pi = 3.1415926;
const float PI = pi;

vec3 hsl(float cx, float cy, float cz) {
    vec3 rgb = clamp(abs(mod(cx * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return cz + cy * (rgb - 0.5) * (1.0 - abs(2.0 * cz - 1.0));
}

vec3 hsl2rgb(vec3 c) {
    return hsl(c.x, c.y, c.z);
}

vec3 hsv2rgb(vec3 c) {
    return hsl2rgb(c);
}

// Corrected atan2: takes (y, x) in that order
float atan2(float y, float x){
    return atan(y, x);
}

// 2D noise function
float noise(vec2 p) {
    // Scale + move UV with time
    vec2 uv = (p + iTime * 0.1) * 0.0625;
    // Convert RGB to a single grayscale
    return dot(texture2D(iChannel0, uv).rgb, vec3(0.333));
}

// 3D noise function (pseudo-3D via a 2D noise texture)
float noise(vec3 p) {
    // Combine all 3 coordinates for a less planar approach
    // e.g., rotate p, offset with time, etc.
    vec2 uv = p.xy;
    uv.x += p.z * 1.234;      // subtle offset from z
    uv *= 0.0625;             // scale down
    uv += iTime * 0.1;        // animate over time

    // Convert RGB to a single grayscale
    return dot(texture2D(iChannel0, uv).rgb, vec3(0.333));
}

// Turbulent functions with multiple octaves
float turbulent(vec3 p) {
    float t = iTime * 0.1;
    return noise(p * 0.5 + t) * 0.5 +
           noise(p * 2.0 + t * 2.0) * 0.25 +
           noise(p * 4.0 + t * 3.0) * 0.125;
}

float turbulent(vec2 p) {
    float t = iTime * 0.1;
    return noise(p * 0.5 + t) * 0.5 +
           noise(p * 2.0 + t * 2.0) * 0.25 +
           noise(p * 4.0 + t * 3.0) * 0.125;
}

`

export default {vertex,fragment,glslEnv};
