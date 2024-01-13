import * as THREE from 'three';


// Vertex shader
const vertexShader = `
void main() {
    gl_PointSize = 30.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fragment shader
const fragmentShader = `

float noise(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}


void main() {
    float distance = length(gl_PointCoord - vec2(0.5, 0.5));
    // Distort the distance
    distance += noise(gl_PointCoord * 50.0) * 1.0;

    float gradient = 1.0 - smoothstep(0.3, 0.5, distance);

    gl_FragColor = vec4(1.0, 1.0, 1.0, gradient);
}


`;


const particleLifespan = 20; // in seconds
const riseSpeed = 0.05; // Speed at which particles rise
const dispersionFactor = 0.3; // How much particles disperse
const xDispertionFactor = 0.1;
const numParticles = 150;
let particleAge = new Float32Array(numParticles); // Track age of each particle
let initialize = false;
let positions;
let particleRiseSpeeds = new Float32Array(numParticles); // Array to store individual rise speeds
let particleLifespans = new Float32Array(numParticles); // Array to store individual rise speeds
const yOffset = 0.2;
const lifeSpanVariation = 0.5;
const riseSpeedVariation = 0.5;
// Parameters for wave motion
const waveAmplitude = 0.001; // Amplitude of the wave
const waveFrequency = 0.5; // Frequency of the wave

const particleMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true, 
    depthWrite: false, // rendering order will not affect how other objects are rendered in terms of depth, good for semi transparent materials
    
});


const particleGeometry = new THREE.BufferGeometry();

function updateParticles(tipWorldPos, deltaTime) {
    if (!initialize) {
        positions = new Float32Array(numParticles * 3); // Initialize the array
        for (let i = 0; i < numParticles; i++) {
            let index = i * 3;
            positions[index] = tipWorldPos.x + (Math.random() - 0.5) * xDispertionFactor;
            positions[index + 1] = tipWorldPos.y + (Math.random() * yOffset);
            positions[index + 2] = tipWorldPos.z + (Math.random() - 0.5) * dispersionFactor;
            particleLifespans[i] = Math.random() * particleLifespan; // Stagger initial ages
            particleRiseSpeeds[i] = riseSpeed + (Math.random() * riseSpeedVariation);
            particleAge[i] = Math.random() * particleLifespans[i]; // Stagger initial ages
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        initialize = true;
    } 
    else {
        const positions = particleGeometry.attributes.position.array;

        for (let i = 0; i < numParticles; i++) {
            let index = i * 3;

            if (particleAge[i] < particleLifespan) {
                // Update position - rise and disperse
                positions[index + 1] += riseSpeed * deltaTime; // Y - rise
                positions[index] += (Math.random() - 0.5) * xDispertionFactor * deltaTime; // X - dispersion
                positions[index + 2] += (Math.random() - 0.5) * dispersionFactor * deltaTime; // Z - dispersion
                // Swirl and sway motion
                //by multiplying particle age by the frequency then by the amplitude, each particle will swirl and sway as it ages
                let wave = Math.sin(particleAge[i] * waveFrequency) * waveAmplitude;
                positions[index] += wave; // Apply wave motion to X
                positions[index + 2] += wave; // Apply wave motion to Z
                particleAge[i] += deltaTime; // Update age of the particle
            } 
            else {
                // Reset particle
                let index = i * 3;
                positions[index] = tipWorldPos.x + (Math.random() - 0.5) * xDispertionFactor;
                positions[index + 1] = tipWorldPos.y + (Math.random() * yOffset);
                positions[index + 2] = tipWorldPos.z + (Math.random() - 0.5) * dispersionFactor;
                particleLifespans[i] = Math.random() * particleLifespan; // Stagger initial ages
                particleRiseSpeeds[i] = riseSpeed + (Math.random() * riseSpeedVariation);
                particleAge[i] = Math.random() * particleLifespans[i]; // Stagger initial ages
            }
        }

        particleGeometry.attributes.position.needsUpdate = true; // Important to update the geometry
    }
}

const particleSystem = new THREE.Points(particleGeometry, particleMaterial);

export { particleSystem, updateParticles };
