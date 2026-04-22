import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const scene = new THREE.Scene(); /* setting up the scene nothing works without it*/
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); /*adding the perspective camera there are many types in the three.js doc but this works the best for this situation*/
camera.position.z = 5; /* camera oisiton*/
camera.position.x = 8; /* camera oisiton*/
const homePosition = new THREE.Vector3(8, 3, 7); /*home position meaning the position that the camera gets tped to when the user lets go of it  (the defult position) */ 


const renderer = new THREE.WebGLRenderer({ antialias: true }); /* adding the web rendered and removing the laising (sharp edges thing) */
const controls = new OrbitControls(camera, renderer.domElement);/*adding the orbit controls (the controls that moves the camera */
let isDragging = false; /* cariable for if the camera is dragging on not so i can make it go back to the begining*/


controls.addEventListener('start', () => {
    isDragging = true;
}); /*checks that if the usser is dragging or not*/


controls.addEventListener('end', () => {
    isDragging = false;
});/*checks that if the usser is dragging or not*/

renderer.setSize(window.innerWidth, window.innerHeight); /*making the renderer work on all the screen*/
document.body.appendChild(renderer.domElement);
//building the composer to add effects to the objects before they get printed on the screen
const composer = new EffectComposer(renderer); //goes to the renderer it self

// it add the glow to the objects to the scene nd making them appear to the camera before printing them
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// controlling the bloom itself
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), // Size of the glow
    1.5,  // Strength
    0.4,  // Radius
    0.85  // Threshold: Only glow on bright colors (0.85 means dark colors stay dark)
);
composer.addPass(bloomPass); //adding the new blooms to the composer

const AudioContext = window.AudioContext || window.webkitAudioContext; //cause fire fox is so great i had to add the other part so it knows what audio it uses
const audioContext = new AudioContext(); 
const analyser = audioContext.createAnalyser(); //calculates the volume of different pitches
analyser.fftSize = 256; // range of the analysr
const dataArray = new Uint8Array(analyser.frequencyBinCount); // calculates 128 places for the pitches
const waveDataArray = new Uint8Array(analyser.frequencyBinCount);

// Mic Toggle State
let micSource = null;
let micStream = null;
let isMicOn = false;

const micBtn = document.getElementById('startBtn');

micBtn.addEventListener('click', async () => {
    if (!isMicOn) { 
        // TURN ON
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); //asks for the mic permission
        micSource = audioContext.createMediaStreamSource(micStream);// getting the raw data
        micSource.connect(analyser);//giving the data to the analyser
        micBtn.textContent = "Turn Off Mic"; // Change button text
        isMicOn = true;
    } else {
        // if the mic is on this turns it off
        micSource.disconnect(); // Unplug the cable
        micStream.getTracks().forEach(track => track.stop()); // Kill the mic
        micBtn.textContent = "Turn On Mic"; // Change button text
        isMicOn = false;
    }



});
 
// The State Machine
let currentMode = 'bars'; // Starts in bars mode

document.getElementById('modeBarsBtn').addEventListener('click', () => {
    currentMode = 'bars';
});

document.getElementById('modeWaveBtn').addEventListener('click', () => {
    currentMode = 'wave';
});
document.getElementById('modeRadialBtn').addEventListener('click', () => {
    currentMode = 'radial';
});
document.getElementById('fakeUploadBtn').addEventListener('click', () => {
    document.getElementById('audioUpload').click();
});
// main menu
document.getElementById('enterBtn').addEventListener('click', () => {
    // Delete the top layer
    document.getElementById('start-screen').style.display = 'none';
    
    // Unhide the bottom UI panel
    document.querySelector('.ui-panel').style.display = 'flex';
});

const audioElement = new Audio(); 
let isMp3Connected = false;

document.getElementById('audioUpload').addEventListener('change', (event) => {const file = event.target.files[0];
    const fileurl = URL.createObjectURL(file);// by getting the path of the mp3 from the files you turn it into a temp web for the webpage to use
    audioElement.src = fileurl;
    document.getElementById('playBtn').disabled = false; 
    document.getElementById('stopBtn').disabled = false; 
});

document.getElementById('playBtn').addEventListener('click', () => {
     if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (!isMp3Connected) {
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        isMp3Connected = true;
    }
    audioElement.play();
}); // <--- Play button closes here


// Stop button is completely separate!
document.getElementById('stopBtn').addEventListener('click', () => {
    audioElement.pause(); 
    audioElement.currentTime = 0; 
});



//list for the cubes
const cubes = [];

