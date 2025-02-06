import*as app from "./renderer.js"

import generators from "./generators.js"
import converse from "./converse.js"

const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const saveBtn = document.getElementById("save-btn");
const chatBtn = document.getElementById("chat-btn");
const stopButton = document.getElementById("stop-btn")
const chatInput = document.getElementById("chat-input");
const repairButton = document.getElementById('repair-btn')

let setVisible = (e, visible=true) => e.style.display = visible ? '':'none'

setVisible(repairButton, false)
setVisible(stopButton, false);

const divider = document.getElementById("divider");
const chatPanel = document.getElementById('chat-panel')
const leftPane = document.getElementById('left-pane')

let activeGenerator = generators.uvEffect;
//uvShaderGenerator;

let exchanges = []

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

let makeEditable = (elem) => {

    elem.contentEditable = true;
    elem.setAttribute('spellcheck', 'false');
    elem.setAttribute('autocorrect', 'off');
    elem.setAttribute('autocapitalize', 'off');
    elem.style.whiteSpace = "pre-wrap"
}

let shaderError;
let glslElement;
let errorElement;
let repairRequest;
let conversation;

repairButton.addEventListener('click', (e) => {
    repairButton.style.display = 'none';
    if (repairRequest) {
        send(repairRequest);
        repairRequest = null;
    }
}
);
stopButton.addEventListener('click', (e) => {
    stopButton.style.display = 'none';
    if (conversation) {
        conversation.stop();
        conversation = null;
    }
}
);

app.onShaderError.fn = (errorInfo) => {

    glslElement && (glslElement.style.background = 'red');
    if (!(errorInfo.fs.status)) {
        if (!errorElement)
            errorElement = displayMessage("", "user", "red");
        let ecks = errorInfo.fs.errors.split(":");
        let errLine = parseInt(ecks[2]);
        let err = ecks[3] + ":" + ecks[4];
        let lines = errorInfo.fs.source.split("\n");
        let hdrOff = 0;
        let chunk = lines.slice(hdrOff);
        let errorLine = errLine - hdrOff - 1;
        let eline = chunk[errorLine];

        repairRequest = eline + " [ERROR] " + err
        // + " [/ERROR] "
        chunk[errorLine] = repairRequest;
        repairRequest = chunk.join("\n") + `
Fix the error between [ERROR] and [/ERROR]. Do not change anything else.
`

        console.log(lines[errLine - 1], errorInfo.fs.errors);

        errorElement.innerText = lines[errLine - 1] + '\n' + errorInfo.fs.errors;

        repairButton.style.display = "";
    }
    shaderError && shaderError(errorInfo);
}

async function send(message, system) {

    // Display user message
    displayMessage(message, "user", "blue");
    sendBtn.disabled = true;

    let botMessage = "";

    // Create a bot message placeholder
    let botMessageElement;
    let lines = []
    let glslLines = [];
    let currentLine = ""
    let inGLSL = false;
    let inThink = false;
    let shaderCrashed;
    let saveCB = plane.onBeforeRender;
    shaderError = (errorInfo) => {

        plane.material.dispose();
        plane.material = defaultMaterial;
        saveBtn.style.display = 'none';
        shaderCrashed = true;
        plane.onBeforeRender = saveCB;
    }
    let recompileTime;
    let waitForCrash = () => {
        //  if(!recompileTime){
        //      recompileTime = performance.now()+500;
        //  }
        //  if(performance.now()>recompileTime){
        if (!shaderCrashed) {
            saveBtn.style.display = '';
        }
        //  }
    }
    let preview = () => {

        if (errorElement) {
            errorElement.remove()
            errorElement = null;
        }
        plane.material = previewShader(glslElement.innerText, activeGenerator.vertex, activeGenerator.fragment);

        saveBtn.style.display = 'none';
        shaderCrashed = false;
        //plane.onBeforeRender=waitForCrash;
        setTimeout(waitForCrash, 1000);

    }
    let runGLSL = () => {
        if (!(glslLines.length || glslElement))
            return
        glslElement.innerText = glslLines.join("\n")
        console.log(glslElement.innerText);
        preview();
        makeEditable(glslElement)
        glslElement.addEventListener('input', function() {
            console.log('Content changed!');
            glslElement.style.background = 'orange'
            preview();
        });

    }

    let parseLine = (currentLine) => {
        let isDelimeter = true;
        if (currentLine == "<think>") {
            inThink = true;
        } else if (currentLine == "</think>") {
            inThink = false;
        } else if (currentLine.startsWith("```")) {
            if (!inGLSL) {
                inGLSL = true;
            } else {
                inGLSL = false;
                runGLSL();
            }
        } else if (currentLine == "") {
            if (inThink) {
                botMessageElement = null;
                botMessage = ""
            }
        } else if (currentLine !== "") {
            if (inGLSL) {
                glslLines.push(currentLine);
            }
            // Update message dynamically
            if (!botMessage.length)
                botMessage = currentLine;
            else
                botMessage += "\n" + currentLine;

            isDelimeter = false;

        }
        let stateColor = inThink ? "lightblue" : (inGLSL ? "orange" : 'blue');
        console.log(`%c${currentLine}`, `color:${stateColor};`);
        if (isDelimeter) {
            botMessageElement = null;
            botMessage = ""
        } else {
            if (!botMessageElement)
                botMessageElement = displayMessage("", "bot", stateColor);

            if (inGLSL) {
                glslElement = botMessageElement;
            }
            ///Can you format your responses in html?
            if (botMessage.startsWith("<"))
                botMessageElement.innerHTML = botMessage;
            else
                botMessageElement.innerText = botMessage;
            // Auto-scroll
            chatContainer.scrollTo(0, chatContainer.scrollHeight);

        }
    }

    conversation = converse({
        message,
        system,
        model,
        parseLine,
        onDone: (exchange) => {
            exchanges.push(exchange);
            stopButton.style.display = 'none';
        }
    });
    stopButton.style.display = '';
}

