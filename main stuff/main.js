// scubaplayer?
//bla bla bla improting
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';


const CFG = {
    fadeStep: 0.05,
    camReturn: 0.04,
    bassGate: 0.48,
    shakeGain: 3.1
};

//the camera these start position is tuff to start with
const scn = new THREE.Scene();
const camMain = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camMain.position.z = 5;
camMain.position.x = 8;

const idlePos = new THREE.Vector3(8, 3, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });

// controls ^^ i love perspective cam
const ctrl = new OrbitControls(camMain, renderer.domElement);

let isDraggingCam = false;
ctrl.addEventListener('start', () => isDraggingCam = true);
ctrl.addEventListener('end', () => isDraggingCam = false);

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// cool effects cuz am cooler
const composerFx = new EffectComposer(renderer);
composerFx.addPass(new RenderPass(scn, camMain));

const bloomFx = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, 0.4, 0.85
);
composerFx.addPass(bloomFx);


// yeah i had to use Ai in this
const AudioCTX = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioCTX();

const analyser = ctx.createAnalyser();
analyser.fftSize = 256;

const freqBuf = new Uint8Array(analyser.frequencyBinCount);
const timeBuf = new Uint8Array(analyser.frequencyBinCount);

// same
let micEnabled = false;
let micNodeRef = null;
let micStreamRef = null;

const micBtn = document.getElementById('micToggle');
//i hate the permission thingy
micBtn.onclick = async function () {
    try {
        if (!micEnabled) {
            micStreamRef = await navigator.mediaDevices.getUserMedia({ audio: true });
            micNodeRef = ctx.createMediaStreamSource(micStreamRef);

            micNodeRef.connect(analyser);

            micEnabled = true;
            micBtn.textContent = "Mic On";

        } else {
            micNodeRef.disconnect();

            // sometimes tracks stay alive? not sure
            micStreamRef.getTracks().forEach(t => t.stop());

            micEnabled = false;
            micBtn.textContent = "Mic Off";
        }
    } catch (e) {
        console.error("mic failed again", e); // seen this on Chrome incognito
        micBtn.textContent = "Mic Err";
    }
};



let mode = 'bars'; 

document.getElementById('setBars').onclick = () => mode = 'bars';
document.getElementById('setWave').onclick = () => mode = 'wave';
document.getElementById('setRadial').onclick = () => mode = 'radial';

document.getElementById('enterBtn').onclick = function () {
    document.getElementById('start-screen').style.display = 'none';
    document.querySelector('.ui-panel').style.display = 'flex';
};

// custom music cuz imagine singing in the mic the whole day
const audioTag = new Audio();
let srcLinked = false;

document.getElementById('fileInput').addEventListener('change', function (e) {
    const f = e.target.files[0];
    if (!f) return;

    audioTag.src = URL.createObjectURL(f);

    document.getElementById('audioPlay').disabled = false;
    document.getElementById('audioStop').disabled = false;
});

document.getElementById('audioPlay').onclick = function () {
    if (ctx.state === 'suspended') ctx.resume();

    if (!srcLinked) {
        const src = ctx.createMediaElementSource(audioTag);
        src.connect(analyser);
        analyser.connect(ctx.destination);
        srcLinked = true;
    }

    audioTag.play();
};

document.getElementById('audioStop').onclick = function () {
    audioTag.pause();
    audioTag.currentTime = 0;
};

// the fun design
const barsArr = []; 

for (let i = 0; i < 64; i++) {
    let mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 1, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );

    mesh.position.x = (i - 31.5) * 0.2;

    scn.add(mesh);
    barsArr.push(mesh);
}

//the wavee
const wavePts = new Float32Array(128 * 3);
const waveGeom = new THREE.BufferGeometry();
waveGeom.setAttribute('position', new THREE.BufferAttribute(wavePts, 3));

const waveMat = new THREE.LineBasicMaterial({ color: 0xff00ff });
const waveObj = new THREE.Line(waveGeom, waveMat);

waveObj.visible = false;
scn.add(waveObj);

// sun likey but uh ai said its called radical or radial idk
const radialBits = [];
const r = 4;

for (let i = 0; i < 32; i++) {
    let m = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 1, 0.3),
        new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );

    let a = (i / 32) * Math.PI * 2;

    m.position.x = Math.cos(a) * r;
    m.position.z = Math.sin(a) * r;

    m.lookAt(0, 0, 0);
    m.visible = false;

    scn.add(m);
    radialBits.push(m);
}

// particles needed the help of ai in this tbh
const pts = new Float32Array(1000 * 3);
for (let i = 0; i < 1000; i++) {
    pts[i * 3] = (Math.random() - 0.5) * 40;
    pts[i * 3 + 1] = (Math.random() - 0.5) * 40;
    pts[i * 3 + 2] = (Math.random() - 0.5) * 40;
}

const dust = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pts, 3)),
    new THREE.PointsMaterial({ size: 0.1 })
);

scn.add(dust);

// resize the basics froma playlist i watched tbh 
window.addEventListener('resize', () => {
    camMain.aspect = window.innerWidth / window.innerHeight;
    camMain.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    composerFx.setSize(window.innerWidth, window.innerHeight);
});

//the loooooopppp
function run() {
    requestAnimationFrame(run);

    analyser.getByteFrequencyData(freqBuf);

    if (mode === 'bars') {
        waveObj.visible = false;
        for (let i = 0; i < 32; i++) {
            radialBits[i].visible = false;
        }

        for (let i = 0; i < 64; i++) {
            barsArr[i].visible = true; 
            const pitch = freqBuf[i] / 255;
            barsArr[i].scale.y = 0.2 + (pitch * 5);
            barsArr[i].material.color.setHSL(pitch * 0.8, 1, 0.5);
        }
    } else if (mode === 'wave') {
        for (let i = 0; i < 32; i++) {
            radialBits[i].visible = false;
        }
        for (let i = 0; i < 64; i++) {
            barsArr[i].visible = false;
        }
        waveObj.visible = true;
        analyser.getByteTimeDomainData(timeBuf);

        for (let i = 0; i < 128; i++) {
            wavePts[i * 3] = (i - 64) * 0.15; 
            let targetY = (timeBuf[i] - 128) / 50;
            let currentY = wavePts[(i * 3) + 1];
            wavePts[(i * 3) + 1] += (targetY - currentY) * 0.15; 
            wavePts[(i * 3) + 2] = 0;
        }
        waveGeom.attributes.position.needsUpdate = true;

    } else if (mode === 'radial') {
        for (let i = 0; i < 64; i++) {
            barsArr[i].visible = false;
        }
        waveObj.visible = false;

        for (let i = 0; i < 32; i++) {
            radialBits[i].visible = true;
            const pitch = freqBuf[i * 2] / 255;
            radialBits[i].scale.y = 0.5 + (pitch * 8);
            radialBits[i].material.color.setHSL(0.5 - (pitch * 0.5), 1, 0.5);
        }
    }

    dust.rotation.y += 0.0005;
    dust.rotation.x += 0.0002;

    if (!isDraggingCam) {
        camMain.position.lerp(idlePos, 0.05);
    }

    ctrl.update();
    composerFx.render();
}

run();