for (let i = 0; i < 64; i++) {
    const geo = new THREE.BoxGeometry(0.2, 1, 0.2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const c = new THREE.Mesh(geo, mat);
    c.position.x = (i - 31.5) * 0.2; 

    scene.add(c);
    cubes.push(c);
}

// Create an array to hold 128 X, Y, and Z coordinates (128 * 3 = 384 numbers)
const wavePositions = new Float32Array(128 * 3);

// The skeleton for the line
const waveGeometry = new THREE.BufferGeometry();
waveGeometry.setAttribute('position', new THREE.BufferAttribute(wavePositions, 3));

// The skin for the line (neon pink)
const waveMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff });
const waveLine = new THREE.Line(waveGeometry, waveMaterial);
waveLine.visible = false; // Hide it by default
scene.add(waveLine);


// --- RADIAL SUN FACTORY ---
const radialCubes = [];
const radius = 4; // How big the circle is

for (let i = 0; i < 32; i++) {
    const geo = new THREE.BoxGeometry(0.3, 1, 0.3);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Cyan color
    const c = new THREE.Mesh(geo, mat);

    // The Clock Math!
    // angle calculates where this cube sits on the 360-degree circle
    const angle = (i / 32) * Math.PI * 2; // Math.PI * 2 is a full circle
    
    // cos(angle) gives us the X position on the circle
    c.position.x = Math.cos(angle) * radius;
    
    // sin(angle) gives us the Z position on the circle
    c.position.z = Math.sin(angle) * radius;
    
    // Make the cube look toward the center of the circle
    c.lookAt(0, 0, 0);

    c.visible = false; // Hidden by default
    scene.add(c);
    radialCubes.push(c);
}

// --- STAR FIELD ---
// 1. Create 1000 empty slots to hold X, Y, and Z coordinates
const starPositions = new Float32Array(1000 * 3);

// 2. Scatter them randomly in a giant cube
for (let i = 0; i < 1000; i++) {
    // Math.random() gives a number between 0 and 1. 
    // We multiply by 40 and subtract 20 to get numbers between -20 and +20
    starPositions[i * 3]     = (Math.random() - 0.5) * 40; // X
    starPositions[(i * 3) + 1] = (Math.random() - 0.5) * 40; // Y
    starPositions[(i * 3) + 2] = (Math.random() - 0.5) * 40; // Z
}

//the particles
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);





function animate() {
    requestAnimationFrame(animate);

    //getting the pitches
    analyser.getByteFrequencyData(dataArray);

    // if the mode is bars remove wave and circle
    if (currentMode === 'bars') {
        waveLine.visible = false;
        for (let i = 0; i < 32; i++) {
            radialCubes[i].visible = false;
        }

        // Show the bars 
        for (let i = 0; i < 64; i++) {
            cubes[i].visible = true; 
            const pitch = dataArray[i] / 255;
            cubes[i].scale.y = 0.2 + (pitch * 5);
            cubes[i].material.color.setHSL(pitch * 0.8, 1, 0.5);
        }
        //if its wave remove bars and circle
    } else if (currentMode === 'wave') {
        for (let i = 0; i < 32; i++) {
            radialCubes[i].visible = false;
        }
        for (let i = 0; i < 64; i++) {
            cubes[i].visible = false;
        }
        //show wave
        waveLine.visible = true;
        analyser.getByteTimeDomainData(waveDataArray);

        for (let i = 0; i < 128; i++) {
            wavePositions[i * 3] = (i - 64) * 0.15; 
            let targetY = (waveDataArray[i] - 128) / 50;
            let currentY = wavePositions[(i * 3) + 1];
            wavePositions[(i * 3) + 1] += (targetY - currentY) * 0.15; 
            wavePositions[(i * 3) + 2] = 0;
        }
        waveGeometry.attributes.position.needsUpdate = true;

    } else if (currentMode === 'radial') {
        // Hide bars and wave
        for (let i = 0; i < 64; i++) {
            cubes[i].visible = false;
        }
        waveLine.visible = false;

        // show circle
        for (let i = 0; i < 32; i++) {
            radialCubes[i].visible = true;
            const pitch = dataArray[i * 2] / 255;
            radialCubes[i].scale.y = 0.5 + (pitch * 8);
            radialCubes[i].material.color.setHSL(0.5 - (pitch * 0.5), 1, 0.5);
        }
    }

    //particles movement
    stars.rotation.y += 0.0005;
    stars.rotation.x += 0.0002;
        // If the user let go of the mouse, pull the camera back to Home
    if (!isDragging) {
        camera.position.lerp(homePosition, 0.05);
    }

    controls.update();
    composer.render(); //rendering the effects we made ealier
}
animate();