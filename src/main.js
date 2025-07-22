// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize for high-res displays
document.getElementById('container').appendChild(renderer.domElement);

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// --- CENTRAL ICOSAHEDRON (VISUALIZER CORE) ---
const icosahedronGeometry = new THREE.IcosahedronGeometry(1.5, 1);
const icosahedronMaterial = new THREE.MeshStandardMaterial({
    color: 0xff007f,
    emissive: 0x000000,
    wireframe: true,
    roughness: 0.5,
    metalness: 0.5
});
const icosahedron = new THREE.Mesh(icosahedronGeometry, icosahedronMaterial);
scene.add(icosahedron);

// --- PARTICLE SYSTEM ---
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 7000;
const posArray = new Float32Array(particlesCount * 3);
for (let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 25;
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.015,
    color: 0xffffff,
    transparent: true,
    opacity: 0.7
});
const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particleMesh);

// --- WAVE GRAPH VISUALIZER ---
const waveSegments = 128; // Number of bars in the wave
const waveHeightScale = 3.0; // Max height of the wave
const waveWidth = 15; // Total width of the wave

const waveGeometry = new THREE.BufferGeometry();
// We'll create two vertices for each "bar" of the wave: one at the bottom, one at the top
const waveVertices = new Float32Array(waveSegments * 2 * 3); // 2 vertices per segment, 3 coords each
const waveColors = new Float32Array(waveSegments * 2 * 3); // Colors for each vertex (RGB)

for (let i = 0; i < waveSegments; i++) {
    const x = (i / (waveSegments - 1) - 0.5) * waveWidth;

    // Bottom vertex of the bar
    waveVertices[i * 6] = x;
    waveVertices[i * 6 + 1] = 0; // Start at y=0 relative to wave position
    waveVertices[i * 6 + 2] = 0;

    // Top vertex of the bar
    waveVertices[i * 6 + 3] = x;
    waveVertices[i * 6 + 4] = 0; // Initial height
    waveVertices[i * 6 + 5] = 0;

    // Initial color (e.g., cyan)
    waveColors[i * 6] = 0; waveColors[i * 6 + 1] = 1; waveColors[i * 6 + 2] = 1; // R, G, B for bottom vertex
    waveColors[i * 6 + 3] = 0; waveColors[i * 6 + 4] = 1; waveColors[i * 6 + 5] = 1; // R, G, B for top vertex
}

waveGeometry.setAttribute('position', new THREE.BufferAttribute(waveVertices, 3));
waveGeometry.setAttribute('color', new THREE.BufferAttribute(waveColors, 3));

// Use LineSegments to draw individual bars
const waveMaterial = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 }); // linewidth may not work on all platforms
const wave = new THREE.LineSegments(waveGeometry, waveMaterial);
wave.position.set(0, -4, 0); // Position the wave closer to the bottom (y=-4)
scene.add(wave);

// --- AUDIO SETUP ---
const playMyMusicButton = document.getElementById('play-my-music-button');
const audioFileInput = document.getElementById('audio-file-input');
const overlay = document.getElementById('overlay');

const listener = new THREE.AudioListener();
camera.add(listener);

const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
let analyser;

// Function to start audio playback
function startAudio(audioBuffer) {
    // Resume audio context on user interaction
    const audioContext = listener.context;
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    // Stop current sound if playing
    if (sound.isPlaying) {
        sound.stop();
    }

    sound.setBuffer(audioBuffer);
    sound.setLoop(true);
    sound.setVolume(0.5);
    sound.play();

    // Setup analyser after audio is loaded
    analyser = new THREE.AudioAnalyser(sound, 256);

    // Fade out the overlay
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 500);
}

// Event listener for the "PLAY MY MUSIC" button
playMyMusicButton.addEventListener('click', () => {
    // Trigger the file input click programmatically
    audioFileInput.click();
});

// Event listener for user audio file input (when a file is actually selected)
audioFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const audioContext = listener.context;
            audioContext.decodeAudioData(e.target.result, (buffer) => {
                startAudio(buffer);
            }, (error) => {
                console.error('Error decoding audio data:', error);
                alert('Could not load audio file. Please try another file.');
            });
        };
        reader.readAsArrayBuffer(file);
    }
});


// --- ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Animate even when audio is not playing
    icosahedron.rotation.y = elapsedTime * 0.2;
    particleMesh.rotation.y = elapsedTime * 0.05;

    // --- AUDIO VISUALIZATION ---
    if (analyser) {
        const frequencyData = analyser.getFrequencyData(); // Get frequency data

        // Animate Icosahedron based on overall volume
        const avgFrequency = frequencyData.reduce((a, b) => a + b) / frequencyData.length;
        const scale = 1 + (avgFrequency / 255) * 1.5;
        icosahedron.scale.set(scale, scale, scale);

        // Animate Wave Graph
        const wavePositionAttribute = wave.geometry.attributes.position;
        const waveColorAttribute = wave.geometry.attributes.color;

        for (let i = 0; i < waveSegments; i++) {
            // Map frequency data to wave segments
            const dataIndex = Math.floor((i / (waveSegments - 1)) * (frequencyData.length / 2));
            const y = (frequencyData[dataIndex] / 255) * waveHeightScale; // Scale wave height

            // Update the top vertex of each bar
            wavePositionAttribute.setY(i * 2 + 1, y); // i * 2 + 1 targets the second vertex of each segment

            // Dynamic coloring based on frequency
            const colorHue = (frequencyData[dataIndex] / 255) * 0.6; // Map frequency to a hue (e.g., green to magenta)
            const color = new THREE.Color().setHSL(colorHue, 1, 0.5); // HSL for vibrant colors

            // Apply color to both vertices of the bar
            waveColorAttribute.setXYZ(i * 2, color.r, color.g, color.b); // Bottom vertex
            waveColorAttribute.setXYZ(i * 2 + 1, color.r, color.g, color.b); // Top vertex
        }
        wavePositionAttribute.needsUpdate = true;
        waveColorAttribute.needsUpdate = true;
    }

    // Render the scene
    renderer.render(scene, camera);

    // Call the next frame
    requestAnimationFrame(animate);
}
animate();

// --- RESIZE HANDLER ---
window.addEventListener('resize', () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});