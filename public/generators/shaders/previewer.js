import*as app from "./../../renderer.js"
import generators from "./../../generators.js"
let {THREE, scene, camera, controls, events, renderer} = app;

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
document.addEventListener('keydown', (e) => {
    if (e.code == 'Equal')
        timeScale *= 10;
    if (e.code == 'Minus')
        timeScale *= .1;
}
)

let globalTime = 0;
let lastTime;
let sharedUniforms = {

    iTime: {
        //get value() {
        //    return (performance.now()-timeBias)*timeScale / 1000;
        //}
        value: 0
    },
    iChannel0: {
        value: defaultMaterial.map
    }
}

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
let galleryBounds = new THREE.Box3();

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
    let prv = {
        mesh: p
    }
    previewers.push(prv)
    previewCount++;
    galleryBounds.expandByPoint(p.position);
    return previewShaderMap[shader.fragmentShader] = prv;
}

controls.minAzimuthAngle = controls.maxAzimuthAngle = 0;
controls.minPolarAngle = controls.maxPolarAngle = Math.PI * .5;
controls.zoomToCursor = true;
// Track mouse position
let mouse = new THREE.Vector2();
window.addEventListener("mousemove", (e) => {
    // To get mouse coords relative to the canvas
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
}
);

let targetZoom;

let mouseScroll = () => {
    const rect = renderer.domElement.getBoundingClientRect();
    let thresh = rect.width/8;
    if ((mouse.x <= rect.left) || (mouse.x >= rect.right) || (mouse.y <= rect.top) || (mouse.y >= rect.bottom))
        return;
    let dl = mouse.x - rect.left;
    let dr = rect.right - mouse.x;
    let dt = mouse.y - rect.top;
    let db = rect.bottom - mouse.y;
    let dx = 0;
    let dy = 0;
    if (dl < thresh)
        dx -= 1.-(dl / thresh);
    if (dr < thresh)
        dx += 1.-(dr / thresh);
    if (dt < thresh)
        dy += 1.-(dt / thresh);
    if (db < thresh)
        dy -= 1.-(db / thresh);
    camera.position.sub(controls.target);
    controls.target.x += dx * .05;
    controls.target.y += dy * .05;
    galleryBounds.clampPoint(controls.target,controls.target)
    camera.position.add(controls.target);
    controls.minDistance = .01;
    controls.maxDistance = 10;
    controls.mouseButtons.RIGHT=0;
    controls.mouseButtons.LEFT=2;

}

events.listen('frame', () => {
    let time = performance.now() / 1000;
    if (!lastTime)
        lastTime = time;
    sharedUniforms.iTime.value += ((time - lastTime) * timeScale);
    sharedUniforms.iTime.value %= 10000
    lastTime = time;

    mouseScroll();
    for (let i = 0; i < previewers.length; i++) {
        let p = previewers[i];
        p.mesh.visible = p.mesh.position.distanceTo(controls.target) < 10;
    }
}
)
export {previewShader, plane, addPreviewer, defaultMaterial, previewShaderMap}
