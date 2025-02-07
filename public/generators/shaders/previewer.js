import*as app from "./../../renderer.js"
import generators from "./../../generators.js"
let {THREE, scene, camera, controls, events} = app;

let noiseTexture = new THREE.TextureLoader().load('./noise.png')
noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
let defaultMaterial = new THREE.MeshBasicMaterial({
    map: noiseTexture
});

let planeMaterial = defaultMaterial;
let plane = new THREE.Mesh(new THREE.PlaneGeometry(),planeMaterial);
plane.frustumCulled = false;
scene.add(plane);

let timeScale = 1.;
document.addEventListener('keydown',(e)=>{
    if(e.code=='Equal')timeScale *= 10;
    if(e.code=='Minus')timeScale *= .1;
})

let globalTime = 0;
let lastTime;
let sharedUniforms={

    iTime: {
        //get value() {
        //    return (performance.now()-timeBias)*timeScale / 1000;
        //}
        value:0
    },
    iChannel0: {
        value: defaultMaterial.map
    }
}


events.listen('frame',()=>{
    let time = performance.now() / 1000;
    if(!lastTime)lastTime=time;
    sharedUniforms.iTime.value+=((time-lastTime) * timeScale);
    sharedUniforms.iTime.value%=10000
    lastTime=time;
})

let previewShader = (func, vertexFn, fragmentFn) => {
    return new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: .1,
        uniforms: {
            ...sharedUniforms
        },
        vertexShader: vertexFn(),
        fragmentShader: fragmentFn(func)
    })
}


let previewers = [];
let previewCount = 0;

let previewShaderMap = {}

let addPreviewer = (e) => {
    let shader;
    if (e.indexOf("Effect3") >= 0)
        shader = previewShader(e, generators.volumetricEffect.vertex, generators.volumetricEffect.fragment)
    else if ((e.indexOf("Effect2") >= 0))
        shader = previewShader(e, generators.uvEffect.vertex, generators.uvEffect.fragment)
    else
        return;
    
    let p = plane.clone();
    p.material = shader;
    let col = previewCount % 15;
    let row = (previewCount / 15) | 0
    p.position.x = (col + 1) * 1.1;
    p.position.y = (row + 1) * 1.1;
    scene.add(p);
    previewCount++;
    return previewShaderMap[shader.fragmentShader] = {mesh:p};
}

export {previewShader,plane,addPreviewer,defaultMaterial,previewShaderMap}