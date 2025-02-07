import glsl from "./glslHeaders.js"
import system from "./system.js"

let generator = (request) => `
${system}


${glsl.glslEnv}

### **Output Instructions**
`+
//Now, generate 2 variations of the GLSL effect function.
`
Now, generate the GLSL effect function:

Use glsl tags like this:

\`\`\`glsl
vec4 Effect2(vec2 uv) {
    // your code
}
\`\`\`

- Use uv in a meaningful way for a dynamic generative effect.
- Incorporate procedural noise, turbulence, and color transformations when appropriate.
- The output must only contain GLSL code, wrapped in glsl fenced code blocks.

Here's the prompt to generate: ${request}.
`

// Please generate 3 separate variations, each in their own glsl block, separated with a descriptive label.

let vertex = (func) => glsl.vertex
let fragment = (func)=>`
${glsl.fragment}

${func}  //Your effect function here!

void main(){
    gl_FragColor = Effect2(vUv);
}
`
export default {generator,system,vertex,fragment}
