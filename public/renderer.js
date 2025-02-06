import*as THREE from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
let canvas = window['three-canvas'];
let renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
})
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera();
//OrthographicCamera();
let controls = new OrbitControls(camera,renderer.domElement);
scene.add(camera);
camera.position.set(1, 1, 1)


renderer.setClearColor('black')
renderer.render(scene, camera);

let onShaderError = {
    fn: () => {}
}

let triageShader = (gl, shader) => {
    return {
        status: gl.getShaderParameter(shader, gl.COMPILE_STATUS),
        errors: gl.getShaderInfoLog(shader),
        source: gl.getShaderSource(shader)
    }
}
renderer.debug.onShaderError = (gl, program, glVertexShader, glFragmentShader) => {
    let errorInfo = {
        vs: triageShader(gl, glVertexShader),
        fs: triageShader(gl, glFragmentShader),
        gl,
        program,
        glVertexShader,
        glFragmentShader
    }
    onShaderError.fn(errorInfo)
}

let onFrame = {fn:()=>{}}
let {width, height} = canvas;
renderer.setAnimationLoop( (dt) => {
    let containerBounds = canvas.parentElement.getClientRects()[0];
    if ((containerBounds.width !== width) || (containerBounds.height !== height)) {
        renderer.setSize(width = containerBounds.width, height = containerBounds.height, true);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
    onFrame.fn(dt)
    controls.update()
    renderer.render(scene, camera)
}
)
export {THREE, renderer, scene, camera, controls, onShaderError, onFrame};
