
import glsl from "./glslHeaders.js"

export async function download(content, filename) {
  // Define your header and footer
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Three Litch:${filename}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0; 
      padding: 0;
      border: 0;
    }
  body {
      font-family: 'Courier New', Courier, monospace;  /* Monospaced font for code */
      white-space: pre-wrap;  /* Maintains whitespace formatting */
      word-wrap: break-word;  /* Ensures long lines do not overflow */
      overflow: hidden;
      width:100%;
      height:100%;
  }
  #left-pane{
      width:100%;
      height:100%;
      display: flex;
      flex-direction: row;
  }
   #three-canvas{
      width:100%;
      height:100%;
   
   }
  
  </style>
    <!-- Import Map -->
    <script type="importmap">
    {
      "imports": {
        "three": "https://threejs.org/build/three.module.js",
        "three/addons/": "https://threejs.org/examples/jsm/"
      }
    }
    </script>
</head>
<body>
<div id="left-pane">
<canvas id="three-canvas"></canvas>
</div>
<script type='module'>
${(await (await fetch("./../../renderer.js")).text()).split('export')[0]}
  
  let effect2=\`${content}\`;
  
  let globalTime = 0;
  let lastTime;
    
    let buf = new Float32Array(96*96*4);
    for(let i=0;i<buf.length;i++){
        buf[i]=Math.random();
        if((i%4)==3){
            buf[i-3] *= buf[i]
            buf[i-2] *= buf[i]
            buf[i-1] *= buf[i]
        }
    }
    let noiseTexture = new THREE.DataTexture(buf,96,96);
  noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
  let defaultMaterial = new THREE.MeshBasicMaterial({
      map: noiseTexture
  });

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
  
let vertex = (func) => glsl.vertex
let fragment = \`
${glsl.fragment}

\`+effect2+\`  //Your effect function here!

void main(){
    gl_FragColor = Effect2(vUv);
}
\`

  let previewShader = () => {
      return new THREE.ShaderMaterial({
          transparent: true,
          side: THREE.DoubleSide,
          alphaTest: .1,
          uniforms: {
              ...sharedUniforms
          },
          vertexShader:\`${glsl.vertex}\`,
          fragmentShader: fragment
      })
  }
  let box = new THREE.Mesh(new THREE.BoxGeometry(),previewShader());
  let uvs = box.geometry.attributes.uv.array;
  for(let i=0;i<uvs.length;i++)
      uvs[i]=((uvs[i]-.5)*2)+.5;
  
  scene.add(box);

  
let timeScale = 1.;
document.addEventListener('keydown', (e) => {
    if (e.code == 'Equal')
        timeScale *= 10;
    if (e.code == 'Minus')
        timeScale *= .1;
}
)

  events.listen('frame',()=>{
  
    let time = performance.now() / 1000;
    if (!lastTime)
        lastTime = time;
    sharedUniforms.iTime.value += ((time - lastTime) * timeScale);
    sharedUniforms.iTime.value %= 10000
    lastTime = time;

  })
</script>
</body>
</html>`;
  
  const blob = new Blob([fullHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  filename = filename.split('.')[0];
  a.download = filename.endsWith('.html') ? filename : filename + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
