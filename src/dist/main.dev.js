"use strict";

// --- AUDIO SETUP ---
var playMyMusicButton = document.getElementById('play-my-music-button');
var audioFileInput = document.getElementById('audio-file-input');
var overlay = document.getElementById('overlay');
var listener = new THREE.AudioListener(); // Ensure the camera is defined

var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;
camera.add(listener);
var sound = new THREE.Audio(listener);
var audioLoader = new THREE.AudioLoader();
var analyser; // Function to start audio playback

function startAudio(audioBuffer) {
  // Resume audio context on user interaction
  var audioContext = listener.context;

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  } // Stop current sound if playing


  if (sound.isPlaying) {
    sound.stop();
  }

  sound.setBuffer(audioBuffer);
  sound.setLoop(true);
  sound.setVolume(0.5);
  sound.play(); // Setup analyser after audio is loaded

  analyser = new THREE.AudioAnalyser(sound, 256); // Fade out the overlay

  overlay.style.opacity = '0';
  setTimeout(function () {
    overlay.style.display = 'none';
  }, 500);
} // Removed "PLAY DEFAULT MUSIC" button event listener
// Event listener for the "PLAY MY MUSIC" button


playMyMusicButton.addEventListener('click', function () {
  // Trigger the file input click programmatically
  audioFileInput.click();
}); // Event listener for user audio file input (when a file is actually selected)

audioFileInput.addEventListener('change', function (event) {
  var file = event.target.files[0];

  if (file) {
    var reader = new FileReader();

    reader.onload = function (e) {
      var audioContext = listener.context;
      audioContext.decodeAudioData(e.target.result, function (buffer) {
        startAudio(buffer);
      }, function (error) {
        console.error('Error decoding audio data:', error);
        alert('Could not load audio file. Please try another file.');
      });
    };

    reader.readAsArrayBuffer(file);
  }
}); // --- VISUALIZER SETUP ---

var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement); // Create a group of interactive elements (e.g., spheres)

var spheres = [];
var sphereCount = 50;
var sphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
var sphereMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff
});

for (var i = 0; i < sphereCount; i++) {
  var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
  spheres.push(sphere);
  scene.add(sphere);
} // Handle mouse movement


var mouse = new THREE.Vector2();
document.addEventListener('mousemove', function (event) {
  mouse.x = event.clientX / window.innerWidth * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}); // Animation loop

function animate() {
  requestAnimationFrame(animate);

  if (analyser) {
    var data = analyser.getFrequencyData();
    spheres.forEach(function (sphere, index) {
      var scale = data[index % data.length] / 256 + 0.5;
      sphere.scale.set(scale, scale, scale);
      sphere.position.x += mouse.x * 0.01;
      sphere.position.y += mouse.y * 0.01;
    });
  }

  renderer.render(scene, camera);
} // Resize renderer on window resize


window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
animate();