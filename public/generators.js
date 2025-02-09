import volumetricEffect from "./generators/shaders/volumetricEffect.js"
import uvEffect from "./generators/shaders/uvEffect.js"
import glsl from "./generators/shaders/glslHeaders.js"

let generators = {
    volumetricEffect,
    uvEffect
}
let prompts = {
    /*
    vertHeader: glsl.vertex,
    fragHeader: glsl.fragment,
    uvVertex: (func) => glsl.vertex,
    uvFragment: (func) => `
    ${glsl.fragment}
    
    ${func}  //Your effect function here!

void main(){
    gl_FragColor = Effect2(vUv);
}
`,
*/
    volumeVertex: (func) => glsl.vertex,
    volumeFragment: (func) => `
    ${glsl.fragment}

    ${func}  //Your effect function here!
void main(){
    gl_FragColor = Effect3(vWorldPos);
}
`,
    uvShaderGenerator: uvEffect.generator,
    volumeShaderGenerator: volumetricEffect
}
export default generators;
