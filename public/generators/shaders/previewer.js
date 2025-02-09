import*as app from "./../../renderer.js"
import generators from "./../../generators.js"
let {THREE, scene, camera, controls, events, renderer} = app;


let canvas = renderer.domElement;

let buf = new Float32Array(96*96*4);
for(let i=0;i<buf.length;i++){
    buf[i]=Math.random();

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
let defaultMaterial = new THREE.MeshBasicMaterial({
    map: noiseTexture
});


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

let planeMaterial = defaultMaterial;
let plane = new THREE.Mesh(new THREE.PlaneGeometry(),planeMaterial);
plane.frustumCulled = false;
scene.add(plane);


let previewers = [];
let previewCount = 0;

let previewShaderMap = {}
let galleryBounds = new THREE.Box3();
let tileSpacing = 1.1
let addPreviewer = (e) => {
    let shader;
    if (e.indexOf("Effect3") >= 0)
        shader = previewShader(e, generators.volumetricEffect.vertex, generators.volumetricEffect.fragment)
    else if ((e.indexOf("Effect2") >= 0))
        shader = previewShader(e, generators.uvEffect.vertex, generators.uvEffect.fragment)
    else
        return;

    let p = plane.clone();
    
    p.frustumCulled = false;
    
    p.material = shader;
    let col = previewCount % 15;
    let row = (previewCount / 15) | 0
    p.position.x = (col + 1) * tileSpacing;
    p.position.y = (row + 1) * tileSpacing;
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
controls.minDistance = .01;
controls.maxDistance = 20;
controls.mouseButtons.RIGHT = 0;
controls.mouseButtons.LEFT = 2;
controls.zoomToCursor = true;
// Track mouse position
let mouse = new THREE.Vector2();
let mouseNDC = new THREE.Vector2();

let clickPlane = new THREE.Mesh(new THREE.PlaneGeometry(1000,1000));
let selectionPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.02,1.02),new THREE.MeshBasicMaterial({
    color: 'yellow'
}));
let raycaster = new THREE.Raycaster();
let worldCursor = new THREE.Vector3();
let buttons = 0;
let canvasIsTarget;

let canvasHasFocus = false;
canvas.addEventListener("pointermove", (e) => {
    canvasIsTarget = (e.target === renderer.domElement);
    // To get mouse coords relative to the canvas
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
}
);

scene.add(selectionPlane)

canvas.addEventListener("pointerdown", (e) => {
    buttons = e.buttons;
    if (e.target !== renderer.domElement) 
        canvasIsTarget = false;

    else
        canvasIsTarget = true;

}
)
canvas.addEventListener("pointerenter", (e) => {
    canvasHasFocus=true;

})
canvas.addEventListener("pointerleave", (e) => {
    canvasHasFocus=false;
})
window.addEventListener("pointerup", (e) => {
    buttons = e.buttons;
}
)

let targetZoom;
let prevButtons;

let mouseDragViewport=()=>{
    const rect = renderer.domElement.getBoundingClientRect();
    let thresh = rect.width / 8;
    
    let dl = mouse.x - rect.left;
    let dr = rect.right - mouse.x;
    let dt = mouse.y - rect.top;
    let db = rect.bottom - mouse.y;
    let dx = 0;
    let dy = 0;
    if (dl < thresh)
        dx -= 1. - (dl / thresh);
    if (dr < thresh)
        dx += 1. - (dr / thresh);
    if (dt < thresh)
        dy += 1. - (dt / thresh);
    if (db < thresh)
        dy -= 1. - (db / thresh);
    camera.position.sub(controls.target);
    controls.target.x += dx * .05;
    controls.target.y += dy * .05;
    galleryBounds.clampPoint(controls.target, controls.target)
    camera.position.add(controls.target);

}

let mouseScroll = () => {

    if (!canvasIsTarget)
        return

    if (!canvasHasFocus)
        return

    
    const rect = renderer.domElement.getBoundingClientRect();
    if ((mouse.x <= rect.left) || (mouse.x >= rect.right) || (mouse.y <= rect.top) || (mouse.y >= rect.bottom))
        return;
    mouseNDC.x = (mouse.x / rect.width) * 2 - 1;
    mouseNDC.y = -(mouse.y / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);

    if(!buttons)
        mouseDragViewport();
    
    if (!buttons) {
        prevButtons = null;
        return
    }

    let hits = raycaster.intersectObject(clickPlane);
    if (!hits[0])
        return;
    let p = selectionPlane.position.copy(hits[0].point)
    p.x = Math.floor((p.x / tileSpacing) + .5) * tileSpacing
    p.y = Math.floor((p.y / tileSpacing) + .5) * tileSpacing

    worldCursor.copy(selectionPlane.position)

    if (!prevButtons) {
        prevButtons = buttons;
        let prv = previewers.slice();
        prv.forEach(a => a.cursorDistance = a.mesh.position.distanceTo(worldCursor));
        prv.sort( (a, b) => a.cursorDistance - b.cursorDistance);
        let p = prv[0];
        if (p && (p.cursorDistance<1) && (buttons==1)) {
            document.getElementById('info-panel').innerText = prv[0].fileName;
            events.dispatch('artifact-selected', prv[0]);
            selectionPlane.visible = true;
        }else{
            events.dispatch('artifact-selected', undefined);
            selectionPlane.visible = false;
        }
    }

}

let distMax=(a,b)=>{
    let dx=Math.abs(a.x-b.x);
    let dy=Math.abs(a.y-b.y);
    let dz=Math.abs(a.z-b.z);
    return Math.max(dx,dy,dz);
}


events.listen('frame', () => {
    let time = performance.now() / 1000;
    if (!lastTime)
        lastTime = time;
    sharedUniforms.iTime.value += ((time - lastTime) * timeScale);
    sharedUniforms.iTime.value %= 10000
    lastTime = time;

    mouseScroll();
    if(false)
    for (let i = 0; i < previewers.length; i++) {
        let p = previewers[i];
        p.mesh.visible = distMax(p.mesh.position,controls.target) < 10;
    }
}
)
export {previewShader, plane, addPreviewer, defaultMaterial, previewShaderMap}
