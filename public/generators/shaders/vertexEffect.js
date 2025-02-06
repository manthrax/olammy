import glsl from "./glslHeaders.js"
import system from "./system.js"

let generator = (request) => `
${system}

- You must transform vec3 pos for a fully 3D volumetric effect in a function called Effect3().
- Avoid planar projections (i.e. do not rely solely on pos.xy).
Format your output as a fenced code block with the glsl language tag:

\`\`\`glsl
vec4 Effect3(vec3 pos){
    // your code
}
\`\`\`

Below is our fragment shader header. Use it exactly as provided:

${glsl.fragment}

Now, please produce:

\`\`\`glsl
vec4 Effect3(vec3 pos) {
    // your code
}
\`\`\`

Use all three coordinates in pos for a volumetric effect. 
When finished, output only the code for Effect3, wrapped in glsl fenced code blocks.

Here's the prompt:
${request}.
`

let vertex = (func) => glsl.vertex
let fragment = (func)=>`
${glsl.fragment}

${func}  //Your effect function here!

void main(){
    gl_FragColor = Effect3(vWorldPos);
}
`
export default {generator,system,vertex,fragment}
