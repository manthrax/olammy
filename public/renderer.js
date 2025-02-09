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


let events = {
    _events:{},
    listen:function(name,fn){
        if(!this._events[name])this._events[name]=[]
        this._events[name].push(fn);
    },
    mute:function(name,fn){
        if(!this._events[name])console.error("event not found:",name)
        this._events[name]=this._events[name].filter(v=>v==fn);
    },
    dispatch:function(name,params){
        return this._events[name]&&this._events[name].map(fn=>fn(params))
    }
}


function Alea(seed) {
    function Mash() {
        let n = 0xefc8249d;

        return function(data) {
            data = data.toString();
            for (let i = 0; i < data.length; i++) {
                n += data.charCodeAt(i);
                let h = 0.02519603282416938 * n;
                n = h >>> 0;
                h -= n;
                h *= n;
                n = h >>> 0;
                h -= n;
                n += h * 0x100000000; // 2^32
            }
            return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
        };
    }

    let m = Mash(), s0 = m(" "), s1 = m(" "), s2 = m(" ");
    s0 -= m(seed); if (s0 < 0) { s0 += 1; }
    s1 -= m(seed); if (s1 < 0) { s1 += 1; }
    s2 -= m(seed); if (s2 < 0) { s2 += 1; }

    return function() {
        let t = 2091639 * s0 + s2 * 2.3283064365386963e-10; // 2^-32
        s0 = s1;
        s1 = s2;
        return s2 = t - (s2 = t | 0);
    };
}

let rand = Alea(399);
let buf = new Float32Array(96*96*4);
for(let i=0;i<buf.length;i++){
    buf[i]=rand();

    if((i%4)==3)buf[i]=1;
    /*
    {
        buf[i-3] *= buf[i]
        buf[i-2] *= buf[i]
        buf[i-1] *= buf[i]
    }
   */
} 

let noiseTexture = new THREE.DataTexture(buf,96,96);
//let noiseTexture = new THREE.TextureLoader().load('./noise.png')
noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
let noiseMaterial = new THREE.MeshBasicMaterial({
    map: noiseTexture
});


let onFrame = {fn:()=>{}}
let {width, height} = canvas;
renderer.setAnimationLoop( (dt) => {
    const container = canvas.parentElement;
   // let containerBounds = canvas.parentElement.getClientRects()[0];
      //const w = containerBounds.width;
     //const h = containerBounds.height
      const w = container.clientWidth;
      const h = container.clientHeight
    
    if ((w !== width) || (h !== height)) {

        
        renderer.setSize(width = w, height = h, true);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
    onFrame.fn(dt)
    events.dispatch('frame',dt)
    controls.update()
    renderer.render(scene, camera)
}
)

export {THREE, renderer, scene, camera, controls, onShaderError, onFrame, events,noiseTexture,noiseMaterial};