async function sendChat() {
    let message = userInput.innerText.trim();
    if (!message)
        return;
    send(message);
    sendBtn.disabled = false;
}

async function sendMessage() {

    let message = userInput.innerText.trim();

    if (!message)
        return;

    message = activeGenerator.generator(message);

    send(message, activeGenerator.system);

    sendBtn.disabled = false;
}

function displayMessage(text="", sender="bot", bgcolor='lightblue') {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);
    messageElement.innerText = text;
    messageElement.style.background = bgcolor
    chatContainer.appendChild(messageElement);

    chatContainer.scrollTo(0, chatContainer.scrollHeight);

    return messageElement;
}

let fakeEnter = (evt, elem) => {}

let shiftEnterKD = (e) => {
    if (e.key === "Enter") {
        e.preventDefault()
        if (e.shiftKey) {
            document.execCommand("insertParagraph");
        } else if (e.ctrlKey)
            sendMessage();
        else
            sendChat();
    }
}

sendBtn.addEventListener("click", sendMessage);

makeEditable(userInput);
userInput.addEventListener("keydown", shiftEnterKD)
userInput.addEventListener("input", (e) => {});

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

let artifacts={}

let galleryDir;
try{
    galleryDir = await (await fetch("/files")).json()
    
    console.log(galleryDir);
    let fraggles = {}
    await galleryDir.forEach(async (f, i) => {
        let fraggle = await (await fetch(f)).json()
        if (fraggles[fraggle.src]) {
            console.log("Found duplicate:", f)
        } else {
            fraggles[fraggle.src] = f;
            addPreviewer(fraggle.src)
    
            artifacts[f] = fraggle;
        }
        if(i==galleryDir.length-1){
            console.log(JSON.stringify(artifacts))
        }
    }
    )
        
}
catch(e){
    console.log("FAIL")
        setVisible(divider,false);
        setVisible(chatPanel,false);
        leftPane.style.width = '100%';
}

/*
function uploadFile() {
    var file = document.getElementById('fileInput').files[0];
    var formData = new FormData();
    formData.append('file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData,
    }).then(response => {
        if (response.ok) {
            alert('File uploaded successfully');
        } else {
            alert('Upload failed');
        }
    }
    ).catch(error => {
        console.error('Error:', error);
        alert('Error uploading file');
    }
    );
}*/

async function uploadJSON(jsonObject, filename="data.json") {
    const blob = new Blob([JSON.stringify(jsonObject, null, 2)],{
        type: "application/json"
    });
    const formData = new FormData();
    formData.append("file", blob, filename);

    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            console.log("JSON uploaded successfully!");
            saveBtn.style.display = 'none';
        } else {
            console.error("Upload failed:", await response.text());
        }
    } catch (error) {
        console.error("Error uploading JSON:", error);
    }
}


function uploadFile() {
    saveBtn.style.display = 'none';
    if (glslElement) {
        uploadJSON({
            src: glslElement.innerText,
        })
        addPreviewer(glslElement.innerText);
    } else {
        alert("no glsl!")
    }
}

saveBtn.addEventListener("click", uploadFile);
let model = "deepseek-r1:14b"
modelList.addEventListener("change", (e) => {
    model = e.target.value;
}
);

function fetchModels() {
    fetch('/models').then(response => response.json()).then(data => {
        const modelList = document.getElementById('modelList');
        modelList.innerHTML = '';
        // Clear previous list
        data.models.forEach(fmodel => {
            const li = document.createElement('option');
            li.textContent = fmodel.name;
            modelList.appendChild(li);
            if (fmodel.name == model) {
                li.setAttribute('selected', true);
            }
        }
        );
    }
    ).catch(async error => {

        console.error('Error fetching models:', error);

        setVisible(divider,false);
        setVisible(chatPanel,false);
        leftPane.style.width = '100%';
        for(let i=1;i<90;i++){
            try{
            let f = await (await fetch(`../data/data_${i}.json`)).json()
            addPreviewer(f.src);
            }
            catch(e){
                
            }
        }
camera.position.set(3,10,10)
app.controls.target.set(3,10,0)
    }
    );

}

fetchModels();
