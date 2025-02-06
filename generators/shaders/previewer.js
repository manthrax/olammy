import*as app from "./../../renderer.js"
import generators from "./../../generators.js"
let {THREE, scene, camera} = app;

let noiseTexture = new THREE.TextureLoader().load('./noise.png')
noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
let defaultMaterial = new THREE.MeshBasicMaterial({
    map: noiseTexture
});
let planeMaterial = defaultMaterial;
let plane = new THREE.Mesh(new THREE.BoxGeometry(),planeMaterial);
scene.add(plane);
let previewShader = (func, vertexFn, fragmentFn) => {
    return new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: .1,
        uniforms: {
            iTime: {
                get value() {
                    return performance.now() / 1000;
                }
            },
            iChannel0: {
                value: defaultMaterial.map
            }
        },
        vertexShader: vertexFn(),
        fragmentShader: fragmentFn(func)
    })
}


let previewers = [];
let previewCount = 0;
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
    let col = previewCount % 5;
    let row = (previewCount / 5) | 0
    p.position.x = (col + 1) * 1.5;
    p.position.y = (row + 1) * 1.5;
    scene.add(p);
    previewCount++;
}

export {previewShader,plane,addPreviewer,defaultMaterial